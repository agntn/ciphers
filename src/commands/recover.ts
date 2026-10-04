import { styleText } from 'node:util'
import { defineCommand } from 'citty'
import consola from 'consola'
import { InvalidOptionError } from '../core/errors.ts'
import {
  DEFAULT_COLUMNAR_KEY_LENGTH,
  DEFAULT_KEY_CANDIDATES,
  keyRecoveryCiphers,
  recoverKey,
  type KeyRecovery,
  type KeyRecoveryCipher,
} from '../core/recover.ts'

/** Characters a key line keeps below the top one. */
const PREVIEW_LENGTH = 80

/** The command that reads the text with a key, for each cipher; substitution has none. */
const nextCommands: Readonly<Record<KeyRecoveryCipher, string | undefined>> = {
  vigenere: 'ciphers decode vigenere',
  beaufort: 'ciphers decode beaufort',
  'variant-beaufort': 'ciphers encode vigenere',
  substitution: undefined,
  columnar: 'ciphers decode columnar',
}

/**
 * Read a whole number flag, nothing when it's left out.
 *
 * @param name - The flag, for the error.
 * @param raw - The flag as typed.
 * @returns {number | undefined} The number.
 * @throws {InvalidOptionError} When it isn't a whole number.
 */
function wholeNumber(name: string, raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  if (!/^\d+$/.test(raw)) throw new InvalidOptionError(name, raw, 'must be a whole number')
  return Number(raw)
}

/**
 * Read `--cipher`.
 *
 * @param raw - The flag as typed.
 * @returns {KeyRecoveryCipher} The cipher.
 * @throws {InvalidOptionError} When it is not one the search knows.
 */
function parseCipher(raw: string): KeyRecoveryCipher {
  const cipher = keyRecoveryCiphers.find((name) => name === raw.trim().toLowerCase())
  if (cipher === undefined) {
    throw new InvalidOptionError('cipher', raw, `must be one of ${keyRecoveryCiphers.join(', ')}`)
  }
  return cipher
}

/**
 * Print the keys, best first, and the command that reads the text with the top one.
 *
 * @param recovery - A result with at least one candidate.
 */
function printRecovery(recovery: Readonly<KeyRecovery>): void {
  const unit = recovery.scoredBy === 'quadgrams' ? 'quadgram' : 'letter'
  consola.info(
    `${styleText('bold', `${recovery.cipher} keys`)} (${recovery.letters} letters, lang=${recovery.language}), best first; ${recovery.language} plaintext ~${recovery.referenceFit.toFixed(2)} per ${unit}, random letters ~${recovery.randomFit.toFixed(2)}\n`,
  )
  recovery.candidates.forEach(({ key, fit, text }, index) => {
    const characters = Array.from(text)
    const shown =
      index > 0 && characters.length > PREVIEW_LENGTH
        ? `${characters.slice(0, PREVIEW_LENGTH).join('')}…`
        : text
    consola.log(`  ${index + 1}. key ${styleText('bold', key)}  fit ${fit.toFixed(2)}  ${shown}`)
  })
  consola.log('')
  const next = nextCommands[recovery.cipher]
  if (next === undefined) {
    consola.info('The key is the cipher letter of each plaintext letter A to Z, ? where unused')
    return
  }
  consola.info(`Next: ${next} "<text>" --key ${recovery.candidates[0]!.key}`)
}

export default defineCommand({
  meta: {
    name: 'recover',
    description:
      'Search for the key of a Vigenère, Beaufort, variant Beaufort, substitution or columnar text (best first)',
  },
  args: {
    text: { type: 'positional', description: 'Ciphertext to search a key for', required: true },
    cipher: {
      type: 'string',
      description: `Cipher it was encrypted with: ${keyRecoveryCiphers.join(', ')}`,
      alias: 'c',
      required: true,
    },
    period: {
      type: 'string',
      description: 'Key length of vigenere, beaufort or variant-beaufort (default: the likeliest)',
    },
    keyLength: {
      type: 'string',
      description: `Columnar key length (default: every length from 2 to ${DEFAULT_COLUMNAR_KEY_LENGTH})`,
    },
    lang: {
      type: 'string',
      description: 'Language the plaintext reads in (en, pl, ja for Hepburn romaji)',
      alias: 'l',
      default: 'en',
    },
    limit: { type: 'string', description: `Keys to print (default ${DEFAULT_KEY_CANDIDATES})` },
  },
  async run({ args }) {
    if (args.lang !== 'en' && args.lang !== 'pl' && args.lang !== 'ja') {
      throw new InvalidOptionError('lang', args.lang, 'must be en, pl or ja')
    }
    const period = wholeNumber('period', args.period)
    const keyLength = wholeNumber('key-length', args.keyLength)
    const limit = wholeNumber('limit', args.limit)
    const recovery = recoverKey(args.text, {
      cipher: parseCipher(args.cipher),
      language: args.lang,
      ...(period === undefined ? {} : { period }),
      ...(keyLength === undefined ? {} : { keyLength }),
      ...(limit === undefined ? {} : { limit }),
    })
    if (recovery.candidates.length === 0) {
      consola.warn(`${recovery.letters} letters are too few to search`)
      return
    }
    printRecovery(recovery)
  },
})
