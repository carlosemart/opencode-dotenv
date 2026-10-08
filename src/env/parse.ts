/**
 * `.env` file parser compatible with the usual dotenv syntax:
 *
 * - `KEY=value`, `export KEY=value`
 * - `#` comments and blank lines
 * - single-quoted (literal) and double-quoted (with escapes) values
 * - multi-line quoted values
 * - end-of-line comments on unquoted values (`KEY=value # note`)
 */

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export type EnvMap = Record<string, string>

/** Process environment, whose values may be absent. */
export type ProcessEnv = Record<string, string | undefined>

function unescapeDouble(next: string | undefined): string {
  switch (next) {
    case "n":
      return "\n"
    case "r":
      return "\r"
    case "t":
      return "\t"
    case undefined:
      return ""
    default:
      return next
  }
}

/** Index of the `#` that starts a comment in an unquoted value, or -1. */
function inlineCommentIndex(value: string): number {
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "#" && (i === 0 || value[i - 1] === " " || value[i - 1] === "\t")) {
      return i
    }
  }
  return -1
}

interface ValueResult {
  value: string
  /** Last line consumed (for multi-line values). */
  consumed: number
}

function readValue(rest: string, lines: string[], index: number): ValueResult {
  let s = rest
  let start = 0
  while (start < s.length && (s[start] === " " || s[start] === "\t")) start++
  s = s.slice(start)

  const quote = s[0]
  if (quote === '"' || quote === "'") {
    let cursor = 1
    let value = ""
    let lineIndex = index
    while (true) {
      if (cursor >= s.length) {
        lineIndex++
        if (lineIndex >= lines.length) break // no closing quote: keep what was read
        value += "\n"
        s = lines[lineIndex]
        cursor = 0
        continue
      }
      const ch = s[cursor]
      if (quote === '"' && ch === "\\") {
        value += unescapeDouble(s[cursor + 1])
        cursor += 2
        continue
      }
      if (ch === quote) {
        cursor++
        break
      }
      value += ch
      cursor++
    }
    return { value, consumed: lineIndex }
  }

  const hash = inlineCommentIndex(s)
  const value = (hash === -1 ? s : s.slice(0, hash)).trim()
  return { value, consumed: index }
}

/** Parse the full contents of a `.env` file. */
export function parseEnv(content: string): EnvMap {
  const out: EnvMap = {}
  const lines = content.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    if (line.trimStart().startsWith("export ")) {
      line = line.trimStart().slice("export ".length)
    }

    const eq = line.indexOf("=")
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    if (!KEY_RE.test(key)) continue

    const { value, consumed } = readValue(line.slice(eq + 1), lines, i)
    out[key] = value
    i = consumed
  }

  return out
}
