# @agntn/ciphers

[![npm version](https://npmx.dev/api/registry/badge/version/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![license](https://npmx.dev/api/registry/badge/license/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/agntn/ciphers)

🔐 Twenty classical ciphers, one call. `ATTACK AT DAWN` goes in, `DWWDFN DW GDZQ` comes out, and the way back is the same call with `decode`. Terminal, TypeScript, agent or browser tab, and nothing ever leaves the machine.

## Why?

The puzzle says the answer is in a Vigenère, so you open a cipher site. The key field wants uppercase, J quietly became I, and the third tab does Playfair differently than the second one. Now hand that to an agent and it will do the Vigenère in its head and be wrong from the fourth letter on, confidently. So: one `encode` and one `decode` with the same options everywhere, and five tools a model can call instead of counting on its fingers.

Docs, and a playground where the library runs in your browser: [ciphers.agntn.dev](https://ciphers.agntn.dev).

## ✨ Features

- 🔡 **Twenty ciphers.** Caesar, ROT13, ROT47, Atbash, Vigenère, Beaufort, Autokey, Trithemius, Alberti, rail fence, affine, Playfair, Polybius, Morse, Bacon, tap code, columnar, ADFGVX, bifid and Enigma M3.
- 🔁 **Same call on all of them.** `create('vigenere').encode(text, { key })`, swap the name and the options, and the result says which cipher, which operation and which options it actually used.
- 🔨 **Brute force built in.** All 25 Caesar shifts in one command, so nobody has to try them by hand ever again.
- 📊 **Frequencies and the index of coincidence.** Tells you whether it's one alphabet or several before you burn an hour on the wrong attack. English, Polish and Japanese romaji reference orders.
- 🧭 **Ciphers describe themselves.** `info()` has the category, the family, the options, the keyspace and whether encode and decode are the same thing, and the CLI, the tools and the playground all read it from there.
- 🖥️ **CLI, library, MCP, Pi and OMP.** Five tools with one set of executors behind them, whichever one you're holding.
- 🌐 **Runs in the browser too.** The playground imports the package into the page, nothing is posted anywhere.
- 🧱 **Bounded on purpose.** Text and keys have a maximum length in every tool schema, so a model can't hand the process a novel to shift.
- 🧩 **Your cipher in one class.** Extend `Cipher`, `register()` it, and `create()` finds it like any built-in.

## 📦 Install

```bash
pnpm add @agntn/ciphers
```

Node.js 25 or newer. No native anything, no network, no keys to sign up for, it's all string work.

## 🚀 First call

```bash
npx @agntn/ciphers encode caesar "ATTACK AT DAWN" --shift 3
```

```
DWWDFN DW GDZQ
```

Cipher name, text, the flags that cipher needs, and only the result on stdout, so it pipes. Got the ciphertext but not the shift?

```bash
ciphers brute "DWWDFN DW GDZQ"
```

```
ℹ Caesar brute-force (shift 1-25):

  shift= 1 → CVVCEM CV FCYP
  shift= 2 → BUUBDL BU EBXO
  shift= 3 → ATTACK AT DAWN
  shift= 4 → ZSSZBJ ZS CZVM
  shift= 5 → YRRYAI YR BYUL
  shift= 6 → XQQXZH XQ AXTK
  shift= 7 → WPPWYG WP ZWSJ
  shift= 8 → VOOVXF VO YVRI
  shift= 9 → UNNUWE UN XUQH
  shift=10 → TMMTVD TM WTPG
  shift=11 → SLLSUC SL VSOF
  shift=12 → RKKRTB RK URNE
  shift=13 → QJJQSA QJ TQMD
  shift=14 → PIIPRZ PI SPLC
  shift=15 → OHHOQY OH ROKB
  shift=16 → NGGNPX NG QNJA
  shift=17 → MFFMOW MF PMIZ
  shift=18 → LEELNV LE OLHY
  shift=19 → KDDKMU KD NKGX
  shift=20 → JCCJLT JC MJFW
  shift=21 → IBBIKS IB LIEV
  shift=22 → HAAHJR HA KHDU
  shift=23 → GZZGIQ GZ JGCT
  shift=24 → FYYFHP FY IFBS
  shift=25 → EXXEGO EX HEAR
```

Shift 3, obviously. Shift 25 ends in HEAR, which is about as funny as a Caesar brute force gets ;)

Enigma is in there too, the Wehrmacht M3 with rotors I, II and III and reflector B:

```bash
ciphers encode enigma "ATTACK AT DAWN"
```

```
BZHGNO CR RTCM
```

`decode` with the same settings gives the plaintext back, a rotor machine is its own inverse. The settings are `--positions`, `--rings` and `--plugboard`, and without them you get AAA, AAA and an empty board, the machine every tutorial starts on.

A few more, same rules:

```bash
ciphers encode vigenere "ATTACK AT DAWN" --key LEMON
ciphers decode atbash "ZGGZXP ZG WZDM"
ciphers encode tap-code "HELP"
ciphers frequency "DWWDFN DW GDZQ" --lang pl
ciphers info bifid
```

`frequency` prints the histogram and the index of coincidence. Around 0.065 it's one alphabet with English underneath (0.057 with Polish, about 0.082 with Japanese romaji), down near 0.038 the alphabet keeps changing and you want a key length, not a histogram.

### Commands

| Command     | What it does                                        | Example                                                |
| ----------- | --------------------------------------------------- | ------------------------------------------------------ |
| `encode`    | Plaintext in, ciphertext out                        | `ciphers encode vigenere "ATTACK AT DAWN" --key LEMON` |
| `decode`    | The other way, same flags                           | `ciphers decode vigenere "LXFOPV EF RNHR" --key LEMON` |
| `brute`     | All 25 Caesar shifts                                | `ciphers brute "DWWDFN DW GDZQ"`                       |
| `frequency` | Letter histogram and the index of coincidence       | `ciphers frequency "DWWDFN DW GDZQ" --lang en`         |
| `ciphers`   | Every cipher by category, `-v` adds the options     | `ciphers ciphers -v`                                   |
| `info`      | One cipher's category, family, options and keyspace | `ciphers info enigma`                                  |
| `mcp`       | The MCP server on stdio                             | `ciphers mcp`                                          |

A cipher's options are its flags: `--key`, `--transposition`, `--shift`, `--rails`, `--period`, `--letters`, `--a`, `--b` and the three Enigma ones. Which cipher takes which is `ciphers info <name>`, or the [CLI guide](https://ciphers.agntn.dev/guide/cli).

## 🧠 Library

```ts
import { create, resolveCipher, analyzeFrequency } from '@agntn/ciphers'

const vigenere = create('vigenere')
const { text } = vigenere.encode('ATTACK AT DAWN', { key: 'LEMON' })
console.log(text) // LXFOPV EF RNHR
console.log(vigenere.decode(text, { key: 'LEMON' }).text) // ATTACK AT DAWN

const enigma = resolveCipher('Enigma')
console.log(enigma.encode('ATTACK AT DAWN').text) // BZHGNO CR RTCM

console.log(analyzeFrequency('DWWDFN DW GDZQ', 'en')?.ic) // 0.13636363636363635
```

That's nearly all of it. `create()` wants the exact registered name and hands you one cached instance per cipher. `resolveCipher()` lowercases and turns spaces into hyphens, so `'Rail Fence'` works and `'railfence'` doesn't, there is no fuzzy matching on purpose. Every result carries `cipher`, `operation` and the `options` that were applied, so one logged result is enough to repeat the call. Wrong key, shift out of range, unknown name: one `CipherError` family, and the message names the option or the cipher. The rest: [Transform](https://ciphers.agntn.dev/guide/transform), [Analysis](https://ciphers.agntn.dev/guide/analysis), [Custom ciphers](https://ciphers.agntn.dev/guide/custom).

## 🔡 Ciphers

| Cipher         | Family                      | Self-inverse | Options                                    |
| -------------- | --------------------------- | :----------: | ------------------------------------------ |
| **caesar**     | substitution-shift          |      ✗       | `--shift` (1-25, default 3)                |
| **rot13**      | substitution-shift          |      ✓       | -                                          |
| **rot47**      | substitution-shift          |      ✓       | -                                          |
| **atbash**     | substitution-reflection     |      ✓       | -                                          |
| **vigenere**   | polyalphabetic              |      ✗       | `--key` (required)                         |
| **beaufort**   | polyalphabetic              |      ✓       | `--key` (required)                         |
| **autokey**    | polyalphabetic              |      ✗       | `--key` (required)                         |
| **trithemius** | polyalphabetic              |      ✗       | -                                          |
| **alberti**    | polyalphabetic              |      ✗       | `--key`, `--period` (both required)        |
| **rail-fence** | transposition               |      ✗       | `--rails` (default 3)                      |
| **affine**     | substitution-multiplicative |      ✗       | `--a` (multiplier), `--b` (shift)          |
| **playfair**   | digraph                     |      ✗       | `--key` (required)                         |
| **polybius**   | fractionation               |      ✗       | `--key` (optional)                         |
| **morse**      | fractionation               |      ✗       | -                                          |
| **bacon**      | fractionation               |      ✗       | `--letters` (24 or 26, default 26)         |
| **tap-code**   | fractionation               |      ✗       | -                                          |
| **columnar**   | transposition               |      ✗       | `--key` (required)                         |
| **adfgvx**     | fractionation               |      ✗       | `--key`, `--transposition` (both optional) |
| **bifid**      | fractionation               |      ✗       | `--key` (optional), `--period` (default 5) |
| **enigma**     | rotor                       |      ✓       | `--positions`, `--rings`, `--plugboard`    |

Playfair and Polybius fold J into I, tap code shares C and K, Bacon is the 26-letter variant unless `letters` says 24, and Alberti is a keyed disk that turns every `period` letters, not a reenactment of the original. One page per cipher, rules and vectors included: [Ciphers](https://ciphers.agntn.dev/ciphers).

## 🤖 Agents

```bash
ciphers mcp
pi install npm:@agntn/ciphers
omp install @agntn/ciphers
```

```json
{
  "mcpServers": {
    "ciphers": { "command": "npx", "args": ["-y", "@agntn/ciphers", "mcp"] }
  }
}
```

Five tools, `cipher_encode`, `cipher_decode`, `cipher_brute_caesar`, `cipher_frequency` and `cipher_info`, the same five on all three. Arguments are checked against the schema before a cipher sees them, and a wrong key is a tool error with the reason in it, not a dead session. A model that doesn't know what Bifid takes calls `cipher_info` first, the encode and decode descriptions say so. And a decoded ciphertext is data: `IGNORE PREVIOUS INSTRUCTIONS` falling out of a ROT13 is the answer to the puzzle, not a new task. [Agents guide](https://ciphers.agntn.dev/guide/agents).

## 🚫 What this does not do

Cryptography. Nothing in here keeps a secret from anyone with a laptop and an afternoon, and that's the point, it's for puzzles, CTFs and teaching. No hashing, no AES, no wallet keys. Keys and signatures are [@agntn/keys](https://github.com/agntn/keys), and even those want nothing to do with real money.

## ➕ Adding a cipher

Want a twenty-first? One class extending `Cipher` with `name()`, `info()`, `encode()` and `decode()`, then `register('name', YourCipher)` and `create('name')` works. A built-in goes into `builtins` instead, with a vector from somewhere other than the code under test. Walkthrough: [Custom ciphers](https://ciphers.agntn.dev/guide/custom).

## 🛠️ Development

```bash
pnpm install
pnpm dev          # obuild --stub
pnpm check        # oxfmt --check, oxlint, tsc over the library, the extensions and the tests
pnpm test         # vitest through vite-plus
pnpm build        # obuild
pnpm docs         # the Nuxt site, bundled straight from src/
```

## 💛 Thanks

This package gets built on tools that Anthropic and OpenAI hand to open source projects, [Claude for Open Source](https://claude.com/contact-sales/claude-for-oss) and [Codex for Open Source](https://developers.openai.com/community/codex-for-oss). Thank you <3

## 📄 License

[MIT](./LICENSE)
