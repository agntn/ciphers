import { defineCommand } from 'citty'
import consola from 'consola'

export default defineCommand({
  meta: { name: 'frequency', description: 'Frequency analysis of text' },
  args: {
    text: { type: 'positional', description: 'Text to analyze', required: true },
    lang: { type: 'string', description: 'Reference language (pl, en)', alias: 'l', default: 'en' },
  },
  async run({ args }) {
    const letters = args.text.toUpperCase().replace(/[^A-Z]/g, '')
    const total = letters.length
    if (total === 0) { consola.warn('No letters found in input'); return }

    const freq = new Map<string, number>()
    for (const c of letters) freq.set(c, (freq.get(c) ?? 0) + 1)

    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
    const maxCount = sorted[0][1]

    const langRef: Record<string, string> = {
      en: 'ETAOINSHRDLCUMWFGYPBVKJXQZ',
      pl: 'AIOEZNSWRCYTKLDPMJUŁBGFHĄŚŻÓĆĘŃŹ',
    }
    const ref = langRef[args.lang] ?? langRef.en

    consola.info(`\x1b[1mFrequency Analysis\x1b[0m (${total} letters, lang=${args.lang}):\n`)
    consola.info('  Letter | Count | Freq   | Bar')
    consola.info('  -------+-------+--------+' + '-'.repeat(30))
    for (const [char, count] of sorted) {
      const pct = ((count / total) * 100).toFixed(1).padStart(5)
      const bar = '█'.repeat(Math.ceil((count / maxCount) * 20))
      consola.log(`  ${char}      | ${String(count).padStart(5)} | ${pct}% | ${bar}`)
    }
    consola.info(`\n  Expected order (${args.lang}): ${ref.split('').join(' ')}`)
    consola.info(`  Actual order:   ${sorted.map(([c]) => c).join(' ')}`)
  },
})
