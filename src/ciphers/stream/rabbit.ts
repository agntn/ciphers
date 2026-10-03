import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { getOpt } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError } from '../../core/errors.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  type Bytes,
  decodeBlocks,
  encodeBlocks,
  fromHex,
  readHex,
} from '../../core/block-mode.ts'

const BLOCK_SIZE = 16

/** The counter constants A0 to A7 of RFC 4503 §2.5. */
const A = [
  0x4d34d34d, 0xd34d34d3, 0x34d34d34, 0x4d34d34d, 0xd34d34d3, 0x34d34d34, 0x4d34d34d, 0xd34d34d3,
] as const

/**
 * How key, IV and keystream bytes map to the 128-bit and 64-bit numbers RFC 4503 works on. `big`
 * reads them as its test vectors do, most significant byte first. `little` is the byte order of
 * the eSTREAM reference code, which Crypto++, wolfSSL and libtomcrypt follow.
 */
export type RabbitEndian = 'big' | 'little'

const ENDIANS: readonly RabbitEndian[] = ['big', 'little']

function rotl(word: number, bits: number): number {
  return ((word << bits) | (word >>> (32 - bits))) >>> 0
}

/**
 * The g-function of RFC 4503 §2.6: square the 32-bit sum and XOR the two halves of the 64-bit
 * result. The square passes 2^53, so it goes through `BigInt`.
 *
 * @param u - A state word.
 * @param v - Its counter word.
 * @returns {number} A 32-bit word.
 */
function g(u: number, v: number): number {
  const sum = BigInt((u + v) >>> 0)
  const square = sum * sum
  return Number((square ^ (square >> 32n)) & 0xffffffffn)
}

/** Eight state words, eight counter words and the counter carry bit, 513 bits in all. */
class RabbitState {
  private readonly x: number[] = []
  private readonly c: number[] = []
  private carry = 0

  /**
   * The key setup of RFC 4503 §2.3, which leaves the master state.
   *
   * @param k - The key as eight 16-bit words, K0 (bits 15..0) first.
   */
  constructor(k: readonly number[]) {
    const at = (i: number): number => k[i % 8]!
    for (let j = 0; j < 8; j++) {
      const even = j % 2 === 0
      this.x.push((even ? (at(j + 1) << 16) | at(j) : (at(j + 5) << 16) | at(j + 4)) >>> 0)
      this.c.push((even ? (at(j + 4) << 16) | at(j + 5) : (at(j) << 16) | at(j + 1)) >>> 0)
    }
    for (let i = 0; i < 4; i++) this.iterate()
    for (let j = 0; j < 8; j++) this.c[j] = (this.c[j]! ^ this.x[(j + 4) % 8]!) >>> 0
  }

  /** One iteration: the counter update of RFC 4503 §2.5, then the next-state function of §2.6. */
  private iterate(): void {
    const { x, c } = this
    for (let j = 0; j < 8; j++) {
      const sum = c[j]! + A[j]! + this.carry
      this.carry = sum > 0xffffffff ? 1 : 0
      c[j] = sum >>> 0
    }
    const gs = x.map((word, j) => g(word, c[j]!))
    for (let j = 0; j < 8; j++) {
      const [g0, g1, g2] = [gs[j]!, gs[(j + 7) % 8]!, gs[(j + 6) % 8]!]
      x[j] = j % 2 === 0 ? (g0 + rotl(g1, 16) + rotl(g2, 16)) >>> 0 : (g0 + rotl(g1, 8) + g2) >>> 0
    }
  }

  /**
   * The IV setup of RFC 4503 §2.4, on top of the master state.
   *
   * @param low - IV bits 31..0.
   * @param high - IV bits 63..32.
   */
  ivSetup(low: number, high: number): void {
    const words = [
      low,
      ((high & 0xffff0000) | (low >>> 16)) >>> 0,
      high,
      ((high << 16) | (low & 0xffff)) >>> 0,
    ]
    for (let j = 0; j < 8; j++) this.c[j] = (this.c[j]! ^ words[j % 4]!) >>> 0
    for (let i = 0; i < 4; i++) this.iterate()
  }

  /**
   * One 128-bit output block, as the extraction scheme of RFC 4503 §2.7 builds it after the next
   * iteration.
   *
   * @returns {number[]} 16 bytes, least significant first.
   */
  extract(): number[] {
    this.iterate()
    const { x } = this
    const low = (word: number): number => word & 0xffff
    const high = (word: number): number => word >>> 16
    const s = [
      low(x[0]!) ^ high(x[5]!),
      high(x[0]!) ^ low(x[3]!),
      low(x[2]!) ^ high(x[7]!),
      high(x[2]!) ^ low(x[5]!),
      low(x[4]!) ^ high(x[1]!),
      high(x[4]!) ^ low(x[7]!),
      low(x[6]!) ^ high(x[3]!),
      high(x[6]!) ^ low(x[1]!),
    ]
    return s.flatMap((word) => [word & 0xff, word >>> 8])
  }
}

/**
 * Bytes least significant first, reversed from the order `endian` gives them in.
 *
 * @param bytes - Key or IV bytes as passed.
 * @param endian - The order they are in.
 * @returns {Bytes} The same bytes, least significant first.
 */
function lsbFirst(bytes: Bytes, endian: RabbitEndian): Bytes {
  return endian === 'big' ? bytes.toReversed() : bytes
}

/**
 * Rabbit as RFC 4503 defines it. The key and the optional IV set up the state, each iteration
 * gives a 128-bit block of keystream, and the keystream is XORed into the data. Encryption and
 * decryption are the same operation. A short last block takes the least significant bytes of its
 * keystream block, as §2.8 says: the first bytes when `endian` is `little`, the last when `big`.
 *
 * @param data - Any number of bytes.
 * @param key - 16 key bytes.
 * @param iv - 8 IV bytes, or none to skip the IV setup.
 * @param endian - Byte order of key, IV and keystream.
 * @returns {number[]} As many bytes as came in.
 */
export function rabbit(
  data: Bytes,
  key: Bytes,
  iv: Bytes | undefined,
  endian: RabbitEndian,
): number[] {
  const k = lsbFirst(key, endian)
  const state = new RabbitState(
    Array.from({ length: 8 }, (_, i) => k[2 * i]! | (k[2 * i + 1]! << 8)),
  )
  if (iv) {
    const v = lsbFirst(iv, endian)
    const word = (at: number): number =>
      (v[at]! | (v[at + 1]! << 8) | (v[at + 2]! << 16) | (v[at + 3]! << 24)) >>> 0
    state.ivSetup(word(0), word(4))
  }
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    const chunk = data.slice(offset, offset + BLOCK_SIZE)
    const block = state.extract()
    const keystream = endian === 'big' ? block.toReversed().slice(BLOCK_SIZE - chunk.length) : block
    output.push(...chunk.map((byte, i) => byte ^ keystream[i]!))
  }
  return output
}

type RabbitSettings = { endian: RabbitEndian; iv?: string }

function readSettings(options: Readonly<CipherBaseOptions>): RabbitSettings {
  const endian = getOpt<unknown>(options, 'endian', 'big')
  if (!ENDIANS.includes(endian as RabbitEndian)) {
    throw new InvalidOptionError('endian', endian, 'must be big or little')
  }
  const iv = options.iv
  if (iv === undefined || iv === '') return { endian: endian as RabbitEndian }
  return {
    endian: endian as RabbitEndian,
    iv: readHex(iv, 'iv', (digits) => digits === 16, 'must be 16 hex digits (a 64-bit IV)'),
  }
}

const RABBIT: BlockMode<RabbitSettings> = {
  name: 'rabbit',
  label: 'Rabbit',
  blockSize: BLOCK_SIZE,
  padding: false,
  keyDigits: [32],
  keyError: 'must be 32 hex digits (a 128-bit Rabbit key)',
  settings: readSettings,
  run: (data, key, _operation, settings) =>
    rabbit(
      data,
      key,
      settings.iv === undefined ? undefined : fromHex(settings.iv),
      settings.endian,
    ),
}

export class Rabbit extends Cipher {
  name(): string {
    return 'rabbit'
  }

  info(): CipherInfo {
    return {
      name: 'rabbit',
      label: 'Rabbit',
      description:
        'Rabbit stream cipher (RFC 4503, eSTREAM): a 128-bit key and an optional 64-bit IV set up eight state and eight counter words, and each iteration gives 16 bytes of keystream to XOR into the text. Encrypting and decrypting are the same step. UTF-8 text in, hex out, as many bytes as went in',
      category: 'stream',
      family: 'arx',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32 hex digits, a 128-bit key',
        },
        {
          name: 'iv',
          type: 'string',
          required: false,
          description: 'Initialization vector, 16 hex digits; without it the IV setup is skipped',
        },
        {
          name: 'endian',
          type: 'string',
          required: false,
          default: 'big',
          description:
            'Byte order of key, IV and keystream: big as in RFC 4503 and CyberChef, little as in Crypto++',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^128 keys',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return encodeBlocks(RABBIT, text, options)
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    return decodeBlocks(RABBIT, text, options)
  }
}
