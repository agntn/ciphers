import { bzip2 } from '@agntn/compressions/bzip2'
import { deflate } from '@agntn/compressions/deflate'
import { base64 } from '@agntn/encodings/base64'
import { sha1 } from '@agntn/hashes'
import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../../core/types.ts'
import { getOpt } from '../../../core/types.ts'
import { Cipher } from '../../../core/cipher.ts'
import { CipherError, InvalidOptionError, normalizeError } from '../../../core/errors.ts'
import {
  BYTES_OPTION,
  type Bytes,
  type PlainBytes,
  fromHex,
  readBytes,
  readHex,
  readPlaintext,
  toHex,
  writePlaintext,
} from '../../../core/block-mode.ts'
import { aesBlock } from '../aes/block.ts'
import { readPassphrase } from '../aes/passphrase.ts'
import { tripleDesBlock } from '../triple-des/block.ts'
import { blowfishBlock } from '../blowfish.ts'
import { cast5Block } from '../cast5.ts'
import { ideaBlock } from '../idea.ts'
import { readArmor, writeArmor } from './armor.ts'
import { type Packet, readPackets, writePacket } from './packets.ts'
import {
  MAX_S2K_COUNT,
  MIN_S2K_COUNT,
  S2K_HASHES,
  type S2k,
  decodeCount,
  deriveKey,
  encodeCount,
  readS2k,
  writeS2k,
} from './s2k.ts'

/** Packet tags, RFC 4880 §4.3. */
const TAG = {
  pkesk: 1,
  signature: 2,
  skesk: 3,
  onePassSignature: 4,
  compressed: 8,
  sed: 9,
  marker: 10,
  literal: 11,
  seipd: 18,
  mdc: 19,
  aead: 20,
} as const

/** A symmetric algorithm of RFC 4880 §9.2 that has a block function here. */
interface Algorithm {
  readonly id: number
  readonly name: string
  readonly keySize: number
  readonly blockSize: number
  readonly encrypt: (key: Bytes) => (block: Bytes) => Bytes
}

const ALGORITHMS: readonly Algorithm[] = [
  { id: 1, name: 'idea', keySize: 16, blockSize: 8, encrypt: (key) => ideaBlock(key, 'encrypt') },
  {
    id: 2,
    name: '3des',
    keySize: 24,
    blockSize: 8,
    encrypt: (key) => tripleDesBlock(key, 'encrypt'),
  },
  { id: 3, name: 'cast5', keySize: 16, blockSize: 8, encrypt: (key) => cast5Block(key, 'encrypt') },
  {
    id: 4,
    name: 'blowfish',
    keySize: 16,
    blockSize: 8,
    encrypt: (key) => blowfishBlock(key, 'encrypt'),
  },
  { id: 7, name: 'aes128', keySize: 16, blockSize: 16, encrypt: (key) => aesBlock(key, 'encrypt') },
  { id: 8, name: 'aes192', keySize: 24, blockSize: 16, encrypt: (key) => aesBlock(key, 'encrypt') },
  { id: 9, name: 'aes256', keySize: 32, blockSize: 16, encrypt: (key) => aesBlock(key, 'encrypt') },
]

/** Ids a message may name that have no block function here. */
const OTHER_ALGORITHMS: Readonly<Record<number, string>> = {
  0: 'plaintext',
  5: 'SAFER-SK',
  6: 'DES/SK',
  10: 'Twofish',
  11: 'Camellia-128',
  12: 'Camellia-192',
  13: 'Camellia-256',
}

const ALGORITHM_NAMES = ALGORITHMS.map((algorithm) => algorithm.name)

/** Compression ids of RFC 4880 §9.3, each with what decompresses it under an output limit. */
const COMPRESSION: Readonly<
  Record<number, { name: string; run: (data: Uint8Array, limit: number) => { bytes: Uint8Array } }>
> = {
  1: { name: 'zip', run: (data, limit) => deflate.decompress(data, { container: 'raw', limit }) },
  2: { name: 'zlib', run: (data, limit) => deflate.decompress(data, { container: 'zlib', limit }) },
  3: { name: 'bzip2', run: (data, limit) => bzip2.decompress(data, { limit }) },
}

/** Passphrase packets one message may make this cipher try, each up to 65 MB of hashing. */
const MAX_SKESK = 8

/** How large compressed data may grow, and how deep compressed packets may nest. */
const MAX_INFLATED = 4 * 1024 * 1024
const MAX_NESTING = 4

/** The two bytes of an MDC packet header, which the SHA-1 covers too. */
const MDC_HEADER = [0xd3, 0x14]
const MDC_LENGTH = 22

interface Skesk {
  readonly algorithm: Algorithm
  readonly s2k: S2k
  readonly encryptedKey: Bytes
}

interface SessionKey {
  readonly algorithm: Algorithm
  readonly key: Bytes
}

interface Opened {
  readonly prefix: number[]
  readonly packets: number[]
}

interface Literal {
  readonly data: number[]
  readonly filename: string
  readonly compression?: string
}

interface Decrypted extends Literal {
  readonly skesk: Skesk
  readonly algorithm: Algorithm
  readonly prefix: Bytes
}

function algorithmById(id: number | undefined): Algorithm {
  const algorithm = ALGORITHMS.find((candidate) => candidate.id === id)
  if (algorithm) return algorithm
  const name =
    id !== undefined && Object.hasOwn(OTHER_ALGORITHMS, id) ? ` (${OTHER_ALGORITHMS[id]})` : ''
  throw new CipherError(
    `Cipher algorithm ${String(id)}${name} is not supported: ${ALGORITHM_NAMES.join(', ')}`,
  )
}

/**
 * CFB with a zero IV and no resync, as SEIPD and encrypted session keys use it.
 *
 * @param algorithm - The block cipher.
 * @param key - Its key.
 * @param data - Any number of bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} As many bytes as `data`.
 */
function cfb(
  algorithm: Algorithm,
  key: Bytes,
  data: Bytes,
  operation: 'encrypt' | 'decrypt',
): number[] {
  const encrypt = algorithm.encrypt(key)
  const output: number[] = []
  let previous: Bytes = Array.from<number>({ length: algorithm.blockSize }).fill(0)
  for (let at = 0; at < data.length; at += algorithm.blockSize) {
    const chunk = data.slice(at, at + algorithm.blockSize)
    const stream = encrypt(previous)
    const result = chunk.map((byte, i) => byte ^ stream[i]!)
    output.push(...result)
    previous = operation === 'encrypt' ? result : chunk
  }
  return output
}

/**
 * The encoded text as bytes: an armored block, or the bare packets in base64 or hex.
 *
 * @param text - What was passed to `decode`.
 * @returns {number[]} The message.
 */
function readMessage(text: string): number[] {
  if (text.includes('-----BEGIN PGP')) return readArmor(text)
  const compact = text.replaceAll(/\s/g, '')
  if (/^(?:[0-9a-f]{2})+$/i.test(compact)) return fromHex(compact.toLowerCase())
  try {
    return [...base64.decode(compact)]
  } catch {
    throw new CipherError(
      'Ciphertext must be an armored OpenPGP message (-----BEGIN PGP MESSAGE-----), or its packets in base64 or hex',
    )
  }
}

function readSkesk(body: Bytes): Skesk {
  if (body[0] !== 4) {
    throw new CipherError(
      `SKESK version ${String(body[0])} is not supported: only 4, since 5 and 6 carry AEAD`,
    )
  }
  const algorithm = algorithmById(body[1])
  const { s2k, next } = readS2k(body, 2)
  return { algorithm, s2k, encryptedKey: body.slice(next) }
}

/**
 * The session key: the S2K output, or the key it decrypts when the packet has one.
 *
 * @param skesk - The passphrase packet.
 * @param passphrase - The passphrase as UTF-8.
 * @returns {SessionKey | undefined} The key, or nothing when the decrypted one cannot be a key.
 */
function sessionKey(skesk: Skesk, passphrase: Bytes): SessionKey | undefined {
  const derived = deriveKey(skesk.s2k, passphrase, skesk.algorithm.keySize)
  if (skesk.encryptedKey.length === 0) return { algorithm: skesk.algorithm, key: derived }
  const [id, ...key] = cfb(skesk.algorithm, derived, skesk.encryptedKey, 'decrypt')
  const algorithm = ALGORITHMS.find((candidate) => candidate.id === id)
  return algorithm?.keySize === key.length ? { algorithm, key } : undefined
}

/**
 * Decrypts SEIPD; the repeated prefix bytes catch a wrong key, the MDC a change.
 *
 * @param body - The SEIPD packet body.
 * @param session - The session key.
 * @returns {Opened | 'wrong key' | 'changed'} The random prefix and the packets inside, or why not.
 */
function decryptData(body: Bytes, session: SessionKey): Opened | 'wrong key' | 'changed' {
  const size = session.algorithm.blockSize
  const plain = cfb(session.algorithm, session.key, body.slice(1), 'decrypt')
  if (plain.length < size + 2 + MDC_LENGTH) {
    throw new CipherError('The encrypted data packet is too short to hold its prefix and MDC')
  }
  if (plain[size - 2] !== plain[size] || plain[size - 1] !== plain[size + 1]) return 'wrong key'
  const end = plain.length - MDC_LENGTH
  const digest = sha1(Uint8Array.from(plain.slice(0, end + 2)))
  const mdc = plain.slice(end)
  if (
    mdc[0] !== MDC_HEADER[0] ||
    mdc[1] !== MDC_HEADER[1] ||
    digest.some((b, i) => b !== mdc[2 + i])
  ) {
    return 'changed'
  }
  return { prefix: plain.slice(0, size), packets: plain.slice(size + 2, end) }
}

/**
 * Unpacks at most `MAX_INFLATED` bytes. Subpaths export no error classes, so fields tell them apart.
 *
 * @param body - The packet body: the compression id, then the data.
 * @returns {{ bytes: number[]; compression: string }} The contents and the compression name.
 * @throws {CipherError} When the id is unknown, the data is broken or it grows too large.
 */
function decompress(body: Bytes): { bytes: number[]; compression: string } {
  const [id, ...data] = body
  if (id === 0) return { bytes: data, compression: 'none' }
  const format = id !== undefined && Object.hasOwn(COMPRESSION, id) ? COMPRESSION[id] : undefined
  if (format === undefined) {
    throw new CipherError(`Compression ${String(id)} is not supported: only zip, zlib and bzip2`)
  }
  try {
    const { bytes } = format.run(Uint8Array.from(data), MAX_INFLATED)
    return { bytes: Array.from(bytes), compression: format.name }
  } catch (error) {
    if (!(error instanceof Error) || !('partial' in error)) throw error
    if ('limit' in error) {
      throw new CipherError(`Compressed data inflates past ${MAX_INFLATED} bytes`)
    }
    throw new CipherError(`Compressed data is broken: ${error.message}`)
  }
}

function readLiteral(body: Bytes): Literal {
  const nameLength = body[1] ?? 0
  if (body.length < 2 + nameLength + 4)
    throw new CipherError('The literal data packet is cut short')
  const data = body.slice(2 + nameLength + 4)
  const filename = new TextDecoder().decode(Uint8Array.from(body.slice(2, 2 + nameLength)))
  const text = body[0] === 0x74 || body[0] === 0x75
  return { data: text ? dropCarriageReturns(data) : data, filename }
}

/**
 * Text mode stores lines as CRLF, and GnuPG writes them out as LF on Unix.
 *
 * @param data - The literal data.
 * @returns {number[]} The data with every CR before an LF removed.
 */
function dropCarriageReturns(data: Bytes): number[] {
  return data.filter((byte, i) => byte !== 0x0d || data[i + 1] !== 0x0a)
}

/**
 * The literal data, through compressed packets and past unchecked signatures.
 *
 * @param bytes - Packets.
 * @param depth - Compressed packets already opened around them.
 * @returns {Literal} The data, its file name and the compression it came out of.
 */
function findLiteral(bytes: Bytes, depth: number): Literal {
  for (const packet of readPackets(bytes)) {
    if (packet.tag === TAG.literal) return readLiteral(packet.body)
    if (packet.tag === TAG.compressed) return openCompressed(packet, depth)
    if (
      packet.tag !== TAG.onePassSignature &&
      packet.tag !== TAG.signature &&
      packet.tag !== TAG.marker
    ) {
      throw new CipherError(`Packet tag ${packet.tag} is not expected inside the encrypted data`)
    }
  }
  throw new CipherError('The encrypted data holds no literal data packet')
}

function openCompressed(packet: Packet, depth: number): Literal {
  if (depth >= MAX_NESTING) {
    throw new CipherError(`Compressed packets nest more than ${MAX_NESTING} deep`)
  }
  const { bytes, compression } = decompress(packet.body)
  const literal = findLiteral(bytes, depth + 1)
  return { ...literal, compression: literal.compression ?? compression }
}

/**
 * Why a message without a SEIPD packet cannot be opened.
 *
 * @param packets - The top-level packets.
 * @returns {CipherError} The error to throw.
 */
function missingData(packets: readonly Packet[]): CipherError {
  if (packets.some((packet) => packet.tag === TAG.aead)) {
    return new CipherError(
      'AEAD encrypted data (packet tag 20, as GnuPG writes OCB) is not supported',
    )
  }
  if (packets.some((packet) => packet.tag === TAG.sed)) {
    return new CipherError(
      'Encrypted data without integrity protection (packet tag 9, PGP 2 and 6) is not supported',
    )
  }
  return new CipherError('The message has no encrypted data packet (SEIPD, tag 18)')
}

/**
 * The passphrase packets this cipher can run; an unsupported one is thrown only when none is left.
 *
 * @param packets - The top-level packets.
 * @returns {Skesk[]} The readable packets in order.
 */
function passphrasePackets(packets: readonly Packet[]): Skesk[] {
  const skesks = packets.filter((packet) => packet.tag === TAG.skesk)
  if (skesks.length === 0) {
    const toKey = packets.some((packet) => packet.tag === TAG.pkesk)
    throw new CipherError(
      `The message has no passphrase packet (SKESK, tag 3)${toKey ? ': it is encrypted to a public key only' : ''}`,
    )
  }
  if (skesks.length > MAX_SKESK) {
    throw new CipherError(
      `The message has ${skesks.length} passphrase packets; at most ${MAX_SKESK} are tried`,
    )
  }
  const readable: Skesk[] = []
  let unsupported: unknown
  for (const packet of skesks) {
    try {
      readable.push(readSkesk(packet.body))
    } catch (e) {
      unsupported ??= e
    }
  }
  if (readable.length === 0) throw unsupported
  return readable
}

/**
 * Tries every passphrase packet in order until one opens the data.
 *
 * @param message - The message bytes.
 * @param passphrase - The passphrase as UTF-8.
 * @returns {Decrypted} The literal data and what opened it.
 * @throws {CipherError} When no packet takes the passphrase, or the data does not check out.
 */
function decryptMessage(message: Bytes, passphrase: Bytes): Decrypted {
  const packets = readPackets(message)
  const data = packets.find((packet) => packet.tag === TAG.seipd)
  if (!data) throw missingData(packets)
  if (data.body[0] !== 1) {
    throw new CipherError(
      `SEIPD version ${String(data.body[0])} is not supported: only 1, since 2 carries AEAD`,
    )
  }
  let changed = false
  for (const skesk of passphrasePackets(packets)) {
    const session = sessionKey(skesk, passphrase)
    const opened = session ? decryptData(data.body, session) : 'wrong key'
    if (session && typeof opened === 'object') {
      return {
        ...findLiteral(opened.packets, 0),
        skesk,
        algorithm: session.algorithm,
        prefix: opened.prefix,
      }
    }
    changed ||= opened === 'changed'
  }
  throw new CipherError(
    changed
      ? 'The MDC does not match: the message was changed or cut'
      : 'Wrong passphrase: the check bytes after the random prefix do not match',
  )
}

interface EncodeSettings {
  readonly algorithm: Algorithm
  readonly hash: number
  readonly count: number
  readonly salt: Bytes
  readonly prefix: Bytes
}

function readAlgorithm(options: Readonly<CipherBaseOptions>): Algorithm {
  const name = getOpt<unknown>(options, 'algorithm', 'aes256')
  const algorithm = ALGORITHMS.find((candidate) => candidate.name === name)
  if (!algorithm) {
    throw new InvalidOptionError('algorithm', name, `must be one of ${ALGORITHM_NAMES.join(', ')}`)
  }
  return algorithm
}

function readDigest(options: Readonly<CipherBaseOptions>): number {
  const name = getOpt<unknown>(options, 'digest', 'sha512')
  const entry = Object.entries(S2K_HASHES).find(([, hash]) => hash.name === name)
  if (!entry) {
    const names = Object.values(S2K_HASHES).map((hash) => hash.name)
    throw new InvalidOptionError('digest', name, `must be one of ${names.join(', ')}`)
  }
  return Number(entry[0])
}

function readCount(options: Readonly<CipherBaseOptions>): number {
  const count = getOpt<unknown>(options, 'count', MAX_S2K_COUNT)
  if (
    !Number.isInteger(count) ||
    (count as number) < MIN_S2K_COUNT ||
    (count as number) > MAX_S2K_COUNT
  ) {
    throw new InvalidOptionError(
      'count',
      count,
      `must be an integer from ${MIN_S2K_COUNT} to ${MAX_S2K_COUNT}, the bytes the S2K hashes`,
    )
  }
  return encodeCount(count as number)
}

/**
 * A fixed hex value from the options, or random bytes when it is left out.
 *
 * @param options - The cipher options.
 * @param name - `salt` or `iv`.
 * @param size - Bytes wanted.
 * @returns {number[]} The bytes.
 */
function readRandom(options: Readonly<CipherBaseOptions>, name: string, size: number): number[] {
  const value = options[name]
  if (value === undefined || value === '') return [...crypto.getRandomValues(new Uint8Array(size))]
  return fromHex(
    readHex(value, name, (digits) => digits === 2 * size, `must be ${2 * size} hex digits`),
  )
}

function readEncodeSettings(options: Readonly<CipherBaseOptions>): EncodeSettings {
  const algorithm = readAlgorithm(options)
  return {
    algorithm,
    hash: readDigest(options),
    count: readCount(options),
    salt: readRandom(options, 'salt', 8),
    prefix: readRandom(options, 'iv', algorithm.blockSize),
  }
}

/**
 * What `gpg --symmetric --armor` writes for these bytes, minus the compression.
 *
 * @param data - The plain bytes.
 * @param passphrase - The passphrase as UTF-8.
 * @param settings - Algorithm, S2K and the random values.
 * @returns {number[]} The message bytes.
 */
function encryptMessage(data: Bytes, passphrase: Bytes, settings: EncodeSettings): number[] {
  const { algorithm, prefix } = settings
  const s2k: S2k = { type: 3, hash: settings.hash, salt: settings.salt, count: settings.count }
  const key = deriveKey(s2k, passphrase, algorithm.keySize)
  const literal = writePacket(TAG.literal, [0x62, 0, 0, 0, 0, 0, ...data])
  const covered = [...prefix, ...prefix.slice(-2), ...literal, ...MDC_HEADER]
  const plain = [...covered, ...sha1(Uint8Array.from(covered))]
  return [
    ...writePacket(TAG.skesk, [4, algorithm.id, ...writeS2k(s2k)]),
    ...writePacket(TAG.seipd, [1, ...cfb(algorithm, key, plain, 'encrypt')]),
  ]
}

/**
 * The result options, which `encode` takes back to write the same message.
 *
 * @param passphrase - The passphrase as passed.
 * @param algorithm - The algorithm of the data.
 * @param s2k - The S2K of the passphrase packet.
 * @param prefix - The random first block.
 * @param bytes - What the plain side was.
 * @returns {Record<string, unknown>} The result options.
 */
function resultOptions(
  passphrase: string,
  algorithm: Algorithm,
  s2k: Readonly<S2k>,
  prefix: Bytes,
  bytes: PlainBytes,
): Record<string, unknown> {
  return {
    key: passphrase,
    algorithm: algorithm.name,
    digest: S2K_HASHES[s2k.hash]!.name,
    ...(s2k.count !== undefined && { count: decodeCount(s2k.count) }),
    ...(s2k.salt && { salt: toHex(s2k.salt) }),
    iv: toHex(prefix),
    ...(bytes === 'hex' && { bytes }),
  }
}

/**
 * Puts `[openpgp]` in front of a plain `CipherError` from the packet code.
 *
 * @param e - What was thrown.
 * @returns {Error} The error to rethrow.
 */
function prefixed(e: unknown): Error {
  if (e instanceof CipherError && e.constructor === CipherError && !e.message.startsWith('[')) {
    return new CipherError(`[openpgp] ${e.message}`)
  }
  return normalizeError(e, 'openpgp')
}

/** A passphrase-protected OpenPGP message, what `gpg --symmetric` writes and reads. */
export class OpenPgp extends Cipher {
  name(): string {
    return 'openpgp'
  }

  info(): CipherInfo {
    return {
      name: 'openpgp',
      label: 'OpenPGP (passphrase)',
      description:
        'A passphrase-protected OpenPGP message, RFC 4880, what gpg --symmetric writes: an S2K turns the passphrase into the key, CFB encrypts a literal data packet behind a random block, and an MDC (SHA-1) catches changes. Decoding reads armored or bare packets with IDEA, Triple DES, CAST5, Blowfish or AES, ZIP, ZLIB or BZip2 compression and an encrypted session key; encoding writes armor GnuPG opens. UTF-8 text in, armor out',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, armor out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'The passphrase, any text, read as UTF-8',
        },
        {
          name: 'algorithm',
          type: 'string',
          required: false,
          default: 'aes256',
          description: `Encoding only: ${ALGORITHM_NAMES.join(', ')}. Decoding reads it from the message`,
        },
        {
          name: 'digest',
          type: 'string',
          required: false,
          default: 'sha512',
          description:
            'Encoding only: the S2K hash, md5, sha1, ripemd160, sha224, sha256, sha384, sha512, sha3-256 or sha3-512 (GnuPG 2.4 picks sha512)',
        },
        {
          name: 'count',
          type: 'number',
          required: false,
          default: MAX_S2K_COUNT,
          description: `Encoding only: bytes the S2K hashes, ${MIN_S2K_COUNT} to ${MAX_S2K_COUNT}, rounded up to a count OpenPGP can write`,
        },
        {
          name: 'salt',
          type: 'string',
          required: false,
          description: 'Encoding only: the S2K salt, 16 hex digits. Random when left out',
        },
        {
          name: 'iv',
          type: 'string',
          required: false,
          description:
            'Encoding only: the random block before the text, as many hex digits as the algorithm has in a block (16, or 32 for AES). Random when left out',
        },
        BYTES_OPTION,
      ],
      keyspace: 'set by the passphrase, not by the algorithm',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const passphrase = readPassphrase(options)
      const settings = readEncodeSettings(options)
      const bytes = readBytes(options)
      const data = readPlaintext('openpgp', text, bytes)
      const message = encryptMessage(data, [...new TextEncoder().encode(passphrase)], settings)
      const s2k: S2k = { type: 3, hash: settings.hash, salt: settings.salt, count: settings.count }
      return {
        text: writeArmor(message),
        cipher: 'openpgp',
        operation: 'encode',
        options: resultOptions(passphrase, settings.algorithm, s2k, settings.prefix, bytes),
      }
    } catch (e) {
      throw prefixed(e)
    }
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const passphrase = readPassphrase(options)
      const bytes = readBytes(options)
      const decrypted = decryptMessage(readMessage(text), [...new TextEncoder().encode(passphrase)])
      return {
        text: writePlaintext('openpgp', decrypted.data, bytes),
        cipher: 'openpgp',
        operation: 'decode',
        options: {
          ...resultOptions(
            passphrase,
            decrypted.algorithm,
            decrypted.skesk.s2k,
            decrypted.prefix,
            bytes,
          ),
          ...(decrypted.compression !== undefined && { compression: decrypted.compression }),
          ...(decrypted.filename !== '' && { filename: decrypted.filename }),
        },
      }
    } catch (e) {
      throw prefixed(e)
    }
  }
}
