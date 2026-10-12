import type { CipherInfo } from '../../../core/types.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  BlockCipher,
  blockCbc,
  fromHex,
  readIv,
} from '../../../core/block-mode.ts'
import { tripleDesBlock } from './block.ts'

const BLOCK_SIZE = 8

/** CBC of NIST SP 800-38A §6.2 over Triple DES, each block XORed with the one before it. */
export const tripleDesCbc = blockCbc(tripleDesBlock, BLOCK_SIZE)

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
      worksOn: 'UTF-8 or hex, hex out',
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
        BYTES_OPTION,
      ],
      keyspace: '2^112 or 2^168 keys (56 bits of every 64-bit DES key)',
    }
  }

  protected mode(): BlockMode {
    return TRIPLE_DES_CBC
  }
}
