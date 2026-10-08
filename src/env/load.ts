import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { Logger } from "../log.ts"
import type { DotenvOptions } from "../options.ts"
import { decryptContent, hasEncryptedValues, resolvePrivateKey } from "./decrypt.ts"
import { expandEnv } from "./expand.ts"
import { parseEnv, type EnvMap, type ProcessEnv } from "./parse.ts"
import { candidateFiles, resolveLayers } from "./resolve.ts"

export interface LoadInput {
  options: DotenvOptions
  /** Location directory. */
  directory: string
  /** Process environment (injectable for tests). */
  processEnv: ProcessEnv
  log: Logger
}

export interface LoadResult {
  /** Effective variables for this location (merged, ready for shell/MCP). */
  env: EnvMap
  /**
   * Subset of variables the plugin should export to `process.env` so that
   * OpenCode's native `{env:VAR}` expansion resolves them. Depends on
   * `options.processEnv`.
   */
  processEnv: EnvMap
  /** Paths read, for diagnostics. */
  files: string[]
  /** Names of the loaded variables. */
  keys: string[]
}

async function readParsedFile(
  path: string,
  directory: string,
  profile: string | null,
  options: DotenvOptions,
  processEnv: ProcessEnv,
  log: Logger,
): Promise<EnvMap | null> {
  let content: string
  try {
    content = readFileSync(path, "utf8")
  } catch {
    return null
  }

  if (options.dotenvx && hasEncryptedValues(content)) {
    const privateKey = resolvePrivateKey({ directory, profile, processEnv })
    if (privateKey) {
      const decrypted = await decryptContent(content, privateKey)
      if (decrypted) return decrypted
      log.warn(`could not decrypt ${path}; keeping the encrypted value`)
    } else {
      log.warn(`encrypted values in ${path} without an available private key`)
    }
  }

  return parseEnv(content)
}

/**
 * Load the `.env` files applying the layer and profile model, and return the
 * effective map for the location plus the subset to export to `process.env`.
 * Never logs values.
 */
export async function loadEnv(input: LoadInput): Promise<LoadResult> {
  const { options, processEnv, log } = input
  const { directories, profile } = resolveLayers({
    options,
    directory: input.directory,
    processEnv,
  })

  const globalEnv: EnvMap = {}
  const projectEnv: EnvMap = {}
  const merged: EnvMap = {}
  const files: string[] = []
  const names = candidateFiles(options, profile)

  for (const { path: directory, scope } of directories) {
    for (const name of names) {
      const path = join(directory, name)
      if (!existsSync(path)) continue

      const parsed = await readParsedFile(path, directory, profile, options, processEnv, log)
      if (!parsed) continue

      files.push(path)
      for (const [key, value] of Object.entries(parsed)) {
        // First occurrence wins (directories are ordered high to low).
        const bucket = scope === "global" ? globalEnv : projectEnv
        if (!(key in bucket)) bucket[key] = value
        if (!(key in merged)) merged[key] = value
      }
    }
  }

  const fallback = (name: string): string | undefined => processEnv[name]
  const expanded = options.expand ? expandEnv(merged, fallback) : merged

  const env: EnvMap = {}
  for (const [key, value] of Object.entries(expanded)) {
    env[key] = options.override ? value : (processEnv[key] ?? value)
  }

  const exported: EnvMap = {}
  if (options.processEnv === "all") {
    Object.assign(exported, env)
  } else if (options.processEnv === "global") {
    // Export user-level values only, and never a value overridden by the
    // project layer (that would leak a project secret through process.env).
    const globalExpanded = options.expand ? expandEnv(globalEnv, fallback) : globalEnv
    for (const key of Object.keys(globalEnv)) {
      if (key in projectEnv) continue
      exported[key] = options.override ? globalExpanded[key] : (processEnv[key] ?? globalExpanded[key])
    }
  }

  log.info(`${files.length} .env file(s), ${Object.keys(env).length} variable(s)`)

  return { env, processEnv: exported, files, keys: Object.keys(env) }
}
