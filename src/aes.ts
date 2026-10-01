import { aesCtr } from './ciphers/block/aes/ctr.ts'
import { aesEcb } from './ciphers/block/aes/ecb.ts'
import { CipherError, InvalidOptionError } from './core/errors.ts'

const BLOCK_SIZE = 16

/**
 * Refuse a key that isn't 16, 24 or 32 bytes, naming its length and never its bytes.
 *
 * @param key - The key to check.
 * @throws {InvalidOptionError} For anything else.
 */
function checkKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || ![16, 24, 32].includes(key.length)) {
    const shape = key instanceof Uint8Array ? `${key.length} bytes` : typeof key
    throw new InvalidOptionError('key', shape, 'must be a Uint8Array of 16, 24 or 32 bytes')
  }
}

/**
 * Refuse data that is not a `Uint8Array`.
 *
 * @param data - The data to check.
 * @throws {CipherError} For anything else.
 */
function checkData(data: Uint8Array): void {
  if (!(data instanceof Uint8Array)) {
    throw new CipherError(`[aes] Data must be a Uint8Array, got ${typeof data}`)
  }
}

/**
 * AES-ECB on raw bytes: whole 16-byte blocks in, as many out, no padding and no hex.
 *
 * @param data - Whole 16-byte blocks; empty gives empty.
 * @param key - 16, 24 or 32 bytes for AES-128, AES-192 or AES-256.
 * @param operation - `'encrypt'` or `'decrypt'`.
 * @returns {Uint8Array} The transformed blocks, a new array.
 * @throws {InvalidOptionError} For a bad key or operation. The message names the key length only.
 * @throws {CipherError} When the data is not whole blocks.
 */
export function ecb(
  data: Uint8Array,
  key: Uint8Array,
  operation: 'encrypt' | 'decrypt',
): Uint8Array {
  checkKey(key)
  if (operation !== 'encrypt' && operation !== 'decrypt') {
    throw new InvalidOptionError('operation', operation, "must be 'encrypt' or 'decrypt'")
  }
  checkData(data)
  if (data.length % BLOCK_SIZE !== 0) {
    throw new CipherError(
      `[aes] Data must be whole ${BLOCK_SIZE}-byte blocks, got ${data.length} bytes`,
    )
  }
  return Uint8Array.from(aesEcb([...data], [...key], operation))
}

/**
 * AES-CTR on raw bytes: any length in, as many out, and decrypting is the same call.
 *
 * @param data - Any number of bytes; empty gives empty.
 * @param key - 16, 24 or 32 bytes for AES-128, AES-192 or AES-256.
 * @param counter - The first 16-byte counter block, counted up big-endian, wrapping to zero.
 * @returns {Uint8Array} The XORed data, a new array.
 * @throws {InvalidOptionError} For a bad key or counter. The message names the key length only.
 * @throws {CipherError} When the data is not a `Uint8Array`.
 */
export function ctr(data: Uint8Array, key: Uint8Array, counter: Uint8Array): Uint8Array {
  checkKey(key)
  if (!(counter instanceof Uint8Array) || counter.length !== BLOCK_SIZE) {
    const shape = counter instanceof Uint8Array ? `${counter.length} bytes` : typeof counter
    throw new InvalidOptionError('counter', shape, `must be a Uint8Array of ${BLOCK_SIZE} bytes`)
  }
  checkData(data)
  return Uint8Array.from(aesCtr([...data], [...key], [...counter]))
}
