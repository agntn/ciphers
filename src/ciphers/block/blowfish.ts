import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types'
import { Cipher } from '../../core/cipher'
import { normalizeError } from '../../core/errors'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../core/block-mode'

const BLOCK_SIZE = 8
const ROUNDS = 16

interface BlowfishTables {
  /** The 18 round subkeys. */
  p: readonly number[]
  /** Four S-boxes of 256 words. */
  s: readonly (readonly number[])[]
}

let piWords: readonly number[] | undefined

/**
 * The words of the fractional part of π that Blowfish starts from, 18 for the P-array and then
 * 1024 for the four S-boxes, as Schneier's 1993 paper specifies. They are computed with Machin's
 * formula, π = 16·arctan(1/5) − 4·arctan(1/239), in fixed point with 64 guard bits, once, instead
 * of shipping them as 8336 hex digits.
 *
 * @returns {number[]} 1042 words, `0x243f6a88` first.
 */
function blowfishPi(): readonly number[] {
  if (piWords) return piWords
  const words = 18 + 4 * 256
  const bits = BigInt(32 * words + 64)
  const one = 1n << bits
  const arctanInverse = (x: bigint): bigint => {
    let power = one / x
    let sum = power
    for (let n = 3n, sign = -1n; power !== 0n; n += 2n, sign = -sign) {
      power /= x * x
      sum += (sign * power) / n
    }
    return sum
  }
  const pi = 16n * arctanInverse(5n) - 4n * arctanInverse(239n)
  const fraction = (pi - (3n << bits)) >> 64n
  const hex = fraction.toString(16).padStart(8 * words, '0')
  piWords = Array.from({ length: words }, (_, i) =>
    Number.parseInt(hex.slice(8 * i, 8 * i + 8), 16),
  )
  return piWords
}

function f(s: BlowfishTables['s'], x: number): number {
  const sum = (s[0]![x >>> 24]! + s[1]![(x >>> 16) & 0xff]!) >>> 0
  return ((sum ^ s[2]![(x >>> 8) & 0xff]!) + s[3]![x & 0xff]!) >>> 0
}

/**
 * Sixteen Feistel rounds on two 32-bit halves. Decryption is the same network with the P-array
 * reversed.
 *
 * @param left - The high word.
 * @param right - The low word.
 * @param p - 18 subkeys, in the order the rounds use them.
 * @param s - The four S-boxes.
 * @returns {[number, number]} The two output words.
 */
function feistel(
  left: number,
  right: number,
  p: readonly number[],
  s: BlowfishTables['s'],
): [number, number] {
  for (let i = 0; i < ROUNDS; i++) {
    left = (left ^ p[i]!) >>> 0
    right = (right ^ f(s, left)) >>> 0
    ;[left, right] = [right, left]
  }
  return [(right ^ p[ROUNDS + 1]!) >>> 0, (left ^ p[ROUNDS]!) >>> 0]
}

/**
 * The key schedule of the paper: XOR the key, repeated as often as it takes, into the P-array,
 * then encrypt a zero block over and over and let the output replace P and the S-boxes in turn,
 * 521 encryptions in all.
 *
 * @param key - 4 to 56 key bytes.
 * @returns {BlowfishTables} The keyed P-array and S-boxes.
 */
function keySchedule(key: Bytes): BlowfishTables {
  const pi = blowfishPi()
  const p = pi.slice(0, ROUNDS + 2).map((word, i) => {
    let keyWord = 0
    for (let j = 0; j < 4; j++) keyWord = (keyWord << 8) | key[(4 * i + j) % key.length]!
    return (word ^ keyWord) >>> 0
  })
  const s = Array.from({ length: 4 }, (_, box) =>
    pi.slice(ROUNDS + 2 + 256 * box, ROUNDS + 2 + 256 * (box + 1)),
  )
  let block: [number, number] = [0, 0]
  for (const table of [p, ...s]) {
    for (let i = 0; i < table.length; i += 2) {
      block = feistel(block[0], block[1], p, s)
      ;[table[i], table[i + 1]] = block
    }
  }
  return { p, s }
}

/**
 * Run each 8-byte block through Blowfish on its own, the way ECB does. Equal plaintext blocks
 * come out as equal ciphertext blocks.
 *
 * @param data - Whole blocks to transform.
 * @param key - 4 to 56 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function blowfishEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const { p, s } = keySchedule(key)
  const subkeys = operation === 'encrypt' ? p : p.toReversed()
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    const words = [0, 4].map((start) =>
      data.slice(offset + start, offset + start + 4).reduce((word, byte) => (word << 8) | byte, 0),
    )
    for (const word of feistel(words[0]!, words[1]!, subkeys, s)) {
      output.push(word >>> 24, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff)
    }
  }
  return output
}

const BLOWFISH: BlockMode = {
  name: 'blowfish',
  label: 'Blowfish ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: Array.from({ length: 53 }, (_, i) => 8 + 2 * i),
  keyError: 'must be an even number of hex digits from 8 to 112 (a 32 to 448-bit Blowfish key)',
  run: blowfishEcb,
}

export class Blowfish extends Cipher {
  name(): string {
    return 'blowfish'
  }

  info(): CipherInfo {
    return {
      name: 'blowfish',
      label: 'Blowfish (ECB)',
      description:
        "Blowfish, Bruce Schneier's 1993 cipher, in ECB mode: 16 Feistel rounds on 8-byte blocks with S-boxes built from the key, starting from the digits of pi. Each block goes through on its own, so equal plaintext blocks give equal ciphertext blocks. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'An even number of hex digits from 8 to 112, a 32 to 448-bit key',
        },
      ],
      keyspace: '2^32 to 2^448 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(BLOWFISH, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'blowfish')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(BLOWFISH, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'blowfish')
    }
  }
}
