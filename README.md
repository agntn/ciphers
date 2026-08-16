# @agntn/ciphers

18 classical ciphers behind one small local API and CLI. Everything runs locally. No HTTP, no API keys, just text transformations for learning and puzzles.

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

`alberti` uses a simplified keyed disk, not a full historical simulation. The inner disk rotates one position after every `period` Latin letters, which keeps results reproducible.

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

// Cipher names match exactly
const caesar = create('caesar')
const result = caesar.encode('HELLO', { shift: 5 })
// result.text === 'MJQQT'

// Each cipher keeps its own options
const cipher = resolveCipher('vigenere')
const encoded = cipher.encode('SECRET', { key: 'KEY' })

// Self-inverse ciphers use the same transformation both ways
const rot13 = create('rot13')
rot13.decode(rot13.encode('HELLO').text).text === 'HELLO' // true
```

Every built-in cipher is a concrete class extending the exported abstract `Cipher`. Custom ciphers stay boring: extend `Cipher` and register the constructor with `register(name, CipherClass)`. `create()` caches one instance per name.

## OMP and Pi Extensions

Both integrations expose the same four local tools. Agents get the same API instead of another wrapper to learn:

- `cipher_encode`: encode text with any cipher
- `cipher_decode`: decode text with any cipher
- `cipher_brute_caesar`: try all 25 Caesar shifts
- `cipher_frequency`: inspect letter frequency

## MCP Server

The package exposes the same four local tools through an MCP server over stdio:

```bash
ciphers mcp
```

For clients that accept JSON server configuration:

```json
{
  "mcpServers": {
    "ciphers": {
      "command": "ciphers",
      "args": ["mcp"]
    }
  }
}
```

The server validates every request against its published JSON Schema. It runs entirely
locally and does not require network access or credentials.

## Install

```bash
pnpm install
pnpm build
```

## Test

```bash
pnpm test
```

## License

MIT
