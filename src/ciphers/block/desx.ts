import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { normalizeError } from '../../core/errors.ts'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../core/block-mode.ts'
import { desBlock } from './triple-des/block.ts'

const BLOCK_SIZE = 8

function xor(a: Bytes, b: Bytes): number[] {
  return a.map((byte, i) => byte ^ b[i]!)
}

/**
 * Run each 8-byte block through DESX on its own, the way ECB does: XOR with the input whitening
 * key, single DES, XOR with the output whitening key. The 24 key bytes are laid out as OpenSSL's
 * `desx-cbc` takes them, the DES key first, then the input and output whitening keys.
 *
 * @param data - Whole blocks to transform.
 * @param key - 24 key bytes: DES key, input whitening, output whitening.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function desxEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const transform = desBlock(key.slice(0, 8), operation)
  const input = key.slice(8, 16)
  const output = key.slice(16, 24)
  const [before, after] = operation === 'encrypt' ? [input, output] : [output, input]
  const result: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    result.push(...xor(transform(xor(data.slice(offset, offset + BLOCK_SIZE), before)), after))
  }
  return result
}

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

export class Desx extends Cipher {
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
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            '48 hex digits: the DES key, then the input and the output whitening key (OpenSSL desx order); DES parity bits ignored',
        },
      ],
      keyspace: '2^184 keys (56 DES bits and two 64-bit whitening keys)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(DESX, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'desx')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(DESX, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'desx')
    }
  }
}
