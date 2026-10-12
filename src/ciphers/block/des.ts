import type { CipherInfo } from '../../core/types.ts'
import { BYTES_OPTION, type BlockMode, BlockCipher, blockEcb } from '../../core/block-mode.ts'
import { desBlock } from './triple-des/block.ts'

const BLOCK_SIZE = 8

/** Single DES on each 8-byte block alone, the way ECB does. */
export const desEcb = blockEcb(desBlock, BLOCK_SIZE)

const DES: BlockMode = {
  name: 'des',
  label: 'DES ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [16],
  keyError: 'must be 16 hex digits (a 64-bit DES key, 56 bits without parity)',
  run: desEcb,
}

export class Des extends BlockCipher {
  name(): string {
    return 'des'
  }

  info(): CipherInfo {
    return {
      name: 'des',
      label: 'DES (ECB)',
      description:
        'DES, the FIPS 46-3 Data Encryption Standard, in ECB mode: 16 Feistel rounds on 8-byte blocks under one 56-bit key, each block on its own, so equal plaintext blocks give equal ciphertext blocks. UTF-8 text with PKCS#7 padding in, hex out',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '16 hex digits; parity bits ignored',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^56 keys (the 8 parity bits of the 64-bit key do nothing)',
    }
  }

  protected mode(): BlockMode {
    return DES
  }
}
