# @agntn/ciphers

18 ciphers behind one small local API and CLI. Local text transformations for educational and puzzle use, with no HTTP or API keys.

## Ciphers

| Cipher         | Family                      | Self-inverse | Options                                    |
| -------------- | --------------------------- | :----------: | ------------------------------------------ |
| **caesar**     | substitution-shift          |      ✗       | `--shift` (1-25, default 3)                |
| **rot13**      | substitution-shift          |      ✓       | -                                          |
| **rot47**      | substitution-shift          |      ✓       | -                                          |
| **atbash**     | substitution-reflection     |      ✓       | -                                          |
| **vigenere**   | polyalphabetic              |      ✗       | `--key` (required)                         |
| **trithemius** | polyalphabetic              |      ✗       | -                                          |
| **alberti**    | polyalphabetic              |      ✗       | `--key`, `--period` (both required)        |
| **rail-fence** | transposition               |      ✗       | `--rails` (default 3)                      |
| **affine**     | substitution-multiplicative |      ✗       | `--a` (multiplier), `--b` (shift)          |
| **playfair**   | digraph                     |      ✗       | `--key` (required)                         |
| **polybius**   | fractionation               |      ✗       | `--key` (optional)                         |
| **morse**      | fractionation               |      ✗       | -                                          |
| **bacon**      | fractionation               |      ✗       | -                                          |
| **tap-code**   | fractionation               |      ✗       | -                                          |
| **columnar**   | transposition               |      ✗       | `--key` (required)                         |
| **adfgvx**     | fractionation               |      ✗       | `--key` (optional)                         |
| **bifid**      | fractionation               |      ✗       | `--key` (optional), `--period` (default 5) |
| **enigma**     | rotor                       |      ✓       | `--positions`, `--rings`, `--plugboard`    |

`alberti` implements the reproducible, simplified keyed-disk variant: the inner disk rotates one position after each `period` Latin letters.

## CLI

```bash
ciphers encode caesar "ATTACK AT DAWN" --shift 3     # DWWDFN DW GDZQ
ciphers decode atbash "ZGGZXP ZG WZDM"                # ATTACK AT DAWN
ciphers brute "KHOOR"                                  # shift=3 → HELLO
ciphers frequency "DWWDFN DW GDZQ" --lang en          # histogram
ciphers ciphers -v                                     # full list with options
ciphers info vigenere                                  # cipher details
ciphers encode morse "SOS"                             # ... --- ...
ciphers encode bacon "SECRET"                          # ABBAB AABAA ...
ciphers encode tap-code "HELP"                         # 2 3 1 5 3 1 3 5
ciphers encode columnar "ATTACK" --key KEY             # TCAATK
ciphers encode adfgvx "HELLO"                          # DDAVDXDXFF
ciphers encode bifid "TEST" --key EXAMPLE              # OSUT
ciphers encode enigma "AAAAA"                          # BDZGO
```

## Library

```typescript
import '@agntn/ciphers'
import { create, resolveCipher, getOpt } from '@agntn/ciphers'

// Create by exact cipher name
const caesar = create('caesar')
const result = caesar.encode('HELLO', { shift: 5 })
// result.text === 'MJQQT'

// Options stay specific to each cipher
const cipher = resolveCipher('vigenere')
const encoded = cipher.encode('SECRET', { key: 'KEY' })

// These do the same thing in both directions
const rot13 = create('rot13')
rot13.encode('HELLO').text === rot13.decode('URYYB').text // true
```

Every built-in cipher is a concrete class extending the exported abstract `Cipher`. Adding your own is deliberately boring: extend `Cipher`, then register the constructor with `register(name, CipherClass)`. `create()` keeps one cached instance per name.

## OMP and Pi Extensions

Both integrations expose the same four local tools, so agents don't need a second cipher API:

- `cipher_encode`: encode text with any cipher
- `cipher_decode`: decode text with any cipher
- `cipher_brute_caesar`: try all 25 Caesar shifts
- `cipher_frequency`: inspect letter frequency

## Install

```bash
pnpm install
pnpm build
```

## Test

```bash
pnpm test:run
```

## License

MIT
