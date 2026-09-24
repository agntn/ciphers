import { InvalidOptionError } from './errors.ts'

/** Supported reference languages for letter-frequency analysis. */
export type FrequencyLanguage = 'en' | 'pl' | 'ja'

/** Letter counts and expected ordering for one normalized input. */
export interface FrequencyAnalysis {
  readonly total: number
  readonly language: FrequencyLanguage
  readonly counts: ReadonlyArray<readonly [character: string, count: number]>
  readonly reference: string
  /** Index of coincidence; absent when the input has fewer than two letters. */
  readonly ic?: number
  /** Index of coincidence of plaintext in `language`, from the same table as `reference`. */
  readonly referenceIc: number
  /**
   * Mean natural-log probability of one letter under the language's frequencies. The closer to
   * zero, the more the letters read like that language; compare it only between texts scored
   * against the same language.
   */
  readonly fit: number
}

/**
 * Percent of A-Z letters in running text: Wikipedia's letter frequency table for English, PWN's
 * count of the IPI PAN corpus for Polish, base letters only. Japanese is Hepburn romaji spelled
 * out from the hiragana counts of Chikamatsu et al. (2000, p. 499), a year of a newspaper: each
 * kana as the Foreign Ministry's passport table writes it, small ya/yu/yo joined to the i-row
 * kana before them, っ doubling a following k, s, t or p in proportion to how often those kana
 * occur. Kanji readings are not in it, and particles stay as their kana spell them (ha, he).
 * Hepburn never writes L, Q, V or X; each gets one occurrence out of the 39 million letters, so
 * a stray loanword lowers the fit instead of sinking it to minus infinity.
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
  ja: {
    A: 15.2,
    B: 0.503,
    C: 0.254,
    D: 3.18,
    E: 7.24,
    F: 0.0297,
    G: 2.51,
    H: 5.12,
    I: 9.92,
    J: 0.146,
    K: 4.14,
    L: 0.00000256,
    M: 2.61,
    N: 10.2,
    O: 13.4,
    P: 0.0241,
    Q: 0.00000256,
    R: 5.63,
    S: 4.98,
    T: 8.03,
    U: 5.53,
    V: 0.00000256,
    W: 0.315,
    X: 0.00000256,
    Y: 0.839,
    Z: 0.244,
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

/**
 * Chance that two letters drawn from plaintext match: the sum of squared letter probabilities.
 *
 * @param percentages - Percent of running text per letter.
 * @returns {number} The expected index of coincidence.
 */
function expectedCoincidence(percentages: Readonly<Record<string, number>>): number {
  const values = Object.values(percentages)
  const total = values.reduce((sum, percent) => sum + percent, 0)
  return values.reduce((sum, percent) => sum + (percent / total) ** 2, 0)
}

const frequencyReferences: Record<FrequencyLanguage, string> = {
  en: frequencyOrder(letterPercentages.en),
  pl: frequencyOrder(letterPercentages.pl),
  ja: frequencyOrder(letterPercentages.ja),
}

const referenceCoincidences: Record<FrequencyLanguage, number> = {
  en: expectedCoincidence(letterPercentages.en),
  pl: expectedCoincidence(letterPercentages.pl),
  ja: expectedCoincidence(letterPercentages.ja),
}

const letterLogProbabilities: Record<FrequencyLanguage, ReadonlyMap<string, number>> = {
  en: logProbabilities(letterPercentages.en),
  pl: logProbabilities(letterPercentages.pl),
  ja: logProbabilities(letterPercentages.ja),
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
    throw new InvalidOptionError('language', language, 'must be en, pl or ja')
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
    referenceIc: referenceCoincidences[language],
    fit: logProbability / total,
  }
}
