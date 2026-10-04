import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../../core/types.ts'
import { getOpt } from '../../../core/types.ts'
import { Cipher } from '../../../core/cipher.ts'
import { CipherError, MissingOptionError } from '../../../core/errors.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  type Bytes,
  decodeBlocks,
  encodeBlocks,
  fromHex,
  readHex,
} from '../../../core/block-mode.ts'
import { KEYSTREAM_BLOCK, bytesLe } from '../words.ts'
import { chachaBlock, chacha20Xor } from './block.ts'
import { poly1305 } from './poly1305.ts'

const TAG_BYTES = 16

/**
 * Zeros up to the next multiple of 16 bytes, none when the length already is one.
 *
 * @param length - Bytes so far.
 * @returns {number[]} The padding.
 */
function pad16(length: number): number[] {
  return Array.from({ length: -length & 15 }, () => 0)
}

/**
 * The Poly1305 input of RFC 8439 §2.8: padded aad, padded ciphertext, then both lengths.
 *
 * @param aad - Associated data.
 * @param ciphertext - The encrypted text.
 * @returns {number[]} The bytes the tag covers.
 */
function macData(aad: Bytes, ciphertext: Bytes): number[] {
  const length = (bytes: number): number[] =>
    bytesLe([bytes % 2 ** 32, Math.floor(bytes / 2 ** 32)])
  return [
    ...aad,
    ...pad16(aad.length),
    ...ciphertext,
    ...pad16(ciphertext.length),
    ...length(aad.length),
    ...length(ciphertext.length),
  ]
}

/**
 * AEAD_CHACHA20_POLY1305 of RFC 8439 §2.8; decrypting checks the tag before any text comes back.
 *
 * @param data - Plaintext to encrypt, or ciphertext with the tag at its end to decrypt.
 * @param key - 32 key bytes.
 * @param operation - Which way to go.
 * @param nonce - 12 bytes, never used twice under one key.
 * @param aad - Associated data: authenticated, not encrypted, not part of the output.
 * @returns {number[]} Ciphertext and tag, or the plaintext.
 * @throws {CipherError} When the ciphertext is shorter than a tag or the tag does not match.
 */
export function chacha20Poly1305(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  nonce: Bytes,
  aad: Bytes,
): number[] {
  const macKey = chachaBlock(key, 0, nonce).slice(0, 32)
  if (operation === 'encrypt') {
    const ciphertext = chacha20Xor(data, key, nonce, 1)
    return [...ciphertext, ...poly1305(macData(aad, ciphertext), macKey)]
  }
  if (data.length < TAG_BYTES) {
    throw new CipherError(
      `[chacha20-poly1305] Ciphertext must end in a ${TAG_BYTES}-byte tag, got ${data.length} bytes`,
    )
  }
  const ciphertext = data.slice(0, -TAG_BYTES)
  const received = data.slice(-TAG_BYTES)
  const tag = poly1305(macData(aad, ciphertext), macKey)
  const difference = tag.reduce((sum, byte, i) => sum | (byte ^ received[i]!), 0)
  if (difference !== 0) {
    throw new CipherError(
      '[chacha20-poly1305] Tag does not match: wrong key, nonce or aad, or the ciphertext was changed',
    )
  }
  return chacha20Xor(ciphertext, key, nonce, 1)
}

type Chacha20Poly1305Settings = { nonce: string; aad: string }

function readSettings(options: Readonly<CipherBaseOptions>): Chacha20Poly1305Settings {
  if (options.nonce === undefined || options.nonce === '') throw new MissingOptionError('nonce')
  const nonce = readHex(
    options.nonce,
    'nonce',
    (digits) => digits === 24,
    'must be 24 hex digits (a 96-bit nonce)',
  )
  const aad = readHex(getOpt(options, 'aad', ''), 'aad', () => true, 'must be whole bytes of hex')
  return { nonce, aad }
}

const CHACHA20_POLY1305: BlockMode<Chacha20Poly1305Settings> = {
  name: 'chacha20-poly1305',
  label: 'ChaCha20-Poly1305',
  blockSize: KEYSTREAM_BLOCK,
  padding: false,
  keyDigits: [64],
  keyError: 'must be 64 hex digits (a 256-bit ChaCha20 key)',
  settings: readSettings,
  run: (data, key, operation, settings) =>
    chacha20Poly1305(data, key, operation, fromHex(settings.nonce), fromHex(settings.aad)),
}

export class ChaCha20Poly1305 extends Cipher {
  name(): string {
    return 'chacha20-poly1305'
  }

  info(): CipherInfo {
    return {
      name: 'chacha20-poly1305',
      label: 'ChaCha20-Poly1305',
      description:
        'ChaCha20-Poly1305 AEAD (RFC 8439, the TLS 1.3 and WireGuard one): ChaCha20 encrypts the text from block 1, and Poly1305 under a one-time key from block 0 tags the associated data and the ciphertext. Decoding refuses any ciphertext whose tag does not match. UTF-8 text in, hex out, the text bytes followed by a 16-byte tag',
      category: 'stream',
      family: 'arx',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '64 hex digits, a 256-bit key',
        },
        {
          name: 'nonce',
          type: 'string',
          required: true,
          description: '24 hex digits (12 bytes), never reused under one key',
        },
        {
          name: 'aad',
          type: 'string',
          required: false,
          default: '',
          description: 'Associated data in hex: covered by the tag, not encrypted',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^256 keys',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return encodeBlocks(CHACHA20_POLY1305, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return decodeBlocks(CHACHA20_POLY1305, text, options)
  }
}
