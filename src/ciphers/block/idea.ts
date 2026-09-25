import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../core/block-mode.ts'

const BLOCK_SIZE = 8
const ROUNDS = 8

/**
 * Multiplication modulo 2^16 + 1, with the word 0 standing for 2^16. The product stays below
 * 2^33, well inside the integers a double holds exactly.
 *
 * @param a - A 16-bit word.
 * @param b - A 16-bit word.
 * @returns {number} The product as a 16-bit word.
 */
function mul(a: number, b: number): number {
  return (((a || 0x10000) * (b || 0x10000)) % 0x10001) & 0xffff
}

function add(a: number, b: number): number {
  return (a + b) & 0xffff
}

/**
 * The inverse under `mul`, by Fermat: x^(2^16 - 1) modulo the prime 2^16 + 1.
 *
 * @param x - A 16-bit word, 0 meaning 2^16.
 * @returns {number} The word that `mul` takes back to 1.
 */
function mulInverse(x: number): number {
  let result = 1
  let base = x || 0x10000
  for (let exponent = 0xffff; exponent > 0; exponent >>>= 1) {
    if (exponent & 1) result = (result * base) % 0x10001
    base = (base * base) % 0x10001
  }
  return result & 0xffff
}

function addInverse(x: number): number {
  return -x & 0xffff
}

/**
 * The 52 encryption subkeys: the 128-bit key cut into eight 16-bit words, then the key rotated
 * left by 25 bits and cut again, until there are six for each of the eight rounds and four for the
 * output transformation.
 *
 * @param key - 16 key bytes.
 * @returns {number[]} 52 words, in the order encryption uses them.
 */
function encryptionKeys(key: Bytes): number[] {
  let k = key.reduce((value, byte) => (value << 8n) | BigInt(byte), 0n)
  const mask = (1n << 128n) - 1n
  const subkeys: number[] = []
  while (subkeys.length < 6 * ROUNDS + 4) {
    for (let shift = 112n; shift >= 0n && subkeys.length < 6 * ROUNDS + 4; shift -= 16n) {
      subkeys.push(Number((k >> shift) & 0xffffn))
    }
    k = ((k << 25n) | (k >> 103n)) & mask
  }
  return subkeys
}

/**
 * The decryption subkeys, which run the same rounds backwards: the inverses of the encryption
 * keys in reverse order, the two additive ones swapped everywhere except in the first and last
 * group, since the rounds swap the middle words and the output transformation does not.
 *
 * @param encryption - The 52 encryption subkeys.
 * @returns {number[]} 52 words, in the order decryption uses them.
 */
function decryptionKeys(encryption: readonly number[]): number[] {
  const subkeys: number[] = []
  for (let round = 0; round <= ROUNDS; round++) {
    const at = 6 * (ROUNDS - round)
    const outer = round === 0 || round === ROUNDS
    subkeys.push(
      mulInverse(encryption[at]!),
      addInverse(encryption[at + (outer ? 1 : 2)]!),
      addInverse(encryption[at + (outer ? 2 : 1)]!),
      mulInverse(encryption[at + 3]!),
    )
    if (round < ROUNDS) subkeys.push(encryption[at - 2]!, encryption[at - 1]!)
  }
  return subkeys
}

/**
 * Eight rounds and the output transformation on one 64-bit block as four 16-bit words.
 * Decryption is the same function with the decryption subkeys.
 *
 * @param block - 8 bytes.
 * @param subkeys - 52 encryption or decryption subkeys.
 * @returns {number[]} The transformed 8 bytes.
 */
function crypt(block: Bytes, subkeys: readonly number[]): number[] {
  const word = (i: number) => (block[i]! << 8) | block[i + 1]!
  let [x1, x2, x3, x4] = [word(0), word(2), word(4), word(6)]
  for (let round = 0; round < ROUNDS; round++) {
    const k = subkeys.slice(6 * round, 6 * round + 6)
    const a = mul(x1, k[0]!)
    const b = add(x2, k[1]!)
    const c = add(x3, k[2]!)
    const d = mul(x4, k[3]!)
    const e = mul(a ^ c, k[4]!)
    const f = mul(add(b ^ d, e), k[5]!)
    const g = add(e, f)
    ;[x1, x2, x3, x4] = [a ^ f, c ^ f, b ^ g, d ^ g]
  }
  const k = subkeys.slice(6 * ROUNDS)
  const words = [mul(x1, k[0]!), add(x3, k[1]!), add(x2, k[2]!), mul(x4, k[3]!)]
  return words.flatMap((word) => [word >>> 8, word & 0xff])
}

/**
 * Run each 8-byte block through IDEA on its own, the way ECB does.
 *
 * @param data - Whole blocks to transform.
 * @param key - 16 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function ideaEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const encryption = encryptionKeys(key)
  const subkeys = operation === 'encrypt' ? encryption : decryptionKeys(encryption)
  const result: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    result.push(...crypt(data.slice(offset, offset + BLOCK_SIZE), subkeys))
  }
  return result
}

const IDEA: BlockMode = {
  name: 'idea',
  label: 'IDEA ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32],
  keyError: 'must be 32 hex digits (a 128-bit IDEA key)',
  run: ideaEcb,
}

export class Idea extends Cipher {
  name(): string {
    return 'idea'
  }

  info(): CipherInfo {
    return {
      name: 'idea',
      label: 'IDEA (ECB)',
      description:
        "IDEA, Lai and Massey's 1991 cipher from early PGP, in ECB mode: eight and a half rounds that mix XOR, addition modulo 2^16 and multiplication modulo 2^16 + 1 over 8-byte blocks, each block on its own. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'lai-massey',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32 hex digits (a 128-bit key)',
        },
      ],
      keyspace: '2^128 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return encodeBlocks(IDEA, text, options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return decodeBlocks(IDEA, text, options)
  }
}
