import type { CipherInfo } from '../../../core/types.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  BlockCipher,
  blockCbc,
  fromHex,
  readIv,
} from '../../../core/block-mode.ts'
import { aesBlock } from './block.ts'

const BLOCK_SIZE = 16

/** CBC of NIST SP 800-38A §6.2 over AES, each block XORed with the one before it. */
export const aesCbc = blockCbc(aesBlock, BLOCK_SIZE)

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

export class AesCbc extends BlockCipher {
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
      worksOn: 'UTF-8 or hex, hex out',
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
        BYTES_OPTION,
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  protected mode(): BlockMode {
    return AES_CBC
  }
}
