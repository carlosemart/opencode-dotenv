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
  /** Effective variables contributed by files (already merged with process.env). */
  env: EnvMap
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
 * effective map for the location. Never logs values.
 */
export async function loadEnv(input: LoadInput): Promise<LoadResult> {
  const { options, processEnv, log } = input
  const { directories, profile } = resolveLayers({
    options,
    directory: input.directory,
    processEnv,
  })

  const filesEnv: EnvMap = {}
  const files: string[] = []
  const names = candidateFiles(options, profile)

  for (const directory of directories) {
    for (const name of names) {
      const path = join(directory, name)
      if (!existsSync(path)) continue

      const parsed = await readParsedFile(path, directory, profile, options, processEnv, log)
      if (!parsed) continue

      files.push(path)
      // First occurrence wins (precedence is already ordered high to low).
      for (const [key, value] of Object.entries(parsed)) {
        if (!(key in filesEnv)) filesEnv[key] = value
      }
    }
  }

  const expanded = options.expand ? expandEnv(filesEnv, (name) => processEnv[name]) : filesEnv

  const env: EnvMap = {}
  for (const [key, value] of Object.entries(expanded)) {
    env[key] = options.override ? value : (processEnv[key] ?? value)
  }

  log.info(`${files.length} .env file(s), ${Object.keys(env).length} variable(s)`)

  return { env, files, keys: Object.keys(env) }
}
