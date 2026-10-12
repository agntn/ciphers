import type { CipherInfo } from '../../../core/types.ts'
import { BYTES_OPTION, type BlockMode, BlockCipher, blockEcb } from '../../../core/block-mode.ts'
import { tripleDesBlock } from './block.ts'

const BLOCK_SIZE = 8

/** Triple DES on each 8-byte block alone, the way ECB does. */
export const tripleDesEcb = blockEcb(tripleDesBlock, BLOCK_SIZE)

const TRIPLE_DES: BlockMode = {
  name: 'triple-des',
  label: 'Triple DES ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48],
  keyError: 'must be 32 or 48 hex digits (a two-key or three-key Triple DES key)',
  run: tripleDesEcb,
}

export class TripleDes extends BlockCipher {
  name(): string {
    return 'triple-des'
  }

  info(): CipherInfo {
    return {
      name: 'triple-des',
      label: 'Triple DES (ECB)',
      description:
        'Triple DES (3DES, TDEA) in ECB mode: DES encrypt-decrypt-encrypt under two or three keys, each 8-byte block on its own, so equal plaintext blocks give equal ciphertext blocks. UTF-8 text with PKCS#7 padding in, hex out',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32 hex digits for two keys (K3 = K1) or 48 for three; parity bits ignored',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^112 or 2^168 keys (56 bits of every 64-bit DES key)',
    }
  }

  protected mode(): BlockMode {
    return TRIPLE_DES
  }
}
