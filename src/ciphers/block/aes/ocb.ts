import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../../core/types'
import { getOpt } from '../../../core/types'
import { Cipher } from '../../../core/cipher'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../../core/errors'
import {
  type BlockMode,
  type Bytes,
  decodeBlocks,
  encodeBlocks,
  fromHex,
  readHex,
} from '../../../core/block-mode'
import { aesBlock } from './block'

const BLOCK_SIZE = 16

/** Tag lengths in bits of the named parameter sets in RFC 7253 §3.1. */
export const OCB_TAG_LENGTHS = [64, 96, 128] as const

/** How long the OCB tag is, in bits. */
export type OcbTagLength = (typeof OCB_TAG_LENGTHS)[number]

function xor(a: Bytes, b: Bytes): number[] {
  return a.map((byte, i) => byte ^ b[i]!)
}

/**
 * RFC 7253 §2: shift the 128-bit string left by one bit, and when a one fell off the top, XOR
 * 0x87 into the last byte.
 *
 * @param block - 16 bytes.
 * @returns {number[]} The block doubled in GF(2^128).
 */
function double(block: Bytes): number[] {
  const doubled = block.map((byte, i) => ((byte << 1) | ((block[i + 1] ?? 0) >> 7)) & 0xff)
  if (block[0]! & 0x80) doubled[BLOCK_SIZE - 1]! ^= 0x87
  return doubled
}

interface Masks {
  readonly star: Bytes
  readonly dollar: Bytes
  readonly at: (i: number) => Bytes
}

// The number of trailing zero bits of a positive integer.
function ntz(n: number): number {
  let zeros = 0
  for (let rest = n; (rest & 1) === 0; rest >>>= 1) zeros++
  return zeros
}

// P_* || 1 || zeros: the bytes, then 0x80, then zeros to a whole block.
function padOne(bytes: Bytes): number[] {
  return [...bytes, 0x80, ...Array.from({ length: BLOCK_SIZE - 1 - bytes.length }, () => 0)]
}

/**
 * The key-dependent masks of RFC 7253 §4.1: `L_*` is AES of the zero block, `L_$` its double, and
 * `L_i` doubles `L_$` i + 1 times. Each `L_i` is computed the first time a block index asks for it.
 *
 * @param encrypt - AES forward under the key.
 * @returns {Masks} The masks.
 */
function masks(encrypt: (block: Bytes) => Bytes): Masks {
  const star = encrypt(Array.from({ length: BLOCK_SIZE }, () => 0))
  const dollar = double(star)
  const table: Bytes[] = [double(dollar)]
  return {
    star,
    dollar,
    at: (i) => {
      while (table.length <= i) table.push(double(table.at(-1)!))
      return table[i]!
    },
  }
}

/**
 * RFC 7253 §4.1: HASH of the associated data, all zeros when there is none.
 *
 * @param encrypt - AES forward under the key.
 * @param l - The key-dependent masks.
 * @param aad - Associated data, possibly empty.
 * @returns {Bytes} The 16-byte sum.
 */
function hash(encrypt: (block: Bytes) => Bytes, l: Masks, aad: Bytes): Bytes {
  let sum: Bytes = Array.from({ length: BLOCK_SIZE }, () => 0)
  let offset: Bytes = sum
  const whole = Math.floor(aad.length / BLOCK_SIZE)
  for (let i = 1; i <= whole; i++) {
    offset = xor(offset, l.at(ntz(i)))
    const block = aad.slice((i - 1) * BLOCK_SIZE, i * BLOCK_SIZE)
    sum = xor(sum, encrypt(xor(block, offset)))
  }
  const rest = aad.slice(whole * BLOCK_SIZE)
  if (rest.length > 0) {
    offset = xor(offset, l.star)
    sum = xor(sum, encrypt(xor(padOne(rest), offset)))
  }
  return sum
}

/**
 * RFC 7253 §4.2: the first offset. The nonce goes into one block after the tag length and a one
 * bit, AES encrypts it with its last six bits cleared, and those six bits pick where in the
 * stretched result the 128 bits of the offset start.
 *
 * @param encrypt - AES forward under the key.
 * @param nonce - 1 to 15 bytes.
 * @param tagLength - Tag length in bits.
 * @returns {number[]} Offset_0.
 */
function initialOffset(encrypt: (block: Bytes) => Bytes, nonce: Bytes, tagLength: number) {
  const block = Array.from({ length: BLOCK_SIZE }, () => 0)
  block[0] = (tagLength % 128) << 1
  block[BLOCK_SIZE - 1 - nonce.length]! |= 1
  for (const [i, byte] of nonce.entries()) block[BLOCK_SIZE - nonce.length + i] = byte
  const bottom = block[BLOCK_SIZE - 1]! & 0x3f
  const top = encrypt([...block.slice(0, -1), block[BLOCK_SIZE - 1]! & 0xc0])
  const stretch = [...top, ...xor(top.slice(0, 8), top.slice(1, 9))]
  const shift = bottom & 7
  const start = bottom >> 3
  return Array.from({ length: BLOCK_SIZE }, (_, i) =>
    shift === 0
      ? stretch[start + i]!
      : ((stretch[start + i]! << shift) | (stretch[start + i + 1]! >> (8 - shift))) & 0xff,
  )
}

/**
 * OCB as RFC 7253 defines it, the third version of Rogaway's mode. Every block goes through AES
 * once, masked before and after by an offset that the key, the nonce and the block index give. A
 * short last block is XORed with AES of its offset instead. The tag is AES of the XOR of all the
 * plaintext blocks, masked by the last offset and XORed with a hash of the associated data. The
 * ciphertext is the encrypted text followed by the tag. Decryption checks the tag before it hands
 * anything back.
 *
 * @param data - Plaintext to encrypt, or ciphertext with the tag at its end to decrypt.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Which way to go.
 * @param nonce - 1 to 15 bytes, never used twice under one key.
 * @param aad - Associated data: authenticated, not encrypted, not part of the output.
 * @param tagLength - Tag length in bits.
 * @returns {number[]} Ciphertext and tag, or the plaintext.
 */
export function aesOcb(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  nonce: Bytes,
  aad: Bytes,
  tagLength: OcbTagLength,
): number[] {
  const encrypt = aesBlock(key, 'encrypt')
  const transform = operation === 'encrypt' ? encrypt : aesBlock(key, 'decrypt')
  const tagBytes = tagLength / 8
  const length = operation === 'encrypt' ? data.length : data.length - tagBytes
  if (length < 0) {
    throw new CipherError(
      `[aes-ocb] Ciphertext must end in a ${tagBytes}-byte tag, got ${data.length} bytes`,
    )
  }

  const l = masks(encrypt)
  let offset: Bytes = initialOffset(encrypt, nonce, tagLength)
  let checksum: Bytes = Array.from({ length: BLOCK_SIZE }, () => 0)
  const output: number[] = []
  const whole = Math.floor(length / BLOCK_SIZE)
  for (let i = 1; i <= whole; i++) {
    offset = xor(offset, l.at(ntz(i)))
    const block = data.slice((i - 1) * BLOCK_SIZE, i * BLOCK_SIZE)
    const result = xor(offset, transform(xor(block, offset)))
    checksum = xor(checksum, operation === 'encrypt' ? block : result)
    output.push(...result)
  }
  const rest = data.slice(whole * BLOCK_SIZE, length)
  if (rest.length > 0) {
    offset = xor(offset, l.star)
    const pad = encrypt(offset)
    const result = rest.map((byte, i) => byte ^ pad[i]!)
    checksum = xor(checksum, padOne(operation === 'encrypt' ? rest : result))
    output.push(...result)
  }
  const tag = xor(encrypt(xor(xor(checksum, offset), l.dollar)), hash(encrypt, l, aad))

  if (operation === 'encrypt') return [...output, ...tag.slice(0, tagBytes)]
  checkTag(tag, data.slice(length))
  return output
}

// Compare every byte before deciding, so the time taken does not depend on where they differ.
function checkTag(tag: Bytes, received: Bytes): void {
  const difference = received.reduce((sum, byte, i) => sum | (byte ^ tag[i]!), 0)
  if (difference !== 0) {
    throw new CipherError(
      '[aes-ocb] Tag does not match: wrong key, nonce, aad or tagLength, or the ciphertext was changed',
    )
  }
}

type OcbSettings = { nonce: string; tagLength: OcbTagLength; aad: string }

function readSettings(options: Readonly<CipherBaseOptions>): OcbSettings {
  if (options.nonce === undefined || options.nonce === '') throw new MissingOptionError('nonce')
  const nonce = readHex(
    options.nonce,
    'nonce',
    (digits) => digits >= 2 && digits <= 30,
    'must be 2 to 30 hex digits (a 1 to 15-byte nonce)',
  )
  const aad = readHex(getOpt(options, 'aad', ''), 'aad', () => true, 'must be whole bytes of hex')
  const tagLength = getOpt<unknown>(options, 'tagLength', 128)
  if (!OCB_TAG_LENGTHS.includes(tagLength as OcbTagLength)) {
    throw new InvalidOptionError(
      'tagLength',
      tagLength,
      'must be 64, 96 or 128 (tag length in bits)',
    )
  }
  return { nonce, tagLength: tagLength as OcbTagLength, aad }
}

const AES_OCB: BlockMode<OcbSettings> = {
  name: 'aes-ocb',
  label: 'AES-OCB',
  mode: 'ocb',
  blockSize: BLOCK_SIZE,
  padding: false,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  settings: readSettings,
  run: (data, key, operation, settings) =>
    aesOcb(
      data,
      key,
      operation,
      fromHex(settings.nonce),
      fromHex(settings.aad),
      settings.tagLength,
    ),
}

export class AesOcb extends Cipher {
  name(): string {
    return 'aes-ocb'
  }

  info(): CipherInfo {
    return {
      name: 'aes-ocb',
      label: 'AES (OCB)',
      description:
        'AES-128/192/256 in OCB mode (RFC 7253): each block goes through AES once between two offsets taken from the key, the nonce and its position, and a tag over the text and the associated data goes on the end. Decoding refuses any ciphertext whose tag does not match. UTF-8 text in, hex out, the text bytes followed by the tag',
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
          name: 'nonce',
          type: 'string',
          required: true,
          description: '2 to 30 hex digits (1 to 15 bytes), never reused under one key',
        },
        {
          name: 'aad',
          type: 'string',
          required: false,
          default: '',
          description: 'Associated data in hex: covered by the tag, not encrypted',
        },
        {
          name: 'tagLength',
          type: 'number',
          required: false,
          default: 128,
          description: 'Tag length in bits: 64, 96 or 128',
        },
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(AES_OCB, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes-ocb')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(AES_OCB, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes-ocb')
    }
  }
}
