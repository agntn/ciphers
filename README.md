# cipherhouse

Unified classical cipher provider library for agents. 15 ciphers, self-registering, zero HTTP.

## Ciphers

| Cipher | Family | Self-inverse | Options |
|--------|--------|:---:|---------|
| **caesar** | substitution-shift | ✗ | `--shift` (1-25, default 3) |
| **rot13** | substitution-shift | ✓ | — |
| **rot47** | substitution-shift | ✓ | — |
| **atbash** | substitution-reflection | ✓ | — |
| **vigenere** | polyalphabetic | ✗ | `--key` (required) |
| **rail-fence** | transposition | ✗ | `--rails` (default 3) |
| **affine** | substitution-multiplicative | ✗ | `--a` (multiplier), `--b` (shift) |
| **playfair** | digraph | ✗ | `--key` (required) |
| **polybius** | fractionation | ✗ | `--key` (optional) |
| **morse** | fractionation | ✗ | — |
| **bacon** | fractionation | ✗ | — |
| **tap-code** | fractionation | ✗ | — |
| **columnar** | transposition | ✗ | `--key` (required) |
| **adfgvx** | fractionation | ✗ | `--key` (optional) |
| **bifid** | fractionation | ✗ | `--key` (optional), `--period` (default 5) |

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
```

## Library

```typescript
import 'cipherhouse'
import { create, resolveCipher, getOpt } from 'cipherhouse'

// Direct
const caesar = create('caesar')
const result = caesar.encode('HELLO', { shift: 5 })
// result.text === 'MJQQT'

// Resolve by name
const cipher = resolveCipher('vigenere')
const encoded = cipher.encode('SECRET', { key: 'KEY' })

// Self-inverse ciphers
const rot13 = create('rot13')
rot13.encode('HELLO').text === rot13.decode('URYYB').text // true
```

## Pi Extension

Four tools available:

- `cipher_encode` — encode text with any cipher
- `cipher_decode` — decode text with any cipher
- `cipher_brute_caesar` — brute-force all 25 Caesar shifts
- `cipher_frequency` — letter frequency analysis

## Install

```bash
pnpm install
pnpm build
```

## Test

```bash
pnpm test:run   # 72 tests
```

## License

MIT
