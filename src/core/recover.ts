import { InvalidOptionError } from './errors.ts'
import { assertLanguage, letterLogProbabilities, type FrequencyLanguage } from './frequency.ts'
import { estimatePeriod } from './period.ts'
import {
  ENGLISH_QUADGRAM_FIT,
  QUADGRAM_STEP,
  quadgramLevel,
  quadgramLevelSum,
  quadgramLevels,
  randomQuadgramFit,
} from './quadgrams.ts'
import {
  DEFAULT_COLUMNAR_KEY_LENGTH,
  DEFAULT_KEY_CANDIDATES,
  MAX_COLUMNAR_KEY_LENGTH,
  MAX_KEY_CANDIDATES,
  keyRecoveryCiphers,
  periodicKeyRecoveryCiphers,
  type KeyRecoveryCipher,
} from './recover-options.ts'
import { decodeColumnar } from './utils.ts'

export {
  DEFAULT_COLUMNAR_KEY_LENGTH,
  DEFAULT_KEY_CANDIDATES,
  MAX_COLUMNAR_KEY_LENGTH,
  MAX_KEY_CANDIDATES,
  keyRecoveryCiphers,
  type KeyRecoveryCipher,
}

/** Key lengths of a periodic cipher tried when `period` is not given, the likeliest first. */
const PERIODS_TRIED = 5

/** Letters the hill climbs score; the key found decodes the whole text. */
const SEARCH_LETTERS = 600

/** Characters of a columnar text every key order is scored on first. */
const SCREEN_CHARACTERS = 120

/** Key orders kept from the first scoring, to score again on `SEARCH_CHARACTERS`. */
const SCREENED_ORDERS = 50

/** Characters of a columnar text the screened key orders are scored on. */
const SEARCH_CHARACTERS = 400

/** Letters times random starts of a substitution search, so a short text gets more starts. */
const SUBSTITUTION_BUDGET = 9_000

/** Fewest and most random starts of the substitution search. */
const SUBSTITUTION_RESTARTS = [10, 100] as const

/** Rounds of single key letter changes after the chi-squared key of a periodic cipher. */
const PERIODIC_ROUNDS = 10

/** Seed of the substitution search, fixed so the same text gives the same answer. */
const SEED = 0x9e3779b9

/** How each periodic cipher turns a ciphertext letter and a key letter into plaintext, mod 26. */
const periodicSigns: Readonly<Record<string, readonly [letter: number, key: number]>> = {
  vigenere: [1, -1],
  beaufort: [-1, 1],
  'variant-beaufort': [1, 1],
}

/** Options of `recoverKey`. */
export interface KeyRecoveryOptions {
  /** Cipher the text was encrypted with. */
  readonly cipher: KeyRecoveryCipher
  /** Language the plaintext reads in; substitution and columnar need `en`. */
  readonly language?: FrequencyLanguage
  /** Key length of a periodic cipher; without it the likeliest lengths are tried. */
  readonly period?: number
  /** Columnar key length; without it every length from 2 to `DEFAULT_COLUMNAR_KEY_LENGTH`. */
  readonly keyLength?: number
  /** How many candidates to return. */
  readonly limit?: number
}

/** One key and what it decodes the text to. */
export interface KeyCandidate {
  /**
   * The keyword, as `columnar` takes it too. Substitution: the cipher letter of each plaintext
   * letter A to Z, `?` where the text never shows it.
   */
  readonly key: string
  /** Mean natural-log probability per quadgram, or per letter without a quadgram table. */
  readonly fit: number
  /** The text decoded with `key`. */
  readonly text: string
}

/** Ranked keys for one text. */
export interface KeyRecovery {
  readonly cipher: KeyRecoveryCipher
  readonly language: FrequencyLanguage
  /** What `fit` averages: quadgrams for English, single letters otherwise. */
  readonly scoredBy: 'quadgrams' | 'letters'
  /** A-Z letters in the text. */
  readonly letters: number
  /** `fit` of plaintext in `language`. */
  readonly referenceFit: number
  /** `fit` of random letters. */
  readonly randomFit: number
  /** Best first; scored by letters, a key pays ln 26 per letter for fitting by chance. */
  readonly candidates: readonly KeyCandidate[]
}

/** A key found by one search and its fit on the letters searched. */
interface Found {
  readonly key: string
  readonly fit: number
}

/** Scores a run of plaintext letter codes; higher reads more like the language. */
interface Scorer {
  readonly scoredBy: 'quadgrams' | 'letters'
  readonly referenceFit: number
  readonly randomFit: number
  /** Sum over the run, comparable between runs of one length. */
  readonly total: (codes: ArrayLike<number>, length?: number) => number
  /** Mean per quadgram or letter. */
  readonly fit: (codes: ArrayLike<number>) => number
  /** The quadgram table, for English. */
  readonly levels?: ArrayLike<number>
}

/**
 * Quadgrams for English, letter frequencies for the other languages.
 *
 * @param language - Language the plaintext reads in.
 * @returns {Scorer} The scorer.
 */
function scorer(language: FrequencyLanguage): Scorer {
  if (language === 'en') {
    const levels = quadgramLevels()
    const total = (codes: ArrayLike<number>, length?: number): number =>
      -quadgramLevelSum(levels, codes, length) * QUADGRAM_STEP
    return {
      scoredBy: 'quadgrams',
      levels,
      referenceFit: ENGLISH_QUADGRAM_FIT,
      randomFit: randomQuadgramFit(levels),
      total,
      fit: (codes) => (codes.length < 4 ? -Infinity : total(codes) / (codes.length - 3)),
    }
  }
  const logs = Array.from({ length: 26 }, (_, code) =>
    letterLogProbabilities[language].get(String.fromCodePoint(65 + code))!,
  )
  const total = (codes: ArrayLike<number>, length = codes.length): number => {
    let sum = 0
    for (let index = 0; index < length; index++) sum += logs[codes[index]!]!
    return sum
  }
  return {
    scoredBy: 'letters',
    referenceFit: logs.reduce((sum, log) => sum + Math.exp(log) * log, 0),
    randomFit: logs.reduce((sum, log) => sum + log, 0) / 26,
    total,
    fit: (codes) => (codes.length === 0 ? -Infinity : total(codes) / codes.length),
  }
}

/**
 * The A-Z letters of a text as 0 to 25, case ignored.
 *
 * @param text - Any text.
 * @returns {number[]} The letter codes in order.
 */
function letterCodes(text: string): number[] {
  return Array.from(
    text.matchAll(/[A-Za-z]/g),
    ([letter]) => letter.toUpperCase().codePointAt(0)! - 65,
  )
}

/**
 * Replace each A-Z letter of a text, keeping its case and everything else in place.
 *
 * @param text - The text.
 * @param plain - The letter code to write for the letter code at a letter index.
 * @returns {string} The text with its letters replaced.
 */
function mapLetters(text: string, plain: (code: number, index: number) => number): string {
  let index = 0
  return text.replaceAll(/[A-Za-z]/g, (letter) => {
    const upper = letter.toUpperCase()
    const result = String.fromCodePoint(65 + plain(upper.codePointAt(0)! - 65, index++))
    return letter === upper ? result : result.toLowerCase()
  })
}

/**
 * Refuse an option the cipher does not take, or a bound it breaks.
 *
 * @param options - Options of `recoverKey`.
 * @throws {InvalidOptionError} When an option is out of range or belongs to another cipher.
 */
function checkOptions(options: Readonly<KeyRecoveryOptions>): void {
  const { cipher, period, keyLength, limit } = options
  if (!(keyRecoveryCiphers as readonly string[]).includes(cipher)) {
    throw new InvalidOptionError(
      'cipher',
      cipher,
      `must be one of ${keyRecoveryCiphers.join(', ')}`,
    )
  }
  checkPeriod(cipher, period)
  checkKeyLength(cipher, keyLength)
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit < 1 || limit > MAX_KEY_CANDIDATES)
  ) {
    throw new InvalidOptionError(
      'limit',
      limit,
      `must be an integer from 1 to ${MAX_KEY_CANDIDATES}`,
    )
  }
}

/**
 * Refuse a period for a cipher without a repeating keyword, or one below 1.
 *
 * @param cipher - The cipher searched.
 * @param period - The period given, if any.
 * @throws {InvalidOptionError} When the period does not fit.
 */
function checkPeriod(cipher: KeyRecoveryCipher, period: number | undefined): void {
  if (period === undefined) return
  if (!Object.hasOwn(periodicSigns, cipher)) {
    throw new InvalidOptionError(
      'period',
      period,
      `only ${periodicKeyRecoveryCiphers.join(', ')} take it`,
    )
  }
  if (!Number.isInteger(period) || period < 1) {
    throw new InvalidOptionError('period', period, 'must be a positive integer')
  }
}

/**
 * Refuse a key length for another cipher than columnar, or outside 2 to the maximum.
 *
 * @param cipher - The cipher searched.
 * @param keyLength - The key length given, if any.
 * @throws {InvalidOptionError} When the key length does not fit.
 */
function checkKeyLength(cipher: KeyRecoveryCipher, keyLength: number | undefined): void {
  if (keyLength === undefined) return
  if (cipher !== 'columnar') {
    throw new InvalidOptionError('keyLength', keyLength, 'only columnar takes it')
  }
  if (!Number.isInteger(keyLength) || keyLength < 2 || keyLength > MAX_COLUMNAR_KEY_LENGTH) {
    throw new InvalidOptionError(
      'keyLength',
      keyLength,
      `must be an integer from 2 to ${MAX_COLUMNAR_KEY_LENGTH}`,
    )
  }
}

/**
 * The shortest keyword that repeats to `key`.
 *
 * @param key - A periodic key.
 * @returns {string} Its shortest period.
 */
function shortestPeriod(key: string): string {
  for (let length = 1; length < key.length; length++) {
    if (key.length % length === 0 && key.slice(0, length).repeat(key.length / length) === key) {
      return key.slice(0, length)
    }
  }
  return key
}

/**
 * The shift of each column whose letter counts come closest to the language by chi-squared.
 *
 * @param codes - Ciphertext letters as 0 to 25.
 * @param period - Key length.
 * @param signs - How the cipher combines a letter and a key letter into plaintext.
 * @param language - Language the plaintext reads in.
 * @returns {number[]} One key letter per column as 0 to 25.
 */
function chiSquaredKey(
  codes: readonly number[],
  period: number,
  signs: readonly [letter: number, key: number],
  language: FrequencyLanguage,
): number[] {
  const expected = Array.from({ length: 26 }, (_, code) =>
    Math.exp(letterLogProbabilities[language].get(String.fromCodePoint(65 + code))!),
  )
  return Array.from({ length: period }, (_, column) => {
    const counts = Array.from<number>({ length: 26 }).fill(0)
    let size = 0
    for (let index = column; index < codes.length; index += period) {
      counts[codes[index]!]!++
      size++
    }
    let best = 0
    let bestChi = Infinity
    for (let shift = 0; shift < 26; shift++) {
      let chi = 0
      for (let code = 0; code < 26; code++) {
        const plain = (((signs[0] * code + signs[1] * shift) % 26) + 26) % 26
        const want = size * expected[plain]!
        chi += (counts[code]! - want) ** 2 / want
      }
      if (chi < bestChi) [best, bestChi] = [shift, chi]
    }
    return best
  })
}

/**
 * Where each column's letters sit in a run of letters dealt out to `period` columns in turn.
 *
 * @param length - Letters in the run.
 * @param period - Number of columns.
 * @returns {number[][]} The letter indices of each column.
 */
function columnPositions(length: number, period: number): number[][] {
  const positions = Array.from({ length: period }, (): number[] => [])
  for (let index = 0; index < length; index++) positions[index % period]!.push(index)
  return positions
}

/**
 * Start of every quadgram that holds one of the given letters, each start once.
 *
 * @param positions - Letter indices.
 * @param length - Letters in the run.
 * @returns {number[]} The quadgram starts.
 */
function quadgramStarts(positions: readonly number[], length: number): number[] {
  const starts = new Set<number>()
  for (const position of positions) {
    for (let start = Math.max(0, position - 3); start <= Math.min(position, length - 4); start++) {
      starts.add(start)
    }
  }
  return [...starts]
}

/**
 * Change one key letter, then two neighbours together, while the quadgrams improve. Two wrong
 * neighbours can hold each other in place, since a quadgram spans both columns.
 *
 * @param codes - Ciphertext letters as 0 to 25, the first `SEARCH_LETTERS` of them.
 * @param start - Key letters as 0 to 25 to start from.
 * @param signs - How the cipher combines a letter and a key letter into plaintext.
 * @param levels - The quadgram table.
 * @returns {number[]} The key where no change helps, or `PERIODIC_ROUNDS` ran out.
 */
function climbPeriodic(
  codes: readonly number[],
  start: readonly number[],
  signs: readonly [letter: number, key: number],
  levels: ArrayLike<number>,
): number[] {
  const key = [...start]
  const period = key.length
  const plain = new Uint8Array(codes.length)
  const columns = columnPositions(codes.length, period)
  const setColumn = (column: number, shift: number): void => {
    key[column] = shift
    for (const index of columns[column]!) {
      plain[index] = (((signs[0] * codes[index]! + signs[1] * shift) % 26) + 26) % 26
    }
  }
  key.forEach((shift, column) => setColumn(column, shift))
  const levelsAt = (starts: readonly number[]): number => {
    let sum = 0
    for (const at of starts) sum += quadgramLevel(levels, plain, at)
    return sum
  }
  const tryKey = (
    moved: readonly number[],
    shifts: readonly number[],
    starts: readonly number[],
  ): boolean => {
    const kept = moved.map((column) => key[column]!)
    const before = levelsAt(starts)
    moved.forEach((column, index) => setColumn(column, shifts[index]!))
    if (levelsAt(starts) < before) return true
    moved.forEach((column, index) => setColumn(column, kept[index]!))
    return false
  }
  const singleStarts = columns.map((positions) => quadgramStarts(positions, codes.length))
  const pairStarts = columns.map((positions, column) =>
    quadgramStarts([...positions, ...columns[(column + 1) % period]!], codes.length),
  )
  const singles = (): boolean => {
    let changed = false
    for (let column = 0; column < period; column++) {
      for (let shift = 0; shift < 26; shift++) {
        changed = tryKey([column], [shift], singleStarts[column]!) || changed
      }
    }
    return changed
  }
  const pairs = (): boolean => {
    let changed = false
    for (let column = 0; period > 1 && column < period; column++) {
      const pair = [column, (column + 1) % period]
      for (let shift = 0; shift < 676; shift++) {
        changed = tryKey(pair, [Math.floor(shift / 26), shift % 26], pairStarts[column]!) || changed
      }
    }
    return changed
  }
  for (let round = 0; round < PERIODIC_ROUNDS; round++) {
    if (!singles() && !pairs()) break
  }
  return key
}

/**
 * Keys of a periodic cipher: chi-squared per column for each length, then the quadgram climb.
 *
 * @param codes - Ciphertext letters as 0 to 25.
 * @param text - The ciphertext.
 * @param options - Options of `recoverKey`.
 * @param score - The scorer.
 * @returns {Found[]} One key per length tried, repeated keys once.
 */
function periodicKeys(
  codes: readonly number[],
  text: string,
  options: Readonly<KeyRecoveryOptions>,
  score: Readonly<Scorer>,
): Found[] {
  if (score.levels !== undefined && codes.length < 4) return []
  const language = options.language ?? 'en'
  const signs = periodicSigns[options.cipher]!
  const periods =
    options.period === undefined
      ? estimatePeriod(text, language)
          .periods.slice(0, PERIODS_TRIED)
          .map(({ period }) => period)
      : [options.period]
  const sample = codes.slice(0, SEARCH_LETTERS)
  const found = new Map<string, number>()
  for (const period of periods) {
    if (period > codes.length) continue
    let key = chiSquaredKey(codes, period, signs, language)
    if (score.levels !== undefined) key = climbPeriodic(sample, key, signs, score.levels)
    const word = shortestPeriod(String.fromCodePoint(...key.map((shift) => 65 + shift)))
    const plain = sample.map((code, index) => {
      const shift = word.codePointAt(index % word.length)! - 65
      return (((signs[0] * code + signs[1] * shift) % 26) + 26) % 26
    })
    found.set(word, score.fit(plain))
  }
  return [...found].map(([key, fit]) => ({ key, fit }))
}

/**
 * Mulberry32, a small seeded generator.
 *
 * @param seed - The seed.
 * @returns {() => number} A function giving the next number in [0, 1).
 */
function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

/**
 * The plaintext letter of each cipher letter when both alphabets go by frequency.
 *
 * @param codes - Ciphertext letters as 0 to 25.
 * @returns {number[]} Plaintext letter code per cipher letter code.
 */
function frequencyStart(codes: readonly number[]): number[] {
  const counts = Array.from<number>({ length: 26 }).fill(0)
  for (const code of codes) counts[code]!++
  const english = Array.from('ETAOINSHRDLCUMWFGYPBVKJXQZ', (letter) => letter.codePointAt(0)! - 65)
  const byCount = Array.from({ length: 26 }, (_, code) => code).sort(
    (left, right) => counts[right]! - counts[left]! || left - right,
  )
  const plain = Array.from<number>({ length: 26 }).fill(0)
  byCount.forEach((code, rank) => (plain[code] = english[rank]!))
  return plain
}

/**
 * A random order of the 26 plaintext letters.
 *
 * @param next - The generator.
 * @returns {number[]} Plaintext letter code per cipher letter code.
 */
function shuffled(next: () => number): number[] {
  const plain = Array.from({ length: 26 }, (_, code) => code)
  for (let index = 25; index > 0; index--) {
    const other = Math.floor(next() * (index + 1))
    ;[plain[index], plain[other]] = [plain[other]!, plain[index]!]
  }
  return plain
}

/**
 * Swap the plaintext letters of two cipher letters while that helps, until a whole pass doesn't.
 *
 * @param codes - Ciphertext letters as 0 to 25.
 * @param start - Plaintext letter code per cipher letter code to start from.
 * @param present - Cipher letter codes the text uses; a swap needs one of them.
 * @param score - The scorer.
 * @returns {Found} The key in `KeyCandidate` form and its total score.
 */
function climbSubstitution(
  codes: readonly number[],
  start: readonly number[],
  present: readonly number[],
  score: Readonly<Scorer>,
): Found {
  const plainOf = [...start]
  const plain = new Uint8Array(codes.length)
  const decode = (): number => {
    for (let index = 0; index < codes.length; index++) plain[index] = plainOf[codes[index]!]!
    return score.total(plain)
  }
  let current = decode()
  for (let changed = true; changed;) {
    changed = false
    for (const first of present) {
      for (let second = 0; second < 26; second++) {
        if (second === first) continue
        ;[plainOf[first], plainOf[second]] = [plainOf[second]!, plainOf[first]!]
        const total = decode()
        if (total > current) [current, changed] = [total, true]
        else [plainOf[first], plainOf[second]] = [plainOf[second]!, plainOf[first]!]
      }
    }
  }
  return { key: substitutionKey(plainOf, present), fit: current }
}

/**
 * The cipher letter of each plaintext letter, `?` where the cipher letter never shows.
 *
 * @param plainOf - Plaintext letter code per cipher letter code.
 * @param present - Cipher letter codes the text uses.
 * @returns {string} 26 characters, plaintext A first.
 */
function substitutionKey(plainOf: readonly number[], present: readonly number[]): string {
  const key = Array.from<string>({ length: 26 }).fill('?')
  for (const code of present) key[plainOf[code]!] = String.fromCodePoint(65 + code)
  return key.join('')
}

/**
 * The first `SEARCH_LETTERS` letters, plus a few around each letter that only shows later.
 *
 * @param codes - Ciphertext letters as 0 to 25.
 * @returns {number[]} The letters to search on.
 */
function substitutionSample(codes: readonly number[]): number[] {
  const sample = codes.slice(0, SEARCH_LETTERS)
  const seen = new Set(sample)
  for (let index = sample.length; index < codes.length; index++) {
    if (seen.has(codes[index]!)) continue
    seen.add(codes[index]!)
    sample.push(...codes.slice(Math.max(0, index - 3), index + 4))
  }
  return sample
}

/**
 * Keys of a substitution: climbs from the frequency order and from random ones, each result once.
 *
 * @param codes - Ciphertext letters as 0 to 25.
 * @param score - The scorer.
 * @returns {Found[]} The distinct keys the climbs ended at.
 */
function substitutionKeys(codes: readonly number[], score: Readonly<Scorer>): Found[] {
  const sample = substitutionSample(codes)
  if (sample.length < 4) return []
  const present = [...new Set(sample)].sort((left, right) => left - right)
  const next = random(SEED)
  const found = new Map<string, number>()
  const restarts = Math.min(
    Math.max(Math.ceil(SUBSTITUTION_BUDGET / sample.length), SUBSTITUTION_RESTARTS[0]),
    SUBSTITUTION_RESTARTS[1],
  )
  for (let restart = 0; restart <= restarts; restart++) {
    const start = restart === 0 ? frequencyStart(sample) : shuffled(next)
    const { key, fit } = climbSubstitution(sample, start, present, score)
    found.set(key, fit / (sample.length - 3))
  }
  return [...found].map(([key, fit]) => ({ key, fit }))
}

/**
 * Every order of `length` columns, as the rank of each column.
 *
 * @param length - Number of columns.
 * @yields {number[]} One order per permutation, the same array changed in place.
 */
function* columnOrders(length: number): Generator<number[]> {
  const order = Array.from({ length }, (_, index) => index)
  yield order
  for (;;) {
    let pivot = length - 2
    while (pivot >= 0 && order[pivot]! > order[pivot + 1]!) pivot--
    if (pivot < 0) return
    let swap = length - 1
    while (order[swap]! < order[pivot]!) swap--
    ;[order[pivot], order[swap]] = [order[swap]!, order[pivot]!]
    for (let left = pivot + 1, right = length - 1; left < right; left++, right--) {
      ;[order[left], order[right]] = [order[right]!, order[left]!]
    }
    yield order
  }
}

/**
 * The letters of the first plaintext characters a column order gives.
 *
 * @param letters - Letter code of each ciphertext character, -1 for anything else.
 * @param order - Rank of each column, as `columnar` reads them.
 * @param characters - How many plaintext characters to read.
 * @param into - Where the letter codes go.
 * @returns {number} How many letter codes went into `into`.
 */
function columnarSample(
  letters: readonly number[],
  order: readonly number[],
  characters: number,
  into: Uint8Array,
): number {
  const columns = order.length
  const rows = Math.floor(letters.length / columns)
  const long = letters.length % columns
  const byRank = Array.from<number>({ length: columns })
  order.forEach((rank, column) => (byRank[rank] = column))
  const starts = Array.from<number>({ length: columns })
  let offset = 0
  for (const column of byRank) {
    starts[column] = offset
    offset += rows + (column < long ? 1 : 0)
  }
  let length = 0
  const end = Math.min(letters.length, characters)
  for (let index = 0; index < end; index++) {
    const code = letters[starts[index % columns]! + Math.floor(index / columns)]!
    if (code >= 0) into[length++] = code
  }
  return length
}

/**
 * Keys of a columnar text: every column order on a short start, the best again on a longer one.
 *
 * @param text - The ciphertext, every character a cell.
 * @param options - Options of `recoverKey`.
 * @param score - The scorer.
 * @returns {Found[]} The best orders, as keywords.
 */
function columnarKeys(
  text: string,
  options: Readonly<KeyRecoveryOptions>,
  score: Readonly<Scorer>,
): Found[] {
  const letters = Array.from(text, (character) =>
    /^[A-Za-z]$/.test(character) ? character.toUpperCase().codePointAt(0)! - 65 : -1,
  )
  const lengths =
    options.keyLength === undefined
      ? Array.from({ length: DEFAULT_COLUMNAR_KEY_LENGTH - 1 }, (_, index) => index + 2).filter(
          (columns) => columns <= letters.length,
        )
      : [options.keyLength]
  const into = new Uint8Array(SEARCH_CHARACTERS)
  const fitOf = (order: readonly number[], characters: number): number => {
    const used = columnarSample(letters, order, characters, into)
    return used < 4 ? -Infinity : score.total(into, used) / (used - 3)
  }
  const screened: Found[] = []
  const size = Math.max(SCREENED_ORDERS, options.limit ?? DEFAULT_KEY_CANDIDATES)
  for (const length of lengths) {
    for (const order of columnOrders(length)) {
      const fit = fitOf(order, SCREEN_CHARACTERS)
      if (fit === -Infinity || (screened.length >= size && fit <= screened.at(-1)!.fit)) continue
      screened.push({ key: String.fromCodePoint(...order.map((rank) => 65 + rank)), fit })
      screened.sort((left, right) => right.fit - left.fit)
      screened.length = Math.min(screened.length, size)
    }
  }
  return screened.map(({ key }) => ({
    key,
    fit: fitOf(
      Array.from(key, (letter) => letter.codePointAt(0)! - 65),
      SEARCH_CHARACTERS,
    ),
  }))
}

/**
 * Decode the text with a key found for the cipher.
 *
 * @param text - The ciphertext.
 * @param cipher - The cipher.
 * @param key - A key in `KeyCandidate` form.
 * @returns {string} The plaintext.
 */
function decodeWith(text: string, cipher: KeyRecoveryCipher, key: string): string {
  if (cipher === 'columnar') return decodeColumnar(text, key)
  if (cipher === 'substitution') {
    const plainOf = Array.from<number>({ length: 26 })
    Array.from(key).forEach((letter, plain) => {
      if (letter !== '?') plainOf[letter.codePointAt(0)! - 65] = plain
    })
    return mapLetters(text, (code) => plainOf[code] ?? code)
  }
  const signs = periodicSigns[cipher]!
  return mapLetters(text, (code, index) => {
    const shift = key.codePointAt(index % key.length)! - 65
    return (((signs[0] * code + signs[1] * shift) % 26) + 26) % 26
  })
}

/**
 * Search for the key of a text and rank the keys by how well their plaintext reads. English goes
 * by quadgrams; Polish and Japanese romaji by letters, so only the periodic ciphers take them.
 *
 * @param text - The ciphertext.
 * @param options - The cipher and the search options.
 * @returns {KeyRecovery} The ranked keys, best fit first.
 * @throws {InvalidOptionError} For an unknown cipher or language, an option the cipher does not
 *   take, a bound broken, or a language without quadgrams for substitution or columnar.
 */
export function recoverKey(text: string, options: Readonly<KeyRecoveryOptions>): KeyRecovery {
  checkOptions(options)
  const { cipher } = options
  const language = options.language ?? 'en'
  assertLanguage(language)
  if (language !== 'en' && !Object.hasOwn(periodicSigns, cipher)) {
    throw new InvalidOptionError(
      'language',
      language,
      `must be en for ${cipher}: it is ranked by quadgrams, which only English has`,
    )
  }
  const score = scorer(language)
  const codes = letterCodes(text)
  let found: Found[]
  if (cipher === 'substitution') found = substitutionKeys(codes, score)
  else if (cipher === 'columnar') found = columnarKeys(text, options, score)
  else found = periodicKeys(codes, text, options, score)
  const rank = (candidate: Readonly<Found>): number =>
    score.scoredBy === 'quadgrams'
      ? candidate.fit
      : candidate.fit * codes.length - candidate.key.length * Math.log(26)
  const candidates = found
    .sort((left, right) => rank(right) - rank(left))
    .map(({ key }) => {
      const plain = decodeWith(text, cipher, key)
      return { key, fit: score.fit(letterCodes(plain)), text: plain }
    })
    .sort((left, right) => rank(right) - rank(left))
    .slice(0, options.limit ?? DEFAULT_KEY_CANDIDATES)
  return {
    cipher,
    language,
    scoredBy: score.scoredBy,
    letters: codes.length,
    referenceFit: score.referenceFit,
    randomFit: score.randomFit,
    candidates,
  }
}
