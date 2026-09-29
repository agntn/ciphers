import type { CipherInfo } from '../../../core/types.ts'
import { type BlockMode, type Bytes, BlockCipher } from '../../../core/block-mode.ts'
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
export function aesEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const transform = aesBlock(key, operation)
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    output.push(...transform(data.slice(offset, offset + BLOCK_SIZE)))
  }
  return output
}

const AES: BlockMode = {
  name: 'aes',
  label: 'AES-ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  run: aesEcb,
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
