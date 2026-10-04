# docs/

Docus site for `@agntn/ciphers`. Markdown lives in `content/`. The playground is a Vue page that imports the library into the browser. The one route that answers at request time is `/mcp`, the Docus MCP server with every tool of `ciphers mcp` beside its own `list-pages` and `get-page`. Nothing else on the server, the library needs nothing else.

## Layout

```
docs/
├── DESIGN.md                      # the instruments this site owns and where it departs from the agntn design system
├── nuxt.config.ts                 # extends: ['docus'], cloudflare_module preset (Workers), @agntn/ciphers, #tool-operations and #mcp aliased to ../src, @agntn/hashes, @agntn/tools and the @agntn/encodings subpaths to docs/node_modules
├── shiki-theme.ts                 # code block theme, every colour a --shiki-token-* variable from app.css
├── app/app.config.ts              # title, github, theme, the Nuxt UI variants in the instrument grammar
├── app/app.css                    # theme tokens, the shared `console-*` and `hero-*` grammar, `ciphers-*` classes
├── app/components/                # Docus overrides: header, tabs, sidebar, table of contents, page links, surround, callout; icons are Lucide, brands simple-icons
├── app/components/content/        # MDC components (`::landing-home`, `::cipher-facts`, `::cipher-roster`), the landing instruments, Prose* overrides, CiphersPlayground
├── app/components/OgImage/        # Docs.takumi and Landing.takumi override the Docus OG templates
├── app/assets/fonts.css           # @font-face for the TTFs served from public/fonts (site and OG images)
├── app/composables/               # useLandingCipher (one clock for every live panel), useSubNavigation (the Classical, Block and Stream tabs), useCopied, useRosterFlip
├── app/utils/                     # ciphers table (icons, blurbs, samples over the library's info()), tools (the agent tools' text), tokens, roster, formatting
├── app/pages/playground.vue       # playground, own route outside the docs layout, its own useSeo and OG image
├── server/routes/sitemap.xml.ts   # Docus sitemap plus the Vue pages it cannot see
├── server/mcp/index.ts            # the Docus MCP handler at /mcp, named and versioned like `ciphers mcp`
├── server/mcp/tools/              # one file per cipher tool, each `ciphersMcpTool("<name>")`
├── server/utils/ciphers-mcp.ts    # a tool from `#mcp`: its entry in `toolListings` and `callTool` behind a Zod schema that lets any object through
├── public/                        # fonts, favicon.svg and the icons and manifest cut from it
├── content/index.md               # landing
├── content/1.guide/               # getting started, transform, analysis, cli, agents, custom, playground
└── content/2.ciphers/             # overview, the classical, block and stream overviews, one page per cipher
```

## Commands

```bash
pnpm install          # from docs/, the repo root needs no install or build first
pnpm dev              # http://localhost:3000
pnpm build            # Cloudflare Workers output in .output/, content routes prerendered
pnpm deploy           # build, then wrangler deploy to ciphers.agntn.dev
pnpm generate         # static output without /mcp, the one route that needs the worker
```

Deployment: Workers Builds with root directory `docs`. It installs `docs/` and nothing else, and that's enough, because the library comes from `../src` (next paragraph). The build image takes Node.js from `.node-version` at the repo root and never reads `engines`, so without that file the site builds on the image's default Node.js instead of 26. Nitro preset `cloudflare_module`. Nuxt Content wants a D1 binding named `DB`. `wrangler.jsonc` carries it plus the `NUXT_SITE_URL` var, and Nitro merges that into the generated `.output/server/wrangler.json`. Create the database once with `wrangler d1 create agntn-ciphers` and put the id in `wrangler.jsonc`. Until then the id is all zeros on purpose - `pnpm deploy` with zeros binds nothing, so don't run it before the id is real. No KV binding. Nothing is fetched, so nothing is cached.

`@agntn/ciphers` is an alias in `nuxt.config.ts` for `../src/index.ts`. Vite bundles the checkout's sources for the browser and Nitro gets the same alias for the prerender, so `dist/` and the root `node_modules` are never touched. That works because the subgraph under `src/index.ts` imports nothing from `node:` and, besides `package.json` for the version, two packages from npm. `@agntn/hashes` gives MARS its SHA-1, `aes-passphrase` its `EVP_BytesToKey` over MD5, SHA-1 or SHA-256 and `openpgp` its S2K hashes and the SHA-1 of the MDC, and `@agntn/encodings` gives the block modes `hex` and `aes-passphrase` and `openpgp` `base64`. Workers Builds never installs the root, so `docs/package.json` lists both at the root's versions and `nuxt.config.ts` aliases them to `docs/node_modules`, `@agntn/encodings` once per subpath, since an alias to the package directory skips its `exports`. Any other npm import under `src/core` or `src/ciphers` breaks the deploy until it gets the same two lines. Workers Builds installs with pnpm 11, whose `minimumReleaseAge` refuses a version younger than a day, so `pnpm-workspace.yaml` here and at the root lists `@agntn/*` under `minimumReleaseAgeExclude`; without it the deploy fails for a day after each `@agntn` release. The CLI entry is where the rest belong, and it stays out of the alias. `src/mcp.ts` has its own, see [MCP](#mcp).

Two resolution traps, both because the repo root is its own pnpm workspace:

- `pnpm-workspace.yaml` sets `shamefullyHoist: true`. Without it `docs/node_modules` holds only direct dependencies, Node walks up to the root `node_modules`, and the server bundle can end up with a second copy of Vue.
- `nuxt.config.ts` pins `workspaceDir` to `docs/` and disables devtools and telemetry, which would otherwise resolve from the root.
- `vite.server.fs.allow` in `nuxt.config.ts` adds `../src`. Vite serves only directories on that list, and with `workspaceDir` pinned to `docs/` the library sits outside it, so `pnpm dev` couldn't load it otherwise.

## MCP

`#mcp` is an alias for `../src/mcp.ts`. A file in `server/mcp/tools/` names one tool and nothing else: `ciphersMcpTool()` takes the name, prose and annotations from `toolListings` and runs `callTool()` from there, so a tool changed in `src/tools.ts` changes here without an edit. A new tool needs one more file here, and `test/unit/docs-mcp.test.ts` fails until it has one. The same test holds `callTool()` to the answers of `ciphers mcp`, and calls `ciphersMcpTool()` through the SDK copy in `docs/node_modules`, so the root suite needs `docs/` installed. CI installs both. `@nuxtjs/mcp-toolkit` wants Zod and validates with it before the handler runs. A Zod error quotes the client's keys as they came, bidi overrides and line separators included, and doesn't sound like `ciphers mcp` either (#218). So the Zod schema is `z.looseObject({})`, which takes any object, and its `_zod.toJSONSchema` hook hands back the wire schema from `toolListings`, so `tools/list` still shows the real one. `callTool` then checks the arguments the way stdio does, and every answer is the text `ciphers mcp` gives, refusals through `sanitizeLine` in `@agntn/tools/mcp`. A call with no `arguments` at all reaches Zod as `undefined`. Turning `ciphers_info` away for sending nothing would be silly, so `ciphersMcpTool()` wraps the schema's `run` and reads it as `{}` first, the way stdio does.

`src/tools.ts` and `src/mcp.ts` import `@agntn/tools` and `@agntn/tools/mcp`, aliased to their files in `docs/node_modules` like `@agntn/encodings`. `@agntn/tools/mcp` pulls `@modelcontextprotocol/server`, a dependency here at the root's version. `@agntn/hashes` is aliased to its file too: with `/mcp` the worker imports the library at runtime, and Node refuses a directory import (`Directory import ... is not supported` in prerender).

On the `cloudflare_module` preset the toolkit hands its server to `createMcpHandler` from `agents`, which tells an SDK v1 server apart with `instanceof`. pnpm installs one copy of `@modelcontextprotocol/sdk` per `zod` peer it resolves, so the toolkit and `agents` can each get their own and every request fails with "createMcpHandler received an unsupported server". `nitro.alias` points every import of the SDK at the copy in `docs/node_modules`. Keep it until both resolve the same one; `.output/server` should hold one `class McpServer`.

`/mcp` is public, so the tool limits are the worker's limits. The most expensive calls they allow, `ciphers_passphrase_probe` on its largest grid, `openpgp` at the full S2K count and `ciphers_key_recover` on columnar at key length 9, take about a second of CPU each. A new tool or a raised limit gets the same measurement before it ships. Every argument reaches the worker, passphrases included, because an agent sends them there on purpose. Workers Logs in `wrangler.jsonc` record the invocation, not the body. Keep it that way: no `evlog` module, no `console` call with tool arguments. `content/1.guide/05.agents.md#remote-mcp` tells users the arguments travel.

## Live values

- Every number on the landing and every facts strip comes from the library at render time. `CIPHERS` in `app/utils/ciphers.ts` maps `builtinCiphers` through `create(name).info()`, `useLandingCipher` encodes the sample sentences with `create(name).encode`. No recorded fixtures to regenerate, nothing to drift. A cipher added to the library shows up in the grid by itself, the sidebar icon needs one line in `PRESENTATION`.
- Every text a tool would hand a model, in the `03 Full tool response` rows and the playground, comes from `src/tool-operations.ts` through the `#tool-operations` alias. That module imports nothing but the library, so the page runs the executors the MCP server runs instead of a copy.
- The counts in prose (the headline, the OG image, the SEO description, the playground) come from `CIPHERS.length` through `spellOut` in `app/utils/format.ts`. The landing walk in `useLandingCipher` is a curated order and a cipher missing from it joins at the end, so give a new one a place. The counts written as words in `content/` frontmatter and in the README can't be live; `test/unit/docs-counts.test.ts` at the root fails when they fall behind `builtinCiphers`. The tool count stays out of prose altogether, and the same test fails on one. It also holds the option lists in `1.guide/01.index.md` and `1.guide/05.agents.md` to what the built-ins declare and what `ciphers_encode` takes, and the flags table in `1.guide/04.cli.md` to the flags `encode` and `decode` read.
- The samples are deterministic, so SSR and the client agree and hydration doesn't flicker. Keep it that way. No `Math.random`, no clock inside a computed.
- `CiphersPlayground.vue` reads the deep link through a `watch(route.query)` registered in `onMounted` that fires once. A prerendered page hydrates with an empty query and Nuxt restores the address only afterwards, so reading `route.query` in setup gives you nothing. It writes state back with `router.replace` on every change, except an option longer than 2,000 characters, in practice a whole book, which stays out of the address bar and the share link.
- The playground catches `CipherError` and shows the class name and the message. Anything else is a bug in the library and belongs there, not in a try/catch here.

## SEO

- `seo.schema` in `app/app.config.ts` emits the landing JSON-LD: `WebSite`, the agntn `Organization` as publisher, and a free `SoftwareApplication` with `sameAs` on GitHub and npm. Docs pages get `Article` plus `BreadcrumbList` from Docus on their own.
- The Docus sitemap reads content collections only. `server/routes/sitemap.xml.ts` wraps it and appends the Vue pages listed in `PAGES`; a new page under `app/pages/` goes there too or it is invisible to crawlers.
- Docus links `/favicon.ico` without shipping one. `public/favicon.svg` is the source, the PNGs and the `.ico` are cut from it with ImageMagick, `app.head` in `nuxt.config.ts` links them with the manifest and theme colours.

## OG images

- `app/components/OgImage/Docs.takumi.vue` and `Landing.takumi.vue` override the Docus templates of the same name and are rendered by Takumi at build time. Takumi has no CSS variables, so the theme colours from `app.css` are repeated there as literals. Annoying, but that's what it is.
- nuxt-og-image doesn't see the faces `@nuxt/fonts` generates on this Nuxt version, but it does parse `@font-face` rules from the files in `css`. That's why `app/assets/fonts.css` declares the Figtree and Fira Code TTFs in `public/fonts` and `fonts.families` uses the `local` provider. Site and OG images share the same files.
- The landing OG file is named from the SEO description. Nitro refuses to write a prerender path containing `..`, so a description ending in a period is silently skipped and the landing ships with a dead `og:image`. Keep the description in `content/index.md` without a trailing period. Silently is the bad part.

## Constraints

- Text a visitor types into the playground is rendered as text, through interpolation or a `<pre>`. Never `v-html`, never evaluate.
- Cipher names, icons, blurbs and sample sentences live once, in `app/utils/ciphers.ts`. Sidebar, roster, playground samples and `::cipher-facts` read from it.
- The header tabs split the cipher pages by `info().category` in `useSubNavigation`; the pages keep their `/ciphers/<name>` paths. The file numbers set the reading order inside a tab: the classical ones grouped by kind, the block ones in registry order. A new category needs its overview page in `content/2.ciphers/` and a line in `CATEGORY_SECTIONS`. Labels, families, options, keyspaces and what a cipher works on come from the library and are not repeated here.
- Every vector quoted in `content/` came out of `dist/index.mjs`. Check a new one the same way before writing it down. Don't derive it by hand, that is how wrong vectors end up in docs with a straight face.
- The site makes no network request for its own work and stays that way. The footer says so.
