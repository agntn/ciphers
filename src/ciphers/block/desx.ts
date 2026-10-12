import type { CipherInfo } from '../../core/types.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  type Bytes,
  BlockCipher,
  blockEcb,
  xorBytes,
} from '../../core/block-mode.ts'
import { desBlock } from './triple-des/block.ts'

const BLOCK_SIZE = 8

/**
 * DESX on one block: XOR with the input whitening key, single DES, XOR with the output whitening
 * key. The 24 key bytes come as OpenSSL's `desx-cbc` takes them: DES key, input key, output key.
 *
 * @param key - 24 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {(block: Bytes) => number[]} DESX on one 8-byte block.
 */
function desxBlock(key: Bytes, operation: 'encrypt' | 'decrypt'): (block: Bytes) => number[] {
  const transform = desBlock(key.slice(0, 8), operation)
  const input = key.slice(8, 16)
  const output = key.slice(16, 24)
  const [before, after] = operation === 'encrypt' ? [input, output] : [output, input]
  return (block) => xorBytes(transform(xorBytes(block, before)), after)
}

/** DESX on each 8-byte block alone, the way ECB does. */
export const desxEcb = blockEcb(desxBlock, BLOCK_SIZE)

const DESX: BlockMode = {
  name: 'desx',
  label: 'DESX ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [48],
  keyError:
    'must be 48 hex digits (a DES key, then the input and the output whitening key, 16 digits each)',
  run: desxEcb,
}

export class Desx extends BlockCipher {
  name(): string {
    return 'desx'
  }

  info(): CipherInfo {
    return {
      name: 'desx',
      label: 'DESX (ECB)',
      description:
        "DESX, Rivest's key whitening around DES, in ECB mode: every 8-byte block is XORed with a 64-bit input key, encrypted by single DES and XORed with a 64-bit output key, each block on its own. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            '48 hex digits: the DES key, then the input and the output whitening key (OpenSSL desx order); DES parity bits ignored',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^184 keys (56 DES bits and two 64-bit whitening keys)',
    }
  }

  protected mode(): BlockMode {
    return DESX
  }
}
