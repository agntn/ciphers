import type { CipherBaseOptions, CipherResult } from './types'
import { CipherError, InvalidOptionError, MissingOptionError } from './errors'

/** Bytes as plain numbers, so every step can take a readonly block and return a new one. */
export type Bytes = readonly number[]

/** What text ECB needs to know about one block cipher. */
export interface EcbCipher {
  /** Registry name, used as the `[name]` error prefix and in the result. */
  readonly name: string
  /** How the error for a wrong key names the ciphertext, such as `AES-ECB`. */
  readonly label: string
  /** Block length in bytes. */
  readonly blockSize: number
  /** Accepted key lengths in hex digits. */
  readonly keyDigits: readonly number[]
  /** Why a key of another shape is refused. */
  readonly keyError: string
  /** Transform whole blocks under a key of one of the accepted lengths. */
  readonly run: (data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt') => number[]
}

function toHex(bytes: Bytes): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): number[] {
  return Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
}

function readKey(
  cipher: EcbCipher,
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

function unpad(cipher: EcbCipher, bytes: Bytes): Bytes {
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

function readCiphertext(cipher: EcbCipher, text: string): Bytes {
  const hex = text.replaceAll(/\s/g, '')
  if (!/^[0-9a-f]*$/i.test(hex)) {
    throw new CipherError(`[${cipher.name}] Ciphertext must be hex digits`)
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
 * Encrypt the UTF-8 bytes of a text in ECB: PKCS#7 padding, every block on its own, hex out.
 *
 * @param cipher - The block cipher to run.
 * @param text - Any text.
 * @param options - Carries the hex `key`.
 * @returns {CipherResult} Lowercase hex, with the key as it was read.
 */
export function encodeEcb(
  cipher: EcbCipher,
  text: string,
  options: Readonly<CipherBaseOptions>,
): CipherResult {
  const key = readKey(cipher, options)
  const plaintext = pad([...new TextEncoder().encode(text)], cipher.blockSize)
  return {
    text: toHex(cipher.run(plaintext, key.bytes, 'encrypt')),
    cipher: cipher.name,
    operation: 'encode',
    options: { key: key.hex, mode: 'ecb' },
  }
}

/**
 * Decrypt hex ECB ciphertext back to text. Fails when the padding or the UTF-8 does not hold,
 * which is how a wrong key shows.
 *
 * @param cipher - The block cipher to run.
 * @param text - Whole blocks as hex; case and whitespace are ignored.
 * @param options - Carries the hex `key`.
 * @returns {CipherResult} The decoded text.
 */
export function decodeEcb(
  cipher: EcbCipher,
  text: string,
  options: Readonly<CipherBaseOptions>,
): CipherResult {
  const key = readKey(cipher, options)
  const plaintext = unpad(cipher, cipher.run(readCiphertext(cipher, text), key.bytes, 'decrypt'))
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
    options: { key: key.hex, mode: 'ecb' },
  }
}
