import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"

import type { DotenvOptions } from "../options.ts"
import type { ProcessEnv } from "./parse.ts"

/**
 * Resolve the ordered list of candidate directories, from **highest to lowest
 * precedence**, mirroring OpenCode's configuration hierarchy:
 *
 *   1. `.opencode` directories (closest -> farthest)
 *   2. direct project configs (closest -> farthest) plus the base directory
 *   3. custom config (`dirname($OPENCODE_CONFIG)`)
 *   4. global config (`$OPENCODE_CONFIG_DIR` or `~/.config/opencode`)
 *
 * The remote configuration layer (`.well-known/opencode`) is ignored.
 */

const CONFIG_FILES = ["opencode.json", "opencode.jsonc"]

export interface ResolveInput {
  options: DotenvOptions
  /** Location directory (or `options.directory` when set). */
  directory: string
  processEnv: ProcessEnv
}

export interface ResolvedLayers {
  /** Directories from highest to lowest precedence. */
  directories: string[]
  /** Active profile, or `null`. */
  profile: string | null
}

function expandHome(path: string, home: string): string {
  if (path === "~") return home
  if (path.startsWith("~/")) return join(home, path.slice(2))
  return path
}

function hasConfig(directory: string): boolean {
  return CONFIG_FILES.some((file) => existsSync(join(directory, file)))
}

/** Ancestor chain of `directory`, starting with the closest one. */
function ancestors(directory: string): string[] {
  const chain: string[] = []
  let current = resolve(directory)
  const root = resolve("/")
  while (true) {
    chain.push(current)
    if (current === root) break
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return chain
}

export function resolveProfile(options: DotenvOptions, processEnv: ProcessEnv): string | null {
  return options.env ?? (processEnv.OPENCODE_ENV || null)
}

export function resolveLayers(input: ResolveInput): ResolvedLayers {
  const home = input.processEnv.HOME || homedir()
  const profile = resolveProfile(input.options, input.processEnv)
  const base = resolve(expandHome(input.options.directory ?? input.directory, home))

  const chain = ancestors(base)
  const directories: string[] = []

  const push = (directory: string): void => {
    if (!directories.includes(directory)) directories.push(directory)
  }

  if (input.options.layers.dotenvDir) {
    for (const directory of chain) {
      if (existsSync(join(directory, ".opencode"))) push(join(directory, ".opencode"))
    }
  }

  if (input.options.layers.project) {
    const withConfig = chain.filter(hasConfig)
    if (!withConfig.includes(base)) withConfig.unshift(base)
    for (const directory of withConfig) push(directory)
  }

  if (input.options.layers.custom && input.processEnv.OPENCODE_CONFIG) {
    push(dirname(resolve(expandHome(input.processEnv.OPENCODE_CONFIG, home))))
  }

  if (input.options.layers.global) {
    const globalDir = input.processEnv.OPENCODE_CONFIG_DIR
      ? resolve(expandHome(input.processEnv.OPENCODE_CONFIG_DIR, home))
      : join(home, ".config", "opencode")
    push(globalDir)
  }

  return { directories, profile }
}

/**
 * Candidate file names in a directory, from highest to lowest precedence within
 * that directory.
 */
export function candidateFiles(options: DotenvOptions, profile: string | null): string[] {
  if (options.files) return options.files
  if (!options.flow) return [".env"]
  if (profile) return [`.env.${profile}.local`, `.env.${profile}`, ".env.local", ".env"]
  return [".env.local", ".env"]
}
