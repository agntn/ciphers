import type { Bytes } from '../../../core/block-mode.ts'
import { CipherError } from '../../../core/errors.ts'

const SIGNATURE = {
  local: 0x04_03_4b_50,
  central: 0x02_01_4b_50,
  end: 0x06_05_4b_50,
} as const

/** Fixed parts of the end of central directory record, local header and central header. */
const END_SIZE = 22
const LOCAL_SIZE = 30
const CENTRAL_SIZE = 46
const MAX_COMMENT = 0xff_ff

/** General purpose flag bits from APPNOTE 4.4.4. */
export const FLAG = { encrypted: 1, descriptor: 8, strong: 64, utf8: 0x8_00 } as const

/** The compression methods by id, the ones this cipher opens and the ones worth naming. */
export const METHOD_NAMES: Readonly<Record<number, string>> = {
  0: 'stored',
  8: 'deflate',
  9: 'deflate64',
  12: 'bzip2',
  14: 'lzma',
  93: 'zstd',
  95: 'xz',
  98: 'ppmd',
  99: 'aes',
}

/** One file as the central directory lists it. */
export interface ZipEntry {
  readonly name: string
  readonly flags: number
  readonly method: number
  readonly time: number
  readonly crc: number
  readonly compressedSize: number
  readonly size: number
  readonly offset: number
}

/** The DOS date ZipCrypto archives from this cipher carry: 1 January 1980, midnight. */
const DOS_DATE = 0x00_21

/**
 * An entry name for a message, quoted and escaped when a character in it could fake a line.
 *
 * @param name - The name from the archive.
 * @returns {string} Such as `note.txt`, or `"a.txt\n[zipcrypto] ok"`.
 */
export function showName(name: string): string {
  if (!/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(name)) return name
  return JSON.stringify(name).replaceAll(
    /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu,
    (char) => `\\u{${char.codePointAt(0)!.toString(16)}}`,
  )
}

/**
 * Reads `size` little-endian bytes at `at`.
 *
 * @param bytes - The archive.
 * @param at - Where the number starts.
 * @param size - 2 or 4.
 * @returns {number} The number, unsigned.
 * @throws {CipherError} When the archive ends first.
 */
function readNumber(bytes: Bytes, at: number, size: 2 | 4): number {
  if (at < 0 || at + size > bytes.length) {
    throw new CipherError('Broken archive: it ends in the middle of a header')
  }
  let value = 0
  for (let i = size - 1; i >= 0; i--) value = value * 256 + bytes[at + i]!
  return value
}

/**
 * Writes a number in `size` little-endian bytes.
 *
 * @param value - The number.
 * @param size - 2 or 4.
 * @returns {number[]} Its bytes.
 */
function writeNumber(value: number, size: 2 | 4): number[] {
  return Array.from({ length: size }, (_, i) => Math.floor(value / 256 ** i) % 256)
}

/**
 * The end of central directory record: the last signature whose comment ends the file.
 *
 * @param bytes - The archive.
 * @returns {number} Its offset.
 * @throws {CipherError} When there is none, so this is not a ZIP archive.
 */
function findEnd(bytes: Bytes): number {
  const lowest = Math.max(0, bytes.length - END_SIZE - MAX_COMMENT)
  for (let at = bytes.length - END_SIZE; at >= lowest; at--) {
    if (
      readNumber(bytes, at, 4) === SIGNATURE.end &&
      at + END_SIZE + readNumber(bytes, at + 20, 2) === bytes.length
    ) {
      return at
    }
  }
  throw new CipherError(
    'Broken archive: no end of central directory record, so this is not a ZIP archive or it was cut short',
  )
}

/**
 * Refuses a ZIP64 marker. Info-ZIP adds ZIP64 records on a pipe even when every field fits.
 *
 * @param value - The field as read.
 * @param size - Its width in bytes, 2 or 4, since only all ones in that width is the marker.
 * @throws {CipherError} When it is a ZIP64 marker.
 */
function checkZip64(value: number, size: 2 | 4): void {
  if (value === 256 ** size - 1) {
    throw new CipherError('Not supported: ZIP64 archives, past 65535 entries or 4 GiB')
  }
}

/**
 * Refuses what the end record says this reader can't follow: ZIP64 and archives split over disks.
 *
 * @param bytes - The archive.
 * @param end - Where the end record starts.
 * @throws {CipherError} When the archive needs ZIP64 or is split.
 */
function checkEnd(bytes: Bytes, end: number): void {
  checkZip64(readNumber(bytes, end + 10, 2), 2)
  checkZip64(readNumber(bytes, end + 16, 4), 4)
  if (readNumber(bytes, end + 4, 2) !== 0 || readNumber(bytes, end + 6, 2) !== 0) {
    throw new CipherError('Not supported: archives split over several disks or files')
  }
}

/** Code page 437 from 0x80 up, what APPNOTE says a name without flag bit 11 is written in. */
const CP437_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0'

/**
 * A file name: UTF-8 when it decodes, since Info-ZIP on Unix skips bit 11, or else code page 437.
 *
 * @param bytes - The name bytes.
 * @param flags - The general purpose flags.
 * @returns {string} The name.
 */
function readName(bytes: Bytes, flags: number): string {
  const strict = (flags & FLAG.utf8) === 0
  try {
    return new TextDecoder('utf-8', { fatal: strict, ignoreBOM: true }).decode(
      Uint8Array.from(bytes),
    )
  } catch {
    return String.fromCodePoint(
      ...bytes.map((byte) => (byte < 0x80 ? byte : CP437_HIGH.codePointAt(byte - 0x80)!)),
    )
  }
}

/**
 * One central directory header.
 *
 * @param bytes - The archive.
 * @param at - Where the header starts.
 * @returns {{ entry: ZipEntry; next: number }} The entry, and where the next header starts.
 * @throws {CipherError} When the signature is wrong or the header runs past the archive.
 */
function readCentral(bytes: Bytes, at: number): { entry: ZipEntry; next: number } {
  if (readNumber(bytes, at, 4) !== SIGNATURE.central) {
    throw new CipherError('Broken archive: a central directory header has the wrong signature')
  }
  const nameLength = readNumber(bytes, at + 28, 2)
  const next =
    at + CENTRAL_SIZE + nameLength + readNumber(bytes, at + 30, 2) + readNumber(bytes, at + 32, 2)
  if (next > bytes.length) {
    throw new CipherError('Broken archive: a central directory header runs past the end')
  }
  const entry: ZipEntry = {
    name: readName(
      bytes.slice(at + CENTRAL_SIZE, at + CENTRAL_SIZE + nameLength),
      readNumber(bytes, at + 8, 2),
    ),
    flags: readNumber(bytes, at + 8, 2),
    method: readNumber(bytes, at + 10, 2),
    time: readNumber(bytes, at + 12, 2),
    crc: readNumber(bytes, at + 16, 4),
    compressedSize: readNumber(bytes, at + 20, 4),
    size: readNumber(bytes, at + 24, 4),
    offset: readNumber(bytes, at + 42, 4),
  }
  for (const field of [entry.compressedSize, entry.size, entry.offset]) checkZip64(field, 4)
  return { entry, next }
}

/**
 * The files of a ZIP archive, read from its central directory.
 *
 * @param bytes - The whole archive.
 * @returns {ZipEntry[]} The entries, in directory order.
 * @throws {CipherError} When it is not a ZIP archive, is broken, or is ZIP64 or split.
 */
export function readEntries(bytes: Bytes): ZipEntry[] {
  const end = findEnd(bytes)
  checkEnd(bytes, end)
  const count = readNumber(bytes, end + 10, 2)
  let at = readNumber(bytes, end + 16, 4)
  const entries: ZipEntry[] = []
  for (let i = 0; i < count; i++) {
    const { entry, next } = readCentral(bytes, at)
    entries.push(entry)
    at = next
  }
  return entries
}

/**
 * The stored bytes of one entry, behind its local header: the encryption header, then the data.
 *
 * @param bytes - The whole archive.
 * @param entry - The entry.
 * @returns {number[]} `compressedSize` bytes.
 * @throws {CipherError} When the local header is missing or the data runs past the archive.
 */
export function readEntryData(bytes: Bytes, entry: Readonly<ZipEntry>): number[] {
  if (readNumber(bytes, entry.offset, 4) !== SIGNATURE.local) {
    throw new CipherError(`Broken archive: no local header where ${showName(entry.name)} starts`)
  }
  const start =
    entry.offset +
    LOCAL_SIZE +
    readNumber(bytes, entry.offset + 26, 2) +
    readNumber(bytes, entry.offset + 28, 2)
  if (start + entry.compressedSize > bytes.length) {
    throw new CipherError(`Broken archive: the data of ${showName(entry.name)} runs past the end`)
  }
  return bytes.slice(start, start + entry.compressedSize)
}

/** What `writeArchive` puts in its one entry. */
export interface ArchiveFile {
  readonly name: Bytes
  readonly method: number
  readonly crc: number
  readonly size: number
  /** The encryption header and the encrypted data. */
  readonly data: Bytes
}

/**
 * The fields the local and the central header share, from version needed to the name length.
 *
 * @param file - The entry.
 * @returns {number[]} 24 bytes.
 */
function sharedFields(file: Readonly<ArchiveFile>): number[] {
  const ascii = file.name.every((byte) => byte < 0x80)
  return [
    ...writeNumber(20, 2),
    ...writeNumber(FLAG.encrypted | (ascii ? 0 : FLAG.utf8), 2),
    ...writeNumber(file.method, 2),
    ...writeNumber(0, 2),
    ...writeNumber(DOS_DATE, 2),
    ...writeNumber(file.crc, 4),
    ...writeNumber(file.data.length, 4),
    ...writeNumber(file.size, 4),
    ...writeNumber(file.name.length, 2),
  ]
}

/**
 * One encrypted file without a data descriptor, so the check byte comes from the CRC.
 *
 * @param file - The entry.
 * @returns {number[]} The archive.
 */
export function writeArchive(file: Readonly<ArchiveFile>): number[] {
  const shared = sharedFields(file)
  const local = [...writeNumber(SIGNATURE.local, 4), ...shared, 0, 0, ...file.name, ...file.data]
  const central = [
    ...writeNumber(SIGNATURE.central, 4),
    ...writeNumber(20, 2),
    ...shared,
    ...Array.from({ length: 12 }, () => 0),
    ...writeNumber(0, 4),
    ...file.name,
  ]
  const end = [
    ...writeNumber(SIGNATURE.end, 4),
    0,
    0,
    0,
    0,
    ...writeNumber(1, 2),
    ...writeNumber(1, 2),
    ...writeNumber(central.length, 4),
    ...writeNumber(local.length, 4),
    0,
    0,
  ]
  return [...local, ...central, ...end]
}
