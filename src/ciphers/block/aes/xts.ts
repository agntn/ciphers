import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../../core/types'
import { Cipher } from '../../../core/cipher'
import { CipherError, InvalidOptionError, normalizeError } from '../../../core/errors'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../../core/block-mode'
import { aesBlock } from './block'

const BLOCK_SIZE = 16
/** NIST SP 800-38E caps one data unit at 2^20 AES blocks, 16 MiB. */
const MAX_BYTES = BLOCK_SIZE * 2 ** 20

/**
 * Multiply a tweak by α, the polynomial x, in GF(2^128) modulo x^128 + x^7 + x^2 + x + 1. XTS
 * reads the block as a little-endian number, so the shift carries from byte 0 up to byte 15 and
 * the bit that falls off the top comes back as 0x87 in byte 0.
 *
 * @param tweak - One 16-byte tweak.
 * @returns {number[]} The tweak for the next block.
 */
function double(tweak: Bytes): number[] {
  const next = tweak.map((byte, i) => ((byte << 1) | (i > 0 ? tweak[i - 1]! >> 7 : 0)) & 0xff)
  if (tweak[BLOCK_SIZE - 1]! >> 7) next[0]! ^= 0x87
  return next
}

function xor(a: Bytes, b: Bytes): number[] {
  return a.map((byte, i) => byte ^ b[i]!)
}

/**
 * Refuse data XTS cannot take: less than one whole block to steal from, or a data unit over the
 * 2^20 blocks NIST SP 800-38E allows.
 *
 * @param length - Bytes in the data unit.
 * @param operation - Encrypt or decrypt, which picks how the short case is worded.
 */
function checkLength(length: number, operation: 'encrypt' | 'decrypt'): void {
  if (length < BLOCK_SIZE) {
    throw new CipherError(
      operation === 'encrypt'
        ? `[aes-xts] XTS needs at least one whole block, 16 bytes of UTF-8 text, got ${length} bytes`
        : `[aes-xts] Ciphertext must be at least 16 bytes (32 hex digits), got ${length} bytes`,
    )
  }
  if (length > MAX_BYTES) {
    throw new CipherError(
      `[aes-xts] One data unit is at most 2^20 blocks (16 MiB) under NIST SP 800-38E, got ${length} bytes`,
    )
  }
}

/**
 * XTS-AES as IEEE 1619 and NIST SP 800-38E define it. AES under the second key encrypts the data
 * unit number into the first tweak `T`, and every block is `E(P ⊕ T) ⊕ T` under the first key,
 * with `T` multiplied by α from one block to the next. A last block shorter than 16 bytes steals
 * the tail of the ciphertext before it, so nothing is padded and the output is as long as the
 * input.
 *
 * @param data - 16 bytes to 16 MiB.
 * @param key - Two AES keys of the same length, 32 or 64 bytes in all: the data key, then the
 *   tweak key.
 * @param operation - Encrypt or decrypt.
 * @param unit - The data unit (sector) number, below 2^128.
 * @returns {number[]} As many bytes as came in.
 */
export function aesXts(
  data: Bytes,
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
  unit: bigint,
): number[] {
  checkLength(data.length, operation)
  const half = key.length / 2
  const transform = aesBlock(key.slice(0, half), operation)
  const unitBytes = Array.from({ length: BLOCK_SIZE }, (_, i) =>
    Number((unit >> BigInt(8 * i)) & 0xffn),
  )
  const tweaks: Bytes[] = [aesBlock(key.slice(half), 'encrypt')(unitBytes)]
  const blocks = Math.ceil(data.length / BLOCK_SIZE)
  while (tweaks.length < blocks) tweaks.push(double(tweaks.at(-1)!))
  const step = (block: Bytes, tweak: Bytes) => xor(transform(xor(block, tweak)), tweak)

  const tail = data.length % BLOCK_SIZE
  const whole = tail === 0 ? blocks : blocks - 2
  const output: number[] = []
  for (let j = 0; j < whole; j++) {
    output.push(...step(data.slice(j * BLOCK_SIZE, (j + 1) * BLOCK_SIZE), tweaks[j]!))
  }
  if (tail === 0) return output

  // Ciphertext stealing. Decryption swaps the two tweaks, because the full block it holds was
  // made with the later one.
  const [early, late] = [tweaks[whole]!, tweaks[whole + 1]!]
  const last = data.slice(whole * BLOCK_SIZE, (whole + 1) * BLOCK_SIZE)
  const partial = data.slice((whole + 1) * BLOCK_SIZE)
  const stolen = step(last, operation === 'encrypt' ? early : late)
  const joined = [...partial, ...stolen.slice(tail)]
  output.push(...step(joined, operation === 'encrypt' ? late : early), ...stolen.slice(0, tail))
  return output
}

function readTweak(options: Readonly<CipherBaseOptions>): Record<string, string> {
  const tweak = options.tweak ?? '0'
  if (typeof tweak !== 'string') throw new InvalidOptionError('tweak', tweak, 'must be a string')
  const hex = tweak.replaceAll(/\s/g, '').toLowerCase()
  if (!/^[0-9a-f]{1,32}$/.test(hex)) {
    throw new InvalidOptionError(
      'tweak',
      tweak,
      'must be 1 to 32 hex digits (a 128-bit data unit number)',
    )
  }
  return { tweak: hex.padStart(32, '0') }
}

const AES_XTS: BlockMode = {
  name: 'aes-xts',
  label: 'AES-XTS',
  mode: 'xts',
  blockSize: BLOCK_SIZE,
  padding: false,
  keyDigits: [64, 128],
  keyError:
    'must be 64 or 128 hex digits (two AES-128 or two AES-256 keys: the data key, then the tweak key)',
  settings: readTweak,
  run: (data, key, operation, settings) =>
    aesXts(data, key, operation, BigInt(`0x${settings.tweak}`)),
}

export class AesXts extends Cipher {
  name(): string {
    return 'aes-xts'
  }

  info(): CipherInfo {
    return {
      name: 'aes-xts',
      label: 'AES (XTS)',
      description:
        'AES-128/256 in XTS mode (IEEE 1619, NIST SP 800-38E): the tweak key encrypts the data unit number, and each 16-byte block is masked with that tweak, multiplied by x once per block, before and after AES. A short last block steals from the one before. UTF-8 text of at least 16 bytes in, hex out, as many bytes as went in, no padding',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            '64 or 128 hex digits: the data key, then the tweak key, both AES-128 or both AES-256',
        },
        {
          name: 'tweak',
          type: 'string',
          required: false,
          default: '0',
          description: 'Data unit (sector) number, up to 32 hex digits',
        },
      ],
      keyspace: '2^256 or 2^512 keys (two AES keys)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(AES_XTS, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes-xts')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(AES_XTS, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes-xts')
    }
  }
}
