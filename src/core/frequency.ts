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
}

const frequencyReferences: Record<FrequencyLanguage, string> = {
  en: 'ETAOINSHRDLCUMWFGYPBVKJXQZ',
  pl: 'AIOEZNSWRCYTKLDPMJUBGFHV',
}

/**
 * Analyze A-Z letter counts.
 *
 * @param text - Text to analyze.
 * @param language - Reference frequency table.
 * @returns {FrequencyAnalysis | undefined} The analysis, or `undefined` when no A-Z letters occur.
 */
export function analyzeFrequency(
  text: string,
  language: FrequencyLanguage = 'en',
): FrequencyAnalysis | undefined {
  const letters = text.toUpperCase().replaceAll(/[^A-Z]/g, '')
  if (letters.length === 0) return undefined

  const frequencies = new Map<string, number>()
  for (const character of letters) {
    frequencies.set(character, (frequencies.get(character) ?? 0) + 1)
  }

  const total = letters.length
  let coincidences = 0
  for (const count of frequencies.values()) coincidences += count * (count - 1)

  return {
    total,
    language,
    counts: [...frequencies.entries()].sort((left, right) => right[1] - left[1]),
    reference: frequencyReferences[language],
    ...(total < 2 ? {} : { ic: coincidences / (total * (total - 1)) }),
  }
}
