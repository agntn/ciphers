import { SALSA_MAX_COUNTER, salsa20Xor } from './ciphers/stream/salsa/block.ts'
import { xsalsa20Xor } from './ciphers/stream/salsa/xsalsa20.ts'
import { checkBytes, checkCounterValue, checkData } from './ciphers/stream/words.ts'

/**
 * Salsa20/20 on raw bytes; decrypting is the same call.
 *
 * @param data - Any number of bytes; empty gives empty.
 * @param key - 16 or 32 bytes.
 * @param nonce - 8 bytes.
 * @param counter - Block counter of the first 64 bytes, 0 to 2^53 - 1.
 * @returns {Uint8Array} The XORed data, a new array.
 * @throws {InvalidOptionError} For a bad key, nonce or counter, or a counter the data runs past.
 * @throws {CipherError} When the data is not a `Uint8Array`.
 */
export function salsa20(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  counter = 0,
): Uint8Array {
  checkBytes('key', key, [16, 32])
  checkBytes('nonce', nonce, [8])
  checkCounterValue(counter, SALSA_MAX_COUNTER)
  checkData('salsa20', data)
  return Uint8Array.from(salsa20Xor([...data], [...key], [...nonce], counter))
}

/**
 * XSalsa20, NaCl's `crypto_stream_xsalsa20`, on raw bytes; decrypting is the same call.
 *
 * @param data - Any number of bytes; empty gives empty.
 * @param key - 32 bytes.
 * @param nonce - 24 bytes.
 * @param counter - Block counter of the first 64 bytes, 0 to 2^53 - 1.
 * @returns {Uint8Array} The XORed data, a new array.
 * @throws {InvalidOptionError} For a bad key, nonce or counter, or a counter the data runs past.
 * @throws {CipherError} When the data is not a `Uint8Array`.
 */
export function xsalsa20(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  counter = 0,
): Uint8Array {
  checkBytes('key', key, [32])
  checkBytes('nonce', nonce, [24])
  checkCounterValue(counter, SALSA_MAX_COUNTER)
  checkData('xsalsa20', data)
  return Uint8Array.from(xsalsa20Xor([...data], [...key], [...nonce], counter))
}
