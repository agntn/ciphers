import type { CipherInfo } from '../../../core/types.ts'
import {
  type BlockMode,
  type Bytes,
  BlockCipher,
  fromHex,
  readIv,
} from '../../../core/block-mode.ts'
import { tripleDesBlock } from './block.ts'

const BLOCK_SIZE = 8

function xor(a: Bytes, b: Bytes): number[] {
  return a.map((byte, i) => byte ^ b[i]!)
}

/**
 * CBC as NIST SP 800-38A §6.2 defines it, over the 8-byte Triple DES block: every plaintext
 * block is XORed with the ciphertext block before it, the first one with the IV, and then
 * encrypted. Equal plaintext blocks stop giving equal ciphertext blocks.
 *
 * @param data - Whole 8-byte blocks to transform.
 * @param key - 16 or 24 key bytes.
 * @param operation - Encrypt or decrypt.
 * @param iv - The 8-byte initialization vector.
 * @returns {number[]} The transformed blocks.
 */
export function tripleDesCbc(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  iv: Bytes,
): number[] {
  const transform = tripleDesBlock(key, operation)
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

const TRIPLE_DES_CBC: BlockMode = {
  name: 'triple-des-cbc',
  label: 'Triple DES CBC',
  mode: 'cbc',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48],
  keyError: 'must be 32 or 48 hex digits (a two-key or three-key Triple DES key)',
  settings: (options) => ({ iv: readIv(options, BLOCK_SIZE) }),
  run: (data, key, operation, settings) =>
    tripleDesCbc(data, key, operation, fromHex(settings.iv!)),
}

export class TripleDesCbc extends BlockCipher {
  name(): string {
    return 'triple-des-cbc'
  }

  info(): CipherInfo {
    return {
      name: 'triple-des-cbc',
      label: 'Triple DES (CBC)',
      description:
        'Triple DES (3DES, TDEA) in CBC mode (NIST SP 800-38A): each 8-byte block is XORed with the previous ciphertext block, the first with the IV, before DES encrypt-decrypt-encrypt, so equal plaintext blocks give different ciphertext. UTF-8 text with PKCS#7 padding in, hex out',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32 hex digits for two keys (K3 = K1) or 48 for three; parity bits ignored',
        },
        {
          name: 'iv',
          type: 'string',
          required: true,
          description: 'Initialization vector, 16 hex digits',
        },
      ],
      keyspace: '2^112 or 2^168 keys (56 bits of every 64-bit DES key)',
    }
  }

  protected mode(): BlockMode {
    return TRIPLE_DES_CBC
  }
}
