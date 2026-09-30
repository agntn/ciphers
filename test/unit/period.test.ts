import { describe, expect, it } from 'vite-plus/test'
import { InvalidOptionError } from '../../src/core/errors.ts'
import { DEFAULT_MAX_PERIOD, estimatePeriod } from '../../src/core/period.ts'
import { create } from '../../src/core/registry.ts'
import { OPTION_DESCRIPTIONS } from '../../src/tool-operations.ts'

/** Stinson, Cryptography: Theory and Practice (1995), Example 1.11, keyword JANET. */
const STINSON =
  'CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBWRVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWIAKLXFPSKAUTEMNDCMGTSXMXBTUIADNGMGPSRELXNJELXVRVPRTULHDNQWTWDTYGBPHXTFALJHASVBFXNGLLCHRZBWELEKMSJIKNBHWRJGNMGJSGLXFEYPHAGNRBIEQJTAMRVLCRREMNDGLXRRIMGNSNRWCHRQHAEYEVTAQEBBIPEEWEVKAKOEWADREMXMTBHHCHRTKDNVRZCHRCLQOHPWQAIIWXNRMGWOIIFKEE'

/** Stinson's column indices of coincidence for m = 2 to 5, three decimals each. */
const STINSON_COLUMNS: Record<number, readonly number[]> = {
  2: [0.046, 0.041],
  3: [0.043, 0.05, 0.047],
  4: [0.042, 0.039, 0.046, 0.04],
  5: [0.063, 0.068, 0.069, 0.061, 0.072],
}

describe('estimatePeriod', () => {
  it("finds Stinson's keyword length and keyword", () => {
    const analysis = estimatePeriod(STINSON)
    expect(analysis.total).toBe(313)
    expect(analysis.periods[0]).toMatchObject({ period: 5, key: 'JANET' })
    expect(create('vigenere').decode(STINSON, { key: 'JANET' }).text).toMatch(
      /^THEALMONDTREEWASINTENTATIVEBLOSSOM/,
    )
    expect(analysis.factors[0]).toEqual({ factor: 5, distances: 10 })
  })

  it('averages the column IoC Stinson lists for each m', () => {
    const { periods } = estimatePeriod(STINSON)
    for (const [period, columns] of Object.entries(STINSON_COLUMNS)) {
      const mean = columns.reduce((sum, ic) => sum + ic, 0) / columns.length
      const found = periods.find((candidate) => candidate.period === Number(period))!
      expect(Math.abs(found.ic - mean), `m=${period}`).toBeLessThan(0.0005)
    }
  })

  it('ranks each multiple of a length right behind it, the key only on the top three', () => {
    const { periods } = estimatePeriod(STINSON)
    expect(periods.slice(0, 4).map(({ period }) => period)).toEqual([5, 10, 15, 20])
    expect(periods.filter(({ key }) => key !== undefined)).toHaveLength(3)
    expect(periods.map(({ period }) => period).sort((left, right) => left - right)).toEqual(
      Array.from({ length: 19 }, (_, index) => index + 2),
    )
  })

  it('reads only the letters Vigenère shifts', () => {
    const spaced = STINSON.replaceAll(/(.{7})/g, '$1 ,1é\n').toLowerCase()
    expect(estimatePeriod(spaced)).toEqual(estimatePeriod(STINSON))
  })

  it('stops at the longest length and at half the letters', () => {
    expect(estimatePeriod(STINSON, 'en', 4).periods.map(({ period }) => period)).toEqual([3, 2, 4])
    expect(
      estimatePeriod(STINSON, 'en', 4)
        .factors.map(({ factor }) => factor)
        .sort((left, right) => left - right),
    ).toEqual([2, 3, 4])
    expect(
      estimatePeriod('ABCDEFGHI')
        .periods.map(({ period }) => period)
        .sort((left, right) => left - right),
    ).toEqual([2, 3, 4])
  })

  it('returns no lengths below four letters', () => {
    expect(estimatePeriod('ab c')).toMatchObject({
      total: 3,
      periods: [],
      distances: 0,
      factors: [],
    })
    expect(estimatePeriod('')).toMatchObject({ total: 0, periods: [] })
  })

  it('tells the tools the default it uses', () => {
    expect(OPTION_DESCRIPTIONS.maxPeriod).toContain(`(default ${DEFAULT_MAX_PERIOD})`)
  })

  it('refuses an unknown language and a length below 2', () => {
    expect(() => estimatePeriod(STINSON, 'de' as 'en')).toThrow(InvalidOptionError)
    expect(() => estimatePeriod(STINSON, 'en', 1)).toThrow('Invalid option maxPeriod=1')
    expect(() => estimatePeriod(STINSON, 'en', 2.5)).toThrow(InvalidOptionError)
  })
})
