import { CHACHA_MAX_COUNTER, chacha20Xor } from './ciphers/stream/chacha/block.ts'
import { chacha20Poly1305 as aead } from './ciphers/stream/chacha/chacha20-poly1305.ts'
import { xchacha20Xor } from './ciphers/stream/chacha/xchacha20.ts'
import { checkBytes, checkCounterValue, checkData } from './ciphers/stream/words.ts'
import { InvalidOptionError } from './core/errors.ts'

/**
 * ChaCha20 of RFC 8439 on raw bytes; decrypting is the same call.
 *
 * @param data - Any number of bytes; empty gives empty.
 * @param key - 32 bytes.
 * @param nonce - 12 bytes.
 * @param counter - Block counter of the first 64 bytes, 0 to 2^32 - 1.
 * @returns {Uint8Array} The XORed data, a new array.
 * @throws {InvalidOptionError} For a bad key, nonce or counter, or a counter the data runs past.
 * @throws {CipherError} When the data is not a `Uint8Array`.
 */
export function chacha20(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  counter = 0,
): Uint8Array {
  checkBytes('key', key, [32])
  checkBytes('nonce', nonce, [12])
  checkCounterValue(counter, CHACHA_MAX_COUNTER)
  checkData('chacha20', data)
  return Uint8Array.from(chacha20Xor([...data], [...key], [...nonce], counter))
}

/**
 * XChaCha20 of draft-irtf-cfrg-xchacha on raw bytes; decrypting is the same call.
 *
 * @param data - Any number of bytes; empty gives empty.
 * @param key - 32 bytes.
 * @param nonce - 24 bytes.
 * @param counter - Block counter of the first 64 bytes, 0 to 2^32 - 1.
 * @returns {Uint8Array} The XORed data, a new array.
 * @throws {InvalidOptionError} For a bad key, nonce or counter, or a counter the data runs past.
 * @throws {CipherError} When the data is not a `Uint8Array`.
 */
export function xchacha20(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  counter = 0,
): Uint8Array {
  checkBytes('key', key, [32])
  checkBytes('nonce', nonce, [24])
  checkCounterValue(counter, CHACHA_MAX_COUNTER)
  checkData('xchacha20', data)
  return Uint8Array.from(xchacha20Xor([...data], [...key], [...nonce], counter))
}

/**
 * ChaCha20-Poly1305 of RFC 8439 on raw bytes: ciphertext then tag, the tag checked on decrypt.
 *
 * @param data - Plaintext, or ciphertext with the tag at its end.
 * @param key - 32 bytes.
 * @param nonce - 12 bytes, never used twice under one key.
 * @param operation - `'encrypt'` or `'decrypt'`.
 * @param aad - Associated data, covered by the tag and not encrypted; none by default.
 * @returns {Uint8Array} Ciphertext and tag, or the plaintext, a new array.
 * @throws {InvalidOptionError} For a bad key, nonce or operation.
 * @throws {CipherError} When the data or aad is not a `Uint8Array`, the ciphertext is shorter than
 *   a tag, or the tag does not match.
 */
export function chacha20Poly1305(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  operation: 'encrypt' | 'decrypt',
  aad: Uint8Array = new Uint8Array(0),
): Uint8Array {
  checkBytes('key', key, [32])
  checkBytes('nonce', nonce, [12])
  if (operation !== 'encrypt' && operation !== 'decrypt') {
    throw new InvalidOptionError('operation', operation, "must be 'encrypt' or 'decrypt'")
  }
  checkData('chacha20-poly1305', data)
  checkData('chacha20-poly1305', aad)
  return Uint8Array.from(aead([...data], [...key], operation, [...nonce], [...aad]))
}
