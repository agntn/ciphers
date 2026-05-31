# cipherhouse/AGENTS.md

## Scope

Classical cipher provider library. 15 ciphers as self-registering providers in `src/providers/`. CLI via citty. Pi extension for agent use.

## Conventions

- Cipher providers: one per file in `src/providers/`, self-register on import
- Interface: `CipherProvider` with `encode()` / `decode()` / `info()`
- Registry: `register()` / `create()` / `ciphers()` / `has()` — no HTTP, no API keys
- Singleton cache: `create()` returns same instance per cipher name
- Errors: `CipherError` hierarchy with `normalizeError()`
- CLI: `ch` command with citty subcommands
- Pi extension: 4 tools (cipher_encode, cipher_decode, cipher_brute_caesar, cipher_frequency)
- Resolve: exact match only (no fuzzy prefix matching)

## Key Files

- `src/core/types.ts` — CipherProvider interface + cipher-specific option types
- `src/core/registry.ts` — registration, factory, singleton cache
- `src/core/resolve.ts` — exact-match cipher resolution
- `src/providers/*.ts` — individual cipher implementations
- `packages/pi/extensions/cipherhouse.ts` — Pi agent tools
- `test/unit/ciphers.test.ts` — 72 tests (roundtrip + edge cases)

## Ciphers (15)

caesar, rot13, rot47, atbash, vigenere, rail-fence, affine, playfair, polybius, morse, bacon, tap-code, columnar, adfgvx, bifid

## Adding a New Cipher

1. Create `src/providers/<name>.ts`
2. Implement `CipherProvider` (encode, decode, info)
3. Call `register('<name>', () => new Provider())` at module level
4. Add `import './<name>'` to `src/providers/index.ts`
5. Add to `builtinCiphers` in `src/core/providers.ts`
6. **Run roundtrip verification FIRST** (node --import tsx)
7. Get actual output, copy as expected value in test
8. Add test cases to `test/unit/ciphers.test.ts`

## Ograniczenia

- Classical ciphers only — not secure for real encryption
- No HTTP/API — all ciphers are local text transformations
- Alphabet: Latin (A-Z), J→I mapping for Playfair/Polybius/Bacon
- C/K share in tap-code
- Morse: dot/dash with space separator, / for word breaks
- Bacon: 26-letter alphabet (standard A-Z)
