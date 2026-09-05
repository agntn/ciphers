# docs/

Docus site for `@agntn/ciphers`. Markdown lives in `content/`. The playground is a Vue page that imports the library into the browser. There is no server API because the library needs none, and I'm not adding one for symmetry with the other sites.

## Layout

```
docs/
├── nuxt.config.ts                 # extends: ['docus'], cloudflare_module preset (Workers)
├── app/app.config.ts              # title, github, theme
├── app/app.css                    # theme tokens (light + .dark), shared `ciphers-*` classes
├── app/components/                # Docus overrides: AppHeaderLogo, AppHeaderCTA (nav), AppFooterLeft, DocsAsideLeftBody; icons are Solar (linear), brands stay simple-icons
├── app/components/content/        # MDC components (`::landing-home`, `::cipher-facts`), the landing panels, CiphersPlayground
├── app/components/OgImage/        # Docs.takumi and Landing.takumi override the Docus OG templates
├── app/assets/fonts.css           # @font-face for the TTFs served from public/fonts (site and OG images)
├── app/composables/               # useLandingCipher (one clock for every live panel), useSubNavigation
├── app/utils/                     # ciphers table (icons, blurbs, samples over the library's info()), analysis helpers shared by landing and playground, formatting
├── app/pages/playground.vue       # playground, own route outside the docs layout, its own useSeo and OG image
├── server/routes/sitemap.xml.ts   # Docus sitemap plus the Vue pages it cannot see
├── public/                        # fonts, favicon.svg and the icons and manifest cut from it
├── content/index.md               # landing
├── content/1.guide/               # getting started, transform, analysis, cli, agents, custom, playground
└── content/2.ciphers/             # one page per cipher
```

## Commands

```bash
pnpm install          # from docs/, after pnpm build in the repo root
pnpm dev              # http://localhost:3000
pnpm build            # Cloudflare Workers output in .output/, content routes prerendered
pnpm deploy           # build, then wrangler deploy to ciphers.agntn.dev
pnpm generate         # static output; nothing on this site needs the worker at runtime
```

Deployment: Nitro preset `cloudflare_module`. Nuxt Content wants a D1 binding named `DB`. `wrangler.jsonc` carries it plus the `NUXT_SITE_URL` var, and Nitro merges that into the generated `.output/server/wrangler.json`. Create the database once with `wrangler d1 create agntn-ciphers` and put the id in `wrangler.jsonc`. Until then the id is all zeros on purpose - `pnpm deploy` with zeros binds nothing, so don't run it before the id is real. No KV binding. Nothing is fetched, so nothing is cached.

The site imports `@agntn/ciphers` from `file:..`. Build the parent package first. `dist/index.mjs` has no imports that need Node, so it bundles for the browser as it is.

Two resolution traps, both because the repo root is its own pnpm workspace:

- `pnpm-workspace.yaml` sets `shamefullyHoist: true`. Without it `docs/node_modules` holds only direct dependencies, Node walks up to the root `node_modules`, and the server bundle can end up with a second copy of Vue.
- `nuxt.config.ts` pins `workspaceDir` to `docs/` and disables devtools and telemetry, which would otherwise resolve from the root.

## Live values

- Every number on the landing and every facts strip comes from the library at render time. `CIPHERS` in `app/utils/ciphers.ts` maps `builtinCiphers` through `create(name).info()`, `useLandingCipher` encodes the sample sentences with `create(name).encode`. No recorded fixtures to regenerate, nothing to drift. A cipher added to the library shows up in the grid by itself, the sidebar icon needs one line in `PRESENTATION`.
- The samples are deterministic, so SSR and the client agree and hydration doesn't flicker. Keep it that way. No `Math.random`, no clock inside a computed.
- `CiphersPlayground.vue` reads the deep link through a `watch(route.query)` registered in `onMounted` that fires once. A prerendered page hydrates with an empty query and Nuxt restores the address only afterwards, so reading `route.query` in setup gives you nothing. It writes state back with `router.replace` on every change.
- The playground catches `CipherError` and shows the class name and the message. Anything else is a bug in the library and belongs there, not in a try/catch here.

## SEO

- `seo.schema` in `app/app.config.ts` emits the landing JSON-LD: `WebSite`, the agntn `Organization` as publisher, and a free `SoftwareApplication` with `sameAs` on GitHub and npm. Docs pages get `Article` plus `BreadcrumbList` from Docus on their own.
- The Docus sitemap reads content collections only. `server/routes/sitemap.xml.ts` wraps it and appends the Vue pages listed in `PAGES`; a new page under `app/pages/` goes there too or it is invisible to crawlers.
- Docus links `/favicon.ico` without shipping one. `public/favicon.svg` is the source, the PNGs and the `.ico` are cut from it with ImageMagick, `app.head` in `nuxt.config.ts` links them with the manifest and theme colours.

## OG images

- `app/components/OgImage/Docs.takumi.vue` and `Landing.takumi.vue` override the Docus templates of the same name and are rendered by Takumi at build time. Takumi has no CSS variables, so the theme colours from `app.css` are repeated there as literals. Annoying, but that's what it is.
- nuxt-og-image doesn't see the faces `@nuxt/fonts` generates on this Nuxt version, but it does parse `@font-face` rules from the files in `css`. That's why `app/assets/fonts.css` declares the five TTFs in `public/fonts` and `fonts.families` uses the `local` provider. Site and OG images share the same files.
- The landing OG file is named from the SEO description. Nitro refuses to write a prerender path containing `..`, so a description ending in a period is silently skipped and the landing ships with a dead `og:image`. Keep the description in `content/index.md` without a trailing period. Silently is the bad part.

## Constraints

- Text a visitor types into the playground is rendered as text, through interpolation or a `<pre>`. Never `v-html`, never evaluate.
- Cipher names, icons, blurbs and sample sentences live once, in `app/utils/ciphers.ts`. Sidebar, landing grid, playground samples and `::cipher-facts` read from it. Labels, families, options and keyspaces come from the library and are not repeated here.
- Every vector quoted in `content/` came out of `dist/index.mjs`. Check a new one the same way before writing it down. Don't derive it by hand, that is how wrong vectors end up in docs with a straight face.
- The site makes no network request for its own work and stays that way. The footer says so.
