# docs/

Cloudflare Workers Builds deploys this site to ciphers.agntn.dev. Its install runs in `docs/` and pnpm installs the whole workspace from the root lockfile, so the root `node_modules` exists there and `dist/` never does. It takes Node.js from the root `.node-version`, never from `engines`. Its trigger watches `docs/*`, `src/*`, `package.json` and `.node-version`, so a bump that only touches the root `pnpm-lock.yaml` or `pnpm-workspace.yaml` doesn't redeploy. `package.json` is on that list for the version in the header: a release PR changes nothing else.

Resources on the Cloudflare account, bound by id in `wrangler.jsonc`:

- D1 `agntn-ciphers` as `DB` for Nuxt Content
- No KV, R2 or secrets: the library runs from the bundle, in the browser and in the worker

`/mcp` is public, and every tool argument reaches the worker, passphrases included, because an agent sends them there on purpose. Tool arguments stay out of every log line, observability included. `content/1.guide/05.agents.md#remote-mcp` tells users the arguments travel.
