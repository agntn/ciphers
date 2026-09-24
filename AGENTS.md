# ciphers/AGENTS.md

## Scope

Applies to the whole repository. A nested `AGENTS.md`, if introduced, overrides this file only for its subtree.

`@agntn/ciphers` provides local text transformations for educational, agent, and puzzle use. Keep production cryptographic primitives in a separate package. Cipher operations must not require HTTP, API keys, or another external service.

## Architecture

- Put each cipher in one `src/ciphers/<category>/<name>.ts` file. Its concrete class extends `Cipher`, implements `name()`, `info()`, `encode()`, and `decode()`, and is exported. Do not call `register()` from the file.
- A category is one entry in `cipherCategories` in `src/core/ciphers.ts` and one folder under `src/ciphers/`. Every cipher reports it as `info().category`; `cipher_info` and `ciphers ciphers` list by it and filter on it. Today there are `classical` and `block`; a stream cipher gets its own category rather than a new `family` under either.
- Each category folder has an `index.ts` with its ordered list, and `src/ciphers/index.ts` concatenates those lists into `builtins`, the list the registry is seeded from. A cipher file that is not in them is not in the registry.
- Keep `src/core/registry.ts` constructor-based. `create()` returns one cached instance per name, and re-registering a name invalidates that instance.
- `sideEffects` names `dist/cli.mjs` and nothing else. That holds only while no module registers itself on import: put a `register()` call back at the top of a cipher file and the class reaches the registry through a bare import, which a tree-shaker is free to drop. New ciphers go in `builtins`.
- `src/commands/mcp.ts` imports the server and the SDK inside `run()`, because citty resolves every subcommand for `--help` and for an unknown command too. `test/unit/cli-loads.test.ts` runs those usage paths under a load hook.
- Report domain failures through the `CipherError` hierarchy and normalize unknown thrown values with `normalizeError()`.
- Resolution may normalize case and spaces to hyphens, then it must match a registered name exactly. Do not add fuzzy or prefix matching.
- Keep the `ciphers` Citty CLI and the Pi/OMP extensions aligned with the library. Both extensions expose encode, decode, Caesar brute force, frequency analysis, and cipher info lookup.

## Cipher Contracts

- Latin cipher alphabets use A-Z.
- Playfair and Polybius map J to I.
- Tap code shares C and K.
- Morse uses dots and dashes, spaces between letters, and `/` between words.
- Bacon defaults to the 26-letter A-Z variant; `letters: 24` selects the historical table with I/J and U/V shared.
- ADFGVX runs its columnar transposition only when `transposition` is set; without it the output is the grid step alone.
- Enigma models Wehrmacht M3 with rotors I-II-III and reflector B.
- AES runs in ECB only: UTF-8 text with PKCS#7 padding in, lowercase hex out, and a key of 32, 48 or 64 hex digits. It is a teaching implementation, not constant time.
- Triple DES runs in ECB only, as EDE with a key of 32 hex digits (K3 = K1) or 48 (three keys). Parity bits are ignored. Text, padding and hex work as for AES, with 8-byte blocks.

## Adding or Changing a Cipher

1. Add or update the cipher class and its option types.
2. For a new cipher, export the class, add it to its category list in `src/ciphers/<category>/index.ts`, and add its name to `builtinCiphers` in `src/core/ciphers.ts` in the same position `builtins` gives it. A new category also needs its entry in `cipherCategories` and its list spread into `builtins`.
3. Run a roundtrip probe before writing fixtures.
4. Add an independently known fixed vector plus relevant edge cases to `test/unit/ciphers.test.ts`. Never manufacture the expected value from the implementation under test.
5. Update the CLI, Pi/OMP tools, exports, and README only where the public contract changed.

Use the scripts in `package.json` as the command source of truth. A cipher change is complete when its focused tests pass and every affected public surface builds and typechecks.
