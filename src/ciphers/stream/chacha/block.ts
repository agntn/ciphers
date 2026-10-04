import type { Bytes } from '../../../core/block-mode.ts'
import { bytesLe, checkCounter, rotl, wordsLe, xorKeystream } from '../words.ts'

/** "expand 32-byte k" as four little-endian words, the first row of every ChaCha state. */
const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574] as const

/** The largest block counter of RFC 8439, which keeps it in one 32-bit word. */
export const CHACHA_MAX_COUNTER = 0xffffffff

/**
 * The 20 rounds of RFC 8439 §2.3, without adding the input back.
 *
 * @param input - The 16 state words.
 * @returns {number[]} The 16 words after the rounds.
 */
export function chachaRounds(input: readonly number[]): number[] {
  const x = [...input]
  const quarter = (a: number, b: number, c: number, d: number): void => {
    x[a] = (x[a]! + x[b]!) >>> 0
    x[d] = rotl(x[d]! ^ x[a]!, 16)
    x[c] = (x[c]! + x[d]!) >>> 0
    x[b] = rotl(x[b]! ^ x[c]!, 12)
    x[a] = (x[a]! + x[b]!) >>> 0
    x[d] = rotl(x[d]! ^ x[a]!, 8)
    x[c] = (x[c]! + x[d]!) >>> 0
    x[b] = rotl(x[b]! ^ x[c]!, 7)
  }
  for (let round = 0; round < 10; round++) {
    quarter(0, 4, 8, 12)
    quarter(1, 5, 9, 13)
    quarter(2, 6, 10, 14)
    quarter(3, 7, 11, 15)
    quarter(0, 5, 10, 15)
    quarter(1, 6, 11, 12)
    quarter(2, 7, 8, 13)
    quarter(3, 4, 9, 14)
  }
  return x
}

/**
 * The ChaCha20 block function of RFC 8439 §2.3: 64 bytes of keystream for one counter.
 *
 * @param key - 32 key bytes.
 * @param counter - The 32-bit block counter.
 * @param nonce - 12 nonce bytes.
 * @returns {number[]} 64 bytes of keystream.
 */
export function chachaBlock(key: Bytes, counter: number, nonce: Bytes): number[] {
  const state = [...SIGMA, ...wordsLe(key), counter, ...wordsLe(nonce)]
  const mixed = chachaRounds(state)
  return bytesLe(mixed.map((word, i) => (word + state[i]!) >>> 0))
}

/**
 * HChaCha20 of draft-irtf-cfrg-xchacha §2.2: first and last rows, nothing added back.
 *
 * @param key - 32 key bytes.
 * @param nonce - 16 nonce bytes.
 * @returns {number[]} A 32-byte subkey.
 */
export function hchacha20(key: Bytes, nonce: Bytes): number[] {
  const mixed = chachaRounds([...SIGMA, ...wordsLe(key), ...wordsLe(nonce)])
  return bytesLe([...mixed.slice(0, 4), ...mixed.slice(12)])
}

/**
 * ChaCha20 of RFC 8439 §2.4, which encrypts and decrypts alike.
 *
 * @param data - Any number of bytes.
 * @param key - 32 key bytes.
 * @param nonce - 12 nonce bytes.
 * @param counter - The first block counter.
 * @returns {number[]} As many bytes as came in.
 * @throws {InvalidOptionError} When the data needs a counter past 2^32 - 1.
 */
export function chacha20Xor(data: Bytes, key: Bytes, nonce: Bytes, counter: number): number[] {
  checkCounter(counter, data.length, CHACHA_MAX_COUNTER)
  return xorKeystream(data, (index) => chachaBlock(key, counter + index, nonce))
}
