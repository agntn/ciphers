import type { CipherInfo } from '../../../core/types.ts'
import { CipherError } from '../../../core/errors.ts'
import { type BlockMode, type Bytes, BlockCipher } from '../../../core/block-mode.ts'
import { aesBlock } from './block.ts'

const BLOCK_SIZE = 16

/**
 * CBC-MAC as FIPS 113 and ISO/IEC 9797-1 MAC Algorithm 1 define it: CBC encryption with a zero
 * IV, keeping only the last block. The data is padded with zeros to whole blocks (padding method
 * 1), and empty data becomes one zero block.
 *
 * @param data - The bytes to authenticate.
 * @param key - 16, 24 or 32 key bytes.
 * @returns {number[]} The 16-byte tag.
 */
export function aesCbcMac(data: Bytes, key: Bytes): number[] {
  const encrypt = aesBlock(key, 'encrypt')
  const length = Math.max(BLOCK_SIZE, data.length + (-data.length & (BLOCK_SIZE - 1)))
  let mac: Bytes = Array.from({ length: BLOCK_SIZE }, () => 0)
  for (let offset = 0; offset < length; offset += BLOCK_SIZE) {
    mac = encrypt(mac.map((byte, i) => byte ^ (data[offset + i] ?? 0)))
  }
  return [...mac]
}

/**
 * The text with its tag on the end, or the text back once the tag checks out.
 *
 * @param data - The text bytes to sign, or the text bytes followed by the tag to verify.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - `encrypt` appends the tag, `decrypt` checks and strips it.
 * @returns {number[]} Text and tag, or the text.
 */
function signOrVerify(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  if (operation === 'encrypt') return [...data, ...aesCbcMac(data, key)]
  const length = data.length - BLOCK_SIZE
  if (length < 0) {
    throw new CipherError(
      `[aes-cbc-mac] Input must end in a ${BLOCK_SIZE}-byte tag, got ${data.length} bytes`,
    )
  }
  const text = data.slice(0, length)
  const received = data.slice(length)
  const difference = aesCbcMac(text, key).reduce((sum, byte, i) => sum | (byte ^ received[i]!), 0)
  if (difference !== 0) {
    throw new CipherError('[aes-cbc-mac] Tag does not match: wrong key, or the text was changed')
  }
  return [...text]
}

const AES_CBC_MAC: BlockMode = {
  name: 'aes-cbc-mac',
  label: 'AES-CBC-MAC',
  mode: 'cbc-mac',
  blockSize: BLOCK_SIZE,
  padding: false,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  run: (data, key, operation) => signOrVerify(data, key, operation),
}

export class AesCbcMac extends BlockCipher {
  name(): string {
    return 'aes-cbc-mac'
  }

  info(): CipherInfo {
    return {
      name: 'aes-cbc-mac',
      label: 'AES (CBC-MAC)',
      description:
        'CBC-MAC over AES-128/192/256 (FIPS 113, ISO/IEC 9797-1 MAC Algorithm 1): CBC with a zero IV over the zero-padded text, and the last block is the tag. Nothing is encrypted. UTF-8 text in, hex out, the text bytes followed by the tag, and decoding refuses any text whose tag does not match',
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
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  protected mode(): BlockMode {
    return AES_CBC_MAC
  }
}
