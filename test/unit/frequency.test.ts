import { describe, expect, it } from 'vite-plus/test'
import { InvalidOptionError } from '../../src/core/errors.ts'
import { analyzeFrequency } from '../../src/core/frequency.ts'

describe('analyzeFrequency', () => {
  it('normalizes input and sorts counts descending', () => {
    const { fit, referenceIc, ...analysis } = analyzeFrequency('AaA, bb! c')!
    expect(fit).toBeLessThan(0)
    expect(referenceIc).toBeGreaterThan(0)
    expect(analysis).toEqual({
      total: 6,
      language: 'en',
      counts: [
        ['A', 3],
        ['B', 2],
        ['C', 1],
      ],
      reference: 'ETAOINSHRDLCUMWFGYPBVKJXQZ',
      ic: 8 / 30,
    })
  })

  it('scores letters by their log probability in the language', () => {
    // Wikipedia's English table sums to 100.154 percent, E takes 12.7 of it.
    expect(analyzeFrequency('eee')?.fit).toBeCloseTo(Math.log(12.7 / 100.154), 12)
    // PWN's Polish base letters sum to 93.09 percent, A takes 8.91 of it.
    expect(analyzeFrequency('a', 'pl')?.fit).toBeCloseTo(Math.log(8.91 / 93.09), 12)
    // The Hepburn table sums to 100.04481024 percent, A takes 15.2 of it.
    expect(analyzeFrequency('a', 'ja')?.fit).toBeCloseTo(Math.log(15.2 / 100.04481024), 12)
  })

  it('keeps letters Hepburn never writes finite', () => {
    const fit = analyzeFrequency('LQVX', 'ja')!.fit
    expect(Number.isFinite(fit)).toBe(true)
    expect(fit).toBeLessThan(analyzeFrequency('ZJFP', 'ja')!.fit)
  })

  it('fits a sentence closer to its own language', () => {
    const english = 'DEFEND THE EAST WALL OF THE CASTLE'
    const polish = 'LITWO OJCZYZNO MOJA TY JESTES JAK ZDROWIE'
    expect(analyzeFrequency(english, 'en')!.fit).toBeGreaterThan(
      analyzeFrequency(english.replaceAll(/[A-Z]/g, 'Q'), 'en')!.fit,
    )
    expect(analyzeFrequency(polish, 'pl')!.fit).toBeGreaterThan(
      analyzeFrequency(english, 'pl')!.fit,
    )
    expect(analyzeFrequency(english, 'en')!.fit).toBeGreaterThan(
      analyzeFrequency(polish, 'en')!.fit,
    )
    const japanese =
      'KIMIGAYO WA CHIYO NI YACHIYO NI SAZAREISHI NO IWAO TO NARITE KOKE NO MUSU MADE'
    expect(analyzeFrequency(japanese, 'ja')!.fit).toBeGreaterThan(
      analyzeFrequency(english, 'ja')!.fit,
    )
    expect(analyzeFrequency(japanese, 'ja')!.fit).toBeGreaterThan(
      analyzeFrequency(polish, 'ja')!.fit,
    )
  })

  it('computes the index of coincidence from letter pairs', () => {
    expect(analyzeFrequency('AAAA')?.ic).toBe(1)
    expect(analyzeFrequency('ABCDEFGHIJKLMNOPQRSTUVWXYZ')?.ic).toBe(0)
    expect(analyzeFrequency('A')?.ic).toBeUndefined()
  })

  it('expects the index of coincidence each language measures', () => {
    // Pride and Prejudice and Frankenstein measure 0.0654 and 0.0658 here, Pan Tadeusz and
    // Lalka 0.0579 and 0.0582: 450-character windows of them spread about 0.004 to either side.
    const english = analyzeFrequency('ABC', 'en')!.referenceIc
    const polish = analyzeFrequency('ABC', 'pl')!.referenceIc
    expect(english).toBeGreaterThan(0.064)
    expect(english).toBeLessThan(0.067)
    expect(polish).toBeGreaterThan(0.056)
    expect(polish).toBeLessThan(0.059)
    // Kana alone give 0.088. Kokoro and Rashomon in Hepburn measure 0.082, their 450-character
    // windows 0.075 to 0.089: kanji readings bring more u, s and h than the kana table counts.
    const japanese = analyzeFrequency('ABC', 'ja')!.referenceIc
    expect(japanese).toBeGreaterThan(0.087)
    expect(japanese).toBeLessThan(0.09)
  })

  it('uses the Polish reference order', () => {
    expect(analyzeFrequency('ABC', 'pl')?.reference).toBe('AIOEZNRWSTCYKDPMUJLBGHFQVX')
  })

  it('uses the Japanese reference order', () => {
    expect(analyzeFrequency('ABC', 'ja')?.reference).toBe('AONITERUHSKDMGYBWCZJFPLQVX')
  })

  it('ranks every A-Z letter once in each reference', () => {
    for (const language of ['en', 'pl', 'ja'] as const) {
      const reference = analyzeFrequency('ABC', language)?.reference ?? ''
      expect(reference.split('').sort().join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    }
  })

  it('rejects a language it has no table for', () => {
    for (const language of ['de', 'toString']) {
      expect(() => analyzeFrequency('ABC', language as 'en')).toThrow(InvalidOptionError)
    }
  })

  it('returns undefined without A-Z letters', () => {
    expect(analyzeFrequency('123!?')).toBeUndefined()
  })
})
