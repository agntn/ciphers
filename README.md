# cipherhouse

Unified classical cipher provider library for agents.

## Ciphers

| Cipher | Family | Self-inverse | Options |
|--------|--------|:---:|---------|
| caesar | substitution-shift | ✗ | `--shift` (1-25, default 3) |
| rot13 | substitution-shift | ✓ | — |
| rot47 | substitution-shift | ✓ | — |
| atbash | substitution-reflection | ✓ | — |
| vigenere | polyalphabetic | ✗ | `--key` (required) |
| rail-fence | transposition | ✗ | `--rails` (default 3) |
| affine | substitution-multiplicative | ✗ | `--a` (multiplier), `--b` (shift) |
| playfair | digraph | ✗ | `--key` (required) |
| polybius | fractionation | ✗ | `--key` (optional) |

## CLI

```bash
# Encode
ch encode caesar "ATTACK AT DAWN" --shift 3
# → DWWDFN DW GDZQ

# Decode
ch decode atbash "ZGGZXP ZG WZDM"
# → ATTACK AT DAWN

# Brute-force Caesar (all 25 shifts)
ch brute "DWWDFN DW GDZQ"

# Frequency analysis
ch frequency "DWWDFN DW GDZQ" --lang en

# List ciphers
ch ciphers
ch ciphers -v  # verbose with options

# Cipher info
ch info vigenere
```

## Library

```typescript
import 'cipherhouse'
import { create, resolveCipher } from 'cipherhouse'

// Direct
const caesar = create('caesar')
const result = caesar.encode('HELLO', { shift: 5 })
// result.text === 'MJQQT'

// Resolve by name/prefix
const cipher = resolveCipher('vig') // → Vigenère
const encoded = cipher.encode('SECRET', { key: 'KEY' })

// Self-inverse ciphers
const rot13 = create('rot13')
rot13.encode('HELLO').text === rot13.decode('URYYB').text // true
```

## Pi Extension

Four tools available:

- `cipher_encode` — encode text
- `cipher_decode` — decode text
- `cipher_brute_caesar` — brute-force all 25 shifts
- `cipher_frequency` — letter frequency analysis

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
