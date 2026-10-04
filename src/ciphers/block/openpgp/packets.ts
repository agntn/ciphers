import { CipherError } from '../../../core/errors.ts'
import type { Bytes } from '../../../core/block-mode.ts'

/** One OpenPGP packet: its tag and its body, partial chunks already joined. */
export interface Packet {
  readonly tag: number
  readonly body: Bytes
}

interface Read {
  readonly packet: Packet
  readonly next: number
}

function truncated(at: number): CipherError {
  return new CipherError(`The packet at byte ${at} runs past the end of the message`)
}

function readNumber(bytes: Bytes, at: number, size: number): number {
  if (at + size > bytes.length) throw truncated(at)
  let value = 0
  for (let i = 0; i < size; i++) value = value * 256 + bytes[at + i]!
  return value
}

function slice(bytes: Bytes, from: number, length: number, start: number): number[] {
  if (from + length > bytes.length) throw truncated(start)
  return bytes.slice(from, from + length)
}

/**
 * A packet in the old format, RFC 4880 §4.2.1; length type 3 runs to the end.
 *
 * @param bytes - The data the packet sits in.
 * @param at - Where its tag byte is.
 * @returns {Read} The packet and where the next one starts.
 */
function readOldPacket(bytes: Bytes, at: number): Read {
  const tag = (bytes[at]! >>> 2) & 0x0f
  const type = bytes[at]! & 0x03
  if (type === 3) return { packet: { tag, body: bytes.slice(at + 1) }, next: bytes.length }
  const size = 1 << type
  const length = readNumber(bytes, at + 1, size)
  return {
    packet: { tag, body: slice(bytes, at + 1 + size, length, at) },
    next: at + 1 + size + length,
  }
}

/**
 * A body length in the new format, §4.2.2, partial chunks included.
 *
 * @param bytes - The data.
 * @param at - Where the length starts.
 * @returns {{ length: number; partial: boolean; next: number }} The length and where the chunk starts.
 */
function readNewLength(
  bytes: Bytes,
  at: number,
): { length: number; partial: boolean; next: number } {
  const first = readNumber(bytes, at, 1)
  if (first < 192) return { length: first, partial: false, next: at + 1 }
  if (first < 224) {
    return {
      length: ((first - 192) << 8) + readNumber(bytes, at + 1, 1) + 192,
      partial: false,
      next: at + 2,
    }
  }
  if (first === 255) return { length: readNumber(bytes, at + 1, 4), partial: false, next: at + 5 }
  return { length: 1 << (first & 0x1f), partial: true, next: at + 1 }
}

function readNewPacket(bytes: Bytes, at: number): Read {
  const tag = bytes[at]! & 0x3f
  const chunks: number[][] = []
  let position = at + 1
  for (let partial = true; partial;) {
    const chunk = readNewLength(bytes, position)
    chunks.push(slice(bytes, chunk.next, chunk.length, at))
    position = chunk.next + chunk.length
    partial = chunk.partial
  }
  return { packet: { tag, body: chunks.flat() }, next: position }
}

/**
 * Splits data into OpenPGP packets, old and new format, joining partial body chunks.
 *
 * @param bytes - A message, or the contents of a compressed or decrypted packet.
 * @returns {Packet[]} The packets in order.
 * @throws {CipherError} When a byte is not a packet tag or a packet runs past the end.
 */
export function readPackets(bytes: Bytes): Packet[] {
  const packets: Packet[] = []
  for (let at = 0; at < bytes.length;) {
    if ((bytes[at]! & 0x80) === 0) {
      throw new CipherError(`Byte ${at} is not an OpenPGP packet tag: not an OpenPGP message`)
    }
    const read = (bytes[at]! & 0x40) === 0 ? readOldPacket(bytes, at) : readNewPacket(bytes, at)
    packets.push(read.packet)
    at = read.next
  }
  return packets
}

/**
 * Writes one packet in the new format with a one, two or five-byte length.
 *
 * @param tag - The packet tag.
 * @param body - The body.
 * @returns {number[]} Header and body.
 */
export function writePacket(tag: number, body: Bytes): number[] {
  const n = body.length
  const length =
    n < 192
      ? [n]
      : n < 8384
        ? [((n - 192) >>> 8) + 192, (n - 192) & 0xff]
        : [255, n >>> 24, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
  return [0xc0 | tag, ...length, ...body]
}
