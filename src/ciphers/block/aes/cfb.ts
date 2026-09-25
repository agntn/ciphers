import type { CipherInfo, CipherBaseOptions } from '../../../core/types.ts'
import { getOpt } from '../../../core/types.ts'
import { InvalidOptionError } from '../../../core/errors.ts'
import {
  type BlockMode,
  type Bytes,
  BlockCipher,
  fromHex,
  readIv,
} from '../../../core/block-mode.ts'
import { aesBlock } from './block.ts'

const BLOCK_SIZE = 16

/** Segment sizes in bits: CFB-1, CFB-8 and CFB-128, the three NIST SP 800-38A gives vectors for. */
export const CFB_SEGMENTS = [1, 8, 128] as const

/** How many bits CFB feeds back per step. */
export type CfbSegment = (typeof CFB_SEGMENTS)[number]

/**
 * Shift a block left by one bit and put `bit` in the lowest position.
 *
 * @param block - The shift register.
 * @param bit - 0 or 1.
 * @returns {number[]} The register one bit on.
 */
function shiftInBit(block: Bytes, bit: number): number[] {
  return block.map(
    (byte, i) => ((byte << 1) | (i === block.length - 1 ? bit : block[i + 1]! >> 7)) & 0xff,
  )
}

/**
 * CFB as NIST SP 800-38A §6.3 defines it. A shift register starts as the IV. Each step encrypts
 * it, XORs the leftmost `segment` bits into the next `segment` bits of the input, and shifts the
 * ciphertext segment into the register from the right. AES only ever runs forward, decryption
 * included, and nothing is padded: a short last segment of CFB-128 takes as many keystream bytes
 * as it needs.
 *
 * @param data - Any number of bytes.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @param iv - The 16-byte initialization vector.
 * @param segment - Bits per step: 1, 8 or 128.
 * @returns {number[]} As many bytes as came in.
 */
export function aesCfb(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  iv: Bytes,
  segment: CfbSegment,
): number[] {
  const encrypt = aesBlock(key, 'encrypt')
  const output: number[] = []
  let register: Bytes = iv
  if (segment === 1) {
    for (const byte of data) {
      let result = 0
      for (let bit = 7; bit >= 0; bit--) {
        const input = (byte >> bit) & 1
        const out = input ^ (encrypt(register)[0]! >> 7)
        result |= out << bit
        register = shiftInBit(register, operation === 'encrypt' ? out : input)
      }
      output.push(result)
    }
    return output
  }
  const step = segment / 8
  for (let offset = 0; offset < data.length; offset += step) {
    const input = data.slice(offset, offset + step)
    const keystream = encrypt(register)
    const out = input.map((byte, i) => byte ^ keystream[i]!)
    output.push(...out)
    register = [...register.slice(step), ...(operation === 'encrypt' ? out : input)]
  }
  return output
}

type CfbSettings = { iv: string; segment: CfbSegment }

function readSettings(options: Readonly<CipherBaseOptions>): CfbSettings {
  const segment = getOpt<unknown>(options, 'segment', 128)
  if (!CFB_SEGMENTS.includes(segment as CfbSegment)) {
    throw new InvalidOptionError('segment', segment, 'must be 1, 8 or 128 (bits fed back per step)')
  }
  return { iv: readIv(options, BLOCK_SIZE), segment: segment as CfbSegment }
}

const AES_CFB: BlockMode<CfbSettings> = {
  name: 'aes-cfb',
  label: 'AES-CFB',
  mode: 'cfb',
  blockSize: BLOCK_SIZE,
  padding: false,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  settings: readSettings,
  run: (data, key, operation, settings) =>
    aesCfb(data, key, operation, fromHex(settings.iv), settings.segment),
}

export class AesCfb extends BlockCipher<CfbSettings> {
  name(): string {
    return 'aes-cfb'
  }

  info(): CipherInfo {
    return {
      name: 'aes-cfb',
      label: 'AES (CFB)',
      description:
        'AES-128/192/256 in CFB mode (NIST SP 800-38A): a register starting at the IV is encrypted, its leftmost bits are XORed into the next segment of text, and that ciphertext segment is shifted into the register. Segments of 1, 8 or 128 bits. UTF-8 text in, hex out, as many bytes as went in, no padding',
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
        {
          name: 'segment',
          type: 'number',
          required: false,
          default: 128,
          description: 'Bits fed back per step: 1, 8 or 128',
        },
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  protected mode(): BlockMode<CfbSettings> {
    return AES_CFB
  }
}
