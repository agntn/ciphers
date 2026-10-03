import { base64 } from '@agntn/encodings/base64'
import { Md5Hasher, Sha1Hasher, Sha256Hasher, evpBytesToKey } from '@agntn/hashes'
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
  pad,
  readBytes,
  readHex,
  readPlaintext,
  toHex,
  unpad,
  writePlaintext,
} from '../../../core/block-mode.ts'
import { aesCbc } from './cbc.ts'

const BLOCK_SIZE = 16
const SALT_SIZE = 8

/** `Salted__`, which OpenSSL and CryptoJS write before the salt; base64 turns it into `U2FsdGVkX1`. */
const MAGIC = [0x53, 0x61, 0x6c, 0x74, 0x65, 0x64, 0x5f, 0x5f]

/** 32 CryptoJS words; AES runs 38 rounds on a key that wide. */
export const MAX_PASSPHRASE_KEY_LENGTH = 1024

/** Keeps one call with the widest key well under a second of hashing. */
export const MAX_PASSPHRASE_ITERATIONS = 100_000

/** EVP_BytesToKey hashes: MD5 for CryptoJS, SHA-256 for `openssl enc` since 1.1.0. */
const DIGESTS = { md5: Md5Hasher, sha1: Sha1Hasher, sha256: Sha256Hasher }

type PassphraseDigest = keyof typeof DIGESTS

type PassphraseSettings = { digest: PassphraseDigest; keyLength: number; iterations: number }

function readPassphrase(options: Readonly<CipherBaseOptions>): string {
  const key = options.key
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  return key
}

function readDigest(options: Readonly<CipherBaseOptions>): PassphraseDigest {
  const digest = getOpt<unknown>(options, 'digest', 'md5')
  if (typeof digest !== 'string' || !Object.hasOwn(DIGESTS, digest)) {
    throw new InvalidOptionError('digest', digest, 'must be md5, sha1 or sha256')
  }
  return digest as PassphraseDigest
}

function readSettings(options: Readonly<CipherBaseOptions>): PassphraseSettings {
  const digest = readDigest(options)
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
  return {
    digest,
    keyLength: keyLength as number,
    iterations: iterations as number,
  }
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
  const Hasher = DIGESTS[settings.digest]
  const derived = [
    ...evpBytesToKey(
      () => new Hasher(),
      new TextEncoder().encode(passphrase),
      Uint8Array.from(salt),
      settings.iterations,
      keyBytes + BLOCK_SIZE,
    ),
  ]
  return { key: derived.slice(0, keyBytes), iv: derived.slice(keyBytes) }
}

function readCiphertext(text: string): { salt: Bytes; body: Bytes } {
  let bytes: Bytes
  try {
    bytes = Array.from(base64.decode(text))
  } catch (e) {
    const reason = e instanceof Error ? e.message.replace(/^base64: /, '') : String(e)
    throw new CipherError(`[aes-passphrase] Ciphertext must be base64: ${reason}`)
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

/**
 * The options a result reports: passphrase, mode, salt, `bytes` only when it is hex, then the KDF.
 *
 * @param passphrase - The passphrase as passed.
 * @param salt - The 8-byte salt.
 * @param bytes - What the plain side was.
 * @param settings - Digest, key length and iterations.
 * @returns {Record<string, unknown>} The result options.
 */
function resultOptions(
  passphrase: string,
  salt: Bytes,
  bytes: PlainBytes,
  settings: Readonly<PassphraseSettings>,
): Record<string, unknown> {
  return {
    key: passphrase,
    mode: 'cbc',
    salt: toHex(salt),
    ...(bytes === 'hex' && { bytes }),
    ...settings,
  }
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
        'What CryptoJS.AES.encrypt(message, passphrase) and openssl enc -a write: base64 starting U2FsdGVkX1 (Salted__, an 8-byte salt), AES-CBC with PKCS#7, key and IV from the passphrase through EVP_BytesToKey over MD5, or over the SHA-1 or SHA-256 that digest picks. UTF-8 text in, base64 out',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, base64 out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'The passphrase, any text, read as UTF-8',
        },
        {
          name: 'digest',
          type: 'string',
          required: false,
          default: 'md5',
          description:
            'Hash for EVP_BytesToKey: md5 as in CryptoJS and openssl enc before 1.1.0, sha256 as in openssl enc since, or sha1',
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
          description: `Hash passes per derived block, 1 to ${MAX_PASSPHRASE_ITERATIONS}: CryptoJS EvpKDF.cfg.iterations`,
        },
        {
          name: 'salt',
          type: 'string',
          required: false,
          description:
            'Encoding only: 16 hex digits. Random when left out; decoding reads it from the ciphertext',
        },
        BYTES_OPTION,
      ],
      keyspace: 'set by the passphrase, not by keyLength',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const passphrase = readPassphrase(options)
      const settings = readSettings(options)
      const bytes = readBytes(options)
      const salt = readSalt(options)
      const { key, iv } = deriveKey(passphrase, salt, settings)
      const plaintext = pad(readPlaintext('aes-passphrase', text, bytes), BLOCK_SIZE)
      const ciphertext = aesCbc(plaintext, key, 'encrypt', iv)
      return {
        text: base64.encode(Uint8Array.from([...MAGIC, ...salt, ...ciphertext])),
        cipher: 'aes-passphrase',
        operation: 'encode',
        options: resultOptions(passphrase, salt, bytes, settings),
      }
    } catch (e) {
      throw normalizeError(e, 'aes-passphrase')
    }
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const passphrase = readPassphrase(options)
      const settings = readSettings(options)
      const bytes = readBytes(options)
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
          '[aes-passphrase] Decrypted blocks do not end in PKCS#7 padding: wrong passphrase, digest, keyLength or iterations',
        )
      }
      return {
        text: writePlaintext('aes-passphrase', plaintext, bytes),
        cipher: 'aes-passphrase',
        operation: 'decode',
        options: resultOptions(passphrase, salt, bytes, settings),
      }
    } catch (e) {
      throw normalizeError(e, 'aes-passphrase')
    }
  }
}
