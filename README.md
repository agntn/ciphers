# @oritwoen/ciphers

16 ciphers behind one small local API and CLI. Local text transformations for educational and puzzle use, with no HTTP or API keys.

## Ciphers

| Cipher | Family | Self-inverse | Options |
|--------|--------|:---:|---------|
| **caesar** | substitution-shift | ✗ | `--shift` (1-25, default 3) |
| **rot13** | substitution-shift | ✓ | - |
| **rot47** | substitution-shift | ✓ | - |
| **atbash** | substitution-reflection | ✓ | - |
| **vigenere** | polyalphabetic | ✗ | `--key` (required) |
| **rail-fence** | transposition | ✗ | `--rails` (default 3) |
| **affine** | substitution-multiplicative | ✗ | `--a` (multiplier), `--b` (shift) |
| **playfair** | digraph | ✗ | `--key` (required) |
| **polybius** | fractionation | ✗ | `--key` (optional) |
| **morse** | fractionation | ✗ | - |
| **bacon** | fractionation | ✗ | - |
| **tap-code** | fractionation | ✗ | - |
| **columnar** | transposition | ✗ | `--key` (required) |
| **adfgvx** | fractionation | ✗ | `--key` (optional) |
| **bifid** | fractionation | ✗ | `--key` (optional), `--period` (default 5) |
| **enigma** | rotor | ✓ | `--positions`, `--rings`, `--plugboard` |

## CLI

```bash
ch encode caesar "ATTACK AT DAWN" --shift 3     # DWWDFN DW GDZQ
ch decode atbash "ZGGZXP ZG WZDM"                # ATTACK AT DAWN
ch brute "KHOOR"                                  # shift=3 → HELLO
ch frequency "DWWDFN DW GDZQ" --lang en          # histogram
ch ciphers -v                                     # full list with options
ch info vigenere                                  # cipher details
ch encode morse "SOS"                             # ... --- ...
ch encode bacon "SECRET"                          # ABBAB AABAA ...
ch encode tap-code "HELP"                         # 2 3 1 5 3 1 3 5
ch encode columnar "ATTACK" --key KEY             # TCAATK
ch encode adfgvx "HELLO"                          # DDAVDXDXFF
ch encode bifid "TEST" --key EXAMPLE              # OSUT
ch encode enigma "AAAAA"                          # BDZGO
```

## Library

```typescript
import '@oritwoen/ciphers'
import { create, resolveCipher, getOpt } from '@oritwoen/ciphers'

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
