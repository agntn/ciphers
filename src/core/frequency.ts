/** Supported reference languages for letter-frequency analysis. */
export type FrequencyLanguage = 'en' | 'pl'

/** Letter counts and expected ordering for one normalized input. */
export interface FrequencyAnalysis {
  readonly total: number
  readonly language: FrequencyLanguage
  readonly counts: ReadonlyArray<readonly [character: string, count: number]>
  readonly reference: string
}

const frequencyReferences: Record<FrequencyLanguage, string> = {
  en: 'ETAOINSHRDLCUMWFGYPBVKJXQZ',
  pl: 'AIOEZNSWRCYTKLDPMJUBGFHV',
}

/** Analyze A-Z letter counts, returning undefined when the input has no Latin letters. */
export function analyzeFrequency(
  text: string,
  language: FrequencyLanguage = 'en',
): FrequencyAnalysis | undefined {
  const letters = text.toUpperCase().replace(/[^A-Z]/g, '')
  if (letters.length === 0) return undefined

  const frequencies = new Map<string, number>()
  for (const character of letters) {
    frequencies.set(character, (frequencies.get(character) ?? 0) + 1)
  }

  return {
    total: letters.length,
    language,
    counts: [...frequencies.entries()].sort((left, right) => right[1] - left[1]),
    reference: frequencyReferences[language],
  }
}
