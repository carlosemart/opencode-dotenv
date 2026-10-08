import { describe, expect, it } from "vitest"

import { DEFAULT_OPTIONS, normalizeOptions } from "../src/options.ts"

describe("normalizeOptions", () => {
  it("returns defaults for empty input", () => {
    expect(normalizeOptions(undefined)).toEqual(DEFAULT_OPTIONS)
    expect(normalizeOptions({})).toEqual(DEFAULT_OPTIONS)
  })

  it("applies provided values", () => {
    const options = normalizeOptions({ env: "pre", override: true, files: [".env.pre"] })
    expect(options.env).toBe("pre")
    expect(options.override).toBe(true)
    expect(options.files).toEqual([".env.pre"])
  })

  it("defaults processEnv to global and validates it", () => {
    expect(normalizeOptions({}).processEnv).toBe("global")
    expect(normalizeOptions({ processEnv: "all" }).processEnv).toBe("all")
    expect(normalizeOptions({ processEnv: "nonsense" }).processEnv).toBe("global")
  })

  it("ignores invalid values and falls back to defaults", () => {
    const options = normalizeOptions({ flow: "yes", files: [], env: 42, layers: { global: false } })
    expect(options.flow).toBe(true)
    expect(options.files).toBeNull()
    expect(options.env).toBeNull()
    expect(options.layers.global).toBe(false)
    expect(options.layers.project).toBe(true)
  })
})
