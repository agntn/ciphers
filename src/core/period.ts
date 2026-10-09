import { InvalidOptionError } from './errors.ts'
import { assertLanguage, languageTables, type FrequencyLanguage } from './frequency.ts'

/** Periods the analysis tries unless told otherwise. */
export const DEFAULT_MAX_PERIOD = 20

/** How many of the top periods get a key. */
const KEYED_PERIODS = 3

/** Index of coincidence of letters drawn uniformly from A-Z. */
const RANDOM_IC = 1 / 26

/** Lift over random a divisor keeps when a length is its multiple; a mixed divisor keeps half. */
const MULTIPLE_LIFT = 0.8

/** One key length and how well it splits the text into Caesar columns. */
export interface PeriodCandidate {
  readonly period: number
  /** Mean index of coincidence of the `period` columns. */
  readonly ic: number
  /** Vigenère key whose shifts make each column read most like the language; top periods only. */
  readonly key?: string
}

/** How many distances between repeated trigrams one factor divides. */
export interface KasiskiFactor {
  readonly factor: number
  readonly distances: number
}

/** Key length analysis of one text. */
export interface PeriodAnalysis {
  /** A-Z letters in the text, the only characters Vigenère shifts. */
  readonly total: number
  readonly language: FrequencyLanguage
  /** Index of coincidence of plaintext in `language`. */
  readonly referenceIc: number
  /** Lengths 2 to the limit by column IoC, each multiple right behind; empty below 4 letters. */
  readonly periods: readonly PeriodCandidate[]
  /** Distances between successive occurrences of each repeated trigram. */
  readonly distances: number
  /** Factors over the same range as `periods`, the one dividing most distances first. */
  readonly factors: readonly KasiskiFactor[]
}

/**
 * Letter counts of each column when the letters are dealt out in turn to `period` columns.
 *
 * @param codes - Letters as 0 to 25.
 * @param period - Number of columns.
 * @returns {number[][]} 26 counts per column.
 */
function columnCounts(codes: readonly number[], period: number): number[][] {
  const columns = Array.from({ length: period }, () => Array.from<number>({ length: 26 }).fill(0))
  codes.forEach((code, index) => columns[index % period]![code]!++)
  return columns
}

/**
 * Mean index of coincidence of the columns.
 *
 * @param columns - 26 counts per column, each column with two letters or more.
 * @returns {number} The mean.
 */
function meanCoincidence(columns: readonly (readonly number[])[]): number {
  let sum = 0
  for (const counts of columns) {
    let size = 0
    let pairs = 0
    for (const count of counts) {
      size += count
      pairs += count * (count - 1)
    }
    sum += pairs / (size * (size - 1))
  }
  return sum / columns.length
}

/**
 * The shift that makes each column read most like the language, by the `fit` of `analyzeFrequency`.
 *
 * @param columns - 26 counts per column.
 * @param language - Language the plaintext reads in.
 * @returns {string} One key letter per column, A for no shift.
 */
function columnKey(columns: readonly (readonly number[])[], language: FrequencyLanguage): string {
  const logs = languageTables(language).letterLogs
  const logByCode = Array.from({ length: 26 }, (_, code) =>
    logs.get(String.fromCodePoint(65 + code))!,
  )
  return columns
    .map((counts) => {
      let bestShift = 0
      let bestScore = -Infinity
      for (let shift = 0; shift < 26; shift++) {
        let score = 0
        counts.forEach((count, code) => {
          score += count * logByCode[(code - shift + 26) % 26]!
        })
        if (score > bestScore) {
          bestScore = score
          bestShift = shift
        }
      }
      return String.fromCodePoint(65 + bestShift)
    })
    .join('')
}

/**
 * Distances between successive occurrences of every trigram that repeats.
 *
 * @param codes - Letters as 0 to 25.
 * @returns {number[]} The distances, in text order of the later occurrence.
 */
function trigramDistances(codes: readonly number[]): number[] {
  const last = new Map<number, number>()
  const distances: number[] = []
  for (let index = 0; index + 2 < codes.length; index++) {
    const trigram = codes[index]! * 676 + codes[index + 1]! * 26 + codes[index + 2]!
    const previous = last.get(trigram)
    if (previous !== undefined) distances.push(index - previous)
    last.set(trigram, index)
  }
  return distances
}

/**
 * Rank Vigenère key lengths by column IoC and Kasiski, with the key for the top three.
 *
 * @param text - Ciphertext; only A-Z letters count, the ones Vigenère shifts.
 * @param language - Language the plaintext reads in.
 * @param maxPeriod - Longest key length to try.
 * @returns {PeriodAnalysis} The ranked periods and the Kasiski factors.
 * @throws {InvalidOptionError} For a language without a table or a `maxPeriod` below 2.
 */
export function estimatePeriod(
  text: string,
  language: FrequencyLanguage = 'en',
  maxPeriod: number = DEFAULT_MAX_PERIOD,
): PeriodAnalysis {
  assertLanguage(language)
  if (!Number.isInteger(maxPeriod) || maxPeriod < 2) {
    throw new InvalidOptionError('maxPeriod', maxPeriod, 'must be an integer of at least 2')
  }
  const codes = Array.from(
    text.matchAll(/[A-Za-z]/g),
    ([letter]) => letter.toUpperCase().codePointAt(0)! - 65,
  )
  const referenceIc = languageTables(language).ic

  const limit = Math.min(maxPeriod, Math.floor(codes.length / 2))
  const icByPeriod = new Map<number, number>()
  for (let period = 2; period <= limit; period++) {
    icByPeriod.set(period, meanCoincidence(columnCounts(codes, period)))
  }

  const base = (period: number): number => {
    const lift = Math.min(icByPeriod.get(period)!, referenceIc) - RANDOM_IC
    if (lift <= 0) return period
    for (let divisor = 2; divisor < period; divisor++) {
      if (period % divisor !== 0) continue
      if (icByPeriod.get(divisor)! - RANDOM_IC >= MULTIPLE_LIFT * lift) return divisor
    }
    return period
  }
  const ranked = [...icByPeriod.keys()]
    .map((period) => ({ period, base: base(period) }))
    .sort(
      (left, right) =>
        icByPeriod.get(right.base)! - icByPeriod.get(left.base)! ||
        left.base - right.base ||
        left.period - right.period,
    )
  const periods = ranked.map(({ period }, rank) => ({
    period,
    ic: icByPeriod.get(period)!,
    ...(rank < KEYED_PERIODS ? { key: columnKey(columnCounts(codes, period), language) } : {}),
  }))

  const distances = trigramDistances(codes)
  const factors: KasiskiFactor[] = []
  for (let factor = 2; factor <= limit; factor++) {
    factors.push({
      factor,
      distances: distances.filter((distance) => distance % factor === 0).length,
    })
  }
  factors.sort((left, right) => right.distances - left.distances || left.factor - right.factor)

  return {
    total: codes.length,
    language,
    referenceIc,
    periods,
    distances: distances.length,
    factors,
  }
}
