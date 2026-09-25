import { defineCommand } from 'citty'
import consola from 'consola'
import { InvalidOptionError } from '../core/errors.ts'
import { analyzeFrequency } from '../core/frequency.ts'
import { create } from '../core/registry.ts'
import { rankCaesarShifts } from '../tool-operations.ts'

export default defineCommand({
  meta: {
    name: 'brute',
    description: 'Brute-force Caesar cipher (all 25 shifts, best letter fit to --lang first)',
  },
  args: {
    text: { type: 'positional', description: 'Ciphertext to brute-force', required: true },
    lang: {
      type: 'string',
      description: 'Language the plaintext reads in (en, pl, ja for Hepburn romaji)',
      alias: 'l',
      default: 'en',
    },
  },
  async run({ args }) {
    if (args.lang !== 'en' && args.lang !== 'pl' && args.lang !== 'ja') {
      throw new InvalidOptionError('lang', args.lang, 'must be en, pl or ja')
    }
    consola.info(`Caesar brute-force (25 shifts, best ${args.lang} fit first):\n`)
    for (const { shift, text } of rankCaesarShifts(
      { analyzeFrequency, create },
      args.text,
      args.lang,
    )) {
      consola.log(`  shift=\x1B[1m${String(shift).padStart(2)}\x1B[0m → ${text}`)
    }
  },
})
