import { base64 } from '@agntn/encodings/base64'
import { CipherError } from '../../../core/errors.ts'
import type { Bytes } from '../../../core/block-mode.ts'

const BEGIN = '-----BEGIN PGP MESSAGE-----'
const END = '-----END PGP MESSAGE-----'

/** Base64 characters per armor line, as GnuPG writes them. */
const LINE_LENGTH = 64

/**
 * The 24-bit checksum of RFC 4880 §6.1 that armor puts after an `=`.
 *
 * @param bytes - The message bytes.
 * @returns {number} The CRC-24.
 */
export function crc24(bytes: Bytes): number {
  let crc = 0xb704ce
  for (const byte of bytes) {
    crc ^= byte << 16
    for (let i = 0; i < 8; i++) {
      crc <<= 1
      if (crc & 0x1000000) crc ^= 0x1864cfb
    }
  }
  return crc & 0xffffff
}

function decodeBase64(text: string, what: string): number[] {
  try {
    return [...base64.decode(text)]
  } catch (e) {
    const reason = e instanceof Error ? e.message.replace(/^base64: /, '') : String(e)
    throw new CipherError(`${what} is not base64: ${reason}`)
  }
}

function crcBytes(crc: number): number[] {
  return [crc >>> 16, (crc >>> 8) & 0xff, crc & 0xff]
}

/**
 * The lines between the armor headers and the checksum or the END line.
 *
 * @param lines - The lines after BEGIN.
 * @returns {{ data: string; checksum?: string }} The base64 body and the checksum after `=`.
 */
function armorBody(lines: readonly string[]): { data: string; checksum?: string } {
  let i = 0
  while (i < lines.length && /^[A-Za-z][\w-]*: /.test(lines[i]!)) i++
  const data: string[] = []
  for (; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (line === END) return { data: data.join('') }
    if (line.startsWith('=')) {
      if (lines[i + 1]?.trim() !== END) break
      return { data: data.join(''), checksum: line.slice(1) }
    }
    data.push(line)
  }
  throw new CipherError(`Armor has no ${END} line after the data`)
}

/**
 * Reads ASCII armor, RFC 4880 §6.2, and checks the CRC-24 when there is one.
 *
 * @param text - Text that holds a `BEGIN PGP MESSAGE` block.
 * @returns {number[]} The message bytes.
 * @throws {CipherError} When the block is cut, the base64 is broken or the checksum differs.
 */
export function readArmor(text: string): number[] {
  const lines = text.split(/\r?\n/)
  const begin = lines.findIndex((line) => line.trim() === BEGIN)
  if (begin === -1) {
    const other = /-----BEGIN PGP ([A-Z ,/0-9]+)-----/.exec(text)?.[1]
    throw new CipherError(
      `Armor must be a ${BEGIN} block${other === undefined ? '' : `, not BEGIN PGP ${other}`}`,
    )
  }
  const { data, checksum } = armorBody(lines.slice(begin + 1))
  const bytes = decodeBase64(data, 'Armor data')
  if (checksum !== undefined) {
    const expected = decodeBase64(checksum, 'Armor checksum')
    if (crcBytes(crc24(bytes)).some((byte, i) => byte !== expected[i])) {
      throw new CipherError('Armor checksum does not match: the text was changed or cut')
    }
  }
  return bytes
}

/**
 * Writes armor as `gpg --armor` does: no headers, 64 characters a line, the CRC-24.
 *
 * @param bytes - The message bytes.
 * @returns {string} The armored block, without a final line break.
 */
export function writeArmor(bytes: Bytes): string {
  const data = base64.encode(Uint8Array.from(bytes))
  const lines: string[] = []
  for (let i = 0; i < data.length; i += LINE_LENGTH) lines.push(data.slice(i, i + LINE_LENGTH))
  const checksum = base64.encode(Uint8Array.from(crcBytes(crc24(bytes))))
  return [BEGIN, '', ...lines, `=${checksum}`, END].join('\n')
}
