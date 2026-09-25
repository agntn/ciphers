import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { normalizeError } from '../../core/errors.ts'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../core/block-mode.ts'

const BLOCK_SIZE = 16
const ROUNDS = 16

/** The two 4-bit S-boxes: S0 takes the high nibble of a byte, S1 the low one. */
const S0 = [12, 15, 7, 10, 14, 13, 11, 0, 2, 6, 3, 1, 9, 4, 5, 8]
const S1 = [7, 2, 14, 9, 3, 11, 0, 4, 12, 13, 1, 10, 6, 15, 8, 5]

/** The fixed permutation inside a byte: bit `i` of the output is bit `PERMUTATION[i]` of the input. */
const PERMUTATION = [2, 5, 4, 0, 3, 1, 7, 6]

/** Diffusion: bit `i` of the permuted byte `j` lands in byte `(DIFFUSION[i] + j) mod 8`. */
const DIFFUSION = [7, 6, 2, 1, 5, 0, 3, 4]

/**
 * One bit of a byte, counted from 0 at the high end as Sorkin counts them.
 *
 * @param byte - A byte.
 * @param i - Bit index, 0 for the high bit.
 * @returns {number} 0 or 1.
 */
function bit(byte: number, i: number): number {
  return (byte >> (7 - i)) & 1
}

/**
 * Sixteen Feistel rounds on one block, as Sorkin's FORTRAN does them after his correction in
 * Cryptologia 8(3), July 1984. A round reads eight key bytes, from `7 * round mod 16` on, since the
 * key register turns 56 bits a round. The first of them is also the transform control byte: bit
 * `j` of it swaps the nibbles of byte `j` before the S-boxes. Decryption runs the rounds with the
 * key bytes of the last round first.
 *
 * @param block - 16 bytes, the lower half first.
 * @param key - 16 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed 16 bytes.
 */
function crypt(block: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  let lower = block.slice(0, 8)
  let upper = block.slice(8)
  for (let round = 0; round < ROUNDS; round++) {
    const start = 7 * (operation === 'encrypt' ? round : ROUNDS - 1 - round)
    const control = key[start % 16]!
    const next = [...lower]
    for (let j = 0; j < 8; j++) {
      let byte = upper[j]!
      if (bit(control, j)) byte = ((byte & 0x0f) << 4) | (byte >> 4)
      const substituted = (S0[byte >> 4]! << 4) | S1[byte & 0x0f]!
      const interrupted = substituted ^ key[(start + j) % 16]!
      for (let i = 0; i < 8; i++) {
        next[(DIFFUSION[i]! + j) % 8]! ^= bit(interrupted, PERMUTATION[i]!) << (7 - i)
      }
    }
    lower = upper
    upper = next
  }
  return [...upper, ...lower]
}

/**
 * Run each 16-byte block through Lucifer on its own, the way ECB does.
 *
 * @param data - Whole blocks to transform.
 * @param key - 16 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function luciferEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const result: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    result.push(...crypt(data.slice(offset, offset + BLOCK_SIZE), key, operation))
  }
  return result
}

const LUCIFER: BlockMode = {
  name: 'lucifer',
  label: 'Lucifer ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32],
  keyError: 'must be 32 hex digits (a 128-bit Lucifer key)',
  run: luciferEcb,
}

export class Lucifer extends Cipher {
  name(): string {
    return 'lucifer'
  }

  info(): CipherInfo {
    return {
      name: 'lucifer',
      label: 'Lucifer (ECB)',
      description:
        "Lucifer, IBM's cipher that DES grew out of, as Arthur Sorkin published it in 1984, in ECB mode: sixteen Feistel rounds over 16-byte blocks with two 4-bit S-boxes and a 128-bit key, each block on its own. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'feistel',
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
    try {
      return encodeBlocks(LUCIFER, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'lucifer')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(LUCIFER, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'lucifer')
    }
  }
}
