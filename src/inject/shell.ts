import type { EnvMap } from "../env/parse.ts"
import type { DotenvOptions } from "../options.ts"

/** Subset of the `shell.hook("create.before")` event that we use. */
export interface ShellEvent {
  env: Record<string, string | undefined>
}

/**
 * Inject the loaded variables into the environment of a shell command.
 *
 * Without `override`, only fills what is not set yet (the inherited process
 * environment wins). Never writes to `process.env`.
 */
export function applyShellEnv(event: ShellEvent, env: EnvMap, options: DotenvOptions): void {
  for (const [key, value] of Object.entries(env)) {
    if (options.override || event.env[key] === undefined) {
      event.env[key] = value
    }
  }
}
