import { CipherError } from '../../../core/errors.ts'
import type { Bytes } from '../../../core/block-mode.ts'

/** Base length and extra bits of the length symbols 257 to 285, RFC 1951 §3.2.5. */
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
  163, 195, 227, 258,
]
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
]

/** Base distance and extra bits of the distance symbols 0 to 29. */
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049,
  3073, 4097, 6145, 8193, 12289, 16385, 24577,
]
const DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
]

/** The order the code length code lengths come in, §3.2.7. */
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

const MAX_BITS = 15

/** A canonical Huffman code: how many codes each length has, and the symbols in code order. */
interface Huffman {
  readonly count: readonly number[]
  readonly symbol: readonly number[]
}

function huffman(lengths: Bytes): Huffman {
  const count = Array.from<number>({ length: MAX_BITS + 1 }).fill(0)
  for (const length of lengths) count[length]!++
  let left = 1
  for (let length = 1; length <= MAX_BITS; length++) {
    left = 2 * left - count[length]!
    if (left < 0) throw new CipherError('Deflate data has an over-subscribed Huffman code')
  }
  const offset = [0, 0]
  for (let length = 1; length < MAX_BITS; length++) offset.push(offset[length]! + count[length]!)
  const symbol: number[] = []
  for (const [i, length] of lengths.entries()) {
    if (length !== 0) symbol[offset[length]!++] = i
  }
  return { count, symbol }
}

const FIXED_LENGTHS = huffman([
  ...Array.from<number>({ length: 144 }).fill(8),
  ...Array.from<number>({ length: 112 }).fill(9),
  ...Array.from<number>({ length: 24 }).fill(7),
  ...Array.from<number>({ length: 8 }).fill(8),
])
const FIXED_DISTANCES = huffman(Array.from<number>({ length: 30 }).fill(5))

/** Reads deflate bits least significant first and writes the output, as puff.c in zlib does. */
class Inflater {
  readonly output: number[] = []
  private readonly data: Bytes
  private readonly limit: number
  private position = 0
  private buffer = 0
  private held = 0

  constructor(data: Bytes, limit: number) {
    this.data = data
    this.limit = limit
  }

  run(): number[] {
    let last = 0
    while (last === 0) {
      last = this.bits(1)
      const type = this.bits(2)
      if (type === 0) this.stored()
      else if (type === 1) this.codes(FIXED_LENGTHS, FIXED_DISTANCES)
      else if (type === 2) this.dynamic()
      else throw new CipherError('Deflate data has a block of the reserved type 3')
    }
    return this.output
  }

  /**
   * The bytes after the last block, once `run` has returned.
   *
   * @returns {number[]} What follows the deflate data.
   */
  rest(): number[] {
    return this.data.slice(this.position - (this.held >>> 3))
  }

  private bits(need: number): number {
    while (this.held < need) {
      if (this.position >= this.data.length) throw new CipherError('Deflate data ends early')
      this.buffer |= this.data[this.position++]! << this.held
      this.held += 8
    }
    const value = this.buffer & ((1 << need) - 1)
    this.buffer >>>= need
    this.held -= need
    return value
  }

  private stored(): void {
    this.buffer = 0
    this.held = 0
    const at = this.position
    if (at + 4 > this.data.length) throw new CipherError('Deflate data ends early')
    const length = this.data[at]! | (this.data[at + 1]! << 8)
    const check = this.data[at + 2]! | (this.data[at + 3]! << 8)
    if (length !== (~check & 0xffff)) {
      throw new CipherError('Deflate stored block has a length that does not match its complement')
    }
    if (at + 4 + length > this.data.length) throw new CipherError('Deflate data ends early')
    this.write(this.data.slice(at + 4, at + 4 + length))
    this.position = at + 4 + length
  }

  private write(bytes: Bytes): void {
    if (this.output.length + bytes.length > this.limit) {
      throw new CipherError(`Compressed data inflates past ${this.limit} bytes`)
    }
    for (const byte of bytes) this.output.push(byte)
  }

  private decode(code: Huffman): number {
    let bits = 0
    let first = 0
    let index = 0
    for (let length = 1; length <= MAX_BITS; length++) {
      bits |= this.bits(1)
      const count = code.count[length]!
      if (bits - count < first) return code.symbol[index + bits - first]!
      index += count
      first = (first + count) << 1
      bits <<= 1
    }
    throw new CipherError('Deflate data has a Huffman code that is not in the table')
  }

  private codes(lengths: Huffman, distances: Huffman): void {
    for (let symbol = this.decode(lengths); symbol !== 256; symbol = this.decode(lengths)) {
      if (symbol < 256) {
        this.write([symbol])
        continue
      }
      this.copy(symbol - 257, distances)
    }
  }

  private copy(lengthSymbol: number, distances: Huffman): void {
    if (lengthSymbol >= 29) throw new CipherError('Deflate data has an invalid length symbol')
    const length = LENGTH_BASE[lengthSymbol]! + this.bits(LENGTH_EXTRA[lengthSymbol]!)
    const distanceSymbol = this.decode(distances)
    if (distanceSymbol >= 30) throw new CipherError('Deflate data has an invalid distance symbol')
    const distance = DISTANCE_BASE[distanceSymbol]! + this.bits(DISTANCE_EXTRA[distanceSymbol]!)
    if (distance > this.output.length) {
      throw new CipherError('Deflate data points back before the start of the output')
    }
    const start = this.output.length - distance
    const bytes: number[] = []
    for (let i = 0; i < length; i++) {
      bytes.push(i < distance ? this.output[start + i]! : bytes[i - distance]!)
    }
    this.write(bytes)
  }

  private dynamic(): void {
    const lengthCount = this.bits(5) + 257
    const distanceCount = this.bits(5) + 1
    const codeCount = this.bits(4) + 4
    if (lengthCount > 286 || distanceCount > 30) {
      throw new CipherError('Deflate data has too many length or distance codes')
    }
    const codeLengths = Array.from<number>({ length: 19 }).fill(0)
    for (let i = 0; i < codeCount; i++) codeLengths[CODE_LENGTH_ORDER[i]!] = this.bits(3)
    const lengths = this.codeLengths(huffman(codeLengths), lengthCount + distanceCount)
    if (lengths[256] === 0) throw new CipherError('Deflate data has no end of block code')
    this.codes(huffman(lengths.slice(0, lengthCount)), huffman(lengths.slice(lengthCount)))
  }

  private codeLengths(code: Huffman, total: number): number[] {
    const lengths: number[] = []
    while (lengths.length < total) {
      const symbol = this.decode(code)
      if (symbol < 16) {
        lengths.push(symbol)
        continue
      }
      const [value, repeat] = this.repeat(symbol, lengths)
      if (lengths.length + repeat > total) {
        throw new CipherError('Deflate data repeats a code length past the end of the table')
      }
      lengths.push(...Array.from<number>({ length: repeat }).fill(value))
    }
    return lengths
  }

  private repeat(symbol: number, lengths: Bytes): [number, number] {
    if (symbol === 16) {
      if (lengths.length === 0) throw new CipherError('Deflate data repeats a missing code length')
      return [lengths.at(-1)!, 3 + this.bits(2)]
    }
    return symbol === 17 ? [0, 3 + this.bits(3)] : [0, 11 + this.bits(7)]
  }
}

/**
 * Inflates raw deflate, RFC 1951 and OpenPGP's ZIP, ignoring bytes after the end.
 *
 * @param data - The deflate stream.
 * @param limit - The most bytes the output may grow to.
 * @returns {number[]} The decompressed bytes.
 * @throws {CipherError} When the stream is broken or inflates past `limit`.
 */
export function inflateRaw(data: Bytes, limit: number): number[] {
  return new Inflater(data, limit).run()
}

function readUint32(bytes: Bytes): number {
  return ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0
}

function adler32(bytes: Bytes): number {
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

/**
 * Inflates a zlib stream, RFC 1950, and checks its Adler-32.
 *
 * @param data - The zlib stream.
 * @param limit - The most bytes the output may grow to.
 * @returns {number[]} The decompressed bytes.
 * @throws {CipherError} When the header, the deflate data or the checksum does not hold.
 */
export function inflateZlib(data: Bytes, limit: number): number[] {
  const [method = 0, flags = 0] = data
  if ((method & 0x0f) !== 8 || ((method << 8) | flags) % 31 !== 0 || (flags & 0x20) !== 0) {
    throw new CipherError('Zlib data does not start with a deflate header')
  }
  const inflater = new Inflater(data.slice(2), limit)
  const output = inflater.run()
  const trailer = inflater.rest()
  if (trailer.length < 4 || readUint32(trailer) !== adler32(output)) {
    throw new CipherError('Zlib data has an Adler-32 checksum that does not match')
  }
  return output
}
