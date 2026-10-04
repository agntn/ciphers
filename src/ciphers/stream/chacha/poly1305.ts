import type { Bytes } from '../../../core/block-mode.ts'

/** The prime 2^130 - 5 that Poly1305 works modulo. */
const P = 2n ** 130n - 5n

/** Clears the bits of `r` that RFC 8439 §2.5 says must be zero. */
const CLAMP = 0x0ffffffc0ffffffc0ffffffc0fffffffn

/**
 * Bytes read as a little-endian number.
 *
 * @param bytes - Any bytes.
 * @returns {bigint} The number.
 */
function littleEndian(bytes: Bytes): bigint {
  return bytes.reduceRight((sum, byte) => (sum << 8n) | BigInt(byte), 0n)
}

/**
 * Poly1305 of RFC 8439 §2.5, in `BigInt`, so not constant time.
 *
 * @param message - Any bytes.
 * @param key - 32 bytes, `r` then `s`, never used for two messages.
 * @returns {number[]} The 16-byte tag.
 */
export function poly1305(message: Bytes, key: Bytes): number[] {
  const r = littleEndian(key.slice(0, 16)) & CLAMP
  const s = littleEndian(key.slice(16, 32))
  let accumulator = 0n
  for (let offset = 0; offset < message.length; offset += 16) {
    const block = littleEndian([...message.slice(offset, offset + 16), 1])
    accumulator = ((accumulator + block) * r) % P
  }
  const tag = accumulator + s
  return Array.from({ length: 16 }, (_, i) => Number((tag >> BigInt(8 * i)) & 0xffn))
}
