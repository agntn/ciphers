# Changelog

## v0.6.0

[compare changes](https://github.com/agntn/ciphers/compare/v0.5.2...v0.6.0)

### 🚀 Enhancements

- ⚠️  Say what each cipher works on ([#190](https://github.com/agntn/ciphers/pull/190))
- Give byte cipher plaintext back as hex ([#192](https://github.com/agntn/ciphers/pull/192))
- **classical:** Turn letters into A1Z26 numbers ([#198](https://github.com/agntn/ciphers/pull/198))
- **stream:** Add Salsa20, ChaCha20 and Poly1305 ([#201](https://github.com/agntn/ciphers/pull/201))
- Probe a salted blob across KDF settings ([#202](https://github.com/agntn/ciphers/pull/202))
- Drag a crib across reused XOR keys ([#204](https://github.com/agntn/ciphers/pull/204))
- **classical:** Read numbers as words of a book ([#203](https://github.com/agntn/ciphers/pull/203))
- **tools:** Read text hidden by position ([#205](https://github.com/agntn/ciphers/pull/205))
- **block:** Open what gpg --symmetric writes ([#206](https://github.com/agntn/ciphers/pull/206))
- Recover classical cipher keys ([#211](https://github.com/agntn/ciphers/pull/211))
- Serve the tools from ciphers.agntn.dev/mcp ([#212](https://github.com/agntn/ciphers/pull/212))

### 🩹 Fixes

- **docs:** Read number fields in the playground ([#195](https://github.com/agntn/ciphers/pull/195))
- **docs:** Build the site on Node.js 26 ([#197](https://github.com/agntn/ciphers/pull/197))
- **classical:** Let a book run on one line ([#213](https://github.com/agntn/ciphers/pull/213))

### 💅 Refactors

- Take hex and base64 from encodings ([#196](https://github.com/agntn/ciphers/pull/196))

### 📖 Documentation

- Point base encodings at @agntn/encodings ([#188](https://github.com/agntn/ciphers/pull/188))

### 🏡 Chore

- Add CODEOWNERS ([#200](https://github.com/agntn/ciphers/pull/200))

#### ⚠️ Breaking Changes

- ⚠️  Say what each cipher works on ([#190](https://github.com/agntn/ciphers/pull/190))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))
- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))

## v0.5.2

[compare changes](https://github.com/agntn/ciphers/compare/v0.5.1...v0.5.2)

### 🚀 Enhancements

- **classical:** Add the straddling checkerboard ([#181](https://github.com/agntn/ciphers/pull/181))
- **classical:** Read grids along spiral routes ([#184](https://github.com/agntn/ciphers/pull/184))

### 📖 Documentation

- **guide:** Add --bytes to the CLI flags table ([#183](https://github.com/agntn/ciphers/pull/183))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))
- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))

## v0.5.1

[compare changes](https://github.com/agntn/ciphers/compare/v0.5.0...v0.5.1)

### 🚀 Enhancements

- **aes:** Run CTR on raw bytes ([#174](https://github.com/agntn/ciphers/pull/174))
- **stream:** XOR bytes under a repeating key ([#175](https://github.com/agntn/ciphers/pull/175))
- **stream:** Point XOR decode errors at hex bytes ([#177](https://github.com/agntn/ciphers/pull/177))

### 🩹 Fixes

- **block:** Read openssl enc output over SHA-256 ([#172](https://github.com/agntn/ciphers/pull/172))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))
- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))

## v0.5.0

[compare changes](https://github.com/agntn/ciphers/compare/v0.4.0...v0.5.0)

### 🚀 Enhancements

- **block:** Decode CryptoJS passphrase output ([#141](https://github.com/agntn/ciphers/pull/141))
- **tools:** Add `ciphers_period_estimate` ([#142](https://github.com/agntn/ciphers/pull/142))
- **docs:** Let the playground estimate periods ([#144](https://github.com/agntn/ciphers/pull/144))
- **tools:** Guess the cipher family ([#145](https://github.com/agntn/ciphers/pull/145))
- **stream:** Add RC4 ([#149](https://github.com/agntn/ciphers/pull/149))

### 🩹 Fixes

- **brute:** Rank English shifts by letter pairs ([#137](https://github.com/agntn/ciphers/pull/137))
- **bacon:** Decode only whole groups of five ([#148](https://github.com/agntn/ciphers/pull/148))
- **docs:** Let @agntn releases past minimumReleaseAge ([#150](https://github.com/agntn/ciphers/pull/150))
- **adfgvx:** Refuse codes that aren't whole pairs ([#152](https://github.com/agntn/ciphers/pull/152))

### 💅 Refactors

- **mars:** Take SHA-1 from hashes ([#140](https://github.com/agntn/ciphers/pull/140))
- **tools:** ⚠️  Define each tool once ([#146](https://github.com/agntn/ciphers/pull/146))
- **block:** Derive passphrase keys via hashes ([#153](https://github.com/agntn/ciphers/pull/153))

#### ⚠️ Breaking Changes

- **tools:** ⚠️  Define each tool once ([#146](https://github.com/agntn/ciphers/pull/146))

### ❤️ Contributors

- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))
- Ori

## v0.4.0

[compare changes](https://github.com/agntn/ciphers/compare/v0.3.0...v0.4.0)

### 🚀 Enhancements

- **docs:** Instruments, wiring and category tabs ([#113](https://github.com/agntn/ciphers/pull/113))
- **stream:** Rabbit opens the stream category ([#118](https://github.com/agntn/ciphers/pull/118))
- **aes:** ECB on bytes in its own subpath ([#125](https://github.com/agntn/ciphers/pull/125))
- **tools:** ⚠️  Rename the tools to ciphers_* ([#128](https://github.com/agntn/ciphers/pull/128))

### 🩹 Fixes

- **docs:** Page menu stops pointing at a 404 ([#130](https://github.com/agntn/ciphers/pull/130))
- **cli:** Plain text when piped or NO_COLOR ([#132](https://github.com/agntn/ciphers/pull/132))
- **playfair:** Refuse a key with no letters ([#133](https://github.com/agntn/ciphers/pull/133))
- **columnar:** Sort keys the same on every host ([#134](https://github.com/agntn/ciphers/pull/134))

### 💅 Refactors

- **core:** Remove the unused withCipherError ([#131](https://github.com/agntn/ciphers/pull/131))

### 📖 Documentation

- Say the package is not audited ([#123](https://github.com/agntn/ciphers/pull/123))
- Drop the production primitives rule ([#124](https://github.com/agntn/ciphers/pull/124))

### 📦 Build

- Take vite-plus 1.0.0 from the catalog ([#129](https://github.com/agntn/ciphers/pull/129))

### 🏡 Chore

- ⚠️  Drop Node.js 25 ([#126](https://github.com/agntn/ciphers/pull/126))

### ✅ Tests

- **loads:** Keep the load report off stderr ([#115](https://github.com/agntn/ciphers/pull/115))

#### ⚠️ Breaking Changes

- **tools:** ⚠️  Rename the tools to ciphers_* ([#128](https://github.com/agntn/ciphers/pull/128))
- ⚠️  Drop Node.js 25 ([#126](https://github.com/agntn/ciphers/pull/126))

### ❤️ Contributors

- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.3.0

[compare changes](https://github.com/agntn/ciphers/compare/v0.2.0...v0.3.0)

### 🚀 Enhancements

- ⚠️  File ciphers under a category ([#78](https://github.com/agntn/ciphers/pull/78))
- **block:** AES in ECB mode ([#80](https://github.com/agntn/ciphers/pull/80))
- **block:** Triple DES with two or three keys ([#81](https://github.com/agntn/ciphers/pull/81))
- **block:** AES-LRW, a tweak for every block ([#82](https://github.com/agntn/ciphers/pull/82))
- **block:** AES-CBC, each block tied to the last ([#83](https://github.com/agntn/ciphers/pull/83))
- **block:** Run AES as a keystream in CFB ([#84](https://github.com/agntn/ciphers/pull/84))
- **block:** Count blocks up with AES-CTR ([#85](https://github.com/agntn/ciphers/pull/85))
- **block:** AES-CCM refuses a forged tag ([#86](https://github.com/agntn/ciphers/pull/86))
- **block:** OFB loops AES over its own output ([#87](https://github.com/agntn/ciphers/pull/87))
- **block:** Add `aes-ocb` ([#88](https://github.com/agntn/ciphers/pull/88))
- **block:** Chain Triple DES blocks with CBC ([#90](https://github.com/agntn/ciphers/pull/90))
- **block:** Rijndael with blocks up to 256 bits ([#91](https://github.com/agntn/ciphers/pull/91))
- **block:** AES-XTS steals the short last block ([#92](https://github.com/agntn/ciphers/pull/92))
- **block:** AES-CBC-MAC tags text, hides nothing ([#93](https://github.com/agntn/ciphers/pull/93))
- **block:** Blowfish, keyed S-boxes from pi ([#94](https://github.com/agntn/ciphers/pull/94))
- **mcp:** Run the checkout's source, not dist ([#98](https://github.com/agntn/ciphers/pull/98))
- **brute:** CLI puts the best --lang fit first ([#100](https://github.com/agntn/ciphers/pull/100))
- **block:** DES on its own, not only in 3DES ([#103](https://github.com/agntn/ciphers/pull/103))
- **block:** Wrap DES in two XOR keys as DESX ([#104](https://github.com/agntn/ciphers/pull/104))
- **block:** IDEA from PGP 2, no tables at all ([#105](https://github.com/agntn/ciphers/pull/105))
- **block:** Lucifer as Sorkin fixed it in 1984 ([#106](https://github.com/agntn/ciphers/pull/106))
- **block:** MARS, its S-box grown from SHA-1 ([#107](https://github.com/agntn/ciphers/pull/107))
- **block:** Serpent runs its S-boxes bitslice ([#108](https://github.com/agntn/ciphers/pull/108))

### 🩹 Fixes

- **release:** Leave CHANGELOG to changelogen ([#79](https://github.com/agntn/ciphers/pull/79))
- Block cipher lists follow the registry ([#96](https://github.com/agntn/ciphers/pull/96))
- **cli:** Stop quietly when the pipe closes ([#99](https://github.com/agntn/ciphers/pull/99))
- **tools:** Say serpent needs a key ([#111](https://github.com/agntn/ciphers/pull/111))

### 💅 Refactors

- **block:** Shared base for block ciphers ([#109](https://github.com/agntn/ciphers/pull/109))

### 📖 Documentation

- **agents:** MCP answers in text, no details ([#101](https://github.com/agntn/ciphers/pull/101))
- **guide:** List every option the tools take ([#110](https://github.com/agntn/ciphers/pull/110))

#### ⚠️ Breaking Changes

- ⚠️  File ciphers under a category ([#78](https://github.com/agntn/ciphers/pull/78))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))
- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))

## v0.2.0

[compare changes](https://github.com/agntn/ciphers/compare/v0.1.9...v0.2.0)

### 🚀 Enhancements

- **brute:** Rank Caesar shifts by letter fit ([#67](https://github.com/agntn/ciphers/pull/67))
- **adfgvx:** Transpose with a second key ([#69](https://github.com/agntn/ciphers/pull/69))
- **frequency:** Japanese romaji as ja ([#73](https://github.com/agntn/ciphers/pull/73))

### 🔥 Performance

- **brute:** Only the top shift comes back whole ([#70](https://github.com/agntn/ciphers/pull/70))

### 🩹 Fixes

- **frequency:** Unknown --lang is an error ([#64](https://github.com/agntn/ciphers/pull/64))
- **morse:** Leave unknown tokens alone ([#65](https://github.com/agntn/ciphers/pull/65))
- **package:** Keep docs and tests out of npm ([#66](https://github.com/agntn/ciphers/pull/66))
- **columnar:** ⚠️  Drop the rate limiter ([#68](https://github.com/agntn/ciphers/pull/68))
- **frequency:** Polish gets its own IC ([#71](https://github.com/agntn/ciphers/pull/71))
- **resolve:** An unknown name lists the real ones ([#72](https://github.com/agntn/ciphers/pull/72))

### 🤖 CI

- Test every pull request ([#74](https://github.com/agntn/ciphers/pull/74))

#### ⚠️ Breaking Changes

- **columnar:** ⚠️  Drop the rate limiter ([#68](https://github.com/agntn/ciphers/pull/68))

### ❤️ Contributors

- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.1.9

[compare changes](https://github.com/agntn/ciphers/compare/v0.1.8...v0.1.9)

### 🩹 Fixes

- **cli:** The usage path imports the MCP SDK ([#58](https://github.com/agntn/ciphers/pull/58))
- **docs:** The site counts the ciphers it ships ([#59](https://github.com/agntn/ciphers/pull/59))
- **mcp:** Tell the model which cipher needs a key ([#60](https://github.com/agntn/ciphers/pull/60))

### 🏡 Chore

- Add `pi` image ([a7a579b](https://github.com/agntn/ciphers/commit/a7a579b))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))
- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))

## v0.1.8

[compare changes](https://github.com/agntn/ciphers/compare/v0.1.7...v0.1.8)

### 🚀 Enhancements

- **bacon:** Letters=24 for Bacon's own table ([#49](https://github.com/agntn/ciphers/pull/49))

### 🩹 Fixes

- --help and --version are not cipher names ([#44](https://github.com/agntn/ciphers/pull/44))
- **playfair:** Move same-column pairs down ([#45](https://github.com/agntn/ciphers/pull/45))
- Apply the shared flags on every A-Z cipher ([#46](https://github.com/agntn/ciphers/pull/46))
- **frequency:** Polish order from PWN's table ([#52](https://github.com/agntn/ciphers/pull/52))

### 🏡 Chore

- Add `renovate.json` ([ac08fd0](https://github.com/agntn/ciphers/commit/ac08fd0))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))
- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))

## v0.1.7

[compare changes](https://github.com/agntn/ciphers/compare/v0.1.6...v0.1.7)

### 🚀 Enhancements

- Add Beaufort to the cipher registry ([#35](https://github.com/agntn/ciphers/pull/35))
- Implement plaintext Autokey cipher ([#36](https://github.com/agntn/ciphers/pull/36))

### 🩹 Fixes

- **pi:** Put the cipher tools on the shared executors ([#38](https://github.com/agntn/ciphers/pull/38))
- **docs:** Resolve @agntn/ciphers from src/ ([#39](https://github.com/agntn/ciphers/pull/39))

### 💅 Refactors

- Stop registering ciphers on import ([#37](https://github.com/agntn/ciphers/pull/37))

### 📖 Documentation

- Ciphers.agntn.dev runs every cipher in the browser ([#33](https://github.com/agntn/ciphers/pull/33))
- README stops being the manual ([#40](https://github.com/agntn/ciphers/pull/40))

### ❤️ Contributors

- Aeitwoen ([@aeitwoen](https://github.com/aeitwoen))
- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.1.6

[compare changes](https://github.com/agntn/ciphers/compare/v0.1.5...v0.1.6)

### 🩹 Fixes

- **cli:** Print transform results without logger prefixes ([2d41dcb](https://github.com/agntn/ciphers/commit/2d41dcb))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))

## v0.1.5

[compare changes](https://github.com/agntn/ciphers/compare/v0.1.4...v0.1.5)

### 🚀 Enhancements

- Add cipher_info and the index of coincidence ([#20](https://github.com/agntn/ciphers/pull/20))

### 🔥 Performance

- Clip collapsed cipher result previews ([#24](https://github.com/agntn/ciphers/pull/24))

### 🩹 Fixes

- Keep the OMP loader imports literal ([#21](https://github.com/agntn/ciphers/pull/21))
- Ship the CLI with a shebang ([#23](https://github.com/agntn/ciphers/pull/23))
- **omp:** Restore the extension typecheck ([#28](https://github.com/agntn/ciphers/pull/28))
- **tap-code:** Prevent malformed pair realignment ([#29](https://github.com/agntn/ciphers/pull/29))
- **cli:** Stop dumping domain error stacks ([#31](https://github.com/agntn/ciphers/pull/31))
- **columnar:** Keep whitespace in roundtrips ([#32](https://github.com/agntn/ciphers/pull/32))

### 🏡 Chore

- Use shared ox checks in ciphers ([#30](https://github.com/agntn/ciphers/pull/30))

### ❤️ Contributors

- Ori ([@oritwoen](https://github.com/oritwoen))
- Aeitwoen <aeitwoen@gmail.com>

## v0.1.4

[compare changes](https://github.com/agntn/ciphers/compare/v0.1.3...v0.1.4)

### 🩹 Fixes

- Add repository metadata ([0e211e8](https://github.com/agntn/ciphers/commit/0e211e8))

### ❤️ Contributors

- Aei ([@aeitwoen](https://github.com/aeitwoen))

## v0.1.3

[compare changes](https://github.com/agntn/ciphers/compare/v0.1.2...v0.1.3)

### 🚀 Enhancements

- Expose cipher tools over MCP ([#18](https://github.com/agntn/ciphers/pull/18))

### 🩹 Fixes

- Keep Pi cipher options in sync ([#19](https://github.com/agntn/ciphers/pull/19))

### ❤️ Contributors

- Aeitwoen <aeitwoen@gmail.com>

## v0.1.2

### 🚀 Enhancements

- Cipherhouse — unified classical cipher provider library for agents ([d5704bb](https://github.com/agntn/ciphers/commit/d5704bb))
- 6 new ciphers — morse, bacon, tap-code, columnar, adfgvx, bifid ([a8586d1](https://github.com/agntn/ciphers/commit/a8586d1))
- **columnar:** Add LRU cache + rate limiter ([4ad41ef](https://github.com/agntn/ciphers/commit/4ad41ef))
- Add OMP cipher extension ([99ab39c](https://github.com/agntn/ciphers/commit/99ab39c))
- Add Enigma M3 cipher ([#4](https://github.com/agntn/ciphers/pull/4))
- Add Trithemius cipher ([#5](https://github.com/agntn/ciphers/pull/5))
- Add Alberti disk cipher ([#6](https://github.com/agntn/ciphers/pull/6))

### 🩹 Fixes

- Code review fixes — type safety, edge cases, CLI validation, Node 25 ([a30ff5d](https://github.com/agntn/ciphers/commit/a30ff5d))
- Bifid performance (square rebuild in inner loop), bacon comment accuracy ([29cb43c](https://github.com/agntn/ciphers/commit/29cb43c))
- API design, error handling, documentation — 10-perspective review complete ([86c3d7d](https://github.com/agntn/ciphers/commit/86c3d7d))
- **cipherhouse:** WithCipherError preserves CipherError subclass identity ([21a7cc3](https://github.com/agntn/ciphers/commit/21a7cc3))
- Preserve Playfair ciphertext pairs ([#1](https://github.com/agntn/ciphers/pull/1))
- Handle Unicode in rail fence cipher ([#2](https://github.com/agntn/ciphers/pull/2))
- Handle Unicode in columnar cipher ([#3](https://github.com/agntn/ciphers/pull/3))
- Include base options in Vigenere results ([#7](https://github.com/agntn/ciphers/pull/7))

### 💅 Refactors

- Shared utilities — DRY Polybius square, getOpt, processBaseOptions ([0fc2a7e](https://github.com/agntn/ciphers/commit/0fc2a7e))
- ProcessBaseOptions for caesar/vigenere/affine — DRY preserveCase/stripNonAlpha ([a780f19](https://github.com/agntn/ciphers/commit/a780f19))
- **pi:** DefineTool wrapper, drop unsafe casts, pin dep ranges ([048eab1](https://github.com/agntn/ciphers/commit/048eab1))
- **pi:** Top-level import type for cipherhouse module ([9b8a619](https://github.com/agntn/ciphers/commit/9b8a619))
- Model ciphers as abstract classes ([b4b5f1e](https://github.com/agntn/ciphers/commit/b4b5f1e))

### 📖 Documentation

- AGENTS.md — 15 ciphers, roundtrip-first testing, singleton cache ([e220aff](https://github.com/agntn/ciphers/commit/e220aff))
- Humanize README ([6cd9b2c](https://github.com/agntn/ciphers/commit/6cd9b2c))
- Tighten agent contract ([d86354c](https://github.com/agntn/ciphers/commit/d86354c))
- Sharpen README copy ([9db4b36](https://github.com/agntn/ciphers/commit/9db4b36))

### 🏡 Chore

- Rename package to @oritwoen/ciphers ([2921788](https://github.com/agntn/ciphers/commit/2921788))
- Publish ciphers under agntn scope ([#8](https://github.com/agntn/ciphers/pull/8))
- Adopt Vite+ tooling ([#9](https://github.com/agntn/ciphers/pull/9))
- Align CLI binary with package name ([#10](https://github.com/agntn/ciphers/pull/10))
- Add Changelogen release workflow ([#11](https://github.com/agntn/ciphers/pull/11))

### ✅ Tests

- **cipherhouse:** LruCache, RateLimiter, Polybius, cache key (18/18 PASS) ([c1a40b1](https://github.com/agntn/ciphers/commit/c1a40b1))
- **cipherhouse:** NormalizeMainArgs (5/5 PASS) ([52c6696](https://github.com/agntn/ciphers/commit/52c6696))

### 🤖 CI

- Publish npm releases with OIDC ([#12](https://github.com/agntn/ciphers/pull/12))

### ❤️ Contributors

- Oritwoen ([@oritwoen](https://github.com/oritwoen))
- Ori ([@oritwoen](https://github.com/oritwoen))
- Or <or@local>
