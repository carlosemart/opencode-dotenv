import { describe, expect, it } from "vitest"

import { applyMcpEnv, substituteTokens, type McpEditorLike, type McpServerLike } from "../src/inject/mcp.ts"
import { createLogger } from "../src/log.ts"
import { normalizeOptions } from "../src/options.ts"

const quiet = createLogger(true)

describe("substituteTokens", () => {
  const lookup = (name: string): string | undefined =>
    ({ TOKEN: "secret", NAME: "world" })[name as "TOKEN" | "NAME"]

  it("resolves the {env:VAR} form", () => {
    expect(substituteTokens("Bearer {env:TOKEN}", lookup).value).toBe("Bearer secret")
  })

  it("resolves the ${VAR} form", () => {
    expect(substituteTokens("Hello ${NAME}", lookup).value).toBe("Hello world")
  })

  it("leaves unresolved tokens untouched and reports them", () => {
    const result = substituteTokens("{env:MISSING}", lookup)
    expect(result.value).toBe("{env:MISSING}")
    expect(result.changed).toBe(false)
    expect(result.missing).toEqual(["MISSING"])
  })
})

interface FakeEditor extends McpEditorLike {
  current: Record<string, McpServerLike>
}

function fakeEditor(servers: Record<string, McpServerLike>): FakeEditor {
  const current: Record<string, McpServerLike> = structuredClone(servers)
  return {
    current,
    list: () => Object.entries(current).map(([name, config]) => [name, config] as const),
    update: (name, update) => {
      update(current[name])
    },
  }
}

describe("applyMcpEnv", () => {
  const lookup = (name: string): string | undefined => ({ TOKEN: "secret" })[name as "TOKEN"]
  const options = normalizeOptions({ quiet: true })

  it("substitutes headers of remote servers", () => {
    const editor = fakeEditor({
      portainer: {
        type: "remote",
        headers: { Authorization: "Bearer {env:TOKEN}", "X-Key": "${TOKEN}" },
      },
    })
    applyMcpEnv(editor, lookup, options, quiet)
    expect(editor.current.portainer.headers).toEqual({
      Authorization: "Bearer secret",
      "X-Key": "secret",
    })
  })

  it("substitutes environment of local servers", () => {
    const editor = fakeEditor({
      local: { type: "local", environment: { API_KEY: "{env:TOKEN}" } },
    })
    applyMcpEnv(editor, lookup, options, quiet)
    expect(editor.current.local.environment).toEqual({ API_KEY: "secret" })
  })

  it("does not touch servers without tokens", () => {
    const editor = fakeEditor({
      plain: { type: "remote", headers: { Authorization: "Bearer static" } },
    })
    applyMcpEnv(editor, lookup, options, quiet)
    expect(editor.current.plain.headers).toEqual({ Authorization: "Bearer static" })
  })
})
