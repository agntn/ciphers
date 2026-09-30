import { styleText } from 'node:util'
import { defineCommand } from 'citty'
import consola from 'consola'
import { InvalidOptionError } from '../core/errors.ts'
import { DEFAULT_MAX_PERIOD, estimatePeriod, type PeriodAnalysis } from '../core/period.ts'

/**
 * Read `--max-period`, the default when it's left out.
 *
 * @param raw - The flag as typed.
 * @returns {number} The longest key length to try.
 * @throws {InvalidOptionError} When it isn't a whole number of at least 2.
 */
function parseMaxPeriod(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_MAX_PERIOD
  const maxPeriod = Number(raw)
  if (!/^\d+$/.test(raw) || maxPeriod < 2) {
    throw new InvalidOptionError('max-period', raw, 'must be an integer of at least 2')
  }
  return maxPeriod
}

/**
 * Print the ten likeliest key lengths, the Kasiski factors and the decode to run next.
 *
 * @param analysis - A result with at least one key length.
 */
function printAnalysis(analysis: PeriodAnalysis): void {
  consola.info(
    `${styleText('bold', 'Key length estimate')} (${analysis.total} letters, lang=${analysis.language}), most likely first:\n`,
  )
  const width = String(Math.max(...analysis.periods.map(({ period }) => period))).length
  for (const { period, ic, key } of analysis.periods.slice(0, 10)) {
    const keyText = key === undefined ? '' : `  key ${styleText('bold', key)}`
    consola.log(`  length ${String(period).padStart(width)}  IoC ${ic.toFixed(4)}${keyText}`)
  }
  consola.log('')
  consola.info(
    `${analysis.language} plaintext ~${analysis.referenceIc.toFixed(3)} per column, uniform random ~0.038`,
  )
  const factors = analysis.factors
    .filter(({ distances }) => distances > 0)
    .slice(0, 5)
    .map(({ factor, distances }) => `${factor} (${distances})`)
  consola.info(
    analysis.distances === 0
      ? 'Kasiski: no trigram repeats'
      : `Kasiski: ${analysis.distances} trigram distances, most divided by ${factors.join(', ')}`,
  )
  consola.info(`Next: ciphers decode vigenere "<text>" --key ${analysis.periods[0]!.key}`)
}

export default defineCommand({
  meta: {
    name: 'period',
    description: 'Estimate the Vigenère key length (column IoC and Kasiski, most likely first)',
  },
  args: {
    text: { type: 'positional', description: 'Ciphertext to analyze', required: true },
    lang: {
      type: 'string',
      description: 'Language the plaintext reads in (en, pl, ja for Hepburn romaji)',
      alias: 'l',
      default: 'en',
    },
    maxPeriod: {
      type: 'string',
      description: `Longest key length to try (default ${DEFAULT_MAX_PERIOD})`,
    },
  },
  async run({ args }) {
    if (args.lang !== 'en' && args.lang !== 'pl' && args.lang !== 'ja') {
      throw new InvalidOptionError('lang', args.lang, 'must be en, pl or ja')
    }
    const analysis = estimatePeriod(args.text, args.lang, parseMaxPeriod(args.maxPeriod))
    if (analysis.total === 0) {
      consola.warn('No letters found in input')
      return
    }
    if (analysis.periods.length === 0) {
      consola.warn(`Need at least 4 letters for a key length, got ${analysis.total}`)
      return
    }
    printAnalysis(analysis)
  },
})
