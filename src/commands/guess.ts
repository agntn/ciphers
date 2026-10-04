import { styleText } from 'node:util'
import { defineCommand } from 'citty'
import consola from 'consola'
import { InvalidOptionError } from '../core/errors.ts'
import { guessFamily, type FamilyCandidate } from '../core/guess.ts'
import { create } from '../core/registry.ts'

/**
 * The command to run next: the decode the first cipher needs, or the analysis before it.
 *
 * @param found - One candidate of `guessFamily`.
 * @returns {string} A `ciphers` command line.
 */
function nextCommand(found: FamilyCandidate): string {
  const [first] = found.ciphers
  if (first === 'vigenere') return 'ciphers recover "<text>" -c vigenere'
  if (first === 'caesar' && found.options === undefined) {
    return 'ciphers brute "<text>", or ciphers recover "<text>" -c substitution'
  }
  const flags = [
    ...Object.entries(found.options ?? {}).map(([name, value]) => `--${name} ${value}`),
    ...create(first!)
      .info()
      .options.filter(({ name, required }) => required && !Object.hasOwn(found.options ?? {}, name))
      .map(({ name }) => `--${name} <${name}>`),
  ]
  const decode = ['ciphers decode', first, '"<text>"', ...flags].join(' ')
  return first === 'rail-fence' ? `${decode}, or ciphers recover "<text>" -c columnar` : decode
}

export default defineCommand({
  meta: {
    name: 'guess',
    description: 'Guess the cipher family of a ciphertext (most likely first, with the next step)',
  },
  args: {
    text: { type: 'positional', description: 'Ciphertext to read', required: true },
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
    const guess = guessFamily(args.text, args.lang)
    const counted = `${guess.length} characters, ${guess.letters} letters`
    if (guess.candidates.length === 0) {
      consola.warn(`No family fits (${counted}): no known layout, too few letters for statistics`)
      return
    }
    const ic = guess.ic === undefined ? '' : `, IoC ${guess.ic.toFixed(4)}`
    consola.info(
      `${styleText('bold', 'Family guess')} (${counted}, lang=${guess.language}${ic}), most likely first:\n`,
    )
    guess.candidates.forEach((found, index) => {
      consola.log(
        `  ${index + 1}. ${styleText('bold', found.families.join(', '))} (${found.confidence}): ${found.ciphers.join(', ')}`,
      )
      consola.log(`     ${found.signal}`)
      consola.log(`     Next: ${nextCommand(found)}`)
    })
    consola.log('')
    consola.info('Candidates, not a verdict: only a decode that reads settles it')
  },
})
