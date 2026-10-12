import type { CipherInfo } from '../../../core/types.ts'
import { BYTES_OPTION, type BlockMode, BlockCipher, blockEcb } from '../../../core/block-mode.ts'
import { aesBlock } from './block.ts'

const BLOCK_SIZE = 16

/** AES on each 16-byte block alone, so equal plaintext blocks leak as equal ciphertext. */
export const aesEcb = blockEcb(aesBlock, BLOCK_SIZE)

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
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32, 48 or 64 hex digits for AES-128, AES-192 or AES-256',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  protected mode(): BlockMode {
    return AES
  }
}
