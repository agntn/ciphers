import { aesEcb } from './ciphers/block/aes/ecb.ts'
import { CipherError, InvalidOptionError } from './core/errors.ts'

const BLOCK_SIZE = 16

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
  if (!(key instanceof Uint8Array) || ![16, 24, 32].includes(key.length)) {
    const shape = key instanceof Uint8Array ? `${key.length} bytes` : typeof key
    throw new InvalidOptionError('key', shape, 'must be a Uint8Array of 16, 24 or 32 bytes')
  }
  if (operation !== 'encrypt' && operation !== 'decrypt') {
    throw new InvalidOptionError('operation', operation, "must be 'encrypt' or 'decrypt'")
  }
  if (!(data instanceof Uint8Array)) {
    throw new CipherError(`[aes] Data must be a Uint8Array, got ${typeof data}`)
  }
  if (data.length % BLOCK_SIZE !== 0) {
    throw new CipherError(
      `[aes] Data must be whole ${BLOCK_SIZE}-byte blocks, got ${data.length} bytes`,
    )
  }
  return Uint8Array.from(aesEcb([...data], [...key], operation))
}
