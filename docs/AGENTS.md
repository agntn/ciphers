# docs/

Cloudflare Workers Builds deploys this site to ciphers.agntn.dev. It installs `docs/` alone, so the root `node_modules` and `dist/` never exist there, and it takes Node.js from the root `.node-version`, never from `engines`.

Resources on the Cloudflare account, bound by id in `wrangler.jsonc`:

- D1 `agntn-ciphers` as `DB` for Nuxt Content
- No KV, R2 or secrets: the library runs from the bundle, in the browser and in the worker

`/mcp` is public, and every tool argument reaches the worker, passphrases included, because an agent sends them there on purpose. Tool arguments stay out of every log line, observability included. `content/1.guide/05.agents.md#remote-mcp` tells users the arguments travel.
