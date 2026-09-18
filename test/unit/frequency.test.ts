import { describe, expect, it } from 'vite-plus/test'
import { analyzeFrequency } from '../../src/core/frequency'

describe('analyzeFrequency', () => {
  it('normalizes input and sorts counts descending', () => {
    expect(analyzeFrequency('AaA, bb! c')).toEqual({
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

  it('returns undefined without A-Z letters', () => {
    expect(analyzeFrequency('123!?')).toBeUndefined()
  })
})
