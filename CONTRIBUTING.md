# Contributing

## Setup

Run `pnpm install`, then `pnpm --dir docs install`. Yes, both. `test/unit/docs-mcp.test.ts` loads the `/mcp` handler with Zod from `docs/node_modules`. `pnpm check` lints and typechecks. `pnpm test` runs the suite. `pnpm test:packed` starts the MCP server from a packed tarball.

Running `ciphers mcp` or an extension from this checkout? Both serve `src/`, so a change needs a restart and nothing else. `src/cli.ts` is the exception and wants `pnpm build`. `CIPHERS_DIST=1` forces the bundle.

## What belongs here

- Ciphers run locally. No HTTP, no API key, no service behind an operation.
- Nothing here is audited, and the README says so up front.
- Still, other `@agntn` packages build on these primitives instead of `@noble/*`. So a block cipher gets real care, lesson or not.
- A new kind of cipher gets its own category in `cipherCategories`. Don't squeeze it in as a new `family`.

## Adding a cipher

1. One file, `src/ciphers/<category>/<name>.ts`, with a class extending `Cipher`. A block cipher extends `BlockCipher` and writes one block. `blockEcb` and `blockCbc` do the looping. Modes of one block cipher share a folder, like `aes/`.
2. Add the class to `src/ciphers/<category>/index.ts`. Add its name to `builtinCiphers` in `src/core/ciphers.ts`, same position. Skip that and the registry never hears of it.
3. Run a roundtrip before you write a single fixture.
4. Fixed vectors in `test/unit/ciphers.test.ts` come from outside. An RFC, a paper, Wikipedia, dCode, OpenSSL, a library at a named version. Never the code under test, that's how a wrong vector starts looking right.
5. Give it a page in `docs/content/2.ciphers/`. Say what it takes, where it disagrees with other tools and where its vectors come from. A vector quoted there comes out of `dist/index.mjs`, not out of your head.
6. Its icon is one line in `PRESENTATION` in `docs/app/utils/ciphers.ts`.
7. Touch `src/tools.ts` and the README only when the public contract changes. Counts in prose fall behind? `test/unit/docs-counts.test.ts` says which.

## Code

- Domain failures go through the `CipherError` hierarchy. Anything else thrown passes through `normalizeError()`.
- Names normalize case and spaces, then match exactly. No fuzzy matching, no prefixes.
- `src/core/registry.ts` stays constructor-based. One cached instance per name, and re-registering drops it.
- Nothing registers itself on import.
- The top of a cipher file doesn't call, spread or read a field. Mark it `/* @__PURE__ */` or move it into a function. One stray `Array.from(...)` drags that cipher into every root import, and `test/unit/side-effects.test.ts` will tell on you.
- A family's byte functions get a subpath, like `./aes` or `./chacha`. It imports that family and the errors. Never the root barrel.
- Sources run under plain Node. Relative imports name the `.ts` file. No `enum`, no `namespace`, no parameter properties.

## Agent tools

- One `defineTool` per tool in `src/tools.ts`, executors in `src/tool-operations.ts`.
- `ciphers mcp`, the site's `/mcp`, Pi and OMP all serve that one list. A fix never lands on one surface only.
- Schemas take `Type` from `@agntn/tools`. A bare `typebox` import gets rewritten by OMP to its own facade.
- What a schema can't say per cipher goes in `cipherInputError`. Which ciphers need `key`, `iv` or `nonce`, say, and hex key lengths.
- The `cli` hints keep the command names from before the CLI was built from the tools. `brute`, `period`, `guess` and the rest stay put, with their positionals and `-` for stdin.
- `/mcp` is public, so the worker's CPU limit is the tool limit. A new tool or a raised limit gets its worst call timed before it ships.

## Docs site

`pnpm docs` serves it on port 3000.

- Every number on the site comes from the library at render time. Counts in `content/` frontmatter and the README can't. `test/unit/docs-counts.test.ts` keeps them honest.
- Samples are deterministic, so SSR and the client agree. No `Math.random`, no clock inside a computed.
- The landing walk in `useLandingCipher` is a curated order. A new cipher lands at the end unless you give it a seat.
- A new category needs its overview page in `content/2.ciphers/` and a line in `CATEGORY_SECTIONS`.
- A page under `app/pages/` goes into `PAGES` in `server/routes/sitemap.xml.ts`. Otherwise crawlers never find it.
- Playground input renders as text. No `v-html`, no eval.
- The playground shows a `CipherError` as its class and message. Anything else is a library bug, so fix it there.
- The site makes no network request of its own. The footer promises that.
- The landing's SEO description ends without a period, or the OG image quietly skips the prerender. `test/unit/docs-og.test.ts` checks it.
