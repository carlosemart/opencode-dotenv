/**
 * Plugin options, as declared in `opencode.json(c)`:
 *
 * ```jsonc
 * {
 *   "plugins": [
 *     {
 *       "package": "@carlosemart/opencode-dotenv",
 *       "options": { "env": "pre", "mcp": true }
 *     }
 *   ]
 * }
 * ```
 */

export interface LayerOptions {
  /** `$OPENCODE_CONFIG_DIR` or `~/.config/opencode`. */
  global: boolean
  /** `dirname($OPENCODE_CONFIG)`. */
  custom: boolean
  /** Ancestors with `opencode.json(c)` plus the location directory. */
  project: boolean
  /** `.opencode` directories. */
  dotenvDir: boolean
}

/** How much of the loaded environment is exported to `process.env`. */
export type ProcessEnvMode = "global" | "all" | "none"

export interface DotenvOptions {
  /** Explicit profile; wins over `OPENCODE_ENV`. */
  env: string | null
  /** Per-profile resolution (`.env.<profile>.local` -> ... -> `.env`). */
  flow: boolean
  /** Explicit file list; when set, `flow` is ignored. */
  files: string[] | null
  /** Base directory for the project layer. Defaults to the location directory. */
  directory: string | null
  /** When `true`, `.env` values override `process.env`. */
  override: boolean
  /** Expand `${VAR}` / `$VAR` inside values. */
  expand: boolean
  /** Optional decryption of `encrypted:` values through dotenvx. */
  dotenvx: boolean
  /** Inject into the shell command environment. */
  shell: boolean
  /** Resolve `{env:VAR}` / `${VAR}` in the MCP configuration. */
  mcp: boolean
  /**
   * Export loaded variables to `process.env` so OpenCode's native `{env:VAR}`
   * expansion resolves them. `"global"` exports only user-level layers,
   * `"all"` exports every layer (project secrets become visible to the shared
   * process), `"none"` exports nothing.
   */
  processEnv: ProcessEnvMode
  /** Enabled layers. */
  layers: LayerOptions
  /** Silence warnings. */
  quiet: boolean
}

export const DEFAULT_OPTIONS: DotenvOptions = {
  env: null,
  flow: true,
  files: null,
  directory: null,
  override: false,
  expand: true,
  dotenvx: false,
  shell: true,
  mcp: true,
  processEnv: "global",
  layers: { global: true, custom: true, project: true, dotenvDir: true },
  quiet: false,
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function asStringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value.filter((item): item is string => typeof item === "string" && item.length > 0)
  return items.length > 0 ? items : null
}

function asProcessEnvMode(value: unknown, fallback: ProcessEnvMode): ProcessEnvMode {
  return value === "global" || value === "all" || value === "none" ? value : fallback
}

/**
 * Normalize raw plugin options. Never throws: invalid values fall back to their
 * default.
 */
export function normalizeOptions(raw: unknown): DotenvOptions {
  const input = asRecord(raw)
  const layers = asRecord(input.layers)
  return {
    env: asStringOrNull(input.env),
    flow: asBoolean(input.flow, DEFAULT_OPTIONS.flow),
    files: asStringArrayOrNull(input.files),
    directory: asStringOrNull(input.directory),
    override: asBoolean(input.override, DEFAULT_OPTIONS.override),
    expand: asBoolean(input.expand, DEFAULT_OPTIONS.expand),
    dotenvx: asBoolean(input.dotenvx, DEFAULT_OPTIONS.dotenvx),
    shell: asBoolean(input.shell, DEFAULT_OPTIONS.shell),
    mcp: asBoolean(input.mcp, DEFAULT_OPTIONS.mcp),
    processEnv: asProcessEnvMode(input.processEnv, DEFAULT_OPTIONS.processEnv),
    layers: {
      global: asBoolean(layers.global, DEFAULT_OPTIONS.layers.global),
      custom: asBoolean(layers.custom, DEFAULT_OPTIONS.layers.custom),
      project: asBoolean(layers.project, DEFAULT_OPTIONS.layers.project),
      dotenvDir: asBoolean(layers.dotenvDir, DEFAULT_OPTIONS.layers.dotenvDir),
    },
    quiet: asBoolean(input.quiet, DEFAULT_OPTIONS.quiet),
  }
}
