import { Sha256Hasher, hkdf } from '@agntn/hashes'
import { CipherError } from '../../../core/errors.ts'
import type { Bytes } from '../../../core/block-mode.ts'
import { aesBlock } from '../aes/block.ts'
import { aesCtr } from '../aes/ctr.ts'
import { aesOcb } from '../aes/ocb.ts'

const BLOCK_SIZE = 16

/** Every OpenPGP AEAD mode ends a chunk and a session key in a 16-byte tag. */
const TAG_LENGTH = 16

/** An AEAD mode of RFC 9580 §9.6 that opens with AES. */
export interface AeadMode {
  readonly id: number
  readonly name: string
  readonly nonceLength: number
  /** The plaintext of `sealed`, ciphertext then tag, or nothing when the tag does not match. */
  readonly open: (key: Bytes, nonce: Bytes, aad: Bytes, sealed: Bytes) => number[] | undefined
}

function xor(a: Bytes, b: Bytes): number[] {
  return a.map((byte, i) => byte ^ b[i]!)
}

/**
 * Looks at every byte before deciding, so the time taken doesn't show where the tags differ.
 *
 * @param a - One tag.
 * @param b - The other.
 * @returns {boolean} Whether they match.
 */
function sameTag(a: Bytes, b: Bytes): boolean {
  return a.length === b.length && a.reduce((sum, byte, i) => sum | (byte ^ b[i]!), 0) === 0
}

/**
 * Doubles a block in GF(2^128), the way CMAC derives its subkeys.
 *
 * @param block - 16 bytes.
 * @returns {number[]} The doubled block.
 */
function double(block: Bytes): number[] {
  const doubled = block.map((byte, i) => ((byte << 1) | ((block[i + 1] ?? 0) >> 7)) & 0xff)
  if (block[0]! & 0x80) doubled[BLOCK_SIZE - 1]! ^= 0x87
  return doubled
}

/**
 * OMAC1, which NIST calls CMAC, over a message that is never empty here.
 *
 * @param encrypt - AES forward under the key.
 * @param message - At least one byte.
 * @returns {number[]} The 16-byte MAC.
 */
function cmac(encrypt: (block: Bytes) => Bytes, message: Bytes): number[] {
  const k1 = double(encrypt(Array.from({ length: BLOCK_SIZE }, () => 0)))
  const whole = message.length % BLOCK_SIZE === 0
  const last = whole
    ? xor(message.slice(-BLOCK_SIZE), k1)
    : xor(padLast(message.slice(message.length - (message.length % BLOCK_SIZE))), double(k1))
  let mac: Bytes = Array.from({ length: BLOCK_SIZE }, () => 0)
  const head = message.length - (whole ? BLOCK_SIZE : message.length % BLOCK_SIZE)
  for (let at = 0; at < head; at += BLOCK_SIZE) {
    mac = encrypt(xor(mac, message.slice(at, at + BLOCK_SIZE)))
  }
  return [...encrypt(xor(mac, last))]
}

function padLast(bytes: Bytes): number[] {
  return [...bytes, 0x80, ...Array.from({ length: BLOCK_SIZE - 1 - bytes.length }, () => 0)]
}

/**
 * EAX of Bellare, Rogaway and Wagner, three tweaked OMACs and CTR from the nonce's MAC.
 *
 * @param key - The AES key.
 * @param nonce - 16 bytes in OpenPGP.
 * @param aad - The header the tag covers.
 * @param sealed - Ciphertext, then the tag.
 * @returns {number[] | undefined} The plaintext, or nothing when the tag does not match.
 */
function openEax(key: Bytes, nonce: Bytes, aad: Bytes, sealed: Bytes): number[] | undefined {
  const encrypt = aesBlock(key, 'encrypt')
  const omac = (tweak: number, data: Bytes) =>
    cmac(encrypt, [...Array.from({ length: BLOCK_SIZE - 1 }, () => 0), tweak, ...data])
  const ciphertext = sealed.slice(0, -TAG_LENGTH)
  const counter = omac(0, nonce)
  const tag = xor(xor(counter, omac(1, aad)), omac(2, ciphertext))
  if (!sameTag(tag, sealed.slice(-TAG_LENGTH))) return undefined
  return aesCtr(ciphertext, key, counter)
}

/** The reduction constant of GCM, `11100001` followed by 120 zero bits. */
const GCM_R = 0xe1n << 120n

function toBigInt(block: Bytes): bigint {
  return block.reduce((value, byte) => (value << 8n) | BigInt(byte), 0n)
}

function fromBigInt(value: bigint): number[] {
  return Array.from({ length: BLOCK_SIZE }, (_, i) =>
    Number((value >> BigInt(8 * (BLOCK_SIZE - 1 - i))) & 0xffn),
  )
}

/**
 * Multiplication in GF(2^128) with GCM's bit order, NIST SP 800-38D Algorithm 1.
 *
 * @param x - One factor as a 128-bit number, first byte on top.
 * @param y - The other.
 * @returns {bigint} The product.
 */
function gcmMultiply(x: bigint, y: bigint): bigint {
  let product = 0n
  let v = y
  for (let bit = 127n; bit >= 0n; bit--) {
    if ((x >> bit) & 1n) product ^= v
    v = v & 1n ? (v >> 1n) ^ GCM_R : v >> 1n
  }
  return product
}

function zeroPad(bytes: Bytes): number[] {
  const rest = bytes.length % BLOCK_SIZE
  return rest === 0 ? [...bytes] : [...bytes, ...Array.from({ length: BLOCK_SIZE - rest }, () => 0)]
}

function bitLength(bytes: Bytes): number[] {
  return fromBigInt(BigInt(bytes.length * 8)).slice(-8)
}

/**
 * GHASH of NIST SP 800-38D §6.4 over the padded AAD, the padded ciphertext and both bit lengths.
 *
 * @param h - The hash key, AES of the zero block.
 * @param aad - The header.
 * @param ciphertext - The ciphertext.
 * @returns {number[]} 16 bytes.
 */
function ghash(h: bigint, aad: Bytes, ciphertext: Bytes): number[] {
  const blocks = [
    ...zeroPad(aad),
    ...zeroPad(ciphertext),
    ...bitLength(aad),
    ...bitLength(ciphertext),
  ]
  let y = 0n
  for (let at = 0; at < blocks.length; at += BLOCK_SIZE) {
    y = gcmMultiply(y ^ toBigInt(blocks.slice(at, at + BLOCK_SIZE)), h)
  }
  return fromBigInt(y)
}

/**
 * GCM with a 12-byte nonce, NIST SP 800-38D. Counter 1 masks the tag, the text starts at 2.
 *
 * @param key - The AES key.
 * @param nonce - 12 bytes.
 * @param aad - The header the tag covers.
 * @param sealed - Ciphertext, then the tag.
 * @returns {number[] | undefined} The plaintext, or nothing when the tag does not match.
 */
function openGcm(key: Bytes, nonce: Bytes, aad: Bytes, sealed: Bytes): number[] | undefined {
  const encrypt = aesBlock(key, 'encrypt')
  const ciphertext = sealed.slice(0, -TAG_LENGTH)
  const h = toBigInt(encrypt(Array.from({ length: BLOCK_SIZE }, () => 0)))
  const tag = xor(encrypt([...nonce, 0, 0, 0, 1]), ghash(h, aad, ciphertext))
  if (!sameTag(tag, sealed.slice(-TAG_LENGTH))) return undefined
  return aesCtr(ciphertext, key, [...nonce, 0, 0, 0, 2])
}

/**
 * OCB of RFC 7253 with a 128-bit tag, as `aes-ocb` runs it.
 *
 * @param key - The AES key.
 * @param nonce - 15 bytes in OpenPGP.
 * @param aad - The header the tag covers.
 * @param sealed - Ciphertext, then the tag.
 * @returns {number[] | undefined} The plaintext, or nothing when the tag does not match.
 */
function openOcb(key: Bytes, nonce: Bytes, aad: Bytes, sealed: Bytes): number[] | undefined {
  try {
    return aesOcb(sealed, key, 'decrypt', nonce, aad, 128)
  } catch (error) {
    if (error instanceof CipherError) return undefined
    throw error
  }
}

const AEAD_MODES: readonly AeadMode[] = [
  { id: 1, name: 'eax', nonceLength: 16, open: openEax },
  { id: 2, name: 'ocb', nonceLength: 15, open: openOcb },
  { id: 3, name: 'gcm', nonceLength: 12, open: openGcm },
]

/**
 * The AEAD mode a packet names.
 *
 * @param id - The mode octet.
 * @returns {AeadMode} The mode.
 * @throws {CipherError} When the id is none of EAX, OCB and GCM.
 */
export function aeadById(id: number | undefined): AeadMode {
  const mode = AEAD_MODES.find((candidate) => candidate.id === id)
  if (!mode)
    throw new CipherError(`AEAD mode ${String(id)} is not supported: only eax, ocb and gcm`)
  return mode
}

/**
 * Opens one sealed value with no chunks, as an encrypted session key is.
 *
 * @param mode - The AEAD mode.
 * @param key - The AES key.
 * @param nonce - The nonce.
 * @param aad - The header the tag covers.
 * @param sealed - Ciphertext and tag.
 * @returns {number[] | undefined} The plaintext, or nothing when it is too short or the tag fails.
 */
export function openSealed(
  mode: AeadMode,
  key: Bytes,
  nonce: Bytes,
  aad: Bytes,
  sealed: Bytes,
): number[] | undefined {
  return sealed.length < TAG_LENGTH ? undefined : mode.open(key, nonce, aad, sealed)
}

/** Tag 20 v1 as GnuPG writes it, or SEIPD v2 of RFC 9580. */
export interface AeadData {
  readonly tag: number
  readonly version: number
  readonly algorithm: number
  readonly keySize: number
  readonly mode: AeadMode
  readonly chunkOctet: number
  /** The starting IV of tag 20, or the 32-byte salt of SEIPD v2. */
  readonly iv: Bytes
  /** The chunks with their tags, then the final tag. */
  readonly sealed: Bytes
}

interface Chunking {
  readonly key: Bytes
  readonly nonce: (index: number) => number[]
  readonly aad: (index: number) => number[]
  readonly finalAad: (index: number, total: number) => number[]
}

function uint64(value: number): number[] {
  return fromBigInt(BigInt(value)).slice(-8)
}

function header(data: AeadData): number[] {
  return [0xc0 | data.tag, data.version, data.algorithm, data.mode.id, data.chunkOctet]
}

/**
 * Tag 20 of LibrePGP §5.16. The chunk index goes into the IV by XOR and into every AAD.
 *
 * @param data - The packet.
 * @param sessionKey - The session key.
 * @returns {Chunking} Key, nonces and AADs.
 */
function packetChunking(data: AeadData, sessionKey: Bytes): Chunking {
  const head = header(data)
  return {
    key: sessionKey,
    nonce: (index) => [...data.iv.slice(0, -8), ...xor(data.iv.slice(-8), uint64(index))],
    aad: (index) => [...head, ...uint64(index)],
    finalAad: (index, total) => [...head, ...uint64(index), ...uint64(total)],
  }
}

/**
 * SEIPD v2 of RFC 9580 §5.13.2. HKDF-SHA256 gives the message key and the IV before the index.
 *
 * @param data - The packet.
 * @param sessionKey - The session key.
 * @returns {Chunking} Key, nonces and AADs.
 */
function seipdChunking(data: AeadData, sessionKey: Bytes): Chunking {
  const head = header(data)
  const derived = hkdf(
    () => new Sha256Hasher(),
    Uint8Array.from(sessionKey),
    Uint8Array.from(data.iv),
    Uint8Array.from(head),
    data.keySize + data.mode.nonceLength - 8,
  )
  const iv = [...derived.subarray(data.keySize)]
  return {
    key: [...derived.subarray(0, data.keySize)],
    nonce: (index) => [...iv, ...uint64(index)],
    aad: () => head,
    finalAad: (_, total) => [...head, ...uint64(total)],
  }
}

/**
 * Opens every chunk in order, then the final tag over the total length, which catches a cut.
 *
 * @param data - The AEAD data packet.
 * @param sessionKey - The session key, as long as the packet's algorithm takes.
 * @returns {number[] | undefined} The packets inside, or nothing when a tag does not match.
 * @throws {CipherError} When the packet is too short to hold its final tag.
 */
export function openAeadData(data: AeadData, sessionKey: Bytes): number[] | undefined {
  if (data.sealed.length < TAG_LENGTH) {
    throw new CipherError('The AEAD encrypted data is too short to hold its final tag')
  }
  const chunking =
    data.tag === 20 ? packetChunking(data, sessionKey) : seipdChunking(data, sessionKey)
  const chunks = data.sealed.slice(0, -TAG_LENGTH)
  const step = 2 ** (data.chunkOctet + 6) + TAG_LENGTH
  const plain: number[] = []
  let index = 0
  for (let at = 0; at < chunks.length; at += step, index++) {
    const chunk = chunks.slice(at, at + step)
    const opened =
      chunk.length > TAG_LENGTH
        ? data.mode.open(chunking.key, chunking.nonce(index), chunking.aad(index), chunk)
        : undefined
    if (!opened) return undefined
    for (const byte of opened) plain.push(byte)
  }
  const final = data.mode.open(
    chunking.key,
    chunking.nonce(index),
    chunking.finalAad(index, plain.length),
    data.sealed.slice(-TAG_LENGTH),
  )
  return final ? plain : undefined
}
