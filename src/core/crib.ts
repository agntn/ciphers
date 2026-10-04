import { fromHex } from './block-mode.ts'
import { InvalidOptionError } from './errors.ts'
import { assertLanguage, letterLogProbabilities, type FrequencyLanguage } from './frequency.ts'

/** A crib taken as right: `text` sits in ciphertext `message` (from 0) from byte `offset` on. */
export interface CribPlacement {
  readonly message: number
  readonly offset: number
  readonly text: string
}

/** Options of `dragCrib`. */
export interface CribDragOptions {
  /** Text to slide across every ciphertext; leave it out to read the known placements only. */
  readonly crib?: string
  /** Placements accepted so far; together they fix the key bytes they cover. */
  readonly known?: readonly CribPlacement[]
  /** Language the plaintexts read in; ranks the placements (default `en`). */
  readonly language?: FrequencyLanguage
  /** How many placements to return, best first (default 10). */
  readonly limit?: number
}

/** One place the crib could sit, and what the other ciphertexts read there. */
export interface CribCandidate {
  readonly message: number
  readonly offset: number
  /** Mean natural log probability of a revealed byte; the closer to zero, the more it reads. */
  readonly score: number
  readonly reveals: ReadonlyArray<{ readonly message: number; readonly bytes: readonly number[] }>
}

/** Where a crib drag stands: the ranked placements and what the known ones already give. */
export interface CribDrag {
  readonly language: FrequencyLanguage
  /** Placements the crib has that reveal a byte and agree with the known key, ranked or not. */
  readonly total: number
  readonly candidates: readonly CribCandidate[]
  /** One entry per position up to the longest ciphertext; `undefined` where nothing fixes it. */
  readonly key: ReadonlyArray<number | undefined>
  /** Each ciphertext read with that key; `undefined` where the key is unknown. */
  readonly plaintexts: ReadonlyArray<ReadonlyArray<number | undefined>>
}

export const DEFAULT_CRIB_LIMIT = 10

/** Shares of running text for lowercase and capital letters, split by the letter table. */
const LOWER_SHARE = Math.log(0.75)
const UPPER_SHARE = Math.log(0.04)

/** Log probability of every other byte, by the first class that matches it. */
const BYTE_CLASSES: ReadonlyArray<readonly [RegExp, number]> = [
  [/^ $/, Math.log(0.15)],
  [/^\d$/, Math.log(0.001)],
  [/^[.,'"!?\-:;()]$/, Math.log(0.0035)],
  [/^[!-~]$/, Math.log(0.0005)],
  [/^[\t\n\r]$/, Math.log(0.002)],
]

/** Log probability of a byte that is not ASCII text. */
const NOT_TEXT = Math.log(0.000_001)

/**
 * Log probability of one byte in plaintext of `language`, from a byte model of running text.
 *
 * @param byte - The byte, 0 to 255.
 * @param language - Language whose letter table weighs the letters.
 * @returns {number} A natural log, at most zero.
 */
function byteLog(byte: number, language: FrequencyLanguage): number {
  const character = String.fromCodePoint(byte)
  const letter = letterLogProbabilities[language].get(character.toUpperCase())
  if (letter !== undefined && byte < 0x80) {
    return (character === character.toUpperCase() ? UPPER_SHARE : LOWER_SHARE) + letter
  }
  return BYTE_CLASSES.find(([pattern]) => pattern.test(character))?.[1] ?? NOT_TEXT
}

/**
 * Read one ciphertext: hex digits in whole bytes, case and whitespace ignored.
 *
 * @param digits - The ciphertext as typed.
 * @param index - Its place in the list, for the error.
 * @returns {number[]} At least one byte.
 * @throws {InvalidOptionError} When it is empty, not hex or an odd number of digits.
 */
function readCiphertext(digits: string, index: number): number[] {
  const hex = digits.replaceAll(/\s/g, '')
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new InvalidOptionError(
      'ciphertexts',
      `#${index}`,
      'must each be a nonzero even number of hex digits',
    )
  }
  return fromHex(hex)
}

/**
 * Check one placement against the ciphertexts it names.
 *
 * @param placement - The placement as given.
 * @param index - Its place in `known`, for the error.
 * @param ciphertexts - The ciphertexts as bytes.
 * @returns {number[]} The placement's text as UTF-8 bytes.
 * @throws {InvalidOptionError} When the message or the offset is out of range or the text empty.
 */
function placementBytes(
  placement: CribPlacement,
  index: number,
  ciphertexts: readonly (readonly number[])[],
): number[] {
  const { message, offset, text } = placement
  const target = Number.isInteger(message) ? ciphertexts[message] : undefined
  if (target === undefined) {
    throw new InvalidOptionError(
      'known',
      `#${index}`,
      `message must be a ciphertext number from 0 to ${ciphertexts.length - 1}`,
    )
  }
  const bytes = [...new TextEncoder().encode(text)]
  if (bytes.length === 0)
    throw new InvalidOptionError('known', `#${index}`, 'text must not be empty')
  if (!Number.isInteger(offset) || offset < 0 || offset + bytes.length > target.length) {
    throw new InvalidOptionError(
      'known',
      `#${index}`,
      `must fit in ciphertext ${message}, which has ${target.length} bytes`,
    )
  }
  return bytes
}

/**
 * The key bytes the known placements fix, one entry per position of the longest ciphertext.
 *
 * @param ciphertexts - The ciphertexts as bytes.
 * @param known - The accepted placements.
 * @returns {(number | undefined)[]} The key, `undefined` where nothing fixes a byte.
 * @throws {InvalidOptionError} When a placement is out of range or two disagree on a key byte.
 */
function knownKey(
  ciphertexts: readonly (readonly number[])[],
  known: readonly CribPlacement[],
): Array<number | undefined> {
  const key: Array<number | undefined> = Array.from({
    length: Math.max(...ciphertexts.map((bytes) => bytes.length)),
  })
  known.forEach((placement, index) => {
    const text = placementBytes(placement, index, ciphertexts)
    const target = ciphertexts[placement.message]!
    text.forEach((byte, at) => {
      const position = placement.offset + at
      const value = target[position]! ^ byte
      if (key[position] !== undefined && key[position] !== value) {
        throw new InvalidOptionError(
          'known',
          `#${index}`,
          `disagrees with an earlier placement on key byte ${position}`,
        )
      }
      key[position] = value
    })
  })
  return key
}

/**
 * The summed log probability one key byte gives the other ciphertexts at one position.
 *
 * @param ciphertexts - The ciphertexts as bytes.
 * @param source - The ciphertext the crib sits in, which reveals nothing about itself.
 * @param position - The byte position.
 * @param keyByte - The key byte the crib implies there.
 * @param logs - `byteLog` of every byte value, in the plaintexts' language.
 * @returns {readonly [sum: number, count: number]} The sum and how many ciphertexts reach it.
 */
function revealedLogs(
  ciphertexts: readonly (readonly number[])[],
  source: number,
  position: number,
  keyByte: number,
  logs: readonly number[],
): readonly [sum: number, count: number] {
  let sum = 0
  let count = 0
  for (let message = 0; message < ciphertexts.length; message++) {
    const byte = ciphertexts[message]![position]
    if (message === source || byte === undefined) continue
    sum += logs[byte ^ keyByte]!
    count++
  }
  return [sum, count]
}

/**
 * Score of the crib at one place; nothing when it reveals nothing, contradicts or repeats the key.
 *
 * @param ciphertexts - The ciphertexts as bytes.
 * @param crib - The crib as bytes.
 * @param key - The known key.
 * @param place - The ciphertext and offset the crib is tried at.
 * @param place.message - The ciphertext.
 * @param place.offset - The first byte.
 * @param logs - `byteLog` of every byte value, in the plaintexts' language.
 * @returns {number | undefined} The mean log probability of the revealed bytes.
 */
function placementScore(
  ciphertexts: readonly (readonly number[])[],
  crib: readonly number[],
  key: ReadonlyArray<number | undefined>,
  place: Readonly<{ message: number; offset: number }>,
  logs: readonly number[],
): number | undefined {
  const source = ciphertexts[place.message]!
  let total = 0
  let revealed = 0
  let fresh = false
  for (let at = 0; at < crib.length; at++) {
    const position = place.offset + at
    const keyByte = source[position]! ^ crib[at]!
    const fixed = key[position]
    if (fixed !== undefined && fixed !== keyByte) return undefined
    fresh ||= fixed === undefined
    const [sum, count] = revealedLogs(ciphertexts, place.message, position, keyByte, logs)
    total += sum
    revealed += count
  }
  return fresh && revealed > 0 ? total / revealed : undefined
}

/**
 * What the other ciphertexts read under the key bytes the crib gives at one place.
 *
 * @param ciphertexts - The ciphertexts as bytes.
 * @param crib - The crib as bytes.
 * @param place - The ciphertext and offset the crib sits at.
 * @param place.message - The ciphertext.
 * @param place.offset - The first byte.
 * @returns {Array<{ message: number; bytes: number[] }>} One entry per ciphertext that reaches it.
 */
function placementReveals(
  ciphertexts: readonly (readonly number[])[],
  crib: readonly number[],
  place: Readonly<{ message: number; offset: number }>,
): Array<{ message: number; bytes: number[] }> {
  const source = ciphertexts[place.message]!
  return ciphertexts.flatMap((bytes, message) => {
    if (message === place.message || bytes.length <= place.offset) return []
    const shown = bytes
      .slice(place.offset, place.offset + crib.length)
      .map((byte, at) => byte ^ source[place.offset + at]! ^ crib[at]!)
    return [{ message, bytes: shown }]
  })
}

/**
 * Rank every place the crib fits, best first.
 *
 * @param ciphertexts - The ciphertexts as bytes.
 * @param crib - The crib as bytes.
 * @param key - The known key.
 * @param language - Language the plaintexts read in.
 * @returns {Array<{ message: number; offset: number; score: number }>} The places that score.
 */
function rankPlacements(
  ciphertexts: readonly (readonly number[])[],
  crib: readonly number[],
  key: ReadonlyArray<number | undefined>,
  language: FrequencyLanguage,
): Array<{ message: number; offset: number; score: number }> {
  const logs = Array.from({ length: 256 }, (_, byte) => byteLog(byte, language))
  const ranked: Array<{ message: number; offset: number; score: number }> = []
  ciphertexts.forEach((bytes, message) => {
    for (let offset = 0; offset + crib.length <= bytes.length; offset++) {
      const score = placementScore(ciphertexts, crib, key, { message, offset }, logs)
      if (score !== undefined) ranked.push({ message, offset, score })
    }
  })
  return ranked.sort((left, right) => right.score - left.score)
}

/**
 * Check the options that do not depend on the ciphertexts' bytes and fill in their defaults.
 *
 * @param ciphertexts - The ciphertexts as given.
 * @param options - The options as given.
 * @returns {{ cribBytes: number[]; language: FrequencyLanguage; limit: number }} The crib as
 *   UTF-8 bytes, none without a crib, the language and the limit.
 * @throws {InvalidOptionError} When there are fewer than two ciphertexts, the crib is empty, or the
 *   language or limit is invalid.
 */
function readOptions(
  ciphertexts: readonly string[],
  options: Readonly<CribDragOptions>,
): { cribBytes: number[]; language: FrequencyLanguage; limit: number } {
  const { crib, language = 'en', limit = DEFAULT_CRIB_LIMIT } = options
  assertLanguage(language)
  if (!Number.isInteger(limit) || limit < 1) {
    const shown = typeof limit === 'number' ? limit : typeof limit
    throw new InvalidOptionError('limit', shown, 'must be an integer of at least 1')
  }
  if (ciphertexts.length < 2) {
    throw new InvalidOptionError('ciphertexts', ciphertexts.length, 'must hold at least two')
  }
  if (crib === '') throw new InvalidOptionError('crib', crib, 'must not be empty')
  return {
    cribBytes: crib === undefined ? [] : [...new TextEncoder().encode(crib)],
    language,
    limit,
  }
}

/**
 * Drag a crib across ciphertexts under one reused XOR keystream, most readable places first.
 * Placements in `known` fix key bytes, and places that contradict them drop out.
 *
 * @param ciphertexts - Two or more ciphertexts in hex, each XORed with the same key from byte 0.
 * @param options - The crib, the known placements, the language and how many places to return.
 * @returns {CribDrag} The ranked places, the known key and the plaintexts it gives.
 * @throws {InvalidOptionError} When there are fewer than two ciphertexts, one is not hex, a
 *   placement does not fit or two placements disagree, or the language or limit is invalid.
 */
export function dragCrib(
  ciphertexts: readonly string[],
  options: Readonly<CribDragOptions> = {},
): CribDrag {
  const { cribBytes, language, limit } = readOptions(ciphertexts, options)
  const bytes = ciphertexts.map((digits, index) => readCiphertext(digits, index))
  const key = knownKey(bytes, options.known ?? [])
  const ranked = cribBytes.length === 0 ? [] : rankPlacements(bytes, cribBytes, key, language)
  return {
    language,
    total: ranked.length,
    candidates: ranked.slice(0, limit).map((place) => ({
      ...place,
      reveals: placementReveals(bytes, cribBytes, place),
    })),
    key,
    plaintexts: bytes.map((message) =>
      message.map((byte, position) => {
        const keyByte = key[position]
        return keyByte === undefined ? undefined : byte ^ keyByte
      }),
    ),
  }
}

/**
 * Bytes as one ASCII line: text as is, `\` and `"` escaped, others as `\xNN`, unknown as `·`.
 *
 * @param bytes - The bytes, `undefined` where one is unknown.
 * @returns {string} The line, without quotes around it.
 */
export function showCribBytes(bytes: ReadonlyArray<number | undefined>): string {
  return bytes
    .map((byte) => {
      if (byte === undefined) return '·'
      if (byte === 0x5c || byte === 0x22) return `\\${String.fromCodePoint(byte)}`
      if (byte >= 0x20 && byte < 0x7f) return String.fromCodePoint(byte)
      return `\\x${byte.toString(16).padStart(2, '0')}`
    })
    .join('')
}
