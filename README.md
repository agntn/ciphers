# @agntn/ciphers

[![npm version](https://npmx.dev/api/registry/badge/version/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![license](https://npmx.dev/api/registry/badge/license/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/agntn/ciphers)

🔐 Seventy-five ciphers, one call. `ATTACK AT DAWN` goes in, `DWWDFN DW GDZQ` comes out, and the way back is the same call with `decode`. Terminal, TypeScript, agent or browser tab, and nothing ever leaves the machine.

## Why?

The puzzle says the answer is in a Vigenère, so you open a cipher site. The key field wants uppercase, J quietly became I, and the third tab does Playfair differently than the second one. Now hand that to an agent. It will do the Vigenère in its head and be wrong from the fourth letter on, confidently. So: one `encode` and one `decode` with the same options everywhere, and tools a model can call instead of counting on its fingers.

Docs, and a playground where the library runs in your browser: [ciphers.agntn.dev](https://ciphers.agntn.dev).

> [!CAUTION]
> **Not audited.** This code has never had a security audit. Do not use it in production, with real funds or with sensitive data. It is meant for agents, puzzles and local experiments only. It comes as is, without warranty of any kind, and the authors are not liable for any loss, as the MIT license states. Anything that matters wants an audited library.

## ✨ Features

- 🔡 **Seventy-five ciphers.** From a pencil and paper Caesar to Enigma M3 and AES from ECB to XTS. Chaocipher kept its secret for 92 years, which is a long time to wait for an answer.
- 🔁 **Same call on all of them.** Swap the name and options in `create('vigenere').encode(text, { key })`. The result says which cipher, operation and options it used.
- 🔨 **Brute force built in.** All 25 Caesar shifts in one command, so nobody has to try them by hand ever again.
- 📊 **Frequencies and the index of coincidence.** Tells you whether it's one alphabet or several before you burn an hour on the wrong attack.
- 🧭 **Ciphers describe themselves.** `info()` has the family, the options, the keyspace and whether encode and decode are the same. The CLI and the playground read it from there.
- 🖥️ **CLI, library, MCP, Pi, OMP and AI SDK.** Same tools, whichever one you're holding. No Node at hand? [ciphers.agntn.dev/mcp](https://ciphers.agntn.dev/guide/agents#remote-mcp) serves them over HTTP.
- 🌐 **Runs in the browser too.** The playground imports the package into the page, nothing is posted anywhere.
- 🧱 **Bounded on purpose.** Text and keys have a maximum length in every tool schema, so a model can't hand the process a novel to shift.
- 🧩 **Your cipher in one class.** Extend `Cipher`, `register()` it, and `create()` finds it like any built-in.

## 📦 Install

```bash
pnpm add @agntn/ciphers
```

Node.js 26 or newer. No native anything, no network, no keys to sign up for. It's all string work.

## 🚀 First call

```bash
npx @agntn/ciphers encode caesar "ATTACK AT DAWN" --shift 3
```

```
DWWDFN DW GDZQ
```

Give it the cipher name, the text, then the flags that cipher needs. Only the result goes to stdout, so it pipes. Below, `ciphers` means `pnpm exec ciphers` after `pnpm add`, or install once with `pnpm add -g @agntn/ciphers`. Got the ciphertext but not the shift?

```bash
ciphers brute "DWWDFN DW GDZQ"
```

```
shift= 3 -> ATTACK AT DAWN
shift=25 -> EXXEGO EX HEAR
shift=11 -> SLLSUC SL VSOF
shift=18 -> LEELNV LE OLHY
shift=21 -> IBBIKS IB LIEV
shift= 5 -> YRRYAI YR BYUL
shift=12 -> RKKRTB RK URNE
shift=14 -> PIIPRZ PI SPLC
shift=17 -> MFFMOW MF PMIZ
shift=10 -> TMMTVD TM WTPG
shift=22 -> HAAHJR HA KHDU
shift=16 -> NGGNPX NG QNJA
shift= 9 -> UNNUWE UN XUQH
shift= 8 -> VOOVXF VO YVRI
shift=24 -> FYYFHP FY IFBS
shift= 1 -> CVVCEM CV FCYP
shift= 2 -> BUUBDL BU EBXO
shift=15 -> OHHOQY OH ROKB
shift= 7 -> WPPWYG WP ZWSJ
shift=19 -> KDDKMU KD NKGX
shift=23 -> GZZGIQ GZ JGCT
shift=20 -> JCCJLT JC MJFW
shift= 4 -> ZSSZBJ ZS CZVM
shift= 6 -> XQQXZH XQ AXTK
shift=13 -> QJJQSA QJ TQMD
```

Shift 3 on top, it's the most English of the 25. English goes by letter pairs, so `HELLO WORLD` beats `EBIIL TLOIA` too. `--lang pl` ranks by Polish letters instead, `--lang ja` by Japanese romaji. Shift 25 comes second and ends in HEAR, which is about as funny as a Caesar brute force gets ;)

Enigma's in there too. The Wehrmacht M3, with rotors I, II and III and reflector B:

```bash
ciphers encode enigma "ATTACK AT DAWN"
```

```
BZHGNO CR RTCM
```

Decode with the same settings to get the plaintext back. A rotor machine is its own inverse. Set `--positions`, `--rings` and `--plugboard`, or get AAA, AAA and an empty board. The machine every tutorial starts on.

A few more, same rules:

```bash
ciphers encode vigenere "ATTACK AT DAWN" --key LEMON
ciphers decode atbash "ZGGZXP ZG WZDM"
ciphers encode tap-code "HELP"
ciphers frequency "DWWDFN DW GDZQ" --lang pl
ciphers info bifid
```

The `frequency` command prints a histogram and the index of coincidence. Around 0.065, that's one alphabet with English underneath. Near 0.038, the alphabet keeps changing. You want a key length, not a histogram. That's `period`. The table below covers the rest: guessing families, recovering keys and finding text in invisible characters.

### Commands

| Command      | What it does                                        | Example                                                            |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------ |
| `encode`     | Plaintext in, ciphertext out                        | `ciphers encode vigenere "ATTACK AT DAWN" --key LEMON`             |
| `decode`     | The other way, same flags                           | `ciphers decode vigenere "LXFOPV EF RNHR" --key LEMON`             |
| `brute`      | All 25 Caesar shifts, best fit first                | `ciphers brute "DWWDFN DW GDZQ"`                                   |
| `frequency`  | Letter histogram and the index of coincidence       | `ciphers frequency "DWWDFN DW GDZQ" --lang en`                     |
| `period`     | Vigenère key length, with the likely key            | `ciphers period "<ciphertext>" --max-period 30`                    |
| `guess`      | Likely cipher families and what to run next         | `ciphers guess "<ciphertext>" --lang pl`                           |
| `recover`    | Searched keys, best first, each with its plaintext  | `ciphers recover "<ciphertext>" --cipher substitution`             |
| `probe`      | Which KDF settings open a `Salted__` blob           | `ciphers probe "U2FsdGVkX1..." --key secret`                       |
| `crib`       | Crib dragging over ciphertexts under one reused key | `ciphers crib '["<hex>","<hex>"]' --crib " the "`                  |
| `hidden`     | A message hidden by position, best readings first   | `ciphers hidden "$(cat poem.txt)" --pick line`                     |
| `inspect`    | Invisible and lookalike characters                  | `ciphers inspect "$(cat tweet.txt)"`                               |
| `reveal`     | Messages hidden in invisible characters             | `ciphers reveal - < note.txt`                                      |
| `conceal`    | A message hidden in invisible characters            | `ciphers conceal "noon" --cover "Nothing here."`                   |
| `whitespace` | Whitespace positions and bit readings               | `ciphers whitespace - < note.txt`                                  |
| `trail`      | Messages hidden at line ends                        | `ciphers trail "noon" --cover - --zero space --one tab < poem.txt` |
| `align`      | Word changes between two texts                      | `ciphers align "red fox sleeps" "red fox runs"`                    |
| `info`       | Every cipher by category, or one cipher up close    | `ciphers info enigma`                                              |
| `ciphers`    | Same as `info`, for old habits                      | `ciphers ciphers --category stream`                                |
| `mcp`        | The MCP server on stdio                             | `ciphers mcp`                                                      |

A cipher's options are its flags: `--key`, `--shift`, `--rails` and so on. Which ones does yours take? Ask `ciphers info <name>` or check the [CLI guide](https://ciphers.agntn.dev/guide/cli). Each command is an agent tool, so the CLI refuses exactly what a model gets refused. Add `--json` for the same details the model gets. Morse starting with a dash? Just type it. `-.-.` spells no flag, so it's read as text.

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

That's nearly all of it. Give `create()` the exact registered name and get one cached instance per cipher. Want to be less exact? `resolveCipher()` lowercases and turns spaces into hyphens. `'Rail Fence'` works, `'railfence'` doesn't. No fuzzy matching. Every result carries `text`, `cipher`, `operation` and the `options` that were applied, enough to repeat the call. Wrong key, bad shift, unknown name? The `CipherError` family names the option or cipher. For raw bytes, `@agntn/ciphers/aes`, `@agntn/ciphers/chacha` and `@agntn/ciphers/salsa` take and return a `Uint8Array`.

The rest: [Transform](https://ciphers.agntn.dev/guide/transform), [Analysis](https://ciphers.agntn.dev/guide/analysis), [Custom ciphers](https://ciphers.agntn.dev/guide/custom).

## 🔡 Ciphers

| Category  | Family                      | Ciphers                                                                                                                                                                  |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| classical | substitution-shift          | `caesar`, `rot13`, `rot47`                                                                                                                                               |
| classical | substitution-reflection     | `atbash`                                                                                                                                                                 |
| classical | substitution-multiplicative | `affine`                                                                                                                                                                 |
| classical | substitution-keyed          | `substitution`, `tridigital`                                                                                                                                             |
| classical | polyalphabetic              | `vigenere`, `gronsfeld`, `beaufort`, `porta`, `autokey`, `running-key`, `trithemius`, `alberti`, `quagmire-1`, `quagmire-2`, `quagmire-3`, `quagmire-4`, `chaocipher`    |
| classical | digraph                     | `playfair`, `four-square`, `two-square`                                                                                                                                  |
| classical | polygraphic                 | `hill`                                                                                                                                                                   |
| classical | fractionation               | `polybius`, `nihilist`, `morse`, `fractionated-morse`, `bacon`, `tap-code`, `a1z26`, `adfgvx`, `bifid`, `trifid`, `straddling-checkerboard`                              |
| classical | homophonic                  | `book`                                                                                                                                                                   |
| classical | transposition               | `rail-fence`, `columnar`, `route`                                                                                                                                        |
| classical | rotor                       | `enigma`                                                                                                                                                                 |
| block     | substitution-permutation    | `aes`, `aes-cbc`, `aes-cfb`, `aes-ofb`, `aes-ctr`, `aes-ccm`, `aes-ocb`, `aes-lrw`, `aes-xts`, `aes-cbc-mac`, `aes-passphrase`, `rijndael`, `serpent`, `aria`, `openpgp` |
| block     | feistel                     | `des`, `desx`, `triple-des`, `triple-des-cbc`, `blowfish`, `lucifer`, `mars`, `cast5`, `camellia`, `sm4`                                                                 |
| block     | lai-massey                  | `idea`                                                                                                                                                                   |
| stream    | arx                         | `rabbit`, `salsa20`, `xsalsa20`, `chacha20`, `xchacha20`, `chacha20-poly1305`                                                                                            |
| stream    | permutation                 | `rc4`                                                                                                                                                                    |
| stream    | polyalphabetic              | `xor`                                                                                                                                                                    |
| stream    | crc-lcg                     | `zipcrypto`                                                                                                                                                              |

Seventy-five ciphers, seventeen families, three categories. The table is just names on purpose. For options, ask `ciphers info <name>`. Find rules, quirks and vectors at [Ciphers](https://ciphers.agntn.dev/ciphers), with [classical](https://ciphers.agntn.dev/ciphers/classical), [block](https://ciphers.agntn.dev/ciphers/block) and [stream](https://ciphers.agntn.dev/ciphers/stream) overviews. Why is xor polyalphabetic? It's Vigenère on bytes.

Six are self-inverse, so encode and decode are the same call: `rot13`, `rot47`, `atbash`, `beaufort`, `porta` and `enigma`. Block and stream ciphers take UTF-8 text and a hex key, and return hex. Use `--bytes hex` for plaintext that isn't text. The authenticated ones, `aes-ccm`, `aes-ocb` and `chacha20-poly1305` among them, refuse to decode a ciphertext somebody changed.

Found `U2FsdGVkX1` on a page? `aes-passphrase` opens that CryptoJS base64. `openpgp` opens `gpg --symmetric` output. `zipcrypto` opens old encrypted ZIP entries.

## 🤖 Agents

```bash
ciphers mcp
claude mcp add --transport http ciphers https://ciphers.agntn.dev/mcp # nothing to install
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

There's one tool per command, with the same list for stdio MCP, HTTP, Pi, OMP and the AI SDK. Names and arguments live in the [Agents guide](https://ciphers.agntn.dev/guide/agents). The HTTP server runs on a Cloudflare worker, so public puzzle material only.

Arguments are checked against the schema before a cipher sees them. A wrong key is a tool error with the reason in it, not a dead session.

A model that doesn't know what Bifid takes calls `ciphers_info` first, the encode and decode descriptions say so. And a decoded ciphertext is data: `IGNORE PREVIOUS INSTRUCTIONS` falling out of a ROT13 is the answer to the puzzle, not a new task.

### AI SDK

Install the optional AI SDK 7 peer and your model provider:

```bash
pnpm add @agntn/ciphers ai @ai-sdk/anthropic
```

```ts
import { anthropic } from '@ai-sdk/anthropic'
import { ciphersAiTools } from '@agntn/ciphers/ai'
import { generateText, isStepCount } from 'ai'

const { text } = await generateText({
  model: anthropic('claude-sonnet-5-5'),
  tools: ciphersAiTools,
  stopWhen: isStepCount(5),
  prompt: 'Somebody Caesar-shifted this, crack it: WKH TXLFN EURZQ IRA',
})
```

One import gives your app every tool MCP has. No wrappers to write, which leaves more time for the puzzle. A refused call goes back to the model as a tool error, and the ciphers still run locally.

## 🚫 What this does not do

Cryptography you'd trust with anything. The classical ones fall to anyone with a laptop and an afternoon. That's the point: puzzles, CTFs and teaching. The modern ones are here for the CTF that uses them. Mostly in ECB, the mode that leaks which blocks repeat. RC4 is here too, and RFC 7465 threw it out of TLS in 2015. All of it is plain TypeScript that never tried to be constant time.

No hashing, no wallet keys, no base encodings. Hashes are [@agntn/hashes](https://github.com/agntn/hashes). Keys and signatures are [@agntn/keys](https://github.com/agntn/keys), and even those want nothing to do with real money. Base64, base58 and friends have no key to break, so they're [@agntn/encodings](https://github.com/agntn/encodings).

## ➕ Adding a cipher

Want a seventy-sixth? Extend `Cipher` with `name()`, `info()`, `encode()` and `decode()`. Then `register('name', YourCipher)` and `create('name')` works. The walkthrough is at [Custom ciphers](https://ciphers.agntn.dev/guide/custom). Sending it here as a built-in? You'll need a vector from outside the code under test. [CONTRIBUTING.md](./CONTRIBUTING.md) has the rest.

## 🛠️ Development

```bash
pnpm install      # library and docs site
pnpm dev          # obuild --stub
pnpm check        # oxfmt --check, oxlint, tsc over the library, the extensions and the tests
pnpm test         # vitest through vite-plus
pnpm build        # obuild
pnpm run docs     # Nuxt site, bundled straight from src/
```

## 💛 Thanks

This package gets built on tools that Anthropic and OpenAI hand to open source projects, [Claude for Open Source](https://claude.com/contact-sales/claude-for-oss) and [Codex for Open Source](https://developers.openai.com/community/codex-for-oss). Thank you <3

## 📄 License

[MIT](./LICENSE)
