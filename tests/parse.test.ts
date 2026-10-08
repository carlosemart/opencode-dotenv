import { describe, expect, it } from "vitest"

import { parseEnv } from "../src/env/parse.ts"

describe("parseEnv", () => {
  it("parses simple assignments and trims whitespace", () => {
    expect(parseEnv("A=1\nB = 2\n")).toEqual({ A: "1", B: "2" })
  })

  it("ignores comments and blank lines", () => {
    expect(parseEnv("# a comment\n\nA=1\n")).toEqual({ A: "1" })
  })

  it("strips end-of-line comments on unquoted values", () => {
    expect(parseEnv("A=1 # note\n")).toEqual({ A: "1" })
  })

  it("keeps '#' inside quoted values", () => {
    expect(parseEnv("A='a # b'\n")).toEqual({ A: "a # b" })
    expect(parseEnv('A="a # b"\n')).toEqual({ A: "a # b" })
  })

  it("supports the export prefix", () => {
    expect(parseEnv("export A=1\n")).toEqual({ A: "1" })
  })

  it("interprets escapes inside double quotes", () => {
    expect(parseEnv('A="line1\\nline2"\n')).toEqual({ A: "line1\nline2" })
  })

  it("supports multi-line quoted values", () => {
    expect(parseEnv('A="multi\nline"\n')).toEqual({ A: "multi\nline" })
  })

  it("accepts empty values", () => {
    expect(parseEnv("A=\n")).toEqual({ A: "" })
  })

  it("skips invalid keys", () => {
    expect(parseEnv("BAD KEY=1\n")).toEqual({})
  })
})
