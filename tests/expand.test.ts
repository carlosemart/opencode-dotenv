import { describe, expect, it } from "vitest"

import { expandEnv } from "../src/env/expand.ts"

const noFallback = (): undefined => undefined

describe("expandEnv", () => {
  it("expands ${VAR} from already-resolved values", () => {
    expect(expandEnv({ A: "x", B: "${A}y" }, noFallback)).toEqual({ A: "x", B: "xy" })
  })

  it("expands $VAR from the fallback", () => {
    const fallback = (name: string): string | undefined => (name === "HOME" ? "/home/u" : undefined)
    expect(expandEnv({ A: "$HOME/x" }, fallback)).toEqual({ A: "/home/u/x" })
  })

  it("replaces unresolvable references with an empty string", () => {
    expect(expandEnv({ A: "${MISSING}" }, noFallback)).toEqual({ A: "" })
  })

  it("resolves chained references", () => {
    expect(expandEnv({ A: "1", B: "${A}", C: "${B}" }, noFallback)).toEqual({
      A: "1",
      B: "1",
      C: "1",
    })
  })
})
