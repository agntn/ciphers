import type { Bytes } from '../../../core/block-mode.ts'

/** CRC-32 table (0xEDB88320) for one step per byte, without the checksum's inversions. */
const CRC_TABLE: readonly number[] = /* @__PURE__ */ Array.from({ length: 256 }, (_, n) => {
  let crc = n
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xed_b8_83_20 ^ (crc >>> 1) : crc >>> 1
  return crc >>> 0
})

/** What the three keys start as before the password, from the PKWARE APPNOTE. */
const INITIAL_KEYS = [0x12_34_56_78, 0x23_45_67_89, 0x34_56_78_90] as const

/**
 * One CRC-32 step, the way APPNOTE 6.1 folds a byte into a key.
 *
 * @param crc - The key so far.
 * @param byte - The byte to fold in.
 * @returns {number} The next key, unsigned.
 */
function crcStep(crc: number, byte: number): number {
  return (CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)) >>> 0
}

/** PKWARE's three 32-bit keys. The password only picks where they start. */
export class ZipKeys {
  private key0: number
  private key1: number
  private key2: number

  private constructor(words: readonly number[]) {
    this.key0 = words[0]! >>> 0
    this.key1 = words[1]! >>> 0
    this.key2 = words[2]! >>> 0
  }

  /**
   * The keys right after the password, where the encryption header starts.
   *
   * @param password - The password bytes.
   * @returns {ZipKeys} Fresh keys.
   */
  static fromPassword(password: Bytes): ZipKeys {
    const keys = new ZipKeys(INITIAL_KEYS)
    for (const byte of password) keys.update(byte)
    return keys
  }

  /**
   * Keys taken as they are, such as the three words bkcrack recovers.
   *
   * @param hex - 24 hex digits, key0, key1 and key2 in turn, already checked.
   * @returns {ZipKeys} Fresh keys.
   */
  static fromHex(hex: string): ZipKeys {
    return new ZipKeys([0, 8, 16].map((at) => Number.parseInt(hex.slice(at, at + 8), 16)))
  }

  /**
   * The keys as bkcrack writes them, three words of 8 hex digits.
   *
   * @returns {string} Such as `7067b779 926e6526 2b5a64b9`.
   */
  toHex(): string {
    return [this.key0, this.key1, this.key2]
      .map((word) => word.toString(16).padStart(8, '0'))
      .join(' ')
  }

  /**
   * Decrypts bytes in place of the stream, moving the keys on by each plain byte.
   *
   * @param data - Encrypted bytes.
   * @returns {number[]} The plain bytes.
   */
  decrypt(data: Bytes): number[] {
    return data.map((byte) => {
      const plain = byte ^ this.keystream()
      this.update(plain)
      return plain
    })
  }

  /**
   * Encrypts bytes, moving the keys on by each plain byte.
   *
   * @param data - Plain bytes.
   * @returns {number[]} The encrypted bytes.
   */
  encrypt(data: Bytes): number[] {
    return data.map((byte) => {
      const encrypted = byte ^ this.keystream()
      this.update(byte)
      return encrypted
    })
  }

  private update(byte: number): void {
    this.key0 = crcStep(this.key0, byte)
    this.key1 = (Math.imul(this.key1 + (this.key0 & 0xff), 134_775_813) + 1) >>> 0
    this.key2 = crcStep(this.key2, this.key1 >>> 24)
  }

  private keystream(): number {
    const temp = (this.key2 | 2) & 0xff_ff
    return (Math.imul(temp, temp ^ 1) >>> 8) & 0xff
  }
}
