import type { CipherInfo } from '../../core/types.ts'
import { type BlockMode, type Bytes, BlockCipher } from '../../core/block-mode.ts'

const BLOCK_SIZE = 16

/** The fixed patterns that the key schedule mixes into the multiplication keys. */
const PATTERNS = [0xa4a8d57b, 0x5b5d193b, 0xc8a8309b, 0x73f9a978]

let sbox: readonly number[] | undefined

function rotl(x: number, n: number): number {
  n &= 31
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

/**
 * SHA-1 of a message short enough for one 64-byte block, which the 16 bytes an S-box row hashes
 * always are.
 *
 * @param message - At most 55 bytes.
 * @returns {number[]} The five digest words, big-endian as FIPS 180 reads them.
 */
function sha1(message: readonly number[]): number[] {
  const block = new Uint8Array(64)
  block.set(message)
  block[message.length] = 0x80
  new DataView(block.buffer).setUint32(60, message.length * 8)
  const w = Array.from({ length: 80 }, (_, i) =>
    i < 16 ? new DataView(block.buffer).getUint32(4 * i) : 0,
  )
  for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!, 1)
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]
  let [a, b, c, d, e] = h as [number, number, number, number, number]
  for (let i = 0; i < 80; i++) {
    const [f, k] =
      i < 20
        ? [(b & c) | (~b & d), 0x5a827999]
        : i < 40
          ? [b ^ c ^ d, 0x6ed9eba1]
          : i < 60
            ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc]
            : [b ^ c ^ d, 0xca62c1d6]
    const t = (rotl(a, 5) + f + e + k + w[i]!) >>> 0
    ;[e, d, c, b, a] = [d, c, rotl(b, 30), a, t]
  }
  return [a, b, c, d, e].map((word, i) => (word + h[i]!) >>> 0)
}

/**
 * The 512-word S-box, built the way section 2.6 of IBM's submission describes it instead of
 * shipped as 4096 hex digits. Entry `5i + j` is word `j` of SHA-1 over the words `5i`,
 * `0xb7e15162`, `0x243f6a88` and `0x02917d59`, little-endian on both sides. Then, within each
 * 256-word half, going over the pairs in order, an entry that XORs to two or more zero bytes with
 * a later one is multiplied by 3. Nine entries change.
 *
 * @returns {number[]} S0 in the first 256 words, S1 in the rest.
 */
function marsSbox(): readonly number[] {
  if (sbox) return sbox
  const words: number[] = []
  const input = new DataView(new ArrayBuffer(16))
  for (const [i, word] of [0, 0xb7e15162, 0x243f6a88, 0x02917d59].entries()) {
    input.setUint32(4 * i, word, true)
  }
  for (let i = 0; words.length < 512; i++) {
    input.setUint32(0, 5 * i, true)
    for (const word of sha1([...new Uint8Array(input.buffer)])) {
      // The digest is bytes; MARS reads them back as little-endian words.
      words.push(
        ((word & 0xff) << 24) |
          (((word >>> 8) & 0xff) << 16) |
          (((word >>> 16) & 0xff) << 8) |
          (word >>> 24),
      )
    }
  }
  words.length = 512
  const zeroBytes = (x: number) =>
    [0, 8, 16, 24].filter((shift) => ((x >>> shift) & 0xff) === 0).length
  for (const start of [0, 256]) {
    for (let i = start; i < start + 256; i++) {
      for (let j = i + 1; j < start + 256; j++) {
        if (zeroBytes(words[i]! ^ words[j]!) >= 2) {
          words[i] = Math.imul(words[i]!, 3)
          break
        }
      }
    }
  }
  sbox = words.map((word) => word >>> 0)
  return sbox
}

/**
 * IBM's key schedule with the tweak NIST accepted in August 1999: the key words stirred through
 * the S-box into 40 words, then every multiplication key forced to end in binary 11 and cleared
 * of long runs of equal bits.
 *
 * @param key - 16 to 56 key bytes, a whole number of 32-bit words.
 * @returns {number[]} The 40 expanded key words.
 */
function keySchedule(key: Bytes): number[] {
  const s = marsSbox()
  const n = key.length / 4
  const t = Array.from<number>({ length: 15 }).fill(0)
  for (let i = 0; i < n; i++) {
    t[i] =
      (key[4 * i]! | (key[4 * i + 1]! << 8) | (key[4 * i + 2]! << 16) | (key[4 * i + 3]! << 24)) >>>
      0
  }
  t[n] = n
  const k: number[] = []
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 15; i++) {
      t[i] = (t[i]! ^ rotl(t[(i + 8) % 15]! ^ t[(i + 13) % 15]!, 3) ^ (4 * i + j)) >>> 0
    }
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < 15; i++) t[i] = rotl((t[i]! + s[t[(i + 14) % 15]! & 0x1ff]!) >>> 0, 9)
    }
    for (let i = 0; i < 10; i++) k.push(t[(4 * i) % 15]!)
  }
  for (let i = 5; i < 37; i += 2) {
    const w = (k[i]! | 3) >>> 0
    // Bit l of the mask is set when bit l of w sits inside a run of ten or more equal bits,
    // together with both of its neighbours; bits 0, 1 and 31 never are.
    let m = (~w ^ (w << 1)) & (~w ^ (w >>> 1)) & 0x7ffffffe
    m &= m >>> 1
    m &= m >>> 2
    m &= m >>> 4
    m |= m << 1
    m |= m << 2
    m |= m << 4
    m &= 0x7ffffffc
    k[i] = (w ^ (rotl(PATTERNS[k[i]! & 3]!, k[i - 1]!) & m)) >>> 0
  }
  return k
}

/**
 * The E-function of the core rounds: one 32-bit word and two keys in, three words out.
 *
 * @param input - The source word of the round.
 * @param k1 - The additive key word.
 * @param k2 - The multiplicative key word.
 * @param s - The S-box.
 * @returns {[number, number, number]} `l`, `m` and `r` in the paper's names.
 */
function e(input: number, k1: number, k2: number, s: readonly number[]): [number, number, number] {
  const m = (input + k1) >>> 0
  const r = rotl(Math.imul(rotl(input, 13), k2), 10)
  const l = rotl(s[m & 0x1ff]! ^ rotl(r, 27) ^ r, r)
  return [l, rotl(m, rotl(r, 27)), r]
}

/**
 * One block through the 32 rounds of MARS: key addition, eight unkeyed forward mixing rounds,
 * sixteen keyed core rounds, eight backwards mixing rounds and key subtraction.
 *
 * @param d - Four little-endian words, A first.
 * @param k - The 40 expanded key words.
 * @param s - The S-box.
 * @returns {number[]} The four output words, A first.
 */
function encryptBlock(d: readonly number[], k: readonly number[], s: readonly number[]): number[] {
  let [a, b, c, x] = d.map((word, i) => (word + k[i]!) >>> 0) as [number, number, number, number]
  for (let i = 0; i < 8; i++) {
    b = ((b ^ s[a & 0xff]!) + s[256 + ((a >>> 8) & 0xff)]!) >>> 0
    c = (c + s[(a >>> 16) & 0xff]!) >>> 0
    x = (x ^ s[256 + (a >>> 24)]!) >>> 0
    a = rotl(a, 8)
    if (i % 4 === 0) a = (a + x) >>> 0
    if (i % 4 === 1) a = (a + b) >>> 0
    ;[a, b, c, x] = [b, c, x, a]
  }
  for (let i = 0; i < 16; i++) {
    const [l, m, r] = e(a, k[2 * i + 4]!, k[2 * i + 5]!, s)
    c = (c + m) >>> 0
    if (i < 8) {
      b = (b + l) >>> 0
      x = (x ^ r) >>> 0
    } else {
      x = (x + l) >>> 0
      b = (b ^ r) >>> 0
    }
    ;[a, b, c, x] = [b, c, x, rotl(a, 13)]
  }
  for (let i = 0; i < 8; i++) {
    if (i % 4 === 2) a = (a - x) >>> 0
    if (i % 4 === 3) a = (a - b) >>> 0
    b = (b ^ s[256 + (a & 0xff)]!) >>> 0
    c = (c - s[a >>> 24]!) >>> 0
    x = ((x - s[256 + ((a >>> 16) & 0xff)]!) ^ s[(a >>> 8) & 0xff]!) >>> 0
    ;[a, b, c, x] = [b, c, x, rotl(a, 24)]
  }
  return [a, b, c, x].map((word, i) => (word - k[36 + i]!) >>> 0)
}

/**
 * The inverse of `encryptBlock`, step by step from the end.
 *
 * @param d - Four little-endian words, A first.
 * @param k - The 40 expanded key words.
 * @param s - The S-box.
 * @returns {number[]} The four plaintext words, A first.
 */
function decryptBlock(d: readonly number[], k: readonly number[], s: readonly number[]): number[] {
  let [a, b, c, x] = d.map((word, i) => (word + k[36 + i]!) >>> 0) as [
    number,
    number,
    number,
    number,
  ]
  for (let i = 7; i >= 0; i--) {
    const mixed = rotl(x, 8)
    ;[a, b, c, x] = [
      mixed,
      (a ^ s[256 + (mixed & 0xff)]!) >>> 0,
      (b + s[mixed >>> 24]!) >>> 0,
      ((c ^ s[(mixed >>> 8) & 0xff]!) + s[256 + ((mixed >>> 16) & 0xff)]!) >>> 0,
    ]
    if (i % 4 === 2) a = (a + x) >>> 0
    if (i % 4 === 3) a = (a + b) >>> 0
  }
  for (let i = 15; i >= 0; i--) {
    ;[a, b, c, x] = [rotl(x, 19), a, b, c]
    const [l, m, r] = e(a, k[2 * i + 4]!, k[2 * i + 5]!, s)
    c = (c - m) >>> 0
    if (i < 8) {
      b = (b - l) >>> 0
      x = (x ^ r) >>> 0
    } else {
      x = (x - l) >>> 0
      b = (b ^ r) >>> 0
    }
  }
  for (let i = 7; i >= 0; i--) {
    let mixed = x
    if (i % 4 === 0) mixed = (mixed - c) >>> 0
    if (i % 4 === 1) mixed = (mixed - a) >>> 0
    const original = rotl(mixed, 24)
    ;[a, b, c, x] = [
      original,
      ((a - s[256 + ((original >>> 8) & 0xff)]!) ^ s[original & 0xff]!) >>> 0,
      (b - s[(original >>> 16) & 0xff]!) >>> 0,
      (c ^ s[256 + (original >>> 24)]!) >>> 0,
    ]
  }
  return [a, b, c, x].map((word, i) => (word - k[i]!) >>> 0)
}

/**
 * Run each 16-byte block through MARS on its own, the way ECB does. Blocks and key are read as
 * little-endian words, as IBM's test vectors expect.
 *
 * @param data - Whole blocks to transform.
 * @param key - 16 to 56 key bytes, a whole number of 32-bit words.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function marsEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const s = marsSbox()
  const k = keySchedule(key)
  const crypt = operation === 'encrypt' ? encryptBlock : decryptBlock
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    const words = [0, 4, 8, 12].map(
      (i) =>
        (data[offset + i]! |
          (data[offset + i + 1]! << 8) |
          (data[offset + i + 2]! << 16) |
          (data[offset + i + 3]! << 24)) >>>
        0,
    )
    for (const word of crypt(words, k, s)) {
      output.push(word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, word >>> 24)
    }
  }
  return output
}

const MARS: BlockMode = {
  name: 'mars',
  label: 'MARS ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: Array.from({ length: 11 }, (_, i) => 32 + 8 * i),
  keyError: 'must be 32 to 112 hex digits in steps of 8 (a MARS key of 4 to 14 words)',
  run: marsEcb,
}

export class Mars extends BlockCipher {
  name(): string {
    return 'mars'
  }

  info(): CipherInfo {
    return {
      name: 'mars',
      label: 'MARS (ECB)',
      description:
        "MARS, IBM's AES finalist from 1998, in ECB mode: 32 rounds of a type-3 Feistel network over 16-byte blocks, eight unkeyed mixing rounds on each side of sixteen keyed ones, with a 512-word S-box built from SHA-1 and a key of 4 to 14 words. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32 to 112 hex digits in steps of 8, a 128 to 448-bit key',
        },
      ],
      keyspace: '2^128 to 2^448 keys',
    }
  }

  protected mode(): BlockMode {
    return MARS
  }
}
