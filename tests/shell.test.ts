import { describe, expect, it } from "vitest"

import { applyShellEnv, type ShellEvent } from "../src/inject/shell.ts"
import { normalizeOptions } from "../src/options.ts"

describe("applyShellEnv", () => {
  it("fills variables that are not set yet", () => {
    const event: ShellEvent = { env: {} }
    applyShellEnv(event, { A: "1", B: "2" }, normalizeOptions({}))
    expect(event.env).toEqual({ A: "1", B: "2" })
  })

  it("does not override inherited variables by default", () => {
    const event: ShellEvent = { env: { A: "real" } }
    applyShellEnv(event, { A: "from-file" }, normalizeOptions({}))
    expect(event.env.A).toBe("real")
  })

  it("overrides inherited variables when override is set", () => {
    const event: ShellEvent = { env: { A: "real" } }
    applyShellEnv(event, { A: "from-file" }, normalizeOptions({ override: true }))
    expect(event.env.A).toBe("from-file")
  })
})
