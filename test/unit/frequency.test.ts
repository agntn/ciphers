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
    })
  })

  it('uses the Polish reference order', () => {
    expect(analyzeFrequency('ABC', 'pl')?.reference).toBe('AIOEZNSWRCYTKLDPMJUBGFHV')
  })

  it('returns undefined without A-Z letters', () => {
    expect(analyzeFrequency('123!?')).toBeUndefined()
  })
})
