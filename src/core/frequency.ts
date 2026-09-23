import { InvalidOptionError } from './errors'

/** Supported reference languages for letter-frequency analysis. */
export type FrequencyLanguage = 'en' | 'pl'

/** Letter counts and expected ordering for one normalized input. */
export interface FrequencyAnalysis {
  readonly total: number
  readonly language: FrequencyLanguage
  readonly counts: ReadonlyArray<readonly [character: string, count: number]>
  readonly reference: string
  /** Index of coincidence; absent when the input has fewer than two letters. */
  readonly ic?: number
  /**
   * Mean natural-log probability of one letter under the language's frequencies. The closer to
   * zero, the more the letters read like that language; compare it only between texts scored
   * against the same language.
   */
  readonly fit: number
}

/**
 * Percent of A-Z letters in running text: Wikipedia's letter frequency table for English, PWN's
 * count of the IPI PAN corpus for Polish, base letters only.
 */
const letterPercentages: Record<FrequencyLanguage, Readonly<Record<string, number>>> = {
  en: {
    A: 8.2,
    B: 1.5,
    C: 2.8,
    D: 4.3,
    E: 12.7,
    F: 2.2,
    G: 2,
    H: 6.1,
    I: 7,
    J: 0.16,
    K: 0.77,
    L: 4,
    M: 2.4,
    N: 6.7,
    O: 7.5,
    P: 1.9,
    Q: 0.12,
    R: 6,
    S: 6.3,
    T: 9.1,
    U: 2.8,
    V: 0.98,
    W: 2.4,
    X: 0.15,
    Y: 2,
    Z: 0.074,
  },
  pl: {
    A: 8.91,
    B: 1.47,
    C: 3.96,
    D: 3.25,
    E: 7.66,
    F: 0.3,
    G: 1.42,
    H: 1.08,
    I: 8.21,
    J: 2.28,
    K: 3.51,
    L: 2.1,
    M: 2.8,
    N: 5.52,
    O: 7.75,
    P: 3.13,
    Q: 0.14,
    R: 4.69,
    S: 4.32,
    T: 3.98,
    U: 2.5,
    V: 0.04,
    W: 4.65,
    X: 0.02,
    Y: 3.76,
    Z: 5.64,
  },
}

/**
 * Order A-Z by frequency, most frequent first; letters that tie stay in alphabetical order.
 *
 * @param percentages - Percent of running text per letter.
 * @returns {string} All 26 letters, most frequent first.
 */
function frequencyOrder(percentages: Readonly<Record<string, number>>): string {
  return Object.keys(percentages)
    .sort((left, right) => percentages[right]! - percentages[left]!)
    .join('')
}

/**
 * Natural-log probability of each letter, from the percentages normalized to sum to one.
 *
 * @param percentages - Percent of running text per letter.
 * @returns {Map<string, number>} The log probability of every letter.
 */
function logProbabilities(percentages: Readonly<Record<string, number>>): Map<string, number> {
  const total = Object.values(percentages).reduce((sum, percent) => sum + percent, 0)
  return new Map(
    Object.entries(percentages).map(([letter, percent]) => [letter, Math.log(percent / total)]),
  )
}

const frequencyReferences: Record<FrequencyLanguage, string> = {
  en: frequencyOrder(letterPercentages.en),
  pl: frequencyOrder(letterPercentages.pl),
}

const letterLogProbabilities: Record<FrequencyLanguage, ReadonlyMap<string, number>> = {
  en: logProbabilities(letterPercentages.en),
  pl: logProbabilities(letterPercentages.pl),
}

/**
 * Analyze A-Z letter counts.
 *
 * @param text - Text to analyze.
 * @param language - Reference frequency table.
 * @returns {FrequencyAnalysis | undefined} The analysis, or `undefined` when no A-Z letters occur.
 * @throws {InvalidOptionError} When the language has no frequency table.
 */
export function analyzeFrequency(
  text: string,
  language: FrequencyLanguage = 'en',
): FrequencyAnalysis | undefined {
  if (!Object.hasOwn(letterPercentages, language)) {
    throw new InvalidOptionError('language', language, 'must be en or pl')
  }
  const letters = text.toUpperCase().replaceAll(/[^A-Z]/g, '')
  if (letters.length === 0) return undefined

  const frequencies = new Map<string, number>()
  for (const character of letters) {
    frequencies.set(character, (frequencies.get(character) ?? 0) + 1)
  }

  const total = letters.length
  const letterLogs = letterLogProbabilities[language]
  let coincidences = 0
  let logProbability = 0
  for (const [character, count] of frequencies) {
    coincidences += count * (count - 1)
    logProbability += count * letterLogs.get(character)!
  }

  return {
    total,
    language,
    counts: [...frequencies.entries()].sort((left, right) => right[1] - left[1]),
    reference: frequencyReferences[language],
    ...(total < 2 ? {} : { ic: coincidences / (total * (total - 1)) }),
    fit: logProbability / total,
  }
}
