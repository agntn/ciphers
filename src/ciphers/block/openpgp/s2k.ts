import {
  Md5Hasher,
  Ripemd160Hasher,
  Sha1Hasher,
  Sha224Hasher,
  Sha256Hasher,
  Sha3_256Hasher,
  Sha3_512Hasher,
  Sha512Hasher,
  type Hasher,
} from '@agntn/hashes'
import { CipherError } from '../../../core/errors.ts'
import type { Bytes } from '../../../core/block-mode.ts'

/** The S2K hashes `@agntn/hashes` can run, by their RFC 4880 §9.4 ids. */
export const S2K_HASHES: Readonly<Record<number, { name: string; create: () => Hasher }>> = {
  1: { name: 'md5', create: () => new Md5Hasher() },
  2: { name: 'sha1', create: () => new Sha1Hasher() },
  3: { name: 'ripemd160', create: () => new Ripemd160Hasher() },
  8: { name: 'sha256', create: () => new Sha256Hasher() },
  9: { name: 'sha384', create: () => new Sha512Hasher(48) },
  10: { name: 'sha512', create: () => new Sha512Hasher() },
  11: { name: 'sha224', create: () => new Sha224Hasher() },
  12: { name: 'sha3-256', create: () => new Sha3_256Hasher() },
  14: { name: 'sha3-512', create: () => new Sha3_512Hasher() },
}

/** The largest count a coded byte gives, 0xff. */
export const MAX_S2K_COUNT = 65_011_712

/** The smallest, 0x00. */
export const MIN_S2K_COUNT = 1024

/** A string-to-key specifier: simple (0), salted (1) or iterated and salted (3). */
export interface S2k {
  readonly type: 0 | 1 | 3
  readonly hash: number
  readonly salt?: Bytes
  /** The coded count byte of type 3. */
  readonly count?: number
}

/**
 * The bytes a coded count stands for, RFC 4880 §3.7.1.3.
 *
 * @param coded - The count byte.
 * @returns {number} Bytes to hash.
 */
export function decodeCount(coded: number): number {
  return (16 + (coded & 15)) * 2 ** ((coded >>> 4) + 6)
}

/**
 * The smallest coded count that hashes at least `bytes`.
 *
 * @param bytes - 1024 to 65011712.
 * @returns {number} The count byte.
 */
export function encodeCount(bytes: number): number {
  let coded = 0
  while (decodeCount(coded) < bytes) coded++
  return coded
}

/**
 * Reads the S2K specifier of a SKESK packet.
 *
 * @param bytes - The packet body.
 * @param at - Where the specifier starts.
 * @returns {{ s2k: S2k; next: number }} The specifier and the byte after it.
 * @throws {CipherError} On a type or hash this cipher does not run.
 */
export function readS2k(bytes: Bytes, at: number): { s2k: S2k; next: number } {
  const type = readType(bytes[at])
  const hash = readHash(bytes[at + 1])
  if (type === 0) return { s2k: { type, hash }, next: at + 2 }
  const salt = bytes.slice(at + 2, at + 10)
  if (salt.length < 8) throw new CipherError('The SKESK packet ends inside the S2K salt')
  if (type === 1) return { s2k: { type, hash, salt }, next: at + 10 }
  const count = bytes[at + 10]
  if (count === undefined) throw new CipherError('The SKESK packet ends before the S2K count')
  return { s2k: { type, hash, salt, count }, next: at + 11 }
}

function readType(type: number | undefined): S2k['type'] {
  if (type === 0 || type === 1 || type === 3) return type
  const name = type === 4 ? ' (Argon2)' : type === 101 ? ' (GnuPG dummy, a key stub)' : ''
  throw new CipherError(`S2K type ${String(type)}${name} is not supported: only 0, 1 and 3`)
}

function readHash(hash: number | undefined): number {
  if (hash !== undefined && Object.hasOwn(S2K_HASHES, hash)) return hash
  const names = Object.values(S2K_HASHES).map((entry) => entry.name)
  throw new CipherError(
    `S2K hash ${String(hash)} is not supported: ${names.slice(0, -1).join(', ')} and ${names.at(-1)!}`,
  )
}

/**
 * Writes an S2K specifier.
 *
 * @param s2k - The specifier.
 * @returns {number[]} Its bytes.
 */
export function writeS2k(s2k: Readonly<S2k>): number[] {
  return [s2k.type, s2k.hash, ...(s2k.salt ?? []), ...(s2k.count === undefined ? [] : [s2k.count])]
}

/**
 * `total` bytes of `data` repeated: a 64 KiB chunk fed `times` times, then `tail`.
 *
 * @param data - Salt and passphrase, at least one byte.
 * @param total - Bytes to feed in all.
 * @returns {{ chunk: Uint8Array; times: number; tail: Uint8Array }} What to feed the hash.
 */
function repeat(
  data: Bytes,
  total: number,
): { chunk: Uint8Array; times: number; tail: Uint8Array } {
  const copies = Math.max(1, Math.floor(65_536 / data.length))
  const chunk = Uint8Array.from({ length: copies * data.length }, (_, i) => data[i % data.length]!)
  const times = Math.floor(total / chunk.length)
  return { chunk, times, tail: chunk.subarray(0, total - times * chunk.length) }
}

/**
 * The S2K of RFC 4880 §3.7.1; each extra hash context starts one zero byte longer.
 *
 * @param s2k - The specifier.
 * @param passphrase - The passphrase as UTF-8.
 * @param length - Key bytes wanted.
 * @returns {number[]} The key.
 */
export function deriveKey(s2k: Readonly<S2k>, passphrase: Bytes, length: number): number[] {
  const data = [...(s2k.salt ?? []), ...passphrase]
  const total =
    s2k.count === undefined ? data.length : Math.max(data.length, decodeCount(s2k.count))
  const key: number[] = []
  for (let i = 0; key.length < length; i++) {
    const hasher = S2K_HASHES[s2k.hash]!.create()
    hasher.update(new Uint8Array(i))
    const { chunk, times, tail } = repeat(data, total)
    for (let n = 0; n < times; n++) hasher.update(chunk)
    hasher.update(tail)
    key.push(...hasher.digest())
  }
  return key.slice(0, length)
}
