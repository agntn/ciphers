# cipherhouse/AGENTS.md

## Scope

Classical cipher provider library. Each cipher is a self-registering provider in `src/providers/`. CLI via citty. Pi extension for agent use.

## Conventions

- Cipher providers: one per file in `src/providers/`, self-register on import
- Interface: `CipherProvider` with `encode()` / `decode()` / `info()`
- Registry: `register()` / `create()` / `ciphers()` / `has()` — no HTTP, no API keys
- Errors: `CipherError` hierarchy with `normalizeError()`
- CLI: `ch` command with citty subcommands
- Pi extension: 4 tools (encode, decode, brute-caesar, frequency)

## Key Files

- `src/core/types.ts` — CipherProvider interface
- `src/core/registry.ts` — registration and factory
- `src/providers/*.ts` — individual cipher implementations
- `packages/pi/extensions/cipherhouse.ts` — Pi agent tools
- `test/unit/ciphers.test.ts` — comprehensive tests

## Adding a New Cipher

1. Create `src/providers/<name>.ts`
2. Implement `CipherProvider` (encode, decode, info)
3. Call `register('<name>', () => new Provider())` at module level
4. Add `import './<name>'` to `src/providers/index.ts`
5. Add to `builtinCiphers` in `src/core/providers.ts`
6. Add test cases to `test/unit/ciphers.test.ts`

## Ograniczenia

- Classical ciphers only — not secure for real encryption
- No HTTP/API — all ciphers are local text transformations
- Alphabet: Latin (A-Z), J→I mapping for Playfair/Polybius
