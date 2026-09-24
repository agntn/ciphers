# @agntn/ciphers

[![npm version](https://npmx.dev/api/registry/badge/version/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![license](https://npmx.dev/api/registry/badge/license/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/agntn/ciphers)

🔐 Thirty-one ciphers, one call. `ATTACK AT DAWN` goes in, `DWWDFN DW GDZQ` comes out, and the way back is the same call with `decode`. Terminal, TypeScript, agent or browser tab, and nothing ever leaves the machine.

## Why?

The puzzle says the answer is in a Vigenère, so you open a cipher site. The key field wants uppercase, J quietly became I, and the third tab does Playfair differently than the second one. Now hand that to an agent and it will do the Vigenère in its head and be wrong from the fourth letter on, confidently. So: one `encode` and one `decode` with the same options everywhere, and five tools a model can call instead of counting on its fingers.

Docs, and a playground where the library runs in your browser: [ciphers.agntn.dev](https://ciphers.agntn.dev).

## ✨ Features

- 🔡 **Thirty-one ciphers.** Caesar, ROT13, ROT47, Atbash, Vigenère, Beaufort, Autokey, Trithemius, Alberti, rail fence, affine, Playfair, Polybius, Morse, Bacon, tap code, columnar, ADFGVX, bifid and Enigma M3, plus AES and Triple DES in ECB and CBC mode, AES in CFB, OFB, CTR, CCM, OCB and LRW mode, and Rijndael with the wider blocks AES dropped.
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

| Cipher             | Family                      | Self-inverse | Options                                           |
| ------------------ | --------------------------- | :----------: | ------------------------------------------------- |
| **caesar**         | substitution-shift          |      ✗       | `--shift` (1-25, default 3)                       |
| **rot13**          | substitution-shift          |      ✓       | -                                                 |
| **rot47**          | substitution-shift          |      ✓       | -                                                 |
| **atbash**         | substitution-reflection     |      ✓       | -                                                 |
| **vigenere**       | polyalphabetic              |      ✗       | `--key` (required)                                |
| **beaufort**       | polyalphabetic              |      ✓       | `--key` (required)                                |
| **autokey**        | polyalphabetic              |      ✗       | `--key` (required)                                |
| **trithemius**     | polyalphabetic              |      ✗       | -                                                 |
| **alberti**        | polyalphabetic              |      ✗       | `--key`, `--period` (both required)               |
| **rail-fence**     | transposition               |      ✗       | `--rails` (default 3)                             |
| **affine**         | substitution-multiplicative |      ✗       | `--a` (multiplier), `--b` (shift)                 |
| **playfair**       | digraph                     |      ✗       | `--key` (required)                                |
| **polybius**       | fractionation               |      ✗       | `--key` (optional)                                |
| **morse**          | fractionation               |      ✗       | -                                                 |
| **bacon**          | fractionation               |      ✗       | `--letters` (24 or 26, default 26)                |
| **tap-code**       | fractionation               |      ✗       | -                                                 |
| **columnar**       | transposition               |      ✗       | `--key` (required)                                |
| **adfgvx**         | fractionation               |      ✗       | `--key`, `--transposition` (both optional)        |
| **bifid**          | fractionation               |      ✗       | `--key` (optional), `--period` (default 5)        |
| **enigma**         | rotor                       |      ✓       | `--positions`, `--rings`, `--plugboard`           |
| **aes**            | substitution-permutation    |      ✗       | `--key` (hex, required)                           |
| **aes-cbc**        | substitution-permutation    |      ✗       | `--key`, `--iv` (hex, both required)              |
| **aes-cfb**        | substitution-permutation    |      ✗       | `--key`, `--iv` (hex), `--segment`                |
| **aes-ofb**        | substitution-permutation    |      ✗       | `--key`, `--iv` (hex, both required)              |
| **aes-ctr**        | substitution-permutation    |      ✗       | `--key`, `--iv` (hex, both required)              |
| **aes-ccm**        | substitution-permutation    |      ✗       | `--key`, `--nonce` (hex), `--aad`, `--tag-length` |
| **aes-ocb**        | substitution-permutation    |      ✗       | `--key`, `--nonce` (hex), `--aad`, `--tag-length` |
| **aes-lrw**        | substitution-permutation    |      ✗       | `--key` (hex, required), `--tweak`                |
| **rijndael**       | substitution-permutation    |      ✗       | `--key` (hex, required), `--block-size`           |
| **triple-des**     | feistel                     |      ✗       | `--key` (hex, required)                           |
| **triple-des-cbc** | feistel                     |      ✗       | `--key`, `--iv` (hex, both required)              |

Playfair and Polybius fold J into I, tap code shares C and K, Bacon is the 26-letter variant unless `letters` says 24, and Alberti is a keyed disk that turns every `period` letters, not a reenactment of the original. One page per cipher, rules and vectors included: [Ciphers](https://ciphers.agntn.dev/ciphers).

AES and Triple DES are the block ciphers. They take UTF-8 text, pad it with PKCS#7 and give hex back. The key is hex too: 32, 48 or 64 digits for AES, 32 or 48 for Triple DES. Every block goes through on its own, that's ECB. So two equal blocks of plaintext come out as two equal blocks of ciphertext. `aes-cbc` chains them instead. Each block gets XORed with the ciphertext block before it, the first one with `--iv`, which is 32 hex digits and required. `triple-des-cbc` chains Triple DES the same way, but its blocks are 8 bytes, so its `--iv` is 16 digits. `aes-cfb` takes the same `--iv` and turns AES into a keystream. `--segment` says how many bits go per step, 1, 8 or 128 (default 128). Nothing gets padded, so the ciphertext has exactly as many bytes as the text. `aes-ofb` takes `--iv` as well and feeds AES its own output, block after block, so the keystream never touches the text and nothing gets padded either. `aes-ctr` is a keystream too, only simpler. `--iv` is the first counter block, AES encrypts it, and the counter goes up by one for every next block. No feedback at all, so encrypt and decrypt are literally the same thing. `aes-ccm` is CTR with a tag on the end. `--nonce` is 14 to 26 hex digits, `--aad` is optional hex that the tag covers but nobody encrypts, and `--tag-length` is in bits (default 128). Decode checks the tag first, so a changed byte, a wrong key or a wrong nonce is an error, not garbage. `aes-ocb` takes the same flags and gets its tag in the same AES pass that encrypts. `--nonce` is 2 to 30 hex digits there, and `--tag-length` is 64, 96 or 128. Or there's `aes-lrw`, the LRW mode from the IEEE P1619 drafts. Its key is the AES key plus 32 more digits for a tweak key, and every block gets masked by its own index, counted from `--tweak` (default 1). Equal blocks at different places stop looking equal. And `rijndael` is what AES was cut from. NIST kept only the 128-bit block, Rijndael also has 160, 192, 224 and 256, and `--block-size` picks one (default 128, which is plain AES). Keys of 40 and 56 digits work there too.

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

Cryptography you'd trust with anything. The classical ones fall to anyone with a laptop and an afternoon, and that's the point, they're for puzzles, CTFs and teaching. AES and Triple DES are here too, mostly in ECB, the mode that leaks which blocks repeat. CBC, CFB, OFB, CTR and LRW hide that, but none of them checks integrity, and IEEE dropped LRW for XTS. CCM and OCB do check it, and still fall apart the moment a nonce repeats. All of it is plain TypeScript that never tried to be constant time. They're for the CTF that uses them and for seeing that leak, not for your data. No hashing, no wallet keys. Keys and signatures are [@agntn/keys](https://github.com/agntn/keys), and even those want nothing to do with real money.

## ➕ Adding a cipher

Want a thirty-second? One class extending `Cipher` with `name()`, `info()`, `encode()` and `decode()`, then `register('name', YourCipher)` and `create('name')` works. A built-in goes into `builtins` instead, with a vector from somewhere other than the code under test. Walkthrough: [Custom ciphers](https://ciphers.agntn.dev/guide/custom).

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
