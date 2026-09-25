import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { normalizeError } from '../../core/errors.ts'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../core/block-mode.ts'

const BLOCK_SIZE = 16

/** The fractional part of the golden ratio, mixed into every prekey word. */
const PHI = 0x9e3779b9

/** The eight 4-bit S-boxes, S0 to S7, from table 1 of the submission. */
const SBOXES: readonly (readonly number[])[] = [
  [3, 8, 15, 1, 10, 6, 5, 11, 14, 13, 4, 2, 7, 0, 9, 12],
  [15, 12, 2, 7, 9, 0, 5, 10, 1, 11, 14, 8, 6, 13, 3, 4],
  [8, 6, 7, 9, 3, 12, 10, 15, 13, 1, 14, 4, 0, 11, 5, 2],
  [0, 15, 11, 8, 12, 9, 6, 3, 13, 1, 2, 4, 10, 7, 5, 14],
  [1, 15, 8, 3, 12, 0, 11, 6, 2, 5, 4, 10, 9, 14, 7, 13],
  [15, 5, 2, 11, 4, 10, 9, 12, 0, 3, 14, 8, 13, 6, 7, 1],
  [7, 2, 12, 5, 8, 4, 6, 11, 14, 9, 1, 15, 13, 3, 10, 0],
  [1, 13, 15, 0, 14, 8, 2, 11, 7, 4, 12, 10, 9, 3, 5, 6],
]

const INVERSE_SBOXES = SBOXES.map((box) => {
  const inverse = Array.from<number>({ length: 16 })
  for (const [input, output] of box.entries()) inverse[output] = input
  return inverse
})

type Words = readonly [number, number, number, number]

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
}

/**
 * One S-box in bitslice mode: bit `j` of the four words makes a nibble, word 0 the lowest bit,
 * and the S-box output goes back to bit `j` the same way. Bitslice mode has none of the initial
 * and final permutations of the submission's standard mode, so the words go in as they are.
 *
 * @param box - A 16-entry S-box or its inverse.
 * @param x - The four words.
 * @returns {Words} The four substituted words.
 */
function substitute(box: readonly number[], x: Words): Words {
  const out: [number, number, number, number] = [0, 0, 0, 0]
  for (let j = 0; j < 32; j++) {
    const nibble =
      box[
        ((x[0] >>> j) & 1) |
          (((x[1] >>> j) & 1) << 1) |
          (((x[2] >>> j) & 1) << 2) |
          (((x[3] >>> j) & 1) << 3)
      ]!
    for (let bit = 0; bit < 4; bit++) out[bit] = (out[bit]! | (((nibble >>> bit) & 1) << j)) >>> 0
  }
  return out
}

/**
 * The linear transformation between rounds, section 2.2 of the submission.
 *
 * @param x - The four words after the S-box.
 * @returns {Words} The four mixed words.
 */
function transform(x: Words): Words {
  let [x0, x1, x2, x3] = x
  x0 = rotl(x0, 13)
  x2 = rotl(x2, 3)
  x1 = (x1 ^ x0 ^ x2) >>> 0
  x3 = (x3 ^ x2 ^ (x0 << 3)) >>> 0
  x1 = rotl(x1, 1)
  x3 = rotl(x3, 7)
  x0 = (x0 ^ x1 ^ x3) >>> 0
  x2 = (x2 ^ x3 ^ (x1 << 7)) >>> 0
  return [rotl(x0, 5), x1, rotl(x2, 22), x3]
}

/**
 * `transform` run backwards.
 *
 * @param x - Four mixed words.
 * @returns {Words} The four words as they left the S-box.
 */
function untransform(x: Words): Words {
  let [x0, x1, x2, x3] = x
  x2 = rotr(x2, 22)
  x0 = rotr(x0, 5)
  x2 = (x2 ^ x3 ^ (x1 << 7)) >>> 0
  x0 = (x0 ^ x1 ^ x3) >>> 0
  x3 = rotr(x3, 7)
  x1 = rotr(x1, 1)
  x3 = (x3 ^ x2 ^ (x0 << 3)) >>> 0
  x1 = (x1 ^ x0 ^ x2) >>> 0
  return [rotr(x0, 13), x1, rotr(x2, 3), x3]
}

/**
 * Four words as a tuple.
 *
 * @param get - Word `i` for `i` from 0 to 3.
 * @returns {Words} The four words in order.
 */
function fourWords(get: (i: number) => number): Words {
  return [get(0), get(1), get(2), get(3)]
}

function xor(x: Words, k: Words): Words {
  return [(x[0] ^ k[0]) >>> 0, (x[1] ^ k[1]) >>> 0, (x[2] ^ k[2]) >>> 0, (x[3] ^ k[3]) >>> 0]
}

/**
 * The key schedule: the key padded to 256 bits with a single 1 bit, stretched into 132 prekey
 * words by the golden ratio recurrence, then every four words put through S-box 3, 2, 1, 0, 7
 * and so on into the 33 round keys.
 *
 * @param key - 16, 24 or 32 key bytes, read as little-endian words.
 * @returns {Words[]} The 33 round keys.
 */
function keySchedule(key: Bytes): Words[] {
  const w: number[] = Array.from<number>({ length: 8 }).fill(0)
  for (let i = 0; i < key.length; i++) w[i >>> 2] = (w[i >>> 2]! | (key[i]! << (8 * (i & 3)))) >>> 0
  if (key.length < 32) w[key.length >>> 2] = (w[key.length >>> 2]! | 1) >>> 0
  for (let i = 0; i < 132; i++) {
    w.push(rotl((w[i]! ^ w[i + 3]! ^ w[i + 5]! ^ w[i + 7]! ^ PHI ^ i) >>> 0, 11))
  }
  return Array.from({ length: 33 }, (_, i) =>
    substitute(
      SBOXES[(35 - i) % 8]!,
      fourWords((j) => w[8 + 4 * i + j]!),
    ),
  )
}

function encryptBlock(x: Words, k: readonly Words[]): Words {
  for (let round = 0; round < 32; round++) {
    x = substitute(SBOXES[round % 8]!, xor(x, k[round]!))
    x = round < 31 ? transform(x) : xor(x, k[32]!)
  }
  return x
}

function decryptBlock(x: Words, k: readonly Words[]): Words {
  for (let round = 31; round >= 0; round--) {
    x = round < 31 ? untransform(x) : xor(x, k[32]!)
    x = xor(substitute(INVERSE_SBOXES[round % 8]!, x), k[round]!)
  }
  return x
}

/**
 * Run each 16-byte block through Serpent on its own, the way ECB does. Blocks and key are read
 * as little-endian words, the byte order libgcrypt and Botan use. Code that reads them the other
 * way round gives other ciphertext for the same key.
 *
 * @param data - Whole blocks to transform.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function serpentEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const k = keySchedule(key)
  const crypt = operation === 'encrypt' ? encryptBlock : decryptBlock
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    const words = fourWords(
      (j) =>
        (data[offset + 4 * j]! |
          (data[offset + 4 * j + 1]! << 8) |
          (data[offset + 4 * j + 2]! << 16) |
          (data[offset + 4 * j + 3]! << 24)) >>>
        0,
    )
    for (const word of crypt(words, k)) {
      output.push(word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, word >>> 24)
    }
  }
  return output
}

const SERPENT: BlockMode = {
  name: 'serpent',
  label: 'Serpent ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit Serpent key)',
  run: serpentEcb,
}

export class Serpent extends Cipher {
  name(): string {
    return 'serpent'
  }

  info(): CipherInfo {
    return {
      name: 'serpent',
      label: 'Serpent (ECB)',
      description:
        "Serpent, Anderson, Biham and Knudsen's AES finalist from 1998, in ECB mode: 32 rounds of a substitution-permutation network over 16-byte blocks, eight 4-bit S-boxes applied in bitslice mode, and a 128, 192 or 256-bit key. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32, 48 or 64 hex digits, a 128, 192 or 256-bit key',
        },
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(SERPENT, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'serpent')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(SERPENT, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'serpent')
    }
  }
}
