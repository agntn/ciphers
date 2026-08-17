# Changelog

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
