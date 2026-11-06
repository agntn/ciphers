import { bzip2 } from '@agntn/compressions/bzip2'
import { deflate } from '@agntn/compressions/deflate'
import { base64 } from '@agntn/encodings/base64'
import { crc32 } from '@agntn/hashes'
import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../../core/types.ts'
import { getOpt } from '../../../core/types.ts'
import { Cipher } from '../../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../../core/errors.ts'
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
import {
  FLAG,
  METHOD_NAMES,
  type ZipEntry,
  readEntries,
  readEntryData,
  showName,
  writeArchive,
} from './archive.ts'
import { ZipKeys } from './keys.ts'

/** The random bytes in front of the check byte, and the whole encryption header. */
const IV_SIZE = 11
const HEADER_SIZE = 12

/** The most an entry may unpack to, so a small archive can't fill memory. */
const MAX_INFLATED = 4 * 1024 * 1024

/** The methods this cipher unpacks after decrypting, by id. */
const UNPACK: Readonly<Record<number, (data: Uint8Array) => Uint8Array>> = {
  0: (data) => data,
  8: (data) => deflate.decompress(data, { container: 'raw', limit: MAX_INFLATED }).bytes,
  12: (data) => bzip2.decompress(data, { limit: MAX_INFLATED }).bytes,
}

/** The methods `encode` writes, by name. */
const PACK: Readonly<Record<string, { id: number; run: (data: Uint8Array) => Uint8Array }>> = {
  stored: { id: 0, run: (data) => data },
  deflate: { id: 8, run: (data) => deflate.compress(data, { container: 'raw', level: 9 }) },
}

/** How the caller unlocks the archive: the password, the keys, or both when they agree. */
interface Secret {
  readonly password: string | undefined
  /** As `ZipKeys.toHex` writes them. */
  readonly keys: string
}

/** The archive bytes and the entries its central directory lists. */
interface Archive {
  readonly bytes: Bytes
  readonly entries: readonly ZipEntry[]
}

/** What came out of one entry, and the header bytes it was written with. */
interface Opened {
  readonly entry: ZipEntry
  readonly data: Bytes
  readonly iv: Bytes
}

/**
 * The method name of an entry, as the result options and errors give it.
 *
 * @param method - The method id.
 * @returns {string} Such as `deflate`, or `method 97` for one without a name here.
 */
function methodName(method: number): string {
  return Object.hasOwn(METHOD_NAMES, method) ? METHOD_NAMES[method]! : `method ${method}`
}

/**
 * The encrypted entries, one per line part, for an error that has to say what is in the archive.
 *
 * @param entries - Every entry.
 * @returns {string} Such as `Encrypted entries: note.txt (stored, 15 bytes)`.
 */
function describeEncrypted(entries: readonly ZipEntry[]): string {
  const encrypted = entries.filter((entry) => (entry.flags & FLAG.encrypted) !== 0)
  if (encrypted.length === 0) return 'No entry in the archive is encrypted'
  const list = encrypted.map(
    (entry) => `${showName(entry.name)} (${methodName(entry.method)}, ${entry.size} bytes)`,
  )
  return `Encrypted entries: ${list.join(', ')}`
}

/**
 * The archive bytes from hex or base64, the two ways a binary file fits in a text argument.
 *
 * @param text - What was passed to `decode`.
 * @returns {number[]} The archive.
 * @throws {CipherError} When it is neither.
 */
function readArchive(text: string): number[] {
  const compact = text.replaceAll(/\s/g, '')
  if (/^(?:[0-9a-f]{2})+$/i.test(compact)) return fromHex(compact.toLowerCase())
  try {
    return [...base64.decode(compact)]
  } catch {
    throw new CipherError('Ciphertext must be a ZIP archive in hex or base64')
  }
}

/**
 * The `keys` option: three 32-bit words in hex, as bkcrack prints them.
 *
 * @param value - The option value, or nothing.
 * @returns {string | undefined} The keys as `ZipKeys.toHex` writes them, or nothing.
 * @throws {InvalidOptionError} When it is not 24 hex digits.
 */
function readKeys(value: unknown): string | undefined {
  if (value === undefined || value === '') return undefined
  const hex = readHex(
    value,
    'keys',
    (digits) => digits === 24,
    'must be 24 hex digits, the three 32-bit keys bkcrack prints, such as c4038591 d5ff449d d3b0c696',
  )
  return ZipKeys.fromHex(hex).toHex()
}

/**
 * The `key` option, the password, and the keys it gives.
 *
 * @param value - The option value, or nothing.
 * @returns {{ password: string; keys: string } | undefined} Both, or nothing.
 * @throws {InvalidOptionError} When it is not a string.
 */
function readPassword(value: unknown): { password: string; keys: string } | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string') throw new InvalidOptionError('key', value, 'must be a string')
  const keys = ZipKeys.fromPassword([...new TextEncoder().encode(value)]).toHex()
  return { password: value, keys }
}

/**
 * The password, the keys, or both, which then have to agree so `encode` takes the result back.
 *
 * @param options - The cipher options.
 * @param missing - What the error says when both are left out.
 * @returns {Secret} The keys, and the password when there was one.
 * @throws {MissingOptionError} When neither is given.
 * @throws {InvalidOptionError} When a value is malformed or the two disagree.
 */
function readSecret(options: Readonly<CipherBaseOptions>, missing: string): Secret {
  const password = readPassword(options.key)
  const keys = readKeys(options.keys)
  if (password === undefined) {
    if (keys === undefined) throw new MissingOptionError('key', missing)
    return { password: undefined, keys }
  }
  if (keys !== undefined && keys !== password.keys) {
    throw new InvalidOptionError(
      'keys',
      options.keys,
      `must be the keys the password gives, ${password.keys}`,
    )
  }
  return password
}

/**
 * The entry to open: the one named, or else the first encrypted one.
 *
 * @param entries - Every entry.
 * @param name - The `entry` option.
 * @returns {ZipEntry} The entry.
 * @throws {CipherError} When it is not there.
 */
function pickEntry(entries: readonly ZipEntry[], name: unknown): ZipEntry {
  if (name === undefined || name === '') {
    const first = entries.find((entry) => (entry.flags & FLAG.encrypted) !== 0)
    if (first !== undefined) return first
    throw new CipherError('Nothing to decrypt: no entry in the archive is encrypted')
  }
  if (typeof name !== 'string') throw new InvalidOptionError('entry', name, 'must be a string')
  const found = entries.find((entry) => entry.name === name)
  if (found !== undefined) return found
  throw new CipherError(`No entry named ${showName(name)}. ${describeEncrypted(entries)}`)
}

/**
 * Refuses an entry that is not ZipCrypto, or one packed with a method this cipher can't unpack.
 *
 * @param entry - The entry.
 * @throws {CipherError} When it isn't encrypted, uses another encryption or another method.
 */
function checkEntry(entry: Readonly<ZipEntry>): void {
  const what = `${showName(entry.name)} (${methodName(entry.method)})`
  if ((entry.flags & FLAG.encrypted) === 0) {
    throw new CipherError(`Nothing to decrypt: ${what} is not encrypted`)
  }
  if (entry.method === 99) {
    throw new CipherError(`Not supported: ${showName(entry.name)} uses WinZip AES, not ZipCrypto`)
  }
  if ((entry.flags & FLAG.strong) !== 0) {
    throw new CipherError(
      `Not supported: ${showName(entry.name)} uses PKWARE strong encryption, not ZipCrypto`,
    )
  }
  if (!Object.hasOwn(UNPACK, entry.method)) {
    throw new CipherError(
      `Not supported: ${what} is packed with a method only stored, deflate and bzip2 open here`,
    )
  }
  if (entry.compressedSize < HEADER_SIZE) {
    throw new CipherError(
      `Broken archive: ${showName(entry.name)} is too short for its 12-byte encryption header`,
    )
  }
}

/**
 * Unpacks the data. Broken data here means a wrong password got past the check byte.
 *
 * @param entry - The entry.
 * @param data - The decrypted data.
 * @param secret - `password` or `keys`, for the message.
 * @returns {Uint8Array} The file.
 * @throws {CipherError} When it does not unpack.
 */
function unpack(entry: Readonly<ZipEntry>, data: Bytes, secret: string): Uint8Array {
  try {
    return UNPACK[entry.method]!(Uint8Array.from(data))
  } catch (error) {
    if (error instanceof Error && 'limit' in error) {
      throw new CipherError(
        `Not supported: ${showName(entry.name)} unpacks past ${MAX_INFLATED} bytes`,
      )
    }
    throw new CipherError(
      `Wrong ${secret}: the check byte matched, but ${showName(entry.name)} does not unpack as ${methodName(entry.method)}. A wrong ${secret} passes that byte once in 256 tries, or the data is damaged`,
    )
  }
}

/**
 * Decrypts and unpacks one entry, trusting it only once its CRC-32 and size match.
 *
 * @param archive - The archive and its entries.
 * @param entry - The entry, already through `checkEntry`.
 * @param secret - The keys to open it with.
 * @returns {Opened} The file and what `encode` takes back.
 * @throws {CipherError} When the key is wrong or the data does not check out.
 */
function openEntry(
  archive: Readonly<Archive>,
  entry: Readonly<ZipEntry>,
  secret: Readonly<Secret>,
): Opened {
  const word = secret.password === undefined ? 'keys' : 'password'
  const listing = describeEncrypted(archive.entries)
  const stream = ZipKeys.fromHex(secret.keys.replaceAll(' ', ''))
  const stored = readEntryData(archive.bytes, entry)
  const header = stream.decrypt(stored.slice(0, HEADER_SIZE))
  const check = (entry.flags & FLAG.descriptor) !== 0 ? (entry.time >>> 8) & 0xff : entry.crc >>> 24
  if (header[IV_SIZE] !== check) {
    throw new CipherError(
      `Wrong ${word}: the check byte of the encryption header of ${showName(entry.name)} does not match. ${listing}`,
    )
  }
  const data = unpack(entry, stream.decrypt(stored.slice(HEADER_SIZE)), word)
  const crc = Number.parseInt(toHex([...crc32(data)]), 16)
  if (data.length !== entry.size || crc !== entry.crc) {
    throw new CipherError(
      `Wrong ${word}: the check byte matched, but the CRC-32 or size of ${showName(entry.name)} does not. A wrong ${word} passes that byte once in 256 tries, or the data is damaged`,
    )
  }
  return { entry, data: [...data], iv: header.slice(0, IV_SIZE) }
}

/**
 * The 11 random header bytes: fixed from `iv`, or random when it is left out.
 *
 * @param options - The cipher options.
 * @returns {number[]} The bytes.
 */
function readIv(options: Readonly<CipherBaseOptions>): number[] {
  const value = options.iv
  if (value === undefined || value === '')
    return [...crypto.getRandomValues(new Uint8Array(IV_SIZE))]
  return fromHex(
    readHex(value, 'iv', (digits) => digits === 2 * IV_SIZE, `must be ${2 * IV_SIZE} hex digits`),
  )
}

/**
 * The `method` option of `encode`.
 *
 * @param options - The cipher options.
 * @returns {string} `stored` or `deflate`.
 * @throws {InvalidOptionError} For anything else.
 */
function readMethod(options: Readonly<CipherBaseOptions>): string {
  const method = getOpt<unknown>(options, 'method', 'deflate')
  if (typeof method !== 'string' || !Object.hasOwn(PACK, method)) {
    throw new InvalidOptionError('method', method, 'must be stored or deflate')
  }
  return method
}

/**
 * The `entry` option of `encode`, the file name inside the archive.
 *
 * @param options - The cipher options.
 * @returns {string} The name.
 * @throws {InvalidOptionError} When it is not a usable name.
 */
function readEntryName(options: Readonly<CipherBaseOptions>): string {
  const name =
    options.entry === '' ? 'message.txt' : getOpt<unknown>(options, 'entry', 'message.txt')
  if (
    typeof name !== 'string' ||
    !name.isWellFormed() ||
    new TextEncoder().encode(name).length > 0xff_ff
  ) {
    throw new InvalidOptionError(
      'entry',
      name,
      'must be a file name of 1 to 65535 UTF-8 bytes, without a lone surrogate',
    )
  }
  return name
}

/**
 * The result options, which rewrite an archive from `encode` byte for byte when fed back.
 *
 * @param secret - The password and keys as passed.
 * @param opened - What came out of the entry.
 * @param bytes - What the plain side was.
 * @returns {Record<string, unknown>} The result options.
 */
function resultOptions(
  secret: Readonly<Secret>,
  opened: Readonly<Opened>,
  bytes: PlainBytes,
): Record<string, unknown> {
  const { entry } = opened
  return {
    ...(secret.password !== undefined && { key: secret.password }),
    keys: secret.keys,
    entry: entry.name,
    method: methodName(entry.method),
    iv: toHex(opened.iv),
    crc: entry.crc.toString(16).padStart(8, '0'),
    check: (entry.flags & FLAG.descriptor) === 0 ? 'crc' : 'time',
    ...(bytes === 'hex' && { bytes }),
  }
}

/**
 * Puts `[zipcrypto]` in front of a plain `CipherError`, the way the option errors already read.
 *
 * @param e - What was thrown.
 * @returns {Error} The error to rethrow.
 */
function prefixed(e: unknown): Error {
  if (e instanceof CipherError && e.constructor === CipherError && !e.message.startsWith('[')) {
    return new CipherError(`[zipcrypto] ${e.message}`)
  }
  return normalizeError(e, 'zipcrypto')
}

/** Traditional PKWARE encryption, what `zip -e`, `zip -P` and 7-Zip's ZipCrypto write. */
export class ZipCrypto extends Cipher {
  name(): string {
    return 'zipcrypto'
  }

  info(): CipherInfo {
    return {
      name: 'zipcrypto',
      label: 'ZipCrypto',
      description:
        'Traditional PKWARE encryption from the ZIP APPNOTE, what zip -e and 7-Zip write by default: three 32-bit keys stirred by CRC-32 and a linear congruential step give one keystream byte per byte, behind a 12-byte header whose last byte checks the password. Decoding opens a stored, deflated or bzip2 entry of a ZIP archive in hex or base64 and reports it only once its CRC-32 and size match; encoding writes an archive of one entry. UTF-8 text in, the archive in hex out',
      category: 'stream',
      family: 'crc-lcg',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, ZIP archive in hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: false,
          description: 'The password, any text, read as UTF-8. Required unless keys is given',
        },
        {
          name: 'keys',
          type: 'string',
          required: false,
          description:
            'The three internal keys instead of the password, 24 hex digits as bkcrack prints them. Decoding always returns them',
        },
        {
          name: 'entry',
          type: 'string',
          required: false,
          default: 'message.txt',
          description:
            'The file inside the archive. Decoding opens the first encrypted one when left out',
        },
        {
          name: 'method',
          type: 'string',
          required: false,
          default: 'deflate',
          description: 'Encoding only: stored or deflate. Decoding reads it from the archive',
        },
        {
          name: 'iv',
          type: 'string',
          required: false,
          description:
            'Encoding only: the 11 random bytes in front of the check byte, 22 hex digits. Random when left out',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^96 internal keys, whatever the password',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const secret = readSecret(options, 'Pass key, the password, or keys')
      const method = readMethod(options)
      const name = readEntryName(options)
      const iv = readIv(options)
      const bytes = readBytes(options)
      const plain = Uint8Array.from(readPlaintext('zipcrypto', text, bytes))
      const crc = [...crc32(plain)]
      const data = ZipKeys.fromHex(secret.keys.replaceAll(' ', '')).encrypt([
        ...iv,
        crc[0]!,
        ...PACK[method]!.run(plain),
      ])
      const archive = writeArchive({
        name: [...new TextEncoder().encode(name)],
        method: PACK[method]!.id,
        crc: Number.parseInt(toHex(crc), 16),
        size: plain.length,
        data,
      })
      return {
        text: toHex(archive),
        cipher: 'zipcrypto',
        operation: 'encode',
        options: {
          ...(secret.password !== undefined && { key: secret.password }),
          keys: secret.keys,
          entry: name,
          method,
          iv: toHex(iv),
          ...(bytes === 'hex' && { bytes }),
        },
      }
    } catch (e) {
      throw prefixed(e)
    }
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const bytes = readBytes(options)
      const archive = readArchive(text)
      const entries = readEntries(archive)
      const entry = pickEntry(entries, options.entry)
      checkEntry(entry)
      const secret = readSecret(
        options,
        `Pass key, the password, or keys. ${describeEncrypted(entries)}`,
      )
      const opened = openEntry({ bytes: archive, entries }, entry, secret)
      return {
        text: writePlaintext('zipcrypto', opened.data, bytes),
        cipher: 'zipcrypto',
        operation: 'decode',
        options: resultOptions(secret, opened, bytes),
      }
    } catch (e) {
      throw prefixed(e)
    }
  }
}
