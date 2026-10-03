import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  type Bytes,
  type PlainBytes,
  decodeBlocks,
  encodeBlocks,
  readBytes,
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

type XorSettings = { bytes: PlainBytes }

const XOR: BlockMode<XorSettings> = {
  name: 'xor',
  label: 'XOR',
  blockSize: 1,
  padding: false,
  keyDigits: (digits) => digits > 0 && digits % 2 === 0,
  keyError: 'must be a nonzero even number of hex digits (a key of whole bytes)',
  settings: (options) => ({ bytes: readBytes(options) }),
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
        BYTES_OPTION,
      ],
      keyspace: '256^n keys for an n-byte key',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return encodeBlocks(XOR, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return decodeBlocks(XOR, text, options)
  }
}
