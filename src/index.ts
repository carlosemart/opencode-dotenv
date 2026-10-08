import { Plugin } from "@opencode/plugin"

import { loadEnv } from "./env/load.ts"
import { applyMcpEnv, type Lookup, type McpEditorLike } from "./inject/mcp.ts"
import { applyShellEnv, type ShellEvent } from "./inject/shell.ts"
import { createLogger } from "./log.ts"
import { normalizeOptions } from "./options.ts"

/**
 * opencode-dotenv
 *
 * Loads `.env` files by layer (global and project) and injects them, scoped to
 * the location, through two surfaces:
 *
 *   - the environment of shell commands (`shell.hook("create.before")`);
 *   - the MCP server configuration, resolving `{env:VAR}` and `${VAR}`.
 *
 * It never writes to `process.env` and never logs variable values.
 */

interface Disposable {
  dispose(): Promise<void> | void
}

export default Plugin.define({
  id: "carlosemart.dotenv",
  async setup(ctx) {
    const options = normalizeOptions(ctx.options)
    const log = createLogger(options.quiet)

    let loaded
    try {
      loaded = await loadEnv({
        options,
        directory: ctx.location.directory,
        processEnv: process.env,
        log,
      })
    } catch (error) {
      log.warn(`could not load .env files: ${error instanceof Error ? error.message : "error"}`)
      return
    }

    const lookup: Lookup = (name) => loaded.env[name] ?? process.env[name]
    const disposables: Disposable[] = []

    if (options.shell && ctx.shell?.hook) {
      const registration = await ctx.shell.hook("create.before", (event) => {
        applyShellEnv(event as unknown as ShellEvent, loaded.env, options)
      })
      disposables.push(registration)
    }

    if (options.mcp && ctx.mcp?.transform) {
      const registration = await ctx.mcp.transform((editor) => {
        applyMcpEnv(editor as unknown as McpEditorLike, lookup, options, log)
      })
      disposables.push(registration)
    }

    return async () => {
      for (const registration of disposables) {
        await registration.dispose()
      }
    }
  },
})
