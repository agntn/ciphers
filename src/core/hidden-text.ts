import { InvalidOptionError, MissingOptionError } from './errors.ts'
import {
  analyzeFrequency,
  assertLanguage,
  meanPairLift,
  type FrequencyLanguage,
} from './frequency.ts'

/** Where a hidden message sits: a letter of each unit, every nth letter or word, or a diagonal. */
export const hiddenTextPicks = [
  'line',
  'word',
  'sentence',
  'paragraph',
  'every-letter',
  'every-word',
  'diagonal',
] as const

export type HiddenTextPick = (typeof hiddenTextPicks)[number]

/** Which way a diagonal runs down the lines. */
export type HiddenTextDirection = 'down-right' | 'down-left'

/** One way to read a text. Each pick takes only the options listed for it. */
export interface HiddenTextOptions {
  readonly pick: HiddenTextPick
  /** `line`, `word`, `sentence` and `paragraph`: the letter taken from each, 1 the first, -1 the last. */
  readonly letter?: number
  /** `every-letter` and `every-word`: the step, required there. */
  readonly every?: number
  /** `every-letter` and `every-word`: the position of the first one taken. `diagonal`: the letter of the first line. */
  readonly start?: number
  /** `diagonal`: `down-right` counts letters from the start of each line, `down-left` from its end. */
  readonly direction?: HiddenTextDirection
}

/** One reading of `rankHiddenText`. */
export interface HiddenTextCandidate {
  readonly options: HiddenTextOptions
  readonly text: string
  /**
   * Higher reads more like the language. For English the mean lift of its letter pairs over the
   * same letters drawn apart, above zero for a message and near zero or below for letters picked
   * at random; for Polish and Japanese the `fit` of `analyzeFrequency`, which has no such zero.
   */
  readonly score: number
  /** Whether `score` is a pair lift, which reads as language above zero. */
  readonly lift: boolean
}

/** The readings of one text, the one most like the language first. */
export interface HiddenTextRanking {
  readonly language: FrequencyLanguage
  /** Readings tried, before the ones too short to score and repeats of another were dropped. */
  readonly tried: number
  readonly candidates: readonly HiddenTextCandidate[]
}

/** Fewest A-Z letters a reading needs to be ranked; shorter ones fit the language by chance. */
export const MIN_RANKED_LETTERS = 5

/** Largest step `rankHiddenText` tries for every nth letter. */
export const MAX_RANKED_EVERY = 10

const UNIT_PICKS: ReadonlySet<HiddenTextPick> = new Set(['line', 'word', 'sentence', 'paragraph'])
const EVERY_PICKS: ReadonlySet<HiddenTextPick> = new Set(['every-letter', 'every-word'])

/** The options each pick takes. */
const pickOptions: Readonly<Record<HiddenTextPick, readonly string[]>> = {
  line: ['letter'],
  word: ['letter'],
  sentence: ['letter'],
  paragraph: ['letter'],
  'every-letter': ['every', 'start'],
  'every-word': ['every', 'start'],
  diagonal: ['start', 'direction'],
}

/**
 * The letters of a text, each with the combining marks after it.
 *
 * @param text - Any text.
 * @returns {string[]} One entry per letter, in order.
 */
function letters(text: string): string[] {
  return Array.from(text.matchAll(/\p{L}\p{M}*/gu), ([letter]) => letter)
}

/**
 * Split a text into the units one pick reads.
 *
 * @param text - Any text.
 * @param unit - Lines end at a line break, words at whitespace, sentences after `.`, `!`, `?` or
 * `…` and any closing quotes or brackets before whitespace, paragraphs at a blank line.
 * @returns {string[]} The units, empty ones included.
 */
function units(text: string, unit: 'line' | 'word' | 'sentence' | 'paragraph'): string[] {
  if (unit === 'line') return text.split(/\r\n|\n|\r/)
  if (unit === 'word') return text.split(/\s+/)
  if (unit === 'sentence') return text.split(/(?<=[.!?…]["'”’)\]]*)\s+/u)
  return text.split(/(?:\r\n|\n|\r)[^\S\r\n]*(?:\r\n|\n|\r)\s*/)
}

/**
 * The letter at a position counted from either end.
 *
 * @param row - Letters of one unit.
 * @param position - 1 for the first, -1 for the last.
 * @returns {string} The letter, or nothing when the unit is too short.
 */
function letterAt(row: readonly string[], position: number): string {
  return row.at(position > 0 ? position - 1 : position) ?? ''
}

/**
 * Check an option that has to be a whole number of at least `minimum`.
 *
 * @param name - Option name for the error.
 * @param value - The value, when given.
 * @param minimum - Smallest allowed value.
 * @throws {InvalidOptionError} When it isn't.
 */
function assertCount(name: string, value: number | undefined, minimum: number): void {
  if (value !== undefined && (!Number.isInteger(value) || value < minimum)) {
    throw new InvalidOptionError(name, value, `must be an integer of at least ${minimum}`)
  }
}

/**
 * Refuse an unknown pick and an option the pick does not take.
 *
 * @param options - The reading to check.
 * @throws {InvalidOptionError} For an unknown pick or an option the pick ignores.
 */
function assertPick(options: Readonly<HiddenTextOptions>): void {
  if (!Object.hasOwn(pickOptions, options.pick)) {
    throw new InvalidOptionError('pick', options.pick, `must be ${hiddenTextPicks.join(', ')}`)
  }
  const taken = pickOptions[options.pick]
  for (const name of ['letter', 'every', 'start', 'direction'] as const) {
    if (options[name] !== undefined && !taken.includes(name)) {
      throw new InvalidOptionError(name, options[name], `does not apply to pick ${options.pick}`)
    }
  }
}

/**
 * Refuse an option the pick does not take and values outside each option's range.
 *
 * @param options - The reading to check.
 * @throws {InvalidOptionError} For an unknown pick, an option the pick ignores or a bad value.
 * @throws {MissingOptionError} When an every pick has no `every`.
 */
function assertOptions(options: Readonly<HiddenTextOptions>): void {
  assertPick(options)
  const { letter, direction } = options
  if (letter !== undefined && (!Number.isInteger(letter) || letter === 0)) {
    throw new InvalidOptionError('letter', letter, 'must be a nonzero integer')
  }
  if (EVERY_PICKS.has(options.pick) && options.every === undefined) {
    throw new MissingOptionError('every')
  }
  assertCount('every', options.every, 1)
  assertCount('start', options.start, 1)
  if (direction !== undefined && direction !== 'down-right' && direction !== 'down-left') {
    throw new InvalidOptionError('direction', direction, 'must be down-right or down-left')
  }
}

/**
 * Every `every`th entry from the `start`th on.
 *
 * @param entries - Letters or words.
 * @param every - The step.
 * @param start - Position of the first entry taken, from 1.
 * @returns {string[]} The entries taken.
 */
function stepThrough(entries: readonly string[], every: number, start: number): string[] {
  return entries.filter((_, index) => index >= start - 1 && (index - start + 1) % every === 0)
}

/**
 * The letters down a diagonal of the lines that have letters: the `start`th letter of the first,
 * the next of the second and so on, counted from the end of each line for `down-left`. A line
 * too short for its letter gives nothing.
 *
 * @param text - Lines of text.
 * @param start - Letter of the first line, from 1.
 * @param direction - Which end of the lines the letters count from.
 * @returns {string} The letters joined.
 */
function diagonal(text: string, start: number, direction: HiddenTextDirection): string {
  const rows = units(text, 'line')
    .map((line) => letters(line))
    .filter((row) => row.length > 0)
  const sign = direction === 'down-right' ? 1 : -1
  return rows.map((row, index) => letterAt(row, sign * (start + index))).join('')
}

/**
 * Read the letters or words at the positions `options` names. Letters are any Unicode letter with
 * its combining marks, so punctuation, digits and spaces are never picked and never counted.
 *
 * @param text - Text that may hide a message.
 * @param options - Where the message sits.
 * @returns {string} The picked letters joined, or the picked words joined by spaces.
 * @throws {InvalidOptionError} For an unknown pick, an option the pick ignores or a bad value.
 * @throws {MissingOptionError} When `every-letter` or `every-word` has no `every`.
 */
export function readHiddenText(text: string, options: Readonly<HiddenTextOptions>): string {
  assertOptions(options)
  const { pick } = options
  if (pick === 'every-word') {
    const words = text.split(/\s+/).filter((word) => word !== '')
    return stepThrough(words, options.every!, options.start ?? 1).join(' ')
  }
  if (pick === 'every-letter') {
    return stepThrough(letters(text), options.every!, options.start ?? 1).join('')
  }
  if (pick === 'diagonal') {
    return diagonal(text, options.start ?? 1, options.direction ?? 'down-right')
  }
  const position = options.letter ?? 1
  return units(text, pick)
    .map((unit) => letterAt(letters(unit), position))
    .join('')
}

/**
 * The readings `rankHiddenText` tries, simplest first, so a repeat keeps the simpler name.
 *
 * @returns {HiddenTextOptions[]} First, second and last letter of each unit, both diagonals,
 * then every nth letter from each start for n up to `MAX_RANKED_EVERY`.
 */
function rankedReadings(): HiddenTextOptions[] {
  const readings: HiddenTextOptions[] = []
  for (const pick of UNIT_PICKS) {
    for (const letter of [1, 2, -1]) readings.push({ pick, letter })
  }
  readings.push(
    { pick: 'diagonal', direction: 'down-right' },
    { pick: 'diagonal', direction: 'down-left' },
  )
  for (let every = 2; every <= MAX_RANKED_EVERY; every++) {
    for (let start = 1; start <= every; start++)
      readings.push({ pick: 'every-letter', every, start })
  }
  return readings
}

/**
 * Try the usual hiding places and rank the readings by how much they look like the language: by
 * the lift of letter pairs for English, by single letters for Polish and Japanese romaji, where a
 * sample of running text fits as well as a message, so the ranking says less. Every nth word is not tried, since words taken from a text
 * read as the language whether they hide anything or not.
 *
 * @param text - Text that may hide a message.
 * @param language - Language the message reads in.
 * @returns {HiddenTextRanking} Readings with at least `MIN_RANKED_LETTERS` A-Z letters, each text
 * once, best fit first.
 * @throws {InvalidOptionError} For a language without a table.
 */
export function rankHiddenText(
  text: string,
  language: FrequencyLanguage = 'en',
): HiddenTextRanking {
  assertLanguage(language)
  const readings = rankedReadings()
  const seen = new Set<string>()
  const candidates: HiddenTextCandidate[] = []
  for (const options of readings) {
    const reading = readHiddenText(text, options)
    if (seen.has(reading)) continue
    seen.add(reading)
    const analysis = analyzeFrequency(reading, language)
    if (analysis === undefined || analysis.total < MIN_RANKED_LETTERS) continue
    const lift = meanPairLift(reading, language)
    candidates.push({
      options,
      text: reading,
      score: lift ?? analysis.fit,
      lift: lift !== undefined,
    })
  }
  candidates.sort((left, right) => right.score - left.score)
  return { language, tried: readings.length, candidates }
}
