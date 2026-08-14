# ciphers/AGENTS.md

## Scope

Applies to the whole repository. A nested `AGENTS.md`, if introduced, overrides this file only for its subtree.

`@agntn/ciphers` provides local text transformations for educational, agent, and puzzle use. Keep production cryptographic primitives in a separate package. Cipher operations must not require HTTP, API keys, or another external service.

## Architecture

- Put each cipher in one `src/ciphers/<name>.ts` file. Its concrete class extends `Cipher`, implements `name()`, `info()`, `encode()`, and `decode()`, then registers its constructor at module load.
- Keep `src/core/registry.ts` constructor-based. `create()` returns one cached instance per name, and re-registering a name invalidates that instance.
- Report domain failures through the `CipherError` hierarchy and normalize unknown thrown values with `normalizeError()`.
- Resolution may normalize case and spaces to hyphens, then it must match a registered name exactly. Do not add fuzzy or prefix matching.
- Keep the `ciphers` Citty CLI and the Pi/OMP extensions aligned with the library. Both extensions expose encode, decode, Caesar brute force, and frequency analysis.

## Cipher Contracts

- Latin cipher alphabets use A-Z.
- Playfair and Polybius map J to I.
- Tap code shares C and K.
- Morse uses dots and dashes, spaces between letters, and `/` between words.
- Bacon uses this project's 26-letter A-Z variant, not the historical 24-letter alphabet.
- Enigma models Wehrmacht M3 with rotors I-II-III and reflector B.

## Adding or Changing a Cipher

1. Add or update the cipher class and its option types.
2. For a new cipher, import its module from `src/ciphers/index.ts` and add its name to `builtinCiphers` in `src/core/ciphers.ts`.
3. Run a roundtrip probe before writing fixtures.
4. Add an independently known fixed vector plus relevant edge cases to `test/unit/ciphers.test.ts`. Never manufacture the expected value from the implementation under test.
5. Update the CLI, Pi/OMP tools, exports, and README only where the public contract changed.

Use the scripts in `package.json` as the command source of truth. A cipher change is complete when its focused tests pass and every affected public surface builds and typechecks.
