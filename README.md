# @agntn/ciphers

[![npm version](https://npmx.dev/api/registry/badge/version/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![npm downloads](https://npmx.dev/api/registry/badge/downloads/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![license](https://npmx.dev/api/registry/badge/license/@agntn/ciphers)](https://npmx.dev/package/@agntn/ciphers)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/agntn/ciphers)

🔐 Sixty ciphers, one call. `ATTACK AT DAWN` goes in, `DWWDFN DW GDZQ` comes out, and the way back is the same call with `decode`. Terminal, TypeScript, agent or browser tab, and nothing ever leaves the machine.

## Why?

The puzzle says the answer is in a Vigenère, so you open a cipher site. The key field wants uppercase, J quietly became I, and the third tab does Playfair differently than the second one. Now hand that to an agent and it will do the Vigenère in its head and be wrong from the fourth letter on, confidently. So: one `encode` and one `decode` with the same options everywhere, and tools a model can call instead of counting on its fingers.

Docs, and a playground where the library runs in your browser: [ciphers.agntn.dev](https://ciphers.agntn.dev).

> [!CAUTION]
> **Not audited.** This code has never had a security audit. Do not use it in production, with real funds or with sensitive data. It is meant for agents, puzzles and local experiments only. It comes as is, without warranty of any kind, and the authors are not liable for any loss, as the MIT license states. Anything that matters wants an audited library.

## ✨ Features

- 🔡 **Sixty ciphers.** Caesar, ROT13, ROT47, Atbash, keyword substitution, Vigenère, Gronsfeld with a PIN for a key, Beaufort, Porta with its two quarrelling tables, Autokey, Trithemius, Alberti, rail fence, affine, Playfair, Hill with its matrices, Polybius, the Nihilist sums that run past 100, Morse, Bacon, tap code, A1Z26 with its single digit cousin, the book cipher Beale used, columnar, the route transposition with its spirals, ADFGVX, bifid, the VIC straddling checkerboard and Enigma M3, plus AES and Triple DES in ECB and CBC mode, AES in CFB, OFB, CTR, CCM, OCB, LRW and XTS mode, CBC-MAC over AES, the passphrase format CryptoJS writes, Rijndael with the wider blocks AES dropped, plain DES, DESX, Blowfish, IDEA, Lucifer, the IBM cipher DES came from, two AES finalists, IBM's MARS and Serpent, CAST5 from the old OpenPGP menu, and the passphrase messages `gpg --symmetric` writes. Then the stream ones, Rabbit from RFC 4503, RC4, the 1987 trade secret that leaked in 1994, plain repeating-key XOR, and Bernstein's dancers: Salsa20, XSalsa20, ChaCha20, XChaCha20 and ChaCha20-Poly1305.
- 🔁 **Same call on all of them.** `create('vigenere').encode(text, { key })`, swap the name and the options, and the result says which cipher, which operation and which options it actually used.
- 🔨 **Brute force built in.** All 25 Caesar shifts in one command, so nobody has to try them by hand ever again.
- 📊 **Frequencies and the index of coincidence.** Tells you whether it's one alphabet or several before you burn an hour on the wrong attack. English, Polish and Japanese romaji reference orders.
- 🧭 **Ciphers describe themselves.** `info()` has the category, the family, the options, the keyspace, what the cipher works on and whether encode and decode are the same thing, and the CLI, the tools and the playground all read it from there.
- 🖥️ **CLI, library, MCP, Pi and OMP.** The same tools and one set of executors behind them, whichever one you're holding. No Node at hand? [ciphers.agntn.dev/mcp](https://ciphers.agntn.dev/guide/agents#remote-mcp) serves them over HTTP.
- 🌐 **Runs in the browser too.** The playground imports the package into the page, nothing is posted anywhere.
- 🧱 **Bounded on purpose.** Text and keys have a maximum length in every tool schema, so a model can't hand the process a novel to shift.
- 🧩 **Your cipher in one class.** Extend `Cipher`, `register()` it, and `create()` finds it like any built-in.

## 📦 Install

```bash
pnpm add @agntn/ciphers
```

Node.js 26 or newer. No native anything, no network, no keys to sign up for, it's all string work.

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

`frequency` prints the histogram and the index of coincidence. Around 0.065 it's one alphabet with English underneath (0.057 with Polish, about 0.082 with Japanese romaji), down near 0.038 the alphabet keeps changing and you want a key length, not a histogram. That's `period`. It ranks the lengths by column IoC and Kasiski, and hands you a Vigenère key for the top three. Want the key itself? `recover` searches it for Vigenère, both Beauforts, a mixed alphabet substitution or a columnar transposition, and ranks what it finds by how well the text reads. No idea what you're even holding? `guess` reads the layout and the letters and names the likely families, with the call to try next. Got a `U2FsdGVkX1` blob and a passphrase, but not the digest or key length? `probe` tries them all and tells you how many hits are luck. Two ciphertexts under the same XOR key? `crib` slides a guessed word across them and shows what reads. And when nothing's encrypted at all and the message hides in the first letters, `hidden` tries the usual places and puts the reading that looks like English on top.

### Commands

| Command     | What it does                                        | Example                                                |
| ----------- | --------------------------------------------------- | ------------------------------------------------------ |
| `encode`    | Plaintext in, ciphertext out                        | `ciphers encode vigenere "ATTACK AT DAWN" --key LEMON` |
| `decode`    | The other way, same flags                           | `ciphers decode vigenere "LXFOPV EF RNHR" --key LEMON` |
| `brute`     | All 25 Caesar shifts, best fit first                | `ciphers brute "DWWDFN DW GDZQ"`                       |
| `frequency` | Letter histogram and the index of coincidence       | `ciphers frequency "DWWDFN DW GDZQ" --lang en`         |
| `period`    | Vigenère key length, with the likely key            | `ciphers period "<ciphertext>" --max-period 30`        |
| `guess`     | Likely cipher families and what to run next         | `ciphers guess "<ciphertext>" --lang pl`               |
| `probe`     | Which KDF settings open a `Salted__` blob           | `ciphers probe "U2FsdGVkX1..." --key secret`           |
| `crib`      | Crib dragging over ciphertexts under one reused key | `ciphers crib '["<hex>","<hex>"]' --crib " the "`      |
| `hidden`    | A message hidden by position, best readings first   | `ciphers hidden "$(cat poem.txt)" --pick line`         |
| `recover`   | Searched keys, best first, each with its plaintext  | `ciphers recover "<ciphertext>" --cipher substitution` |
| `info`      | Every cipher by category, or one cipher up close    | `ciphers info enigma`                                  |
| `ciphers`   | Same as `info`, for old habits                      | `ciphers ciphers --category stream`                    |
| `mcp`       | The MCP server on stdio                             | `ciphers mcp`                                          |

A cipher's options are its flags: `--key`, `--transposition`, `--square`, `--rotation`, `--shift`, `--rails`, `--period`, `--letters`, `--a`, `--b` and the three Enigma ones. Which cipher takes which is `ciphers info <name>`, or the [CLI guide](https://ciphers.agntn.dev/guide/cli).

Each command is one of the agent tools, built by `runCli` from [`@agntn/tools`](https://tools.agntn.dev/guide/cli). So the CLI refuses exactly what a model gets refused, in the same words, and `--json` prints the details a model gets. Morse that starts with a dash? Just type it. `-.-.` spells no flag, so it's read as the text, and a misspelled flag after it still gets refused.

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

That's nearly all of it. `create()` wants the exact registered name and hands you one cached instance per cipher. `resolveCipher()` lowercases and turns spaces into hyphens, so `'Rail Fence'` works and `'railfence'` doesn't, there is no fuzzy matching on purpose. Every result carries `cipher`, `operation` and the `options` that were applied, so one logged result is enough to repeat the call. Holding raw bytes? `ecb(data, key, 'encrypt')` and `ctr(data, key, counter)` from `@agntn/ciphers/aes` take a `Uint8Array` and give one back, no padding and no hex. Wrong key, shift out of range, unknown name: one `CipherError` family, and the message names the option or the cipher. The rest: [Transform](https://ciphers.agntn.dev/guide/transform), [Analysis](https://ciphers.agntn.dev/guide/analysis), [Custom ciphers](https://ciphers.agntn.dev/guide/custom).

## 🔡 Ciphers

| Cipher                      | Family                      | Self-inverse | Options                                                    |
| --------------------------- | --------------------------- | :----------: | ---------------------------------------------------------- |
| **caesar**                  | substitution-shift          |      ✗       | `--shift` (1-25, default 3)                                |
| **rot13**                   | substitution-shift          |      ✓       | -                                                          |
| **rot47**                   | substitution-shift          |      ✓       | -                                                          |
| **atbash**                  | substitution-reflection     |      ✓       | -                                                          |
| **substitution**            | substitution-keyed          |      ✗       | `--key` (alphabet or keyword, required)                    |
| **vigenere**                | polyalphabetic              |      ✗       | `--key` (required)                                         |
| **gronsfeld**               | polyalphabetic              |      ✗       | `--key` (digits 0 to 9, required)                          |
| **beaufort**                | polyalphabetic              |      ✓       | `--key` (required)                                         |
| **porta**                   | polyalphabetic              |      ✓       | `--key` (required), `--rotation` (left or right)           |
| **autokey**                 | polyalphabetic              |      ✗       | `--key` (required)                                         |
| **trithemius**              | polyalphabetic              |      ✗       | -                                                          |
| **alberti**                 | polyalphabetic              |      ✗       | `--key`, `--period` (both required)                        |
| **rail-fence**              | transposition               |      ✗       | `--rails` (default 3)                                      |
| **affine**                  | substitution-multiplicative |      ✗       | `--a` (multiplier), `--b` (shift)                          |
| **playfair**                | digraph                     |      ✗       | `--key` (required)                                         |
| **hill**                    | polygraphic                 |      ✗       | `--key` (4 or 9 letters, required)                         |
| **polybius**                | fractionation               |      ✗       | `--key` (optional)                                         |
| **nihilist**                | fractionation               |      ✗       | `--key` (required), `--square` (optional)                  |
| **morse**                   | fractionation               |      ✗       | -                                                          |
| **bacon**                   | fractionation               |      ✗       | `--letters` (24 or 26, default 26)                         |
| **tap-code**                | fractionation               |      ✗       | -                                                          |
| **a1z26**                   | fractionation               |      ✗       | `--separator` (default -), `--zero`                        |
| **book**                    | homophonic                  |      ✗       | `--book` (required), `--address`, `--pick`, `--start`      |
| **columnar**                | transposition               |      ✗       | `--key` (required)                                         |
| **route**                   | transposition               |      ✗       | `--width` (required), `--corner`, `--path`                 |
| **adfgvx**                  | fractionation               |      ✗       | `--key`, `--transposition` (both optional)                 |
| **bifid**                   | fractionation               |      ✗       | `--key` (optional), `--period` (default 5)                 |
| **straddling-checkerboard** | fractionation               |      ✗       | `--key` (optional), `--blanks` (default 26)                |
| **enigma**                  | rotor                       |      ✓       | `--positions`, `--rings`, `--plugboard`                    |
| **aes**                     | substitution-permutation    |      ✗       | `--key` (hex, required)                                    |
| **aes-cbc**                 | substitution-permutation    |      ✗       | `--key`, `--iv` (hex, both required)                       |
| **aes-cfb**                 | substitution-permutation    |      ✗       | `--key`, `--iv` (hex), `--segment`                         |
| **aes-ofb**                 | substitution-permutation    |      ✗       | `--key`, `--iv` (hex, both required)                       |
| **aes-ctr**                 | substitution-permutation    |      ✗       | `--key`, `--iv` (hex, both required)                       |
| **aes-ccm**                 | substitution-permutation    |      ✗       | `--key`, `--nonce` (hex), `--aad`, `--tag-length`          |
| **aes-ocb**                 | substitution-permutation    |      ✗       | `--key`, `--nonce` (hex), `--aad`, `--tag-length`          |
| **aes-lrw**                 | substitution-permutation    |      ✗       | `--key` (hex, required), `--tweak`                         |
| **aes-xts**                 | substitution-permutation    |      ✗       | `--key` (hex, required), `--tweak`                         |
| **aes-cbc-mac**             | substitution-permutation    |      ✗       | `--key` (hex, required)                                    |
| **aes-passphrase**          | substitution-permutation    |      ✗       | `--key` (text), `--digest`, `--key-length`, `--iterations` |
| **rijndael**                | substitution-permutation    |      ✗       | `--key` (hex, required), `--block-size`                    |
| **des**                     | feistel                     |      ✗       | `--key` (hex, required)                                    |
| **desx**                    | feistel                     |      ✗       | `--key` (hex, required)                                    |
| **triple-des**              | feistel                     |      ✗       | `--key` (hex, required)                                    |
| **triple-des-cbc**          | feistel                     |      ✗       | `--key`, `--iv` (hex, both required)                       |
| **blowfish**                | feistel                     |      ✗       | `--key` (hex, required)                                    |
| **idea**                    | lai-massey                  |      ✗       | `--key` (hex, required)                                    |
| **lucifer**                 | feistel                     |      ✗       | `--key` (hex, required)                                    |
| **mars**                    | feistel                     |      ✗       | `--key` (hex, required)                                    |
| **serpent**                 | substitution-permutation    |      ✗       | `--key` (hex, required)                                    |
| **cast5**                   | feistel                     |      ✗       | `--key` (hex, required)                                    |
| **openpgp**                 | substitution-permutation    |      ✗       | `--key` (text), `--algorithm`, `--digest`, `--count`       |
| **rabbit**                  | arx                         |      ✗       | `--key` (hex, required), `--iv`, `--endian`                |
| **rc4**                     | permutation                 |      ✗       | `--key` (hex, required)                                    |
| **xor**                     | polyalphabetic              |      ✗       | `--key` (hex, required), `--bytes`                         |
| **salsa20**                 | arx                         |      ✗       | `--key`, `--nonce` (hex, both required), `--counter`       |
| **xsalsa20**                | arx                         |      ✗       | `--key`, `--nonce` (hex, both required), `--counter`       |
| **chacha20**                | arx                         |      ✗       | `--key`, `--nonce` (hex, both required), `--counter`       |
| **xchacha20**               | arx                         |      ✗       | `--key`, `--nonce` (hex, both required), `--counter`       |
| **chacha20-poly1305**       | arx                         |      ✗       | `--key`, `--nonce` (hex, both required), `--aad`           |

Playfair and Polybius fold J into I, tap code shares C and K, Bacon is the 26-letter variant unless `letters` says 24, and Alberti is a keyed disk that turns every `period` letters, not a reenactment of the original. One page per cipher, rules and vectors included: [Ciphers](https://ciphers.agntn.dev/ciphers).

The block ciphers start with AES and Triple DES. They take UTF-8 text, pad it with PKCS#7 and give hex back. Got plaintext that isn't text, like a raw key or another ciphertext? `--bytes hex` takes it in as hex and gives it back as hex. The stream ciphers take it too. The key is hex too: 32, 48 or 64 digits for AES, 32 or 48 for Triple DES. Every block goes through on its own, that's ECB. So two equal blocks of plaintext come out as two equal blocks of ciphertext. `aes-cbc` chains them instead. Each block gets XORed with the ciphertext block before it, the first one with `--iv`, which is 32 hex digits and required. `triple-des-cbc` chains Triple DES the same way, but its blocks are 8 bytes, so its `--iv` is 16 digits. `aes-cfb` takes the same `--iv` and turns AES into a keystream. `--segment` says how many bits go per step, 1, 8 or 128 (default 128). Nothing gets padded, so the ciphertext has exactly as many bytes as the text. `aes-ofb` takes `--iv` as well and feeds AES its own output, block after block, so the keystream never touches the text and nothing gets padded either. `aes-ctr` is a keystream too, only simpler. `--iv` is the first counter block, AES encrypts it, and the counter goes up by one for every next block. No feedback at all, so encrypt and decrypt are literally the same thing. `aes-ccm` is CTR with a tag on the end. `--nonce` is 14 to 26 hex digits, `--aad` is optional hex that the tag covers but nobody encrypts, and `--tag-length` is in bits (default 128). Decode checks the tag first, so a changed byte, a wrong key or a wrong nonce is an error, not garbage. `aes-ocb` takes the same flags and gets its tag in the same AES pass that encrypts. `--nonce` is 2 to 30 hex digits there, and `--tag-length` is 64, 96 or 128. Or there's `aes-lrw`, the LRW mode from the IEEE P1619 drafts. Its key is the AES key plus 32 more digits for a tweak key, and every block gets masked by its own index, counted from `--tweak` (default 1). Equal blocks at different places stop looking equal. `aes-xts` is what IEEE picked instead of LRW, and what LUKS runs on by default. The key is two AES keys back to back, 64 or 128 digits, and `--tweak` is the sector number (default 0). It pads nothing and steals from the block before when the last one comes up short, so the text needs 16 bytes at least. `aes-cbc-mac` encrypts nothing. It runs CBC with a zero IV, keeps only the last block and puts it after the text bytes as a tag. Decode checks the tag and gives the text back. Just `--key`, nothing else. `aes-passphrase` is the odd one. It opens what `CryptoJS.AES.encrypt(message, passphrase)` leaves on a page, base64 starting with `U2FsdGVkX1`, and `--key` is the passphrase itself, plain text. MD5 turns it and the salt into the AES key and IV. A stock `openssl enc` has used SHA-256 there since 1.1.0, so its output needs `--digest sha256`. When a page bumps CryptoJS's `keySize` or the KDF iterations, `--key-length` (bits, keySize times 32) and `--iterations` follow it. And `rijndael` is what AES was cut from. NIST kept only the 128-bit block, Rijndael also has 160, 192, 224 and 256, and `--block-size` picks one (default 128, which is plain AES). Keys of 40 and 56 digits work there too. `des` is plain DES, the one Triple DES runs three times. Its key is 16 hex digits, 56 bits once the parity bits are gone, and like `triple-des` it's ECB over 8-byte blocks. `desx` wraps that DES in two XORs, one 64-bit key before and one after, which makes brute force hopeless for almost no extra work. Its key is 48 digits: the DES key, then the XOR going in, then the one going out, in the order OpenSSL uses. `blowfish` is Schneier's cipher from 1993, 8-byte blocks in ECB like `triple-des`. Its key is any even number of hex digits from 8 to 112, and it builds its S-boxes out of that key and the digits of pi. `idea` is the cipher from PGP 2, the same 8-byte blocks in ECB and a key of exactly 32 hex digits. It has no S-boxes at all, only XOR, addition and multiplication on 16-bit words. `lucifer` goes back further, to the IBM cipher that DES was cut down from. It's the version Sorkin published in 1984, with the fix he sent in later that year. The blocks are 16 bytes like in AES, and the key is 32 hex digits. `mars` is what IBM sent to the AES competition in 1998. Same 16-byte blocks, and a key of 32 to 112 hex digits in steps of 8. Its S-box has 512 words, and this package grows them from SHA-1 the way IBM's paper says instead of storing them. `serpent` came second to Rijndael in that competition, slower but with more rounds to spare. It takes the same keys as `aes`, and runs 32 small 4-bit S-boxes side by side over the block, 32 rounds of it. `cast5` is CAST-128 from RFC 2144, the cipher OpenPGP once told everyone to carry next to AES. 8-byte blocks in ECB again, and a key of 10 to 32 hex digits. And `openpgp` opens what `gpg --symmetric` writes. Paste the whole `-----BEGIN PGP MESSAGE-----` block as the text, dashes and all, pass the passphrase as `--key`, and the cipher, the hash and the compression come out of the message itself. It reads IDEA, Triple DES, CAST5, Blowfish and AES, ZIP and ZLIB, and checks the MDC, so a changed message is an error. The AEAD kind opens too, OCB from `gpg --force-ocb` or EAX and GCM from RFC 9580, and there every chunk carries its own tag. Encoding writes armor GnuPG opens, AES-256 unless `--algorithm` says otherwise.

`rabbit` has no blocks to pad. It's a stream cipher from 2003, one of the eSTREAM winners, and RFC 4503 describes it. The key is 32 hex digits, `--iv` is 16 and optional, and every step gives 16 bytes of keystream that get XORed into the text, so the ciphertext is as long as the text. No S-boxes, no tables, just additions, rotations and one squaring. The byte order is the RFC's by default, the same as in CyberChef. Code built on the eSTREAM reference, Crypto++ for one, reads the bytes the other way round, and `--endian little` gives what it gives.

`rc4` is older and much simpler. Ron Rivest wrote it in 1987 as an RSA trade secret, and in 1994 someone posted it to the Cypherpunks list. The key is any whole number of bytes from 1 to 256, in hex, and there's no IV. A password like `Secret` goes in as `536563726574`. The key shuffles a table of all 256 byte values, and every keystream byte is one more swap in that table. Nothing gets dropped from the start, so the output matches RFC 6229 and OpenSSL. Hex in a CTF and a short password next to it? Try this one first.

`xor` is the one every CTF starts with. The key bytes repeat under the text and get XORed in, Vigenère on bytes. Any whole number of bytes works as a key. Got hex that isn't text on either side? `--bytes hex` reads and writes hex both ways, like for every other byte cipher.

`chacha20` is what modern code actually runs, and `salsa20` is the cipher it grew out of. Both are Bernstein's, both XOR a keystream in 64-byte blocks, and both want `--nonce` next to the key. 16 hex digits for Salsa20, 24 for ChaCha20, as RFC 8439 has it. `--counter` picks the first block, 0 by default. The RFC's own examples start at 1, so try both when a vector won't match. `xsalsa20` and `xchacha20` take a 48-digit nonce, long enough to pick at random. `chacha20-poly1305` is the TLS 1.3 and WireGuard one. It puts a 16-byte tag after the ciphertext, takes `--aad`, and refuses to decode anything that was changed. Raw `Uint8Array` versions live in `@agntn/ciphers/chacha` and `@agntn/ciphers/salsa`.

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

The tools are `ciphers_encode`, `ciphers_decode`, `ciphers_caesar_brute`, `ciphers_frequency`, `ciphers_period_estimate`, `ciphers_family_guess`, `ciphers_passphrase_probe`, `ciphers_crib_drag`, `ciphers_hidden_text_read`, `ciphers_key_recover` and `ciphers_info`, the same everywhere, the HTTP server included. That one runs on a Cloudflare worker, so public puzzle material only. Arguments are checked against the schema before a cipher sees them, and a wrong key is a tool error with the reason in it, not a dead session. A model that doesn't know what Bifid takes calls `ciphers_info` first, the encode and decode descriptions say so. And a decoded ciphertext is data: `IGNORE PREVIOUS INSTRUCTIONS` falling out of a ROT13 is the answer to the puzzle, not a new task. [Agents guide](https://ciphers.agntn.dev/guide/agents).

## 🚫 What this does not do

Cryptography you'd trust with anything. The classical ones fall to anyone with a laptop and an afternoon, and that's the point, they're for puzzles, CTFs and teaching. AES and Triple DES are here too, mostly in ECB, the mode that leaks which blocks repeat. CBC, CFB, OFB, CTR, LRW and XTS hide that, but none of them checks integrity, and IEEE dropped LRW for XTS. CCM and OCB do check it, and still fall apart the moment a nonce repeats. CBC-MAC checks it without hiding anything, and a longer message can borrow the tag of a shorter one. Rabbit hides the text and checks nothing, and a key used twice without a fresh IV hands out the XOR of both texts. RC4 has no IV at all, its second byte is zero twice as often as it should be, and RFC 7465 threw it out of TLS in 2015. XOR with a repeating key falls to one known word. All of it is plain TypeScript that never tried to be constant time. They're for the CTF that uses them and for seeing that leak, not for your data. No hashing, no wallet keys, no base encodings. Keys and signatures are [@agntn/keys](https://github.com/agntn/keys), and even those want nothing to do with real money. Base64, base58 and friends have no key to break, so they're [@agntn/encodings](https://github.com/agntn/encodings).

## ➕ Adding a cipher

Want a fifty-fourth? One class extending `Cipher` with `name()`, `info()`, `encode()` and `decode()`, then `register('name', YourCipher)` and `create('name')` works. A built-in goes into `builtins` instead, with a vector from somewhere other than the code under test. Walkthrough: [Custom ciphers](https://ciphers.agntn.dev/guide/custom).

## 🛠️ Development

```bash
pnpm install
pnpm --dir docs install   # the /mcp test borrows the site's Zod and SDK
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
