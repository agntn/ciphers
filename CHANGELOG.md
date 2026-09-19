# Changelog

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
