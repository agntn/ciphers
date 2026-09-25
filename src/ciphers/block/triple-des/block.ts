import type { Bytes } from '../../../core/block-mode.ts'

/** Bits as 0 and 1, most significant first, numbered from 1 in the FIPS 46-3 tables. */
type Bits = readonly number[]

// FIPS 46-3, the tables in the order the standard prints them.
const INITIAL_PERMUTATION = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64,
  56, 48, 40, 32, 24, 16, 8, 57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53,
  45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7,
] as const

const FINAL_PERMUTATION: number[] = []
for (const [i, position] of INITIAL_PERMUTATION.entries()) FINAL_PERMUTATION[position - 1] = i + 1

const EXPANSION = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19,
  20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
] as const

const PERMUTATION = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13,
  30, 6, 22, 11, 4, 25,
] as const

const PERMUTED_CHOICE_1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60,
  52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21,
  13, 5, 28, 20, 12, 4,
] as const

const PERMUTED_CHOICE_2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52,
  31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
] as const

/** Left rotations of the two 28-bit key halves before each of the 16 rounds. */
const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1] as const

/** S1 to S8, each four rows of sixteen. */
const SBOXES = [
  [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11,
    9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5,
    11, 3, 14, 10, 0, 6, 13,
  ],
  [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10,
    6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2,
    11, 6, 7, 12, 0, 5, 14, 9,
  ],
  [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12,
    11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4,
    15, 14, 3, 11, 5, 2, 12,
  ],
  [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1,
    10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9,
    4, 5, 11, 12, 7, 2, 14,
  ],
  [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10,
    3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6,
    15, 0, 9, 10, 4, 5, 3,
  ],
  [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14,
    0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10,
    11, 14, 1, 7, 6, 0, 8, 13,
  ],
  [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12,
    2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9,
    5, 0, 15, 14, 2, 3, 12,
  ],
  [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11,
    0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13,
    15, 12, 9, 0, 3, 5, 6, 11,
  ],
] as const

function toBits(bytes: Bytes): Bits {
  return bytes.flatMap((byte) => Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1))
}

function toBytes(bits: Bits): number[] {
  return Array.from({ length: bits.length / 8 }, (_, i) =>
    bits.slice(8 * i, 8 * i + 8).reduce((byte, bit) => (byte << 1) | bit, 0),
  )
}

function permute(bits: Bits, table: readonly number[]): Bits {
  return table.map((position) => bits[position - 1]!)
}

function xor(a: Bits, b: Bits): Bits {
  return a.map((bit, i) => bit ^ b[i]!)
}

function rotateLeft(bits: Bits, count: number): Bits {
  return [...bits.slice(count), ...bits.slice(0, count)]
}

/**
 * FIPS 46-3 key schedule. The parity bit of every key byte is dropped by PC-1, so keys that
 * differ only there give the same subkeys.
 *
 * @param key - 8 key bytes.
 * @returns {Bits[]} The 16 round subkeys of 48 bits, in encryption order.
 */
function subkeys(key: Bytes): Bits[] {
  const halves = permute(toBits(key), PERMUTED_CHOICE_1)
  let c: Bits = halves.slice(0, 28)
  let d: Bits = halves.slice(28)
  return SHIFTS.map((shift) => {
    c = rotateLeft(c, shift)
    d = rotateLeft(d, shift)
    return permute([...c, ...d], PERMUTED_CHOICE_2)
  })
}

/**
 * The round function f: expand to 48 bits, mix in the subkey, S-boxes back to 32, permute.
 *
 * @param right - The 32-bit right half.
 * @param subkey - The 48-bit subkey of this round.
 * @returns {Bits} 32 bits to XOR into the left half.
 */
function feistel(right: Bits, subkey: Bits): Bits {
  const mixed = xor(permute(right, EXPANSION), subkey)
  const substituted = SBOXES.flatMap((box, i) => {
    const six = mixed.slice(6 * i, 6 * i + 6)
    const row = (six[0]! << 1) | six[5]!
    const column = (six[1]! << 3) | (six[2]! << 2) | (six[3]! << 1) | six[4]!
    const value = box[16 * row + column]!
    return [(value >> 3) & 1, (value >> 2) & 1, (value >> 1) & 1, value & 1]
  })
  return permute(substituted, PERMUTATION)
}

/**
 * The 16 rounds on one block. Decryption is the same network with the subkeys reversed.
 *
 * @param block - 8 bytes.
 * @param keys - The 16 subkeys, in the order the rounds use them.
 * @returns {Bytes} The transformed 8 bytes.
 */
function desRounds(block: Bytes, keys: readonly Bits[]): Bytes {
  const bits = permute(toBits(block), INITIAL_PERMUTATION)
  let left: Bits = bits.slice(0, 32)
  let right: Bits = bits.slice(32)
  for (const key of keys) [left, right] = [right, xor(left, feistel(right, key))]
  return toBytes(permute([...right, ...left], FINAL_PERMUTATION))
}

/**
 * Single DES on one block, the DEA of FIPS 46-3.
 *
 * @param key - 8 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {(block: Bytes) => Bytes} A transform for one 8-byte block.
 */
export function desBlock(key: Bytes, operation: 'encrypt' | 'decrypt'): (block: Bytes) => Bytes {
  const keys = subkeys(key)
  const ordered = operation === 'encrypt' ? keys : keys.toReversed()
  return (block) => desRounds(block, ordered)
}

/**
 * Triple DES on one block, the TDEA of NIST SP 800-67. Encryption is encrypt-decrypt-encrypt
 * (EDE) under K1, K2 and K3, decryption the reverse; a 16-byte key is K1 and K2 with K3 = K1.
 *
 * @param key - 16 or 24 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {(block: Bytes) => Bytes} A transform for one 8-byte block.
 */
export function tripleDesBlock(
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
): (block: Bytes) => Bytes {
  const encrypt = [0, 8, key.length === 24 ? 16 : 0].map((start) =>
    subkeys(key.slice(start, start + 8)),
  )
  const decrypt = encrypt.map((keys) => keys.toReversed())
  const steps =
    operation === 'encrypt'
      ? [encrypt[0]!, decrypt[1]!, encrypt[2]!]
      : [decrypt[2]!, encrypt[1]!, decrypt[0]!]
  return (block) => steps.reduce((bytes, keys) => desRounds(bytes, keys), block)
}
