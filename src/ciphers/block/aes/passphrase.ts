import { md5 } from '@agntn/hashes'
import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../../core/types.ts'
import { getOpt } from '../../../core/types.ts'
import { Cipher } from '../../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../../core/errors.ts'
import { type Bytes, fromHex, pad, readHex, toHex, unpad } from '../../../core/block-mode.ts'
import { aesCbc } from './cbc.ts'

const BLOCK_SIZE = 16
const SALT_SIZE = 8

/** `Salted__`, which OpenSSL and CryptoJS write before the salt; base64 turns it into `U2FsdGVkX1`. */
const MAGIC = [0x53, 0x61, 0x6c, 0x74, 0x65, 0x64, 0x5f, 0x5f]

/** 32 CryptoJS words; AES runs 38 rounds on a key that wide. */
export const MAX_PASSPHRASE_KEY_LENGTH = 1024

/** Caps the MD5 work of one call at about a second with the widest key. */
export const MAX_PASSPHRASE_ITERATIONS = 100_000

/**
 * OpenSSL's `EVP_BytesToKey` over MD5, CryptoJS's EvpKDF: each block hashes the one before it
 * with the passphrase and the salt, `iterations` times over, until key and IV are covered.
 *
 * @param passphrase - The passphrase bytes.
 * @param salt - The 8-byte salt.
 * @param length - Bytes to derive, the key then the IV.
 * @param iterations - MD5 passes per block, 1 in OpenSSL and by default in CryptoJS.
 * @returns {number[]} The derived bytes.
 */
export function evpBytesToKey(
  passphrase: Bytes,
  salt: Bytes,
  length: number,
  iterations: number,
): number[] {
  const derived: number[] = []
  let block: Uint8Array = new Uint8Array(0)
  while (derived.length < length) {
    block = md5(Uint8Array.from([...block, ...passphrase, ...salt]))
    for (let i = 1; i < iterations; i++) block = md5(block)
    derived.push(...block)
  }
  return derived.slice(0, length)
}

type PassphraseSettings = { keyLength: number; iterations: number }

function readPassphrase(options: Readonly<CipherBaseOptions>): string {
  const key = options.key
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  return key
}

function readSettings(options: Readonly<CipherBaseOptions>): PassphraseSettings {
  const keyLength = getOpt<unknown>(options, 'keyLength', 256)
  if (
    !Number.isInteger(keyLength) ||
    (keyLength as number) < 128 ||
    (keyLength as number) > MAX_PASSPHRASE_KEY_LENGTH ||
    (keyLength as number) % 32 !== 0
  ) {
    throw new InvalidOptionError(
      'keyLength',
      keyLength,
      `must be 128 to ${MAX_PASSPHRASE_KEY_LENGTH} bits in steps of 32 (CryptoJS keySize times 32)`,
    )
  }
  const iterations = getOpt<unknown>(options, 'iterations', 1)
  if (
    !Number.isInteger(iterations) ||
    (iterations as number) < 1 ||
    (iterations as number) > MAX_PASSPHRASE_ITERATIONS
  ) {
    throw new InvalidOptionError(
      'iterations',
      iterations,
      `must be an integer from 1 to ${MAX_PASSPHRASE_ITERATIONS}`,
    )
  }
  return { keyLength: keyLength as number, iterations: iterations as number }
}

function readSalt(options: Readonly<CipherBaseOptions>): Bytes {
  if (options.salt === undefined || options.salt === '') {
    return [...crypto.getRandomValues(new Uint8Array(SALT_SIZE))]
  }
  return fromHex(
    readHex(options.salt, 'salt', (digits) => digits === 2 * SALT_SIZE, 'must be 16 hex digits'),
  )
}

function deriveKey(
  passphrase: string,
  salt: Bytes,
  settings: Readonly<PassphraseSettings>,
): { key: Bytes; iv: Bytes } {
  const keyBytes = settings.keyLength / 8
  const derived = evpBytesToKey(
    [...new TextEncoder().encode(passphrase)],
    salt,
    keyBytes + BLOCK_SIZE,
    settings.iterations,
  )
  return { key: derived.slice(0, keyBytes), iv: derived.slice(keyBytes) }
}

function readCiphertext(text: string): { salt: Bytes; body: Bytes } {
  let bytes: Bytes
  try {
    bytes = Array.from(atob(text), (char) => char.codePointAt(0)!)
  } catch {
    throw new CipherError('[aes-passphrase] Ciphertext must be base64')
  }
  const salted = MAGIC.every((byte, i) => bytes[i] === byte)
  const body = bytes.slice(MAGIC.length + SALT_SIZE)
  if (!salted || bytes.length < MAGIC.length + SALT_SIZE) {
    throw new CipherError(
      '[aes-passphrase] Ciphertext must start with Salted__ and an 8-byte salt (base64 U2FsdGVkX1)',
    )
  }
  if (body.length === 0 || body.length % BLOCK_SIZE !== 0) {
    throw new CipherError(
      `[aes-passphrase] Ciphertext after the salt must be whole 16-byte blocks, got ${body.length} bytes`,
    )
  }
  return { salt: bytes.slice(MAGIC.length, MAGIC.length + SALT_SIZE), body }
}

/** What `CryptoJS.AES.encrypt(message, passphrase)` writes: `Salted__`, the salt and AES-CBC in base64. */
export class AesPassphrase extends Cipher {
  name(): string {
    return 'aes-passphrase'
  }

  info(): CipherInfo {
    return {
      name: 'aes-passphrase',
      label: 'AES (passphrase)',
      description:
        'What CryptoJS.AES.encrypt(message, passphrase) writes, and openssl enc -md md5: base64 starting U2FsdGVkX1 (Salted__, an 8-byte salt), AES-CBC with PKCS#7, key and IV from the passphrase through EVP_BytesToKey over MD5. UTF-8 text in, base64 out',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'The passphrase, any text, read as UTF-8',
        },
        {
          name: 'keyLength',
          type: 'number',
          required: false,
          default: 256,
          description: `Key length in bits, 128 to ${MAX_PASSPHRASE_KEY_LENGTH} in steps of 32: CryptoJS keySize times 32. Past 256 it runs AES with keyLength / 32 + 6 rounds, as CryptoJS does`,
        },
        {
          name: 'iterations',
          type: 'number',
          required: false,
          default: 1,
          description: `MD5 passes per derived block, 1 to ${MAX_PASSPHRASE_ITERATIONS}: CryptoJS EvpKDF.cfg.iterations`,
        },
        {
          name: 'salt',
          type: 'string',
          required: false,
          description:
            'Encoding only: 16 hex digits. Random when left out; decoding reads it from the ciphertext',
        },
      ],
      keyspace: 'set by the passphrase, not by keyLength',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const passphrase = readPassphrase(options)
      const settings = readSettings(options)
      const salt = readSalt(options)
      const { key, iv } = deriveKey(passphrase, salt, settings)
      const plaintext = pad([...new TextEncoder().encode(text)], BLOCK_SIZE)
      const ciphertext = aesCbc(plaintext, key, 'encrypt', iv)
      return {
        text: btoa(
          [...MAGIC, ...salt, ...ciphertext].map((byte) => String.fromCodePoint(byte)).join(''),
        ),
        cipher: 'aes-passphrase',
        operation: 'encode',
        options: { key: passphrase, mode: 'cbc', salt: toHex(salt), ...settings },
      }
    } catch (e) {
      throw normalizeError(e, 'aes-passphrase')
    }
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const passphrase = readPassphrase(options)
      const settings = readSettings(options)
      const { salt, body } = readCiphertext(text)
      const { key, iv } = deriveKey(passphrase, salt, settings)
      const decrypted = aesCbc(body, key, 'decrypt', iv)
      let plaintext: Bytes
      try {
        plaintext = unpad(
          { name: 'aes-passphrase', label: 'AES passphrase', blockSize: BLOCK_SIZE },
          decrypted,
        )
      } catch {
        throw new CipherError(
          '[aes-passphrase] Decrypted blocks do not end in PKCS#7 padding: wrong passphrase, keyLength or iterations',
        )
      }
      let decoded: string
      try {
        decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(plaintext))
      } catch {
        throw new CipherError('[aes-passphrase] Decrypted bytes are not UTF-8 text')
      }
      return {
        text: decoded,
        cipher: 'aes-passphrase',
        operation: 'decode',
        options: { key: passphrase, mode: 'cbc', salt: toHex(salt), ...settings },
      }
    } catch (e) {
      throw normalizeError(e, 'aes-passphrase')
    }
  }
}
