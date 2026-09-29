import type { CipherInfo } from '../../../core/types.ts'
import { type BlockMode, type Bytes, BlockCipher } from '../../../core/block-mode.ts'
import { CipherError, InvalidOptionError } from '../../../core/errors.ts'
import { aesBlock } from './block.ts'

const BLOCK_SIZE = 16

/**
 * Run each 16-byte block through AES on its own, the way ECB does. Equal plaintext blocks
 * come out as equal ciphertext blocks, which is the leak the mode is known for.
 *
 * @param data - Whole blocks to transform.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function ecb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const transform = aesBlock(key, operation)
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    output.push(...transform(data.slice(offset, offset + BLOCK_SIZE)))
  }
  return output
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
export function aesEcb(
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
  return Uint8Array.from(ecb([...data], [...key], operation))
}

const AES: BlockMode = {
  name: 'aes',
  label: 'AES-ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  run: ecb,
}

export class Aes extends BlockCipher {
  name(): string {
    return 'aes'
  }

  info(): CipherInfo {
    return {
      name: 'aes',
      label: 'AES (ECB)',
      description:
        'AES-128/192/256 in ECB mode: each 16-byte block is encrypted on its own, so equal plaintext blocks give equal ciphertext blocks. UTF-8 text with PKCS#7 padding in, hex out',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32, 48 or 64 hex digits for AES-128, AES-192 or AES-256',
        },
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  protected mode(): BlockMode {
    return AES
  }
}
