import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { getOpt } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, normalizeError } from '../../core/errors.ts'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../core/block-mode.ts'
import { rijndaelBlock } from './aes/block.ts'

/** Block lengths in bits the Rijndael proposal defines: 128 is AES, the rest never made the standard. */
export const RIJNDAEL_BLOCK_SIZES = [128, 160, 192, 224, 256] as const

/** A Rijndael block length in bits. */
export type RijndaelBlockSize = (typeof RIJNDAEL_BLOCK_SIZES)[number]

/**
 * Run each block through Rijndael on its own, the way ECB does.
 *
 * @param data - Whole blocks to transform.
 * @param key - 16, 20, 24, 28 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @param blockSize - Bytes per block: 16, 20, 24, 28 or 32.
 * @returns {number[]} The transformed blocks.
 */
export function rijndaelEcb(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  blockSize: number,
): number[] {
  const transform = rijndaelBlock(key, blockSize, operation)
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += blockSize) {
    output.push(...transform(data.slice(offset, offset + blockSize)))
  }
  return output
}

function readBlockSize(options: Readonly<CipherBaseOptions>): RijndaelBlockSize {
  const blockSize = getOpt<unknown>(options, 'blockSize', 128)
  if (!RIJNDAEL_BLOCK_SIZES.includes(blockSize as RijndaelBlockSize)) {
    throw new InvalidOptionError('blockSize', blockSize, 'must be 128, 160, 192, 224 or 256 bits')
  }
  return blockSize as RijndaelBlockSize
}

/**
 * The block length decides the padding and the ciphertext check, so each one is its own mode.
 *
 * @param blockSize - Block length in bits.
 * @returns {BlockMode} Rijndael in ECB with blocks of that length.
 */
function rijndaelMode(blockSize: RijndaelBlockSize): BlockMode<{ blockSize: RijndaelBlockSize }> {
  return {
    name: 'rijndael',
    label: `Rijndael-${blockSize} ECB`,
    mode: 'ecb',
    blockSize: blockSize / 8,
    keyDigits: [32, 40, 48, 56, 64],
    keyError: 'must be 32, 40, 48, 56 or 64 hex digits (a 128 to 256-bit Rijndael key)',
    settings: () => ({ blockSize }),
    run: (data, key, operation) => rijndaelEcb(data, key, operation, blockSize / 8),
  }
}

export class Rijndael extends Cipher {
  name(): string {
    return 'rijndael'
  }

  info(): CipherInfo {
    return {
      name: 'rijndael',
      label: 'Rijndael (ECB)',
      description:
        'Rijndael, the cipher AES was taken from, with the block and the key each 128, 160, 192, 224 or 256 bits, in ECB mode. A 128-bit block is AES. The wider blocks mix more columns and run up to 14 rounds. UTF-8 text with PKCS#7 padding in, hex out',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32, 40, 48, 56 or 64 hex digits for a 128 to 256-bit key',
        },
        {
          name: 'blockSize',
          type: 'number',
          required: false,
          default: 128,
          description: 'Block length in bits: 128, 160, 192, 224 or 256',
        },
      ],
      keyspace: '2^128 to 2^256 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(rijndaelMode(readBlockSize(options ?? {})), text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'rijndael')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(rijndaelMode(readBlockSize(options ?? {})), text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'rijndael')
    }
  }
}
