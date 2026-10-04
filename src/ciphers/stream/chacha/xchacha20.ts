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
import { CHACHA_MAX_COUNTER, chacha20Xor, hchacha20 } from './block.ts'

/**
 * XChaCha20 of draft-irtf-cfrg-xchacha §2.3: ChaCha20 under the HChaCha20 subkey.
 *
 * @param data - Any number of bytes.
 * @param key - 32 key bytes.
 * @param nonce - 24 nonce bytes.
 * @param counter - The first block counter.
 * @returns {number[]} As many bytes as came in.
 */
export function xchacha20Xor(data: Bytes, key: Bytes, nonce: Bytes, counter: number): number[] {
  const subkey = hchacha20(key, nonce.slice(0, 16))
  return chacha20Xor(data, subkey, [0, 0, 0, 0, ...nonce.slice(16)], counter)
}

const XCHACHA20: BlockMode<NonceSettings> = {
  name: 'xchacha20',
  label: 'XChaCha20',
  blockSize: KEYSTREAM_BLOCK,
  padding: false,
  keyDigits: [64],
  keyError: 'must be 64 hex digits (a 256-bit XChaCha20 key)',
  settings: (options) =>
    readNonceSettings(
      options,
      24,
      CHACHA_MAX_COUNTER,
      'must be a whole number from 0 to 4294967295 (a 32-bit block counter)',
    ),
  run: (data, key, _operation, settings) =>
    xchacha20Xor(data, key, fromHex(settings.nonce), settings.counter),
}

export class XChaCha20 extends Cipher {
  name(): string {
    return 'xchacha20'
  }

  info(): CipherInfo {
    return {
      name: 'xchacha20',
      label: 'XChaCha20',
      description:
        'XChaCha20 stream cipher (draft-irtf-cfrg-xchacha): HChaCha20 turns the 256-bit key and the first 16 bytes of a 192-bit nonce into a subkey, and ChaCha20 runs under it with the last 8. A nonce that long can be picked at random. UTF-8 text in, hex out, as many bytes as went in',
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
          description: 'Block counter of the first 64 bytes, 0 to 4294967295',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^256 keys',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return encodeBlocks(XCHACHA20, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return decodeBlocks(XCHACHA20, text, options)
  }
}
