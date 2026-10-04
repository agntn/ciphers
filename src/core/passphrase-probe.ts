import { aesCbc } from '../ciphers/block/aes/cbc.ts'
import {
  type PassphraseDigest,
  deriveKeyStream,
  readPassphraseSettings,
  readSaltedCiphertext,
} from '../ciphers/block/aes/passphrase.ts'
import { type Bytes, paddingLength, toHex } from './block-mode.ts'
import { InvalidOptionError, MissingOptionError, normalizeError } from './errors.ts'

const BLOCK_SIZE = 16

/** Chance that a wrong key passes PKCS#7: a last byte of 1, or two bytes of 2, and so on to 16. */
export const PADDING_CHANCE = (1 - 256 ** -16) / 255

/** Hash passes one probe may spend: every digest runs each iteration count once. */
export const MAX_PROBE_ITERATIONS = 1_000_000

/** Digests a probe tries unless told otherwise. */
export const DEFAULT_PROBE_DIGESTS: readonly PassphraseDigest[] = ['md5', 'sha1', 'sha256']

/** Key lengths in bits a probe tries unless told otherwise. */
export const DEFAULT_PROBE_KEY_LENGTHS: readonly number[] = [128, 192, 256]

/** Iteration counts a probe tries unless told otherwise. */
export const DEFAULT_PROBE_ITERATIONS: readonly number[] = [1]

/** The settings to try; each list left out takes its default, and a repeated value counts once. */
export interface PassphraseProbeGrid {
  readonly digests?: readonly string[]
  readonly keyLengths?: readonly number[]
  readonly iterations?: readonly number[]
}

/** One setting whose padding held. */
export interface PassphraseProbeHit {
  readonly digest: PassphraseDigest
  readonly keyLength: number
  readonly iterations: number
  /** PKCS#7 padding length, 1 to 16; a wrong setting lands on 1 in 255 of 256 cases. */
  readonly padLength: number
  /** Share of the plaintext characters that print, 0 to 1; bytes that aren't UTF-8 don't. */
  readonly printable: number
  /** The plaintext, when it is UTF-8. */
  readonly text?: string
  /** The plaintext bytes in hex. */
  readonly hex: string
}

/** What one passphrase opens across a grid of KDF settings. */
export interface PassphraseProbe {
  /** The salt from the blob, in hex. */
  readonly salt: string
  /** 16-byte blocks after the salt. */
  readonly blocks: number
  readonly digests: readonly PassphraseDigest[]
  readonly keyLengths: readonly number[]
  readonly iterations: readonly number[]
  /** Settings tried: digests times key lengths times iteration counts. */
  readonly tries: number
  /** Padding hits a wrong passphrase gives over `tries` by chance alone. */
  readonly expected: number
  /** Settings whose padding held, the most printable first, then the longest padding. */
  readonly hits: readonly PassphraseProbeHit[]
}

type ProbeReading = Omit<PassphraseProbeHit, 'digest' | 'keyLength' | 'iterations'>

type ProbeSettings = {
  readonly digests: readonly PassphraseDigest[]
  readonly keyLengths: readonly number[]
  readonly iterations: readonly number[]
}

/**
 * One list of the grid without repeats, each value checked as `aes-passphrase` checks it.
 *
 * @param name - The list's name, for the error.
 * @param values - The list as given.
 * @param check - Reads one value as a cipher option and returns it, or throws `InvalidOptionError`.
 * @returns {T[]} The values in their first order.
 * @throws {InvalidOptionError} For an empty list or a value the format does not take.
 */
function readList<T>(name: string, values: readonly unknown[], check: (value: unknown) => T): T[] {
  if (!Array.isArray(values) || values.length === 0 || values.includes(undefined)) {
    throw new InvalidOptionError(name, values, 'must list at least one value, with no gaps')
  }
  try {
    return [...new Set(values.map((value) => check(value)))]
  } catch (error) {
    if (!(error instanceof InvalidOptionError)) throw error
    throw new InvalidOptionError(name, error.value, error.reason)
  }
}

/**
 * The grid with defaults filled in, inside the hash budget.
 *
 * @param grid - The lists as given.
 * @returns {ProbeSettings} Every list checked and without repeats.
 * @throws {InvalidOptionError} For a bad value or a grid past `MAX_PROBE_ITERATIONS`.
 */
function readGrid(grid: Readonly<PassphraseProbeGrid>): ProbeSettings {
  const digests = readList(
    'digests',
    grid.digests ?? DEFAULT_PROBE_DIGESTS,
    (digest) => readPassphraseSettings({ digest }).digest,
  )
  const keyLengths = readList(
    'keyLengths',
    grid.keyLengths ?? DEFAULT_PROBE_KEY_LENGTHS,
    (keyLength) => readPassphraseSettings({ keyLength }).keyLength,
  )
  const iterations = readList(
    'iterations',
    grid.iterations ?? DEFAULT_PROBE_ITERATIONS,
    (count) => readPassphraseSettings({ iterations: count }).iterations,
  )
  const passes = digests.length * iterations.reduce((sum, count) => sum + count, 0)
  if (passes > MAX_PROBE_ITERATIONS) {
    throw new InvalidOptionError(
      'iterations',
      iterations.join(','),
      `must add up to at most ${Math.floor(MAX_PROBE_ITERATIONS / digests.length)} with ${digests.length} digests, ${MAX_PROBE_ITERATIONS} hash passes in all`,
    )
  }
  return { digests, keyLengths, iterations }
}

/**
 * Text, hex and printable share of decrypted bytes.
 *
 * @param bytes - The plaintext without its padding.
 * @returns {Pick<PassphraseProbeHit, 'printable' | 'text' | 'hex'>} How the bytes read.
 */
function readPlaintext(bytes: Bytes): Pick<PassphraseProbeHit, 'printable' | 'text' | 'hex'> {
  const data = Uint8Array.from(bytes)
  const characters = Array.from(new TextDecoder().decode(data))
  const printing = characters.filter((character) => !/[^\t\n\r\P{Cc}]|�/u.test(character))
  const printable = characters.length === 0 ? 1 : printing.length / characters.length
  let text: string | undefined
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch {
    text = undefined
  }
  return { printable, ...(text !== undefined && { text }), hex: toHex(bytes) }
}

/**
 * Decrypt the last block with one key and IV, and the whole body when its padding holds.
 *
 * @param body - Whole 16-byte blocks after the salt.
 * @param stream - EVP_BytesToKey output, at least `keyBytes` plus 16 bytes.
 * @param keyBytes - Key length in bytes.
 * @returns {ProbeReading | undefined} The hit, or nothing.
 */
function tryKey(body: Bytes, stream: Bytes, keyBytes: number): ProbeReading | undefined {
  const key = stream.slice(0, keyBytes)
  const iv = stream.slice(keyBytes, keyBytes + BLOCK_SIZE)
  const previous = body.length > BLOCK_SIZE ? body.slice(-2 * BLOCK_SIZE, -BLOCK_SIZE) : iv
  const padLength = paddingLength(
    aesCbc(body.slice(-BLOCK_SIZE), key, 'decrypt', previous),
    BLOCK_SIZE,
  )
  if (padLength === undefined) return undefined
  return { padLength, ...readPlaintext(aesCbc(body, key, 'decrypt', iv).slice(0, -padLength)) }
}

/**
 * Try a passphrase on a `Salted__` blob under each setting of a grid, against the hits of chance.
 *
 * @param text - What `aes-passphrase` writes: base64 starting `U2FsdGVkX1`.
 * @param passphrase - The passphrase to try.
 * @param grid - Digests, key lengths in bits and iteration counts, each with its default.
 * @returns {PassphraseProbe} The hits, most printable first, and the count expected by chance.
 * @throws {CipherError} For a blob that isn't `Salted__` base64, no passphrase or a bad grid.
 */
export function probePassphrase(
  text: string,
  passphrase: string,
  grid: Readonly<PassphraseProbeGrid> = {},
): PassphraseProbe {
  try {
    if (typeof passphrase !== 'string' || passphrase === '') throw new MissingOptionError('key')
    const settings = readGrid(grid)
    const { salt, body } = readSaltedCiphertext(text)
    const length = Math.max(...settings.keyLengths) / 8 + BLOCK_SIZE
    const hits = settings.digests.flatMap((digest) =>
      settings.iterations.flatMap((iterations) => {
        const stream = deriveKeyStream(passphrase, salt, { digest, iterations }, length)
        return settings.keyLengths.flatMap((keyLength) => {
          const hit = tryKey(body, stream, keyLength / 8)
          return hit === undefined ? [] : [{ digest, keyLength, iterations, ...hit }]
        })
      }),
    )
    hits.sort((left, right) => right.printable - left.printable || right.padLength - left.padLength)
    const tries = settings.digests.length * settings.keyLengths.length * settings.iterations.length
    return {
      salt: toHex(salt),
      blocks: body.length / BLOCK_SIZE,
      ...settings,
      tries,
      expected: tries * PADDING_CHANCE,
      hits,
    }
  } catch (error) {
    throw normalizeError(error, 'aes-passphrase')
  }
}
