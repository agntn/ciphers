import type { CipherBaseOptions } from '../../core/types.ts'
import { getOpt } from '../../core/types.ts'
import { CipherError, InvalidOptionError, MissingOptionError } from '../../core/errors.ts'
import type { Bytes } from '../../core/block-mode.ts'
import { readHex } from '../../core/block-mode.ts'

/** Bytes in one keystream block of Salsa20 and ChaCha. */
export const KEYSTREAM_BLOCK = 64

/**
 * Rotate a 32-bit word left.
 *
 * @param word - An unsigned 32-bit word.
 * @param bits - 1 to 31.
 * @returns {number} The rotated word, unsigned.
 */
export function rotl(word: number, bits: number): number {
  return ((word << bits) | (word >>> (32 - bits))) >>> 0
}

/**
 * Bytes as little-endian 32-bit words, four bytes each.
 *
 * @param bytes - A multiple of four bytes.
 * @returns {number[]} One unsigned word per four bytes.
 */
export function wordsLe(bytes: Bytes): number[] {
  return Array.from(
    { length: bytes.length / 4 },
    (_, i) =>
      (bytes[4 * i]! |
        (bytes[4 * i + 1]! << 8) |
        (bytes[4 * i + 2]! << 16) |
        (bytes[4 * i + 3]! << 24)) >>>
      0,
  )
}

/**
 * 32-bit words as little-endian bytes.
 *
 * @param words - Unsigned 32-bit words.
 * @returns {number[]} Four bytes per word.
 */
export function bytesLe(words: readonly number[]): number[] {
  return words.flatMap((word) => [
    word & 0xff,
    (word >>> 8) & 0xff,
    (word >>> 16) & 0xff,
    word >>> 24,
  ])
}

/**
 * XOR a keystream in 64-byte blocks; a short last block takes the first bytes of its block.
 *
 * @param data - Any number of bytes.
 * @param block - The keystream block for a block index, counted from 0.
 * @returns {number[]} As many bytes as came in.
 */
export function xorKeystream(data: Bytes, block: (index: number) => Bytes): number[] {
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += KEYSTREAM_BLOCK) {
    const keystream = block(offset / KEYSTREAM_BLOCK)
    const chunk = data.slice(offset, offset + KEYSTREAM_BLOCK)
    output.push(...chunk.map((byte, i) => byte ^ keystream[i]!))
  }
  return output
}

/**
 * Refuse a block counter that runs past `max` before the last block of `length` bytes.
 *
 * @param counter - The first block counter.
 * @param length - Data length in bytes.
 * @param max - The largest counter the cipher has room for.
 * @throws {InvalidOptionError} When the data needs a block past `max`.
 */
export function checkCounter(counter: number, length: number, max: number): void {
  const last = counter + Math.ceil(length / KEYSTREAM_BLOCK) - 1
  if (last > max) {
    throw new InvalidOptionError(
      'counter',
      counter,
      `runs past ${max} before the last 64-byte block of ${length} bytes`,
    )
  }
}

/** What Salsa20 and ChaCha read besides the key: a nonce in hex and the first block counter. */
export type NonceSettings = { nonce: string; counter: number }

/**
 * Read the required `nonce` and the optional `counter` (default 0).
 *
 * @param options - The options passed to the cipher.
 * @param nonceBytes - Nonce length in bytes.
 * @param maxCounter - The largest block counter accepted.
 * @param counterRule - Why another counter is refused.
 * @returns {NonceSettings} The nonce as lowercase hex and the counter.
 */
export function readNonceSettings(
  options: Readonly<CipherBaseOptions>,
  nonceBytes: number,
  maxCounter: number,
  counterRule: string,
): NonceSettings {
  if (options.nonce === undefined || options.nonce === '') throw new MissingOptionError('nonce')
  const nonce = readHex(
    options.nonce,
    'nonce',
    (digits) => digits === 2 * nonceBytes,
    `must be ${2 * nonceBytes} hex digits (a ${8 * nonceBytes}-bit nonce)`,
  )
  const counter = getOpt<unknown>(options, 'counter', 0)
  if (
    typeof counter !== 'number' ||
    !Number.isInteger(counter) ||
    counter < 0 ||
    counter > maxCounter
  ) {
    throw new InvalidOptionError('counter', counter, counterRule)
  }
  return { nonce, counter }
}

/**
 * Refuse a raw byte argument of another type or length, naming its length, never its bytes.
 *
 * @param option - Argument name for the error.
 * @param value - The argument.
 * @param lengths - Accepted lengths in bytes.
 * @throws {InvalidOptionError} For anything else.
 */
export function checkBytes(option: string, value: Uint8Array, lengths: readonly number[]): void {
  if (value instanceof Uint8Array && lengths.includes(value.length)) return
  const shape = value instanceof Uint8Array ? `${value.length} bytes` : typeof value
  const accepted =
    lengths.length === 1
      ? `${lengths[0]}`
      : `${lengths.slice(0, -1).join(', ')} or ${lengths.at(-1)}`
  throw new InvalidOptionError(option, shape, `must be a Uint8Array of ${accepted} bytes`)
}

/**
 * Refuse data for the raw functions that is not a `Uint8Array`.
 *
 * @param cipher - Cipher name for the error prefix.
 * @param data - The data.
 * @throws {CipherError} For anything else.
 */
export function checkData(cipher: string, data: Uint8Array): void {
  if (!(data instanceof Uint8Array)) {
    throw new CipherError(`[${cipher}] Data must be a Uint8Array, got ${typeof data}`)
  }
}

/**
 * Refuse a block counter for the raw functions that is not a whole number from 0 to `max`.
 *
 * @param counter - The counter.
 * @param max - The largest accepted counter.
 * @throws {InvalidOptionError} For anything else.
 */
export function checkCounterValue(counter: number, max: number): void {
  if (Number.isInteger(counter) && counter >= 0 && counter <= max) return
  throw new InvalidOptionError('counter', counter, `must be a whole number from 0 to ${max}`)
}
