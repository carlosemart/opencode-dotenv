# Security Policy

## Supported versions

The latest published version of `@carlosemart/opencode-dotenv` is supported.

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Report them
privately through GitHub's private vulnerability reporting:

https://github.com/carlosemart/opencode-dotenv/security/advisories/new

Include a description, the affected version, and reproduction steps when
possible. We aim to acknowledge reports within a few days.

## Scope

This plugin reads `.env` files and injects their values into the shell
environment and the MCP configuration. Relevant issues include, but are not
limited to:

- leaking variable values into logs or errors;
- leaking a project's secrets into another location or the shared process;
- executing untrusted input from a `.env` file.
