// Root entrypoint for local directory plugin loading.
// OpenCode resolves a local plugin directory by its root `index.ts`, while
// published packages resolve through `exports` in package.json. Keeping both
// pointing here makes local development and the published package behave the
// same.
export { default } from "./src/index.ts"
