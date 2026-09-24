import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../../core/types'
import { Cipher } from '../../../core/cipher'
import { normalizeError } from '../../../core/errors'
import {
  type BlockMode,
  type Bytes,
  decodeBlocks,
  encodeBlocks,
  fromHex,
  readIv,
} from '../../../core/block-mode'
import { aesBlock } from './block'

const BLOCK_SIZE = 16

/**
 * Add one to a block read as a big-endian number, wrapping from all ones to all zeros. That is the
 * standard incrementing function of NIST SP 800-38A §B.1 over the whole block.
 *
 * @param block - The counter block.
 * @returns {number[]} The next counter block.
 */
function increment(block: Bytes): number[] {
  const next = [...block]
  for (let i = next.length - 1; i >= 0; i--) {
    next[i] = (next[i]! + 1) & 0xff
    if (next[i] !== 0) break
  }
  return next
}

/**
 * CTR as NIST SP 800-38A §6.5 defines it. AES encrypts a counter block, starting at `counter` and
 * going up by one per block, and the result is XORed into the data. Encryption and decryption are
 * the same operation, AES only runs forward, and a short last block takes as many keystream bytes
 * as it needs.
 *
 * @param data - Any number of bytes.
 * @param key - 16, 24 or 32 key bytes.
 * @param counter - The 16-byte initial counter block.
 * @returns {number[]} As many bytes as came in.
 */
export function aesCtr(data: Bytes, key: Bytes, counter: Bytes): number[] {
  const encrypt = aesBlock(key, 'encrypt')
  const output: number[] = []
  let block: Bytes = counter
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    const keystream = encrypt(block)
    output.push(...data.slice(offset, offset + BLOCK_SIZE).map((byte, i) => byte ^ keystream[i]!))
    block = increment(block)
  }
  return output
}

const AES_CTR: BlockMode = {
  name: 'aes-ctr',
  label: 'AES-CTR',
  mode: 'ctr',
  blockSize: BLOCK_SIZE,
  padding: false,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  settings: (options) => ({ iv: readIv(options, BLOCK_SIZE) }),
  run: (data, key, _operation, settings) => aesCtr(data, key, fromHex(settings.iv!)),
}

export class AesCtr extends Cipher {
  name(): string {
    return 'aes-ctr'
  }

  info(): CipherInfo {
    return {
      name: 'aes-ctr',
      label: 'AES (CTR)',
      description:
        'AES-128/192/256 in CTR mode (NIST SP 800-38A): a counter block starting at the IV is encrypted and XORed into the text, and the counter goes up by one per block. Encrypting and decrypting are the same step. UTF-8 text in, hex out, as many bytes as went in, no padding',
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
          description: 'Initial counter block, 32 hex digits, incremented as one 128-bit number',
        },
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(AES_CTR, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes-ctr')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(AES_CTR, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes-ctr')
    }
  }
}
