/**
 * Minimal, safe logger.
 *
 * Golden rule: NEVER print variable values. Only names, presence and lengths.
 * Every message built here must respect that.
 */

const PREFIX = "[opencode-dotenv]"

export interface Logger {
  info(message: string): void
  warn(message: string): void
}

const noop = (): void => {}

export function createLogger(quiet: boolean): Logger {
  if (quiet) {
    return { info: noop, warn: noop }
  }
  return {
    info(message: string): void {
      console.info(`${PREFIX} ${message}`)
    },
    warn(message: string): void {
      console.warn(`${PREFIX} ${message}`)
    },
  }
}
