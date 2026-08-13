# ciphers/AGENTS.md

## Scope

Cipher library for local educational and puzzle-oriented text transformations. 17 ciphers as self-registering classes in `src/ciphers/`. CLI via citty. Pi extension for agent use.

## Conventions

- Ciphers: one class per file in `src/ciphers/`, self-register on import
- Base class: abstract `Cipher` with `encode()` / `decode()` / `info()` / `name()`
- Concrete ciphers extend `Cipher` and self-register their class on import
- Registry: `register()` stores constructors; `create()` returns a cached instance — no HTTP, no API keys
- Errors: `CipherError` hierarchy with `normalizeError()`
- CLI: `ch` command with citty subcommands
- Pi extension: 4 tools (cipher_encode, cipher_decode, cipher_brute_caesar, cipher_frequency)
- Resolve: exact match only (no fuzzy prefix matching)

## Key Files

- `src/core/cipher.ts` — abstract `Cipher` + constructor type
- `src/core/types.ts` — result, metadata, and cipher-specific option types
- `src/core/registry.ts` — class registration and singleton cache
- `src/core/resolve.ts` — exact-match cipher resolution
- `src/ciphers/*.ts` — individual cipher implementations
- `packages/pi/extensions/ciphers.ts` — Pi agent tools
- `test/unit/ciphers.test.ts` — roundtrip and edge-case coverage

## Ciphers (17)

caesar, rot13, rot47, atbash, vigenere, trithemius, rail-fence, affine, playfair, polybius, morse, bacon, tap-code, columnar, adfgvx, bifid, enigma

## Adding a New Cipher

1. Create `src/ciphers/<name>.ts`
2. Extend `Cipher` and implement `name`, `encode`, `decode`, and `info`
3. Call `register('<name>', CipherClass)` at module level
4. Add `import './<name>'` to `src/ciphers/index.ts`
5. Add to `builtinCiphers` in `src/core/ciphers.ts`
6. **Run roundtrip verification FIRST** (node --import tsx)
7. Get actual output, copy as expected value in test
8. Add test cases to `test/unit/ciphers.test.ts`

## Ograniczenia

- Educational and puzzle-oriented ciphers; production cryptographic primitives belong in a separate package
- No HTTP/API — all ciphers are local text transformations
- Alphabet: Latin (A-Z), J→I mapping for Playfair/Polybius/Bacon
- C/K share in tap-code
- Morse: dot/dash with space separator, / for word breaks
- Bacon: 26-letter alphabet (standard A-Z)
- Enigma: Wehrmacht M3, rotors I-II-III, reflector B
