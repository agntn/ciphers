import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../../core/types.ts'
import { Cipher } from '../../../core/cipher.ts'
import { InvalidOptionError } from '../../../core/errors.ts'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../../core/block-mode.ts'
import { aesEcb } from './ecb.ts'

const BLOCK_SIZE = 16
const BLOCK_MASK = (1n << 128n) - 1n

function toBigInt(bytes: Bytes): bigint {
  return bytes.reduce((value, byte) => (value << 8n) | BigInt(byte), 0n)
}

function toBytes(value: bigint): number[] {
  return Array.from({ length: BLOCK_SIZE }, (_, i) =>
    Number((value >> BigInt(8 * (BLOCK_SIZE - 1 - i))) & 0xffn),
  )
}

/**
 * Multiply in GF(2^128) modulo x^128 + x^7 + x^2 + x + 1, with a block read as a big-endian
 * number whose lowest bit is the constant term. That is the ordering IEEE P1619 LRW uses, and
 * the one Linux calls `bbe`; GCM reverses the bits and would give other masks.
 *
 * @param a - One factor as a 128-bit number.
 * @param b - The other factor.
 * @returns {bigint} The product, reduced to 128 bits.
 */
function multiply(a: bigint, b: bigint): bigint {
  let product = 0n
  for (let factor = a, rest = b; rest > 0n; rest >>= 1n) {
    if (rest & 1n) product ^= factor
    factor = ((factor << 1n) & BLOCK_MASK) ^ (factor >> 127n ? 0x87n : 0n)
  }
  return product
}

/**
 * LRW: every block is `E(P ⊕ T) ⊕ T` with the mask `T = K2 ⊗ i` for its index `i`, so equal
 * plaintext blocks at different positions give different ciphertext blocks.
 *
 * @param data - Whole 16-byte blocks to transform.
 * @param key - An AES key of 16, 24 or 32 bytes followed by the 16-byte tweak key K2.
 * @param operation - Encrypt or decrypt.
 * @param first - Index of the first block; later blocks count up from it, wrapping at 2^128.
 * @returns {number[]} The transformed blocks.
 */
export function aesLrw(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  first: bigint,
): number[] {
  const tweakKey = toBigInt(key.slice(-BLOCK_SIZE))
  const masks: number[] = []
  for (let i = 0; i < data.length / BLOCK_SIZE; i++) {
    masks.push(...toBytes(multiply(tweakKey, (first + BigInt(i)) & BLOCK_MASK)))
  }
  const masked = data.map((byte, i) => byte ^ masks[i]!)
  return aesEcb(masked, key.slice(0, -BLOCK_SIZE), operation).map((byte, i) => byte ^ masks[i]!)
}

function readTweak(options: Readonly<CipherBaseOptions>): Record<string, string> {
  const tweak = options.tweak ?? '1'
  if (typeof tweak !== 'string') throw new InvalidOptionError('tweak', tweak, 'must be a string')
  const hex = tweak.replaceAll(/\s/g, '').toLowerCase()
  if (!/^[0-9a-f]{1,32}$/.test(hex)) {
    throw new InvalidOptionError('tweak', tweak, 'must be 1 to 32 hex digits (a 128-bit index)')
  }
  return { tweak: hex.padStart(32, '0') }
}

const AES_LRW: BlockMode = {
  name: 'aes-lrw',
  label: 'AES-LRW',
  mode: 'lrw',
  blockSize: BLOCK_SIZE,
  keyDigits: [64, 80, 96],
  keyError:
    'must be 64, 80 or 96 hex digits (an AES-128, AES-192 or AES-256 key, then 32 for the tweak key)',
  settings: readTweak,
  run: (data, key, operation, settings) =>
    aesLrw(data, key, operation, BigInt(`0x${settings.tweak}`)),
}

export class AesLrw extends Cipher {
  name(): string {
    return 'aes-lrw'
  }

  info(): CipherInfo {
    return {
      name: 'aes-lrw',
      label: 'AES (LRW)',
      description:
        'AES-128/192/256 in LRW mode (IEEE P1619): each 16-byte block is masked with the tweak key times its index before and after AES, so equal plaintext blocks at different positions give different ciphertext. UTF-8 text with PKCS#7 padding in, hex out',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            '64, 80 or 96 hex digits: the AES-128, AES-192 or AES-256 key, then 32 for the tweak key',
        },
        {
          name: 'tweak',
          type: 'string',
          required: false,
          default: '1',
          description: 'Index of the first block, up to 32 hex digits; each next block adds one',
        },
      ],
      keyspace: '2^256, 2^320 or 2^384 keys (the AES key plus a 128-bit tweak key)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return encodeBlocks(AES_LRW, text, options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return decodeBlocks(AES_LRW, text, options)
  }
}
