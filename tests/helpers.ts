import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

/** Create a unique temporary directory for a test. */
export function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "opencode-dotenv-"))
}

/** Write a file inside `root`, creating parent directories. Returns its path. */
export function writeFile(root: string, relative: string, content: string): string {
  const path = join(root, relative)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, "utf8")
  return path
}

/** Recursively remove a temporary directory. */
export function removeDir(path: string): void {
  rmSync(path, { recursive: true, force: true })
}
