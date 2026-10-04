import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../../core/types.ts'
import { Cipher } from '../../../core/cipher.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  type Bytes,
  decodeBlocks,
  encodeBlocks,
  fromHex,
} from '../../../core/block-mode.ts'
import { KEYSTREAM_BLOCK, type NonceSettings, readNonceSettings } from '../words.ts'
import { SALSA_MAX_COUNTER, hsalsa20, salsa20Xor } from './block.ts'

/**
 * XSalsa20, the stream of NaCl's secretbox: Salsa20 under the HSalsa20 subkey.
 *
 * @param data - Any number of bytes.
 * @param key - 32 key bytes.
 * @param nonce - 24 nonce bytes.
 * @param counter - The first block counter.
 * @returns {number[]} As many bytes as came in.
 */
export function xsalsa20Xor(data: Bytes, key: Bytes, nonce: Bytes, counter: number): number[] {
  return salsa20Xor(data, hsalsa20(key, nonce.slice(0, 16)), nonce.slice(16), counter)
}

const XSALSA20: BlockMode<NonceSettings> = {
  name: 'xsalsa20',
  label: 'XSalsa20',
  blockSize: KEYSTREAM_BLOCK,
  padding: false,
  keyDigits: [64],
  keyError: 'must be 64 hex digits (a 256-bit XSalsa20 key)',
  settings: (options) =>
    readNonceSettings(
      options,
      24,
      SALSA_MAX_COUNTER,
      'must be a whole number from 0 to 9007199254740991 (the block counter, kept below 2^53)',
    ),
  run: (data, key, _operation, settings) =>
    xsalsa20Xor(data, key, fromHex(settings.nonce), settings.counter),
}

export class XSalsa20 extends Cipher {
  name(): string {
    return 'xsalsa20'
  }

  info(): CipherInfo {
    return {
      name: 'xsalsa20',
      label: 'XSalsa20',
      description:
        "XSalsa20 stream cipher, the one inside NaCl's secretbox: HSalsa20 turns the 256-bit key and the first 16 bytes of a 192-bit nonce into a subkey, and Salsa20 runs under it with the last 8. A nonce that long can be picked at random. UTF-8 text in, hex out, as many bytes as went in",
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
          description: '48 hex digits (24 bytes), never reused under one key',
        },
        {
          name: 'counter',
          type: 'number',
          required: false,
          default: 0,
          description: 'Block counter of the first 64 bytes, 0 to 2^53 - 1',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^256 keys',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return encodeBlocks(XSALSA20, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return decodeBlocks(XSALSA20, text, options)
  }
}
