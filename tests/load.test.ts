import { mkdirSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { loadEnv } from "../src/env/load.ts"
import { createLogger } from "../src/log.ts"
import { normalizeOptions } from "../src/options.ts"
import { makeTempDir, removeDir, writeFile } from "./helpers.ts"

const quiet = createLogger(true)

describe("loadEnv", () => {
  let root: string
  let project: string
  let globalDir: string
  let customDir: string
  let home: string

  beforeEach(() => {
    root = makeTempDir()
    project = join(root, "project")
    globalDir = join(root, "global")
    customDir = join(root, "custom")
    home = join(root, "home")
    for (const dir of [project, globalDir, customDir, home]) mkdirSync(dir, { recursive: true })
  })

  afterEach(() => removeDir(root))

  function processEnv(extra: Record<string, string> = {}): Record<string, string> {
    return { HOME: home, OPENCODE_CONFIG_DIR: globalDir, ...extra }
  }

  async function load(options: Record<string, unknown> = {}, env: Record<string, string> = {}) {
    return loadEnv({
      options: normalizeOptions(options),
      directory: project,
      processEnv: processEnv(env),
      log: quiet,
    })
  }

  it("lets the project .env win over the global .env", async () => {
    writeFile(globalDir, ".env", "SHARED=global\nONLY_GLOBAL=g\n")
    writeFile(project, ".env", "SHARED=project\nONLY_PROJECT=p\n")

    const result = await load()
    expect(result.env.SHARED).toBe("project")
    expect(result.env.ONLY_GLOBAL).toBe("g")
    expect(result.env.ONLY_PROJECT).toBe("p")
  })

  it("lets .env.local win over .env in the same directory", async () => {
    writeFile(project, ".env", "A=base\n")
    writeFile(project, ".env.local", "A=local\n")

    expect((await load()).env.A).toBe("local")
  })

  it("loads the OPENCODE_ENV profile with the highest priority", async () => {
    writeFile(project, ".env", "A=base\n")
    writeFile(project, ".env.pre", "A=pre\n")
    writeFile(project, ".env.pre.local", "A=pre-local\n")

    expect((await load({}, { OPENCODE_ENV: "pre" })).env.A).toBe("pre-local")
  })

  it("lets .opencode/.env win over the direct .env in the same directory", async () => {
    writeFile(project, ".env", "A=direct\n")
    writeFile(project, ".opencode/.env", "A=opencode\n")

    expect((await load()).env.A).toBe("opencode")
  })

  it("lets the project layer win over the custom layer", async () => {
    const customConfig = writeFile(customDir, "opencode.json", "{}\n")
    writeFile(customDir, ".env", "A=custom\n")
    writeFile(project, ".env", "A=project\n")

    expect((await load({}, { OPENCODE_CONFIG: customConfig })).env.A).toBe("project")
  })

  it("lets the custom layer win over the global layer", async () => {
    const customConfig = writeFile(customDir, "opencode.json", "{}\n")
    writeFile(customDir, ".env", "A=custom\n")
    writeFile(globalDir, ".env", "A=global\n")

    expect((await load({}, { OPENCODE_CONFIG: customConfig })).env.A).toBe("custom")
  })

  it("lets the real process environment win unless override is set", async () => {
    writeFile(project, ".env", "A=file\n")

    expect((await load({}, { A: "real" })).env.A).toBe("real")
    expect((await load({ override: true }, { A: "real" })).env.A).toBe("file")
  })

  it("expands references to other variables", async () => {
    writeFile(project, ".env", "BASE=/x\nURL=${BASE}/y\n")

    expect((await load()).env.URL).toBe("/x/y")
  })

  it("honours an explicit files list", async () => {
    writeFile(project, ".env", "A=base\n")
    writeFile(project, ".env.custom", "A=custom\n")

    expect((await load({ files: [".env.custom"] })).env.A).toBe("custom")
  })

  it("exports only global variables to process.env by default", async () => {
    writeFile(globalDir, ".env", "GLOBAL_KEY=g\nSHARED=global\n")
    writeFile(project, ".env", "PROJECT_KEY=p\nSHARED=project\n")

    const result = await load()
    expect(result.processEnv.GLOBAL_KEY).toBe("g")
    expect(result.processEnv.PROJECT_KEY).toBeUndefined()
    // Overridden by the project layer, so it is not exported globally.
    expect(result.processEnv.SHARED).toBeUndefined()
  })

  it("exports every layer with processEnv: all", async () => {
    writeFile(globalDir, ".env", "GLOBAL_KEY=g\n")
    writeFile(project, ".env", "PROJECT_KEY=p\n")

    const result = await load({ processEnv: "all" })
    expect(result.processEnv.GLOBAL_KEY).toBe("g")
    expect(result.processEnv.PROJECT_KEY).toBe("p")
  })

  it("exports nothing with processEnv: none", async () => {
    writeFile(globalDir, ".env", "GLOBAL_KEY=g\n")

    expect((await load({ processEnv: "none" })).processEnv).toEqual({})
  })
})
