import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../../core/types.ts'
import { getOpt } from '../../../core/types.ts'
import { Cipher } from '../../../core/cipher.ts'
import { CipherError, InvalidOptionError, MissingOptionError } from '../../../core/errors.ts'
import {
  type BlockMode,
  type Bytes,
  decodeBlocks,
  encodeBlocks,
  fromHex,
  readHex,
} from '../../../core/block-mode.ts'
import { aesBlock } from './block.ts'
import { aesCtr } from './ctr.ts'

const BLOCK_SIZE = 16

/** Tag lengths in bits that NIST SP 800-38C §A.1 allows: 4 to 16 bytes, an even number of them. */
export const CCM_TAG_LENGTHS = [32, 48, 64, 80, 96, 112, 128] as const

/** How long the CCM tag is, in bits. */
export type CcmTagLength = (typeof CCM_TAG_LENGTHS)[number]

function xor(a: Bytes, b: Bytes): number[] {
  return a.map((byte, i) => byte ^ b[i]!)
}

// Big-endian bytes of `value`, `length` of them.
function bigEndian(value: number, length: number): number[] {
  return Array.from({ length }, (_, i) => Math.floor(value / 256 ** (length - 1 - i)) % 256)
}

// Zeros up to the next whole block, none when the bytes already end on one.
function zeroPad(bytes: Bytes): number[] {
  return [...bytes, ...Array.from({ length: -bytes.length & (BLOCK_SIZE - 1) }, () => 0)]
}

/**
 * NIST SP 800-38C §A.2.2: the length of the associated data, in two bytes below 2^16 - 2^8 and
 * after `ff fe` in four bytes from there. Nothing longer fits in a JavaScript string anyway.
 *
 * @param length - Associated data length in bytes.
 * @returns {number[]} The encoded length.
 */
function encodeAadLength(length: number): number[] {
  return length < 0xff00 ? bigEndian(length, 2) : [0xff, 0xfe, ...bigEndian(length, 4)]
}

/**
 * NIST SP 800-38C §6.1 steps 2 to 5: CBC-MAC over B0, the associated data and the payload, each
 * zero-padded to whole blocks, cut to the tag length.
 *
 * @param encrypt - AES forward under the key.
 * @param nonce - 7 to 13 bytes.
 * @param aad - Associated data, possibly empty.
 * @param payload - The plaintext.
 * @param tagBytes - Tag length in bytes.
 * @returns {Bytes} The tag before CTR masks it.
 */
function cbcMac(
  encrypt: (block: Bytes) => Bytes,
  nonce: Bytes,
  aad: Bytes,
  payload: Bytes,
  tagBytes: number,
): Bytes {
  const q = 15 - nonce.length
  // §A.2.1: Adata flag, (t - 2) / 2 and q - 1 in the flags byte, then N and the payload length.
  const flags = (aad.length > 0 ? 0x40 : 0) | (((tagBytes - 2) / 2) << 3) | (q - 1)
  const blocks = [
    flags,
    ...nonce,
    ...bigEndian(payload.length, q),
    ...(aad.length > 0 ? zeroPad([...encodeAadLength(aad.length), ...aad]) : []),
    ...zeroPad(payload),
  ]
  let mac: Bytes = Array.from({ length: BLOCK_SIZE }, () => 0)
  for (let offset = 0; offset < blocks.length; offset += BLOCK_SIZE) {
    mac = encrypt(xor(blocks.slice(offset, offset + BLOCK_SIZE), mac))
  }
  return mac.slice(0, tagBytes)
}

/**
 * CCM as NIST SP 800-38C §6 defines it, the mode of RFC 3610. A CBC-MAC over the nonce, the
 * associated data and the plaintext gives the tag, and CTR encrypts the plaintext from counter 1
 * and the tag with counter 0. The ciphertext is the encrypted plaintext followed by the tag.
 * Decryption checks the tag before it hands anything back.
 *
 * @param data - Plaintext to encrypt, or ciphertext with the tag at its end to decrypt.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Which way to go.
 * @param nonce - 7 to 13 bytes, never used twice under one key.
 * @param aad - Associated data: authenticated, not encrypted, not part of the output.
 * @param tagLength - Tag length in bits.
 * @returns {number[]} Ciphertext and tag, or the plaintext.
 */
export function aesCcm(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  nonce: Bytes,
  aad: Bytes,
  tagLength: CcmTagLength,
): number[] {
  const encrypt = aesBlock(key, 'encrypt')
  const tagBytes = tagLength / 8
  const q = 15 - nonce.length
  const counter = (i: number) => [q - 1, ...nonce, ...bigEndian(i, q)]
  const tagMask = encrypt(counter(0))

  const payloadLength = operation === 'encrypt' ? data.length : data.length - tagBytes
  if (payloadLength < 0) {
    throw new CipherError(
      `[aes-ccm] Ciphertext must end in a ${tagBytes}-byte tag, got ${data.length} bytes`,
    )
  }
  if (payloadLength >= 256 ** q) {
    throw new CipherError(
      `[aes-ccm] A ${nonce.length}-byte nonce leaves ${q} bytes for the length, so at most ${256 ** q - 1} bytes of text, got ${payloadLength}`,
    )
  }

  // The payload has fewer than 256^q bytes, so its counter never carries out of the last q bytes
  // and the whole-block increment of CTR gives the same counter blocks as §A.3.
  if (operation === 'encrypt') {
    const tag = cbcMac(encrypt, nonce, aad, data, tagBytes)
    return [...aesCtr(data, key, counter(1)), ...xor(tag, tagMask)]
  }
  const plaintext = aesCtr(data.slice(0, payloadLength), key, counter(1))
  const tag = cbcMac(encrypt, nonce, aad, plaintext, tagBytes)
  const received = data.slice(payloadLength)
  const difference = tag.reduce((sum, byte, i) => sum | (byte ^ tagMask[i]! ^ received[i]!), 0)
  if (difference !== 0) {
    throw new CipherError(
      '[aes-ccm] Tag does not match: wrong key, nonce, aad or tagLength, or the ciphertext was changed',
    )
  }
  return plaintext
}

type CcmSettings = { nonce: string; tagLength: CcmTagLength; aad: string }

function readSettings(options: Readonly<CipherBaseOptions>): CcmSettings {
  if (options.nonce === undefined || options.nonce === '') throw new MissingOptionError('nonce')
  const nonce = readHex(
    options.nonce,
    'nonce',
    (digits) => digits >= 14 && digits <= 26,
    'must be 14 to 26 hex digits (a 7 to 13-byte nonce)',
  )
  const aad = readHex(getOpt(options, 'aad', ''), 'aad', () => true, 'must be whole bytes of hex')
  const tagLength = getOpt<unknown>(options, 'tagLength', 128)
  if (!CCM_TAG_LENGTHS.includes(tagLength as CcmTagLength)) {
    throw new InvalidOptionError(
      'tagLength',
      tagLength,
      'must be 32, 48, 64, 80, 96, 112 or 128 (tag length in bits)',
    )
  }
  return { nonce, tagLength: tagLength as CcmTagLength, aad }
}

const AES_CCM: BlockMode<CcmSettings> = {
  name: 'aes-ccm',
  label: 'AES-CCM',
  mode: 'ccm',
  blockSize: BLOCK_SIZE,
  padding: false,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  settings: readSettings,
  run: (data, key, operation, settings) =>
    aesCcm(
      data,
      key,
      operation,
      fromHex(settings.nonce),
      fromHex(settings.aad),
      settings.tagLength,
    ),
}

export class AesCcm extends Cipher {
  name(): string {
    return 'aes-ccm'
  }

  info(): CipherInfo {
    return {
      name: 'aes-ccm',
      label: 'AES (CCM)',
      description:
        'AES-128/192/256 in CCM mode (NIST SP 800-38C, RFC 3610): a CBC-MAC over the nonce, the associated data and the text gives a tag, and CTR encrypts the text and the tag. Decoding refuses any ciphertext whose tag does not match. UTF-8 text in, hex out, the text bytes followed by the tag',
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
          description: '14 to 26 hex digits (7 to 13 bytes), never reused under one key',
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
          description: 'Tag length in bits: 32, 48, 64, 80, 96, 112 or 128',
        },
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return encodeBlocks(AES_CCM, text, options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return decodeBlocks(AES_CCM, text, options)
  }
}
