import type { CipherInfo } from '../../../core/types.ts'
import {
  type BlockMode,
  type Bytes,
  BlockCipher,
  fromHex,
  readIv,
} from '../../../core/block-mode.ts'
import { aesBlock } from './block.ts'

const BLOCK_SIZE = 16

/**
 * OFB as NIST SP 800-38A §6.4 defines it. AES encrypts the IV, then encrypts its own output again
 * and again, and each output block is XORed into the next block of data. The keystream never sees
 * the data, so encryption and decryption are the same operation, AES only runs forward, and a
 * short last block takes as many keystream bytes as it needs.
 *
 * @param data - Any number of bytes.
 * @param key - 16, 24 or 32 key bytes.
 * @param iv - The 16-byte initialization vector.
 * @returns {number[]} As many bytes as came in.
 */
export function aesOfb(data: Bytes, key: Bytes, iv: Bytes): number[] {
  const encrypt = aesBlock(key, 'encrypt')
  const output: number[] = []
  let block: Bytes = iv
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    const keystream = encrypt(block)
    output.push(...data.slice(offset, offset + BLOCK_SIZE).map((byte, i) => byte ^ keystream[i]!))
    block = keystream
  }
  return output
}

const AES_OFB: BlockMode = {
  name: 'aes-ofb',
  label: 'AES-OFB',
  mode: 'ofb',
  blockSize: BLOCK_SIZE,
  padding: false,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  settings: (options) => ({ iv: readIv(options, BLOCK_SIZE) }),
  run: (data, key, _operation, settings) => aesOfb(data, key, fromHex(settings.iv!)),
}

export class AesOfb extends BlockCipher {
  name(): string {
    return 'aes-ofb'
  }

  info(): CipherInfo {
    return {
      name: 'aes-ofb',
      label: 'AES (OFB)',
      description:
        'AES-128/192/256 in OFB mode (NIST SP 800-38A): AES encrypts the IV, then its own output over and over, and each output block is XORed into the text. Encrypting and decrypting are the same step. UTF-8 text in, hex out, as many bytes as went in, no padding',
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

  protected mode(): BlockMode {
    return AES_OFB
  }
}
