import type { CipherBaseOptions, CipherResult } from './types.ts'
import { CipherError, InvalidOptionError, MissingOptionError } from './errors.ts'

/** Bytes as plain numbers, so every step can take a readonly block and return a new one. */
export type Bytes = readonly number[]

/** What a mode reads from the options besides the key. It goes to `run` and back in the result. */
export type BlockSettings = Readonly<Record<string, string | number>>

/** What the text helpers need to know about one block cipher in one mode. */
export interface BlockMode<Settings extends BlockSettings = Readonly<Record<string, string>>> {
  /** Registry name, used as the `[name]` error prefix and in the result. */
  readonly name: string
  /** How the error for a wrong key names the ciphertext, such as `AES-ECB`. */
  readonly label: string
  /** Mode reported in the result options, such as `ecb`. */
  readonly mode: string
  /** Block length in bytes. */
  readonly blockSize: number
  /**
   * `false` for a mode that runs the block cipher as a keystream, such as CFB: no PKCS#7 padding,
   * and the ciphertext is exactly as long as the plaintext. Default: padded.
   */
  readonly padding?: boolean
  /** Accepted key lengths in hex digits. */
  readonly keyDigits: readonly number[]
  /** Why a key of another shape is refused. */
  readonly keyError: string
  /**
   * Read the options the mode takes besides the key, throwing on a bad one. What it returns goes
   * to `run` and back in the result options.
   */
  readonly settings?: (options: Readonly<CipherBaseOptions>) => Settings
  /**
   * Transform the bytes, whole blocks unless `padding` is `false`, under a key of one of the
   * accepted lengths.
   */
  readonly run: (
    data: Bytes,
    key: Bytes,
    operation: 'encrypt' | 'decrypt',
    settings: Settings,
  ) => number[]
}

/** The parts of a mode the checks on key, padding and ciphertext read, whatever its settings. */
type BlockShape = Pick<
  BlockMode,
  'name' | 'label' | 'blockSize' | 'padding' | 'keyDigits' | 'keyError'
>

function toHex(bytes: Bytes): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Hex digits to bytes, two digits each. The caller has already checked the digits and the length.
 *
 * @param hex - An even number of hex digits.
 * @returns {number[]} One byte per pair.
 */
export function fromHex(hex: string): number[] {
  return Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
}

/**
 * Read the required `iv` option: one block of hex digits, case and whitespace ignored.
 *
 * @param options - The options passed to the cipher.
 * @param blockSize - Block length in bytes; the IV takes twice as many hex digits.
 * @returns {string} The IV as lowercase hex.
 */
export function readIv(options: Readonly<CipherBaseOptions>, blockSize: number): string {
  const iv = options.iv
  if (iv === undefined || iv === '') throw new MissingOptionError('iv')
  if (typeof iv !== 'string') throw new InvalidOptionError('iv', iv, 'must be a string')
  const hex = iv.replaceAll(/\s/g, '').toLowerCase()
  const digits = 2 * blockSize
  if (!/^[0-9a-f]*$/.test(hex) || hex.length !== digits) {
    throw new InvalidOptionError(
      'iv',
      iv,
      `must be ${digits} hex digits (one ${blockSize}-byte block)`,
    )
  }
  return hex
}

/**
 * Read an optional hex option such as a nonce: whole bytes, case and whitespace ignored.
 *
 * @param value - The option as passed.
 * @param name - Option name for the error.
 * @param fits - Whether a length in hex digits is accepted.
 * @param rule - Why another length is refused.
 * @returns {string} The value as lowercase hex.
 */
export function readHex(
  value: unknown,
  name: string,
  fits: (digits: number) => boolean,
  rule: string,
): string {
  if (typeof value !== 'string') throw new InvalidOptionError(name, value, 'must be a string')
  const hex = value.replaceAll(/\s/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(hex) || hex.length % 2 !== 0 || !fits(hex.length)) {
    throw new InvalidOptionError(name, value, rule)
  }
  return hex
}

function readKey(
  cipher: BlockShape,
  options: Readonly<CipherBaseOptions>,
): { hex: string; bytes: Bytes } {
  const key = options.key
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  const hex = key.replaceAll(/\s/g, '').toLowerCase()
  if (!/^[0-9a-f]*$/.test(hex) || !cipher.keyDigits.includes(hex.length)) {
    throw new InvalidOptionError('key', key, cipher.keyError)
  }
  return { hex, bytes: fromHex(hex) }
}

function pad(bytes: Bytes, blockSize: number): Bytes {
  const fill = blockSize - (bytes.length % blockSize)
  return [...bytes, ...Array.from({ length: fill }, () => fill)]
}

function unpad(cipher: BlockShape, bytes: Bytes): Bytes {
  const fill = bytes.at(-1) ?? 0
  const valid =
    fill >= 1 && fill <= cipher.blockSize && bytes.slice(-fill).every((byte) => byte === fill)
  if (!valid) {
    throw new CipherError(
      `[${cipher.name}] Decrypted blocks do not end in PKCS#7 padding: wrong key, or not ${cipher.label} ciphertext`,
    )
  }
  return bytes.slice(0, -fill)
}

function readCiphertext(cipher: BlockShape, text: string): Bytes {
  const hex = text.replaceAll(/\s/g, '')
  if (!/^[0-9a-f]*$/i.test(hex)) {
    throw new CipherError(`[${cipher.name}] Ciphertext must be hex digits`)
  }
  if (cipher.padding === false) {
    if (hex.length % 2 !== 0) {
      throw new CipherError(
        `[${cipher.name}] Ciphertext must be whole bytes (an even number of hex digits), got ${hex.length} hex digits`,
      )
    }
    return fromHex(hex)
  }
  const digits = 2 * cipher.blockSize
  if (hex.length === 0 || hex.length % digits !== 0) {
    throw new CipherError(
      `[${cipher.name}] Ciphertext must be whole ${cipher.blockSize}-byte blocks (a multiple of ${digits} hex digits), got ${hex.length} hex digits`,
    )
  }
  return fromHex(hex)
}

/**
 * Encrypt the UTF-8 bytes of a text: PKCS#7 padding unless the mode has none, the bytes through
 * the mode, hex out.
 *
 * @param cipher - The block cipher and mode to run.
 * @param text - Any text.
 * @param options - Carries the hex `key` and whatever else the mode reads.
 * @returns {CipherResult} Lowercase hex, with the key and settings as they were read.
 */
export function encodeBlocks<Settings extends BlockSettings>(
  cipher: BlockMode<Settings>,
  text: string,
  options: Readonly<CipherBaseOptions>,
): CipherResult {
  const key = readKey(cipher, options)
  const settings = cipher.settings?.(options) ?? ({} as Settings)
  const bytes = [...new TextEncoder().encode(text)]
  const plaintext = cipher.padding === false ? bytes : pad(bytes, cipher.blockSize)
  return {
    text: toHex(cipher.run(plaintext, key.bytes, 'encrypt', settings)),
    cipher: cipher.name,
    operation: 'encode',
    options: { key: key.hex, mode: cipher.mode, ...settings },
  }
}

/**
 * Decrypt hex ciphertext back to text. Fails when the padding or the UTF-8 does not hold, which
 * is how a wrong key shows. A mode without padding has only the UTF-8 check.
 *
 * @param cipher - The block cipher and mode to run.
 * @param text - Hex, whole blocks unless the mode has no padding; case and whitespace are ignored.
 * @param options - Carries the hex `key` and whatever else the mode reads.
 * @returns {CipherResult} The decoded text.
 */
export function decodeBlocks<Settings extends BlockSettings>(
  cipher: BlockMode<Settings>,
  text: string,
  options: Readonly<CipherBaseOptions>,
): CipherResult {
  const key = readKey(cipher, options)
  const settings = cipher.settings?.(options) ?? ({} as Settings)
  const ciphertext = readCiphertext(cipher, text)
  const decrypted = cipher.run(ciphertext, key.bytes, 'decrypt', settings)
  const plaintext = cipher.padding === false ? decrypted : unpad(cipher, decrypted)
  let decoded: string
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(plaintext))
  } catch {
    throw new CipherError(`[${cipher.name}] Decrypted bytes are not UTF-8 text`)
  }
  return {
    text: decoded,
    cipher: cipher.name,
    operation: 'decode',
    options: { key: key.hex, mode: cipher.mode, ...settings },
  }
}
