import { describe, expect, it } from 'vite-plus/test'
import { InvalidOptionError } from '../../src/core/errors'
import { analyzeFrequency } from '../../src/core/frequency'

describe('analyzeFrequency', () => {
  it('normalizes input and sorts counts descending', () => {
    const { fit, ...analysis } = analyzeFrequency('AaA, bb! c')!
    expect(fit).toBeLessThan(0)
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
  })

  it('computes the index of coincidence from letter pairs', () => {
    expect(analyzeFrequency('AAAA')?.ic).toBe(1)
    expect(analyzeFrequency('ABCDEFGHIJKLMNOPQRSTUVWXYZ')?.ic).toBe(0)
    expect(analyzeFrequency('A')?.ic).toBeUndefined()
  })

  it('uses the Polish reference order', () => {
    expect(analyzeFrequency('ABC', 'pl')?.reference).toBe('AIOEZNRWSTCYKDPMUJLBGHFQVX')
  })

  it('ranks every A-Z letter once in each reference', () => {
    for (const language of ['en', 'pl'] as const) {
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
