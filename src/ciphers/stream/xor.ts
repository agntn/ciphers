import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { getOpt } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError } from '../../core/errors.ts'
import {
  type BlockMode,
  type Bytes,
  decodeBlocks,
  encodeBlocks,
  transformHex,
} from '../../core/block-mode.ts'

/**
 * Repeating-key XOR: byte `i` of the data XORed with byte `i mod length` of the key.
 *
 * @param data - Any number of bytes.
 * @param key - At least one key byte.
 * @returns {number[]} As many bytes as came in.
 */
export function xor(data: Bytes, key: Bytes): number[] {
  return data.map((byte, i) => byte ^ key[i % key.length]!)
}

const BYTES = ['text', 'hex'] as const

type XorBytes = (typeof BYTES)[number]

type XorSettings = { bytes: XorBytes }

function readSettings(options: Readonly<CipherBaseOptions>): XorSettings {
  const bytes = getOpt<unknown>(options, 'bytes', 'text')
  if (!BYTES.includes(bytes as XorBytes)) {
    throw new InvalidOptionError('bytes', bytes, 'must be text or hex')
  }
  return { bytes: bytes as XorBytes }
}

const XOR: BlockMode<XorSettings> = {
  name: 'xor',
  label: 'XOR',
  blockSize: 1,
  padding: false,
  keyDigits: (digits) => digits > 0 && digits % 2 === 0,
  keyError: 'must be a nonzero even number of hex digits (a key of whole bytes)',
  textHint: 'pass bytes: hex to get them as hex',
  settings: readSettings,
  run: (data, key) => xor(data, key),
}

export class Xor extends Cipher {
  name(): string {
    return 'xor'
  }

  info(): CipherInfo {
    return {
      name: 'xor',
      label: 'XOR',
      description:
        'Repeating-key XOR: the key bytes repeat over the text and each pair is XORed, Vigenère on bytes. Encrypting and decrypting are the same step. UTF-8 text in, hex out, as many bytes as went in, or hex on both sides',
      category: 'stream',
      family: 'polyalphabetic',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Any nonzero even number of hex digits, a key of whole bytes',
        },
        {
          name: 'bytes',
          type: 'string',
          required: false,
          default: 'text',
          description:
            'What the plain side is: text for UTF-8 text, or hex to read and write hex both ways, for bytes that are not text',
        },
      ],
      keyspace: '256^n keys for an n-byte key',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    if (options.bytes === 'hex') return transformHex(XOR, text, options, 'encode')
    return encodeBlocks(XOR, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    if (options.bytes === 'hex') return transformHex(XOR, text, options, 'decode')
    return decodeBlocks(XOR, text, options)
  }
}
