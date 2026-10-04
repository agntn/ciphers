import { styleText } from 'node:util'
import { defineCommand } from 'citty'
import consola from 'consola'
import { InvalidOptionError, MissingOptionError } from '../core/errors.ts'
import {
  hiddenTextPicks,
  rankHiddenText,
  readHiddenText,
  type HiddenTextDirection,
  type HiddenTextOptions,
  type HiddenTextPick,
} from '../core/hidden-text.ts'
import { preview } from '../tool-operations.ts'

/**
 * Read a whole-number flag.
 *
 * @param name - Flag name for the error.
 * @param raw - The flag as typed, when given.
 * @returns {number | undefined} The number, or nothing when the flag is absent.
 * @throws {InvalidOptionError} When it isn't a whole number.
 */
function parseInteger(name: string, raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  if (!/^-?\d+$/.test(raw)) throw new InvalidOptionError(name, raw, 'must be an integer')
  return Number(raw)
}

/**
 * The flags that read one ranked candidate again.
 *
 * @param options - A reading of `rankHiddenText`.
 * @returns {string} `--pick ... --name value`.
 */
function flags(options: Readonly<HiddenTextOptions>): string {
  return Object.entries(options)
    .map(([name, value]) => `--${name} ${String(value)}`)
    .join(' ')
}

/**
 * Print the ten readings most like the language, with the flags that read each again; only the
 * top one is whole.
 *
 * @param text - Text that may hide a message.
 * @param language - Language the message reads in.
 */
function printRanking(text: string, language: 'en' | 'pl' | 'ja'): void {
  const { candidates, tried } = rankHiddenText(text, language)
  if (candidates.length === 0) {
    consola.warn('No reading has 5 or more A-Z letters')
    return
  }
  consola.info(
    `${styleText('bold', 'Hidden text')} (${tried} readings tried, lang=${language}), most like the language first:\n`,
  )
  candidates.slice(0, 10).forEach(({ options, text: reading, score, lift }, rank) => {
    const scored = lift ? `${score.toFixed(2).padStart(5)}  ` : ''
    const shown = rank === 0 ? reading : preview(reading)
    consola.log(`  ${scored}${styleText('bold', shown)}  ${styleText('dim', flags(options))}`)
  })
  consola.log('')
  consola.info(
    candidates[0]!.lift
      ? 'Above 0 the letter pairs read like English, near 0 or below like letters picked at random'
      : `${language} has no pair table, so the letters alone rank the readings: read past the top line`,
  )
}

export default defineCommand({
  meta: {
    name: 'hidden',
    description:
      'Read a message hidden by position (acrostics, every nth letter, diagonals); without --pick, rank the usual places',
  },
  args: {
    text: { type: 'positional', description: 'Text that may hide a message', required: true },
    pick: {
      type: 'string',
      description: `Where the message sits: ${hiddenTextPicks.join(', ')}`,
      alias: 'p',
    },
    letter: {
      type: 'string',
      description: 'Letter of each line, word, sentence or paragraph: 1 first (default), -1 last',
    },
    every: { type: 'string', description: 'Step for every-letter and every-word' },
    start: {
      type: 'string',
      description:
        'First letter or word taken, or letter of the first line for diagonal (default 1)',
    },
    direction: { type: 'string', description: 'Diagonal: down-right (default) or down-left' },
    lang: {
      type: 'string',
      description: 'Language the message reads in, for the ranking (en, pl, ja for Hepburn romaji)',
      alias: 'l',
    },
  },
  async run({ args }) {
    const options = {
      letter: parseInteger('letter', args.letter),
      every: parseInteger('every', args.every),
      start: parseInteger('start', args.start),
      direction: args.direction as HiddenTextDirection | undefined,
    }
    if (args.pick === undefined) {
      if (Object.values(options).some((value) => value !== undefined)) {
        throw new MissingOptionError('pick')
      }
      const lang = args.lang ?? 'en'
      if (lang !== 'en' && lang !== 'pl' && lang !== 'ja') {
        throw new InvalidOptionError('lang', lang, 'must be en, pl or ja')
      }
      printRanking(args.text, lang)
      return
    }
    if (args.lang !== undefined) {
      throw new InvalidOptionError(
        'lang',
        args.lang,
        'ranks the readings, so it does not apply with --pick',
      )
    }
    const reading = readHiddenText(args.text, { pick: args.pick as HiddenTextPick, ...options })
    if (reading === '') consola.warn('Nothing at those positions')
    else process.stdout.write(`${reading}\n`)
  },
})
