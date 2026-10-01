import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../core/block-mode.ts'

/**
 * RC4 as RFC 6229 tests it, the keystream XORed into the data from its first byte, nothing dropped.
 *
 * @param data - Any number of bytes.
 * @param key - 1 to 256 key bytes.
 * @returns {number[]} As many bytes as came in.
 */
export function rc4(data: Bytes, key: Bytes): number[] {
  const s = Array.from({ length: 256 }, (_, i) => i)
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + s[i]! + key[i % key.length]!) & 0xff
    ;[s[i], s[j]] = [s[j]!, s[i]!]
  }
  let i = 0
  j = 0
  return data.map((byte) => {
    i = (i + 1) & 0xff
    j = (j + s[i]!) & 0xff
    ;[s[i], s[j]] = [s[j]!, s[i]!]
    return byte ^ s[(s[i]! + s[j]!) & 0xff]!
  })
}

const RC4: BlockMode = {
  name: 'rc4',
  label: 'RC4',
  blockSize: 1,
  padding: false,
  keyDigits: Array.from({ length: 256 }, (_, i) => 2 + 2 * i),
  keyError: 'must be an even number of hex digits from 2 to 512 (a 1 to 256-byte RC4 key)',
  run: (data, key) => rc4(data, key),
}

export class Rc4 extends Cipher {
  name(): string {
    return 'rc4'
  }

  info(): CipherInfo {
    return {
      name: 'rc4',
      label: 'RC4',
      description:
        'RC4 stream cipher (Rivest, 1987): the key shuffles a table of all 256 byte values, and each step swaps two entries and gives one byte of keystream to XOR into the text. Encrypting and decrypting are the same step. UTF-8 text in, hex out, as many bytes as went in',
      category: 'stream',
      family: 'permutation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'An even number of hex digits from 2 to 512, a 1 to 256-byte key',
        },
      ],
      keyspace: 'up to 2^2048 keys',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return encodeBlocks(RC4, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return decodeBlocks(RC4, text, options)
  }
}
