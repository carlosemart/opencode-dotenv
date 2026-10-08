import type { EnvMap } from "./parse.ts"

/**
 * Expansion of references to other variables inside values.
 *
 * Supports `${VAR}` and `$VAR`. Lookup checks already-resolved variables first,
 * then the `fallback` (normally `process.env`). Unresolvable references are
 * replaced with an empty string, like `dotenv-expand`.
 */

const REFERENCE_RE = /(?<!\\)\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g

export type Lookup = (name: string) => string | undefined

function expandValue(value: string, lookup: Lookup): string {
  return value
    .replace(REFERENCE_RE, (_match, braced: string | undefined, bare: string | undefined) => {
      const name = braced ?? bare ?? ""
      return lookup(name) ?? ""
    })
    .replace(/\\\$/g, "$")
}

/**
 * Expand every variable in a map. Keys are processed in insertion order, so a
 * variable may reference already-resolved ones or the `fallback`. A second pass
 * resolves chained references (A -> B -> C).
 */
export function expandEnv(env: EnvMap, fallback: Lookup): EnvMap {
  const resolved: EnvMap = {}
  const lookup: Lookup = (name) => resolved[name] ?? fallback(name)

  for (const [key, value] of Object.entries(env)) {
    resolved[key] = expandValue(value, lookup)
  }

  for (const [key, value] of Object.entries(resolved)) {
    resolved[key] = expandValue(value, lookup)
  }

  return resolved
}
