import type { Bytes } from '../../../core/block-mode.ts'
import { bytesLe, checkCounter, rotl, wordsLe, xorKeystream } from '../words.ts'

/** "expand 32-byte k", the diagonal of the state for a 256-bit key. */
const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574] as const

/** "expand 16-byte k", the diagonal for a 128-bit key, which then fills both key rows. */
const TAU = [0x61707865, 0x3120646e, 0x79622d36, 0x6b206574] as const

/** The largest block counter kept exact: the 64-bit counter goes through a JavaScript number. */
export const SALSA_MAX_COUNTER = Number.MAX_SAFE_INTEGER

/**
 * The 20 rounds of Salsa20, columns then rows, without adding the input back.
 *
 * @param input - The 16 state words.
 * @returns {number[]} The 16 words after the rounds.
 */
export function salsaRounds(input: readonly number[]): number[] {
  const x = [...input]
  const quarter = (a: number, b: number, c: number, d: number): void => {
    x[b] = (x[b]! ^ rotl((x[a]! + x[d]!) >>> 0, 7)) >>> 0
    x[c] = (x[c]! ^ rotl((x[b]! + x[a]!) >>> 0, 9)) >>> 0
    x[d] = (x[d]! ^ rotl((x[c]! + x[b]!) >>> 0, 13)) >>> 0
    x[a] = (x[a]! ^ rotl((x[d]! + x[c]!) >>> 0, 18)) >>> 0
  }
  for (let round = 0; round < 10; round++) {
    quarter(0, 4, 8, 12)
    quarter(5, 9, 13, 1)
    quarter(10, 14, 2, 6)
    quarter(15, 3, 7, 11)
    quarter(0, 1, 2, 3)
    quarter(5, 6, 7, 4)
    quarter(10, 11, 8, 9)
    quarter(15, 12, 13, 14)
  }
  return x
}

/**
 * Constants on the diagonal, the key in words 1 to 4 and 11 to 14, `middle` in 6 to 9.
 *
 * @param key - 16 or 32 key bytes.
 * @param middle - 16 bytes: nonce and counter, or the HSalsa20 nonce.
 * @returns {number[]} The 16 state words.
 */
function salsaState(key: Bytes, middle: Bytes): number[] {
  const [c0, c1, c2, c3] = key.length === 16 ? TAU : SIGMA
  const k = wordsLe(key.length === 16 ? [...key, ...key] : key)
  return [c0, ...k.slice(0, 4), c1, ...wordsLe(middle), c2, ...k.slice(4), c3]
}

/**
 * The Salsa20 hash over one block: the state through the rounds, plus the state again.
 *
 * @param key - 16 or 32 key bytes.
 * @param nonce - 8 nonce bytes.
 * @param counter - The 64-bit block counter, at most 2^53 - 1.
 * @returns {number[]} 64 bytes of keystream.
 */
export function salsaBlock(key: Bytes, nonce: Bytes, counter: number): number[] {
  const low = counter % 2 ** 32
  const high = (counter - low) / 2 ** 32
  const state = salsaState(key, [...nonce, ...bytesLe([low, high])])
  const mixed = salsaRounds(state)
  return bytesLe(mixed.map((word, i) => (word + state[i]!) >>> 0))
}

/**
 * HSalsa20 of "Extending the Salsa20 nonce": words 0, 5, 10, 15 and 6 to 9, nothing added back.
 *
 * @param key - 32 key bytes.
 * @param nonce - 16 nonce bytes.
 * @returns {number[]} A 32-byte subkey.
 */
export function hsalsa20(key: Bytes, nonce: Bytes): number[] {
  const mixed = salsaRounds(salsaState(key, nonce))
  return bytesLe([0, 5, 10, 15, 6, 7, 8, 9].map((i) => mixed[i]!))
}

/**
 * Salsa20/20, which encrypts and decrypts alike.
 *
 * @param data - Any number of bytes.
 * @param key - 16 or 32 key bytes.
 * @param nonce - 8 nonce bytes.
 * @param counter - The first block counter.
 * @returns {number[]} As many bytes as came in.
 * @throws {InvalidOptionError} When the data needs a counter past 2^53 - 1.
 */
export function salsa20Xor(data: Bytes, key: Bytes, nonce: Bytes, counter: number): number[] {
  checkCounter(counter, data.length, SALSA_MAX_COUNTER)
  return xorKeystream(data, (index) => salsaBlock(key, nonce, counter + index))
}
