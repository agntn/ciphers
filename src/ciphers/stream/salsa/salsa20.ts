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
import { SALSA_MAX_COUNTER, salsa20Xor } from './block.ts'

const SALSA20: BlockMode<NonceSettings> = {
  name: 'salsa20',
  label: 'Salsa20',
  blockSize: KEYSTREAM_BLOCK,
  padding: false,
  keyDigits: [32, 64],
  keyError: 'must be 32 or 64 hex digits (a 128 or 256-bit Salsa20 key)',
  settings: (options) =>
    readNonceSettings(
      options,
      8,
      SALSA_MAX_COUNTER,
      'must be a whole number from 0 to 9007199254740991 (the block counter, kept below 2^53)',
    ),
  run: (data, key, _operation, settings) =>
    salsa20Xor(data, key, fromHex(settings.nonce), settings.counter),
}

export class Salsa20 extends Cipher {
  name(): string {
    return 'salsa20'
  }

  info(): CipherInfo {
    return {
      name: 'salsa20',
      label: 'Salsa20',
      description:
        "Bernstein's Salsa20/20 stream cipher (eSTREAM): a 128 or 256-bit key, a 64-bit nonce and a 64-bit block counter go through 20 rounds of add, rotate and XOR, and each 64 bytes of keystream are XORed into the text. Encrypting and decrypting are the same step. UTF-8 text in, hex out, as many bytes as went in",
      category: 'stream',
      family: 'arx',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32 or 64 hex digits, a 128 or 256-bit key',
        },
        {
          name: 'nonce',
          type: 'string',
          required: true,
          description: '16 hex digits (8 bytes), never reused under one key',
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
      keyspace: '2^128 or 2^256 keys',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return encodeBlocks(SALSA20, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return decodeBlocks(SALSA20, text, options)
  }
}
