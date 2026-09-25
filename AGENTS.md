# ciphers/AGENTS.md

## Scope

Applies to the whole repository. A nested `AGENTS.md`, if introduced, overrides this file only for its subtree.

`@agntn/ciphers` provides local text transformations for educational, agent, and puzzle use. Keep production cryptographic primitives in a separate package. Cipher operations must not require HTTP, API keys, or another external service.

## Architecture

- Put each cipher in one `src/ciphers/<category>/<name>.ts` file. Its concrete class extends `Cipher`, implements `name()`, `info()`, `encode()`, and `decode()`, and is exported. Do not call `register()` from the file.
- Modes of one block cipher share a folder instead: `src/ciphers/block/aes/` holds the AES primitive in `block.ts` and one file per mode, `ecb.ts` for `aes`, `cbc.ts` for `aes-cbc`, `cfb.ts` for `aes-cfb`, `ofb.ts` for `aes-ofb`, `ctr.ts` for `aes-ctr`, `ccm.ts` for `aes-ccm`, `ocb.ts` for `aes-ocb`, `lrw.ts` for `aes-lrw`, `xts.ts` for `aes-xts` and `cbc-mac.ts` for `aes-cbc-mac`. `src/ciphers/block/triple-des/` does the same for Triple DES: `block.ts`, `ecb.ts` for `triple-des` and `cbc.ts` for `triple-des-cbc`.
- `rijndael` is not an AES mode, so it has its own `src/ciphers/block/rijndael.ts`. It runs the primitive from `aes/block.ts`, which takes the block length, and AES is that primitive at 16 bytes.
- `des` is not a Triple DES mode either, so it has its own `src/ciphers/block/des.ts` and runs `desBlock` from `triple-des/block.ts`, the same rounds Triple DES runs three times. `desx` runs that `desBlock` too, from its own `src/ciphers/block/desx.ts`.
- A category is one entry in `cipherCategories` in `src/core/ciphers.ts` and one folder under `src/ciphers/`. Every cipher reports it as `info().category`; `cipher_info` and `ciphers ciphers` list by it and filter on it. Today there are `classical` and `block`; a stream cipher gets its own category rather than a new `family` under either.
- Each category folder has an `index.ts` with its ordered list, and `src/ciphers/index.ts` concatenates those lists into `builtins`, the list the registry is seeded from. A cipher file that is not in them is not in the registry.
- Keep `src/core/registry.ts` constructor-based. `create()` returns one cached instance per name, and re-registering a name invalidates that instance.
- `sideEffects` names `dist/cli.mjs` and nothing else. That holds only while no module registers itself on import: put a `register()` call back at the top of a cipher file and the class reaches the registry through a bare import, which a tree-shaker is free to drop. New ciphers go in `builtins`.
- `src/commands/mcp.ts` imports the server and the SDK inside `run()`, because citty resolves every subcommand for `--help` and for an unknown command too. `test/unit/cli-loads.test.ts` runs those usage paths under a load hook.
- Inside a checkout, the built `dist/cli.mjs` loads the `mcp` command from `src/`, like the Pi and OMP extensions, so a local server needs only a restart after a change. The npm package ships no `src/commands` and runs the bundle, and so do a copy under `node_modules`, where Node does not strip types, and a checkout without devDependencies, since the server imports `typebox`. `CIPHERS_DIST=1` forces the bundle. A change to `src/cli.ts` itself still needs `pnpm build`; `test/eval-packed.mjs` runs `mcp` in each of these layouts.
- The sources run under plain Node: relative imports name the `.ts` file (or `index.ts` for a folder), and there are no `enum`, `namespace` or parameter properties. `tsconfig.json` holds that with `NodeNext`, `allowImportingTsExtensions` and `erasableSyntaxOnly`.
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
- `aes` runs in ECB only: UTF-8 text with PKCS#7 padding in, lowercase hex out, and a key of 32, 48 or 64 hex digits. It is a teaching implementation, not constant time.
- AES-CBC takes the AES key and a required 32-digit `iv`, and chains blocks as NIST SP 800-38A §6.2 does. Text, padding and hex work as for AES.
- AES-CFB takes the AES key and a required 32-digit `iv`, and feeds back `segment` bits per step (1, 8 or 128, default 128) as NIST SP 800-38A §6.3 does. It has no padding: the ciphertext has as many bytes as the UTF-8 text. Hex works as for AES.
- AES-OFB takes the AES key and a required 32-digit `iv`, and encrypts each output block again for the next, starting from the IV, as NIST SP 800-38A §6.4 does. Padding and hex work as for AES-CFB.
- AES-CTR takes the AES key and a required 32-digit `iv`, the initial counter block, and adds one to it per block as a 128-bit big-endian number, wrapping to zero, as NIST SP 800-38A §6.5 and §B.1 do. Padding and hex work as for AES-CFB.
- AES-CCM takes the AES key, a required `nonce` of 14 to 26 hex digits, optional hex `aad` and `tagLength` in bits (32 to 128 in steps of 16, default 128), and runs NIST SP 800-38C: CBC-MAC for the tag, CTR for the text and the tag. The output is the ciphertext followed by the tag in hex, with no padding. Decoding throws `CipherError` and returns no text when the tag does not match.
- AES-OCB takes the AES key, a required `nonce` of 2 to 30 hex digits, optional hex `aad` and `tagLength` in bits (64, 96 or 128, default 128), and runs RFC 7253. Output, padding and a tag that does not match work as for AES-CCM.
- AES-LRW takes the AES key followed by a 32-digit tweak key, masks block `i` with `K2 ⊗ i` in GF(2^128) as IEEE P1619 LRW does, and counts `i` up from `tweak` (hex, default 1). Text, padding and hex work as for AES.
- AES-XTS takes two AES-128 or two AES-256 keys in one key of 64 or 128 hex digits, the data key then the tweak key, and runs IEEE 1619 with `tweak` as the data unit number (hex, default 0, little-endian in the tweak block as OpenSSL takes its IV). A short last block uses ciphertext stealing, so there is no padding, the text must be at least 16 bytes, and one data unit is at most 2^20 blocks as NIST SP 800-38E requires. Equal key halves are accepted, as in IEEE vector 1. Hex works as for AES-CFB.
- AES-CBC-MAC takes the AES key only and runs FIPS 113, ISO/IEC 9797-1 MAC Algorithm 1: CBC with a zero IV over the text padded with zeros to whole blocks (one zero block when empty), the last block as a 16-byte tag. Nothing is encrypted. The output is the UTF-8 bytes followed by the tag in hex, and a tag that does not match works as for AES-CCM.
- `rijndael` runs in ECB only, with `blockSize` in bits (128, 160, 192, 224 or 256, default 128) and a key of 32, 40, 48, 56 or 64 hex digits, as the Rijndael proposal allows. A 128-bit block is AES. Text, padding and hex work as for AES, with blocks of `blockSize`.
- `des` runs in ECB only, as FIPS 46-3 single DES with a key of 16 hex digits. Parity bits are ignored and weak keys are accepted. Text, padding and hex work as for AES, with 8-byte blocks.
- `desx` runs in ECB only, as Rivest's DESX: each block is XORed with an input whitening key, encrypted by `des` and XORed with an output whitening key. The key is 48 hex digits in OpenSSL's `desx-cbc` order, the DES key, then the input and the output whitening key; Botan and the Polish Wikipedia put the input key first. Text, padding and hex work as for `des`.
- `triple-des` runs in ECB only, as EDE with a key of 32 hex digits (K3 = K1) or 48 (three keys). Parity bits are ignored. Text, padding and hex work as for AES, with 8-byte blocks.
- Triple DES CBC takes the Triple DES key and a required 16-digit `iv`, and chains blocks as NIST SP 800-38A §6.2 does. Text, padding and hex work as for Triple DES.
- `blowfish` runs in ECB only, with a key of 8 to 112 hex digits (4 to 56 bytes, the 32 to 448 bits of Schneier's paper). The P-array and S-boxes start from the fractional hex digits of pi, computed once in `BigInt` rather than stored. Text, padding and hex work as for Triple DES.
- `idea` runs in ECB only, as Lai and Massey's IDEA with a key of 32 hex digits: 8.5 rounds on 16-bit words, with the word 0 standing for 2^16 in multiplication modulo 2^16 + 1. Its family is `lai-massey`, since it is neither Feistel nor SPN. Text, padding and hex work as for Triple DES.
- `lucifer` runs in ECB only, as Sorkin's Lucifer from Cryptologia 8(1), 1984, with his bit numbering correction from Cryptologia 8(3), July 1984 applied: 16 Feistel rounds on 16-byte blocks and a key of 32 hex digits. The uncorrected January listing, and code copied from it, gives other ciphertext; the fixed vectors are Outerbridge's 2015 triples. Text, padding and hex work as for AES.
- `mars` runs in ECB only, as IBM's MARS with the key schedule tweak of August 1999: 32 rounds on four little-endian 32-bit words and a key of 32 to 112 hex digits in steps of 8 (4 to 14 words). The 512-word S-box is built once from SHA-1 as section 2.6 of the submission describes, not stored. The fixed vectors are IBM's known answers from Crypto++, plus CycloneCRYPTO for the 160 and 416-bit keys Crypto++ refuses. Text, padding and hex work as for AES.

## Adding or Changing a Cipher

1. Add or update the cipher class and its option types.
2. For a new cipher, export the class, add it to its category list in `src/ciphers/<category>/index.ts`, and add its name to `builtinCiphers` in `src/core/ciphers.ts` in the same position `builtins` gives it. A new category also needs its entry in `cipherCategories` and its list spread into `builtins`.
3. Run a roundtrip probe before writing fixtures.
4. Add an independently known fixed vector plus relevant edge cases to `test/unit/ciphers.test.ts`. Never manufacture the expected value from the implementation under test.
5. Update the CLI, Pi/OMP tools, exports, and README only where the public contract changed.

Use the scripts in `package.json` as the command source of truth. A cipher change is complete when its focused tests pass and every affected public surface builds and typechecks.
