# opencode-dotenv

> Plugin for OpenCode that loads `.env` files by layer and injects them, scoped
> to the project, into shell commands and MCP servers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Status: work in progress](https://img.shields.io/badge/status-work--in--progress-orange.svg)](#project-status)

## Features

- **Layered `.env` discovery** mirroring OpenCode's configuration hierarchy
  (global, custom, project, `.opencode`).
- **Per-profile files** through `OPENCODE_ENV`:
  `.env.<profile>.local` → `.env.<profile>` → `.env.local` → `.env`.
- **Scoped injection** into two surfaces: the environment of shell commands and
  the configuration of MCP servers.
- **`{env:VAR}` and `${VAR}` resolution** in MCP headers/environment from the
  loaded `.env`, with a configurable export to `process.env` for native
  `{env:VAR}` expansion.
- **Variable expansion** of `${VAR}` / `$VAR` inside values.
- **Optional dotenvx decryption** of `encrypted:` values.
- **Safe merging**: existing environment variables win unless `override` is set.
- **Never logs values**: only names and counts.

## Installation

Add the plugin to your OpenCode configuration:

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@carlosemart/opencode-dotenv"]
}
```

With options:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@carlosemart/opencode-dotenv",
      "options": {
        "env": "pre",
        "mcp": true
      }
    }
  ]
}
```

## Usage

Create a `.env` file in your project root:

```dotenv
EXAMPLE_API_KEY=supersecret
EXAMPLE_BASE_URL=http://localhost:8080
```

OpenCode loads those variables and makes them available to the shell commands
run in that project. For MCP servers, use the standard `{env:VAR}` syntax in the
configuration:

```jsonc
"headers": {
  "Authorization": "Bearer {env:EXAMPLE_API_KEY}"
}
```

The plugin resolves the token from the loaded `.env` (or from `process.env`),
without leaking values into other projects.

## How it works

### Layers

`.env` files are discovered in the same places as OpenCode's configuration,
from highest to lowest precedence:

| # | Layer | Directory |
| - | ----- | --------- |
| 1 | `.opencode` | every `<dir>/.opencode/` (closest → farthest) |
| 2 | Project | ancestors with `opencode.json(c)` plus the location directory |
| 3 | Custom | `dirname($OPENCODE_CONFIG)` |
| 4 | Global | `$OPENCODE_CONFIG_DIR` or `~/.config/opencode/` |

The remote configuration layer (`.well-known/opencode`) is ignored. The global
and custom layers are user-level and apply to every project; the project and
`.opencode` layers are local to the current project.

### Profile

`OPENCODE_ENV` (or the `env` option) selects a profile. Within each directory,
the first existing file wins:

```
.env.<profile>.local  →  .env.<profile>  →  .env.local  →  .env
```

Without a profile, only `.env.local` and `.env` are considered.

### Precedence

The effective map for a location is resolved as:

1. real `process.env` (highest, unless `override` is set);
2. project `.env` files (closest wins);
3. global/custom `.env` files (lowest).

The result is applied **only** to that location: shell commands and MCP servers.
A project `.env` never leaks into another project.

## Options

| Option      | Type       | Default          | Description                                              |
| ----------- | ---------- | ---------------- | -------------------------------------------------------- |
| `env`       | `string`   | `OPENCODE_ENV`   | Profile name.                                            |
| `flow`      | `boolean`  | `true`           | Per-profile file resolution.                             |
| `files`     | `string[]` | `null`           | Explicit file list; when set, `flow` is ignored.         |
| `directory` | `string`   | location dir     | Base directory for the project layer.                    |
| `override`  | `boolean`  | `false`          | If `true`, `.env` values override `process.env`.         |
| `expand`    | `boolean`  | `true`           | Expand `${VAR}` / `$VAR` inside values.                  |
| `dotenvx`   | `boolean`  | `false`          | Decrypt `encrypted:` values through dotenvx.             |
| `shell`     | `boolean`  | `true`           | Inject into the shell command environment.               |
| `mcp`       | `boolean`  | `true`           | Resolve `{env:VAR}` / `${VAR}` in the MCP configuration. |
| `processEnv`| `string`   | `"global"`       | Export loaded variables to `process.env` so native `{env:VAR}` resolves: `"global"`, `"all"` or `"none"`. |
| `layers`    | `object`   | all `true`       | Enable/disable each layer (`global`, `custom`, `project`, `dotenvDir`). |
| `quiet`     | `boolean`  | `false`          | Silence warnings.                                        |

## Environment variables

Besides the options above, the plugin reads a few variables from the
environment. Only `OPENCODE_ENV` is plugin-specific; the rest are OpenCode or
system variables.

### Read by the plugin

| Variable | Used for |
| -------- | -------- |
| `OPENCODE_ENV` | Profile name, used when the `env` option is not set. |
| `OPENCODE_CONFIG_DIR` | Directory of the global layer. Defaults to `~/.config/opencode`. |
| `OPENCODE_CONFIG` | Custom config file; the plugin uses its `dirname` as the custom layer. |
| `HOME` | Expanding `~` and resolving the default global directory. |
| `DOTENV_PRIVATE_KEY` | Generic dotenvx private key, when `dotenvx` is enabled. |
| `DOTENV_PRIVATE_KEY_<PROFILE>` | dotenvx private key for a specific profile. |
| any `process.env` entry | Fallback for `${VAR}` expansion and, unless `override`, wins over `.env` values. |

When `dotenvx` is enabled, a `.env.keys` file next to a `.env` is also read for
private keys (it is a file, not an environment variable).

### Written by the plugin

The plugin writes to `process.env` according to the `processEnv` option, so
OpenCode's native `{env:VAR}` expansion can resolve the values. See
[MCP resolution](#mcp-resolution).

### Overlaps

- `env` (option) and `OPENCODE_ENV` (variable) hold the same value: the option
  wins and the variable is the fallback.
- `layers.global` / `layers.custom` (options) enable or disable the layers whose
  locations are chosen by `OPENCODE_CONFIG_DIR` / `OPENCODE_CONFIG` (variables).
  They are complementary, not conflicting.
- `override` (option) interacts with the real `process.env`: by default the
  environment wins; with `override: true` the `.env` wins.

## MCP resolution

There are two ways a token in the MCP configuration gets a value:

- **`${VAR}`** is resolved by the plugin from the loaded `.env` files (any
  layer), scoped to the location. This always works.
- **`{env:VAR}`** is expanded **natively by OpenCode from `process.env`**, before
  the plugin sees the configuration. If `VAR` is not in `process.env`, it becomes
  empty. The plugin therefore exports selected variables to `process.env`
  according to the `processEnv` option:

| `processEnv` | Exported to `process.env`                     | `{env:VAR}` works for |
| ------------ | --------------------------------------------- | --------------------- |
| `"global"`   | global + custom layers (user-level)           | user-level secrets    |
| `"all"`      | every layer, including project                | everything (project secrets become visible to the shared process) |
| `"none"`     | nothing                                       | only variables already in the environment |

Project-layer values are intentionally **not** exported in `"global"` mode, so a
project secret never leaks into the shared process.

> [!NOTE]
> On the first startup after installing the plugin, a `{env:VAR}` token whose
> value comes only from a `.env` file can briefly resolve to an empty string.
> OpenCode expands `{env:VAR}` natively from `process.env`, and the plugin
> populates `process.env` during its own setup. If an MCP server connects before
> that export happens, the first attempt may carry an empty value; it resolves
> once the plugin has loaded and the configuration is re-evaluated.

The plugin also substitutes `${VAR}` and `{env:VAR}` in:

- `headers` of `remote` servers;
- `environment` of `local` servers.

Lookup order is the loaded `.env` first, then `process.env`. Tokens that cannot
be resolved are left untouched and reported by name (unless `quiet`).

## Encrypted values (dotenvx)

Set `dotenvx: true` to decrypt values written as `encrypted:` by
[dotenvx](https://dotenvx.com/). The private key is read from
`DOTENV_PRIVATE_KEY_<PROFILE>` / `DOTENV_PRIVATE_KEY` in the environment, or from
a `.env.keys` file next to the `.env`. dotenvx is optional: if it is not
installed, encrypted values are kept as-is and a warning is logged.

## Security

- **Never** commit a real `.env`: it is already in `.gitignore`.
- The plugin never prints variable values; diagnostics use names and counts.
- Shell injection and `${VAR}` resolution are scoped to the location.
- Variables are exported to the shared `process.env` only as configured by
  `processEnv`. The default `"global"` exports user-level values and never a
  value overridden by the project layer, so project secrets do not leak between
  projects. Use `"none"` for the strictest scoping.
- Unresolved MCP tokens are reported by name only.

## Development

This repository pins its Node toolchain with [mise](https://mise.jdx.dev/)
(`.mise.toml`), which also provides `npm`. The pinned major version matches
`.nvmrc`.

```bash
git clone https://github.com/carlosemart/opencode-dotenv.git
cd opencode-dotenv
mise install
npm install
npm run typecheck
npm test
```

To try it locally, point OpenCode at the repository directory:

```jsonc
{
  "plugins": ["./path/to/opencode-dotenv"]
}
```

## Project status

| Area                 | Status      |
| -------------------- | ----------- |
| Repository scaffold  | ✅ Ready    |
| Package configuration| ✅ Ready    |
| Continuous integration| ✅ Ready   |
| Documentation        | ✅ Ready    |
| Plugin logic         | ✅ Ready    |

## License

[MIT](./LICENSE) © Carlos Espinaco Martínez
