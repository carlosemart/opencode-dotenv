import type { Logger } from "../log.ts"
import type { DotenvOptions } from "../options.ts"

/**
 * Resolution of `{env:VAR}` and `${VAR}` in the MCP server configuration, using
 * the variables loaded from `.env` files (with `process.env` as a fallback).
 * Unresolved tokens are left untouched and reported by name.
 */

export interface McpServerLike {
  type?: string
  headers?: Record<string, string>
  environment?: Record<string, string>
}

export interface McpEditorLike {
  list(): readonly (readonly [string, McpServerLike])[]
  update(name: string, update: (config: McpServerLike) => void): void
}

const TOKEN_RE = /\{env:([A-Za-z_][A-Za-z0-9_]*)\}|\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g

export type Lookup = (name: string) => string | undefined

export interface Substitution {
  value: string
  changed: boolean
  missing: string[]
}

/** Substitute the tokens in a single string. */
export function substituteTokens(value: string, lookup: Lookup): Substitution {
  const missing: string[] = []
  let changed = false
  const next = value.replace(
    TOKEN_RE,
    (match: string, braced: string | undefined, curly: string | undefined): string => {
      const name = braced ?? curly ?? ""
      const resolved = lookup(name)
      if (resolved === undefined) {
        missing.push(name)
        return match
      }
      changed = true
      return resolved
    },
  )
  return { value: next, changed, missing }
}

function substituteRecord(
  record: Record<string, string>,
  lookup: Lookup,
): { record: Record<string, string>; changed: boolean; missing: string[] } {
  const out: Record<string, string> = { ...record }
  const missing: string[] = []
  let changed = false
  for (const [key, value] of Object.entries(record)) {
    const result = substituteTokens(value, lookup)
    if (result.changed) {
      out[key] = result.value
      changed = true
    }
    missing.push(...result.missing)
  }
  return { record: out, changed, missing }
}

/** Apply substitution to every server of an MCP editor. */
export function applyMcpEnv(
  editor: McpEditorLike,
  lookup: Lookup,
  options: DotenvOptions,
  log: Logger,
): void {
  const missingByServer = new Map<string, Set<string>>()

  for (const [name, server] of editor.list()) {
    const config = server
    let headers = config.headers
    let environment = config.environment
    let changed = false
    const missing: string[] = []

    if (config.type === "remote" && config.headers) {
      const result = substituteRecord(config.headers, lookup)
      if (result.changed) {
        headers = result.record
        changed = true
      }
      missing.push(...result.missing)
    }

    if (config.type === "local" && config.environment) {
      const result = substituteRecord(config.environment, lookup)
      if (result.changed) {
        environment = result.record
        changed = true
      }
      missing.push(...result.missing)
    }

    if (changed) {
      editor.update(name, (draft) => {
        if (headers) draft.headers = headers
        if (environment) draft.environment = environment
      })
    }

    if (missing.length > 0) {
      const set = missingByServer.get(name) ?? new Set<string>()
      for (const key of missing) set.add(key)
      missingByServer.set(name, set)
    }
  }

  if (!options.quiet) {
    for (const [name, keys] of missingByServer) {
      log.warn(`MCP "${name}": unresolved variables: ${[...keys].join(", ")}`)
    }
  }
}
