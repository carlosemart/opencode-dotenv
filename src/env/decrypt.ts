import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { parseEnv, type EnvMap, type ProcessEnv } from "./parse.ts"

/**
 * Optional decryption of `encrypted:` values (dotenvx format).
 *
 * The plugin does not depend on dotenvx: when the `dotenvx` option is enabled
 * and a private key is available, `@dotenvx/dotenvx` is imported dynamically. If
 * the package is not installed, a warning is logged (unless `quiet`) and the
 * encrypted value is kept as-is.
 */

export const ENCRYPTED_PREFIX = "encrypted:"

export function hasEncryptedValues(content: string): boolean {
  return content.includes(ENCRYPTED_PREFIX)
}

export function privateKeyName(profile: string | null): string {
  if (!profile) return "DOTENV_PRIVATE_KEY"
  const suffix = profile.toUpperCase().replace(/[^A-Z0-9]/g, "_")
  return `DOTENV_PRIVATE_KEY_${suffix}`
}

export interface PrivateKeyLookup {
  /** Directory where a `.env.keys` may live. */
  directory: string
  profile: string | null
  processEnv: ProcessEnv
}

/**
 * Find the private key used for decryption: first `process.env` (the
 * profile-specific name, then the generic one), then a `.env.keys` file next to
 * the `.env`.
 */
export function resolvePrivateKey(lookup: PrivateKeyLookup): string | undefined {
  const specific = lookup.processEnv[privateKeyName(lookup.profile)]
  if (specific) return specific
  const generic = lookup.processEnv.DOTENV_PRIVATE_KEY
  if (generic) return generic

  const keysFile = join(lookup.directory, ".env.keys")
  if (existsSync(keysFile)) {
    const keys = parseEnv(readFileSync(keysFile, "utf8"))
    return keys[privateKeyName(lookup.profile)] ?? keys.DOTENV_PRIVATE_KEY
  }
  return undefined
}

interface DotenvxModule {
  parse?: (src: string, options?: { privateKey?: string }) => EnvMap
  default?: { parse?: (src: string, options?: { privateKey?: string }) => EnvMap }
}

/**
 * Decrypt the full contents of a `.env` file using dotenvx. Returns `null` when
 * dotenvx is unavailable or fails, so the caller can keep the encrypted value.
 */
export async function decryptContent(content: string, privateKey: string): Promise<EnvMap | null> {
  try {
    const specifier = "@dotenvx/dotenvx"
    const mod = (await import(specifier)) as DotenvxModule
    const parse = mod.parse ?? mod.default?.parse
    if (!parse) return null
    return parse(content, { privateKey })
  } catch {
    return null
  }
}
