import { defineCommand } from 'citty'
import consola from 'consola'
import { analyzeFrequency } from '../core/frequency'

export default defineCommand({
  meta: { name: 'frequency', description: 'Frequency analysis of text' },
  args: {
    text: { type: 'positional', description: 'Text to analyze', required: true },
    lang: { type: 'string', description: 'Reference language (pl, en)', alias: 'l', default: 'en' },
  },
  async run({ args }) {
    const language = args.lang === 'pl' ? 'pl' : 'en'
    const analysis = analyzeFrequency(args.text, language)
    if (analysis === undefined) {
      consola.warn('No letters found in input')
      return
    }

    const maxCount = analysis.counts[0]![1]

    consola.info(
      `\x1b[1mFrequency Analysis\x1b[0m (${analysis.total} letters, lang=${analysis.language}):\n`,
    )
    consola.info('  Letter | Count | Freq   | Bar')
    consola.info('  -------+-------+--------+' + '-'.repeat(30))
    for (const [character, count] of analysis.counts) {
      const percentage = ((count / analysis.total) * 100).toFixed(1).padStart(5)
      const bar = '\u2588'.repeat(Math.ceil((count / maxCount) * 20))
      consola.log(`  ${character}      | ${String(count).padStart(5)} | ${percentage}% | ${bar}`)
    }
    consola.info(
      `\n  Expected order (${analysis.language}): ${analysis.reference.split('').join(' ')}`,
    )
    consola.info(`  Actual order:   ${analysis.counts.map(([character]) => character).join(' ')}`)
  },
})
