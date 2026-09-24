import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../../core/types'
import { Cipher } from '../../../core/cipher'
import { normalizeError } from '../../../core/errors'
import {
  type BlockMode,
  type Bytes,
  decodeBlocks,
  encodeBlocks,
  fromHex,
  readIv,
} from '../../../core/block-mode'
import { aesBlock } from './block'

const BLOCK_SIZE = 16

function xor(a: Bytes, b: Bytes): number[] {
  return a.map((byte, i) => byte ^ b[i]!)
}

/**
 * CBC as NIST SP 800-38A §6.2 defines it: every plaintext block is XORed with the ciphertext
 * block before it, the first one with the IV, and then encrypted. Equal plaintext blocks stop
 * giving equal ciphertext blocks, and a change in one block carries into every later one.
 *
 * @param data - Whole 16-byte blocks to transform.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @param iv - The 16-byte initialization vector.
 * @returns {number[]} The transformed blocks.
 */
export function aesCbc(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  iv: Bytes,
): number[] {
  const transform = aesBlock(key, operation)
  const output: number[] = []
  let previous = iv
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    const block = data.slice(offset, offset + BLOCK_SIZE)
    if (operation === 'encrypt') {
      previous = transform(xor(block, previous))
      output.push(...previous)
    } else {
      output.push(...xor(transform(block), previous))
      previous = block
    }
  }
  return output
}

const AES_CBC: BlockMode = {
  name: 'aes-cbc',
  label: 'AES-CBC',
  mode: 'cbc',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  settings: (options) => ({ iv: readIv(options, BLOCK_SIZE) }),
  run: (data, key, operation, settings) => aesCbc(data, key, operation, fromHex(settings.iv!)),
}

export class AesCbc extends Cipher {
  name(): string {
    return 'aes-cbc'
  }

  info(): CipherInfo {
    return {
      name: 'aes-cbc',
      label: 'AES (CBC)',
      description:
        'AES-128/192/256 in CBC mode (NIST SP 800-38A): each 16-byte block is XORed with the previous ciphertext block, the first with the IV, before it is encrypted, so equal plaintext blocks give different ciphertext. UTF-8 text with PKCS#7 padding in, hex out',
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
        {
          name: 'iv',
          type: 'string',
          required: true,
          description: 'Initialization vector, 32 hex digits',
        },
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(AES_CBC, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes-cbc')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(AES_CBC, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes-cbc')
    }
  }
}
