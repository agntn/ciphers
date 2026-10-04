import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../../core/types.ts'
import { Cipher } from '../../../core/cipher.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  decodeBlocks,
  encodeBlocks,
  fromHex,
} from '../../../core/block-mode.ts'
import { KEYSTREAM_BLOCK, type NonceSettings, readNonceSettings } from '../words.ts'
import { CHACHA_MAX_COUNTER, chacha20Xor } from './block.ts'

const CHACHA20: BlockMode<NonceSettings> = {
  name: 'chacha20',
  label: 'ChaCha20',
  blockSize: KEYSTREAM_BLOCK,
  padding: false,
  keyDigits: [64],
  keyError: 'must be 64 hex digits (a 256-bit ChaCha20 key)',
  settings: (options) =>
    readNonceSettings(
      options,
      12,
      CHACHA_MAX_COUNTER,
      'must be a whole number from 0 to 4294967295 (a 32-bit block counter)',
    ),
  run: (data, key, _operation, settings) =>
    chacha20Xor(data, key, fromHex(settings.nonce), settings.counter),
}

export class ChaCha20 extends Cipher {
  name(): string {
    return 'chacha20'
  }

  info(): CipherInfo {
    return {
      name: 'chacha20',
      label: 'ChaCha20',
      description:
        "ChaCha20 stream cipher as RFC 8439 defines it: Bernstein's Salsa20 variant with a 256-bit key, a 96-bit nonce and a 32-bit block counter. Each block of 64 keystream bytes is XORed into the text, and encrypting and decrypting are the same step. UTF-8 text in, hex out, as many bytes as went in",
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
          name: 'counter',
          type: 'number',
          required: false,
          default: 0,
          description: 'Block counter of the first 64 bytes, 0 to 4294967295',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^256 keys',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return encodeBlocks(CHACHA20, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return decodeBlocks(CHACHA20, text, options)
  }
}
