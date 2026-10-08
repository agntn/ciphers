import type { CipherBaseOptions, CipherInfo, CipherOption, CipherResult } from '../../core/types.ts'
import { getOpt } from '../../core/types.ts'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../../core/errors.ts'
import { processBaseOptions } from '../../core/utils.ts'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Which Quagmire, numbered as the ACA numbers its keyword plans. */
export type QuagmireType = 1 | 2 | 3 | 4

/** The plain alphabet on top of the tableau and the cipher alphabet it slides. */
type Alphabets = Readonly<{ plain: string; cipher: string }>

/**
 * The letters of one keyword option, upper case, everything else dropped.
 *
 * @param options - The call's options.
 * @param name - `key`, `secondKey` or `indicator`.
 * @returns {string} At least one letter from A to Z.
 * @throws {MissingOptionError} When it is absent or empty.
 * @throws {InvalidOptionError} When it is not a string or holds no ASCII letter.
 */
function letters(
  options: Readonly<CipherBaseOptions>,
  name: 'key' | 'secondKey' | 'indicator',
): string {
  const value = options[name]
  if (value === undefined || value === '') throw new MissingOptionError(name)
  if (typeof value !== 'string') throw new InvalidOptionError(name, value, 'must be a string')
  const upper = value.replaceAll(/[^A-Za-z]/g, '').toUpperCase()
  if (upper.length === 0) {
    throw new InvalidOptionError(name, value, 'must contain at least one ASCII letter')
  }
  return upper
}

/**
 * A keyword's letters with repeats dropped, then the rest of A-Z: the ACA's keyed alphabet.
 *
 * @param word - Letters from A to Z.
 * @returns {string} All 26 letters.
 */
function keyed(word: string): string {
  return [...new Set(`${word}${ALPHABET}`)].join('')
}

/**
 * The alphabets each type keys: plain for I, cipher for II, both for III, each its own for IV.
 *
 * @param type - Which Quagmire.
 * @param options - The call's options.
 * @returns {Alphabets} The plain and the cipher alphabet.
 */
function alphabets(type: QuagmireType, options: Readonly<CipherBaseOptions>): Alphabets {
  const key = keyed(letters(options, 'key'))
  if (type === 1) return { plain: key, cipher: ALPHABET }
  if (type === 2) return { plain: ALPHABET, cipher: key }
  if (type === 3) return { plain: key, cipher: key }
  return { plain: key, cipher: keyed(letters(options, 'secondKey')) }
}

/**
 * The `indicatorUnder` option: the plain letter the indicator keyword is written under.
 *
 * @param options - The call's options.
 * @returns {string} One letter from A to Z, A by default.
 * @throws {InvalidOptionError} On anything but one ASCII letter.
 */
function indicatorUnder(options: Readonly<CipherBaseOptions>): string {
  const value = getOpt<unknown>(options, 'indicatorUnder', 'A')
  if (typeof value !== 'string' || !/^[A-Za-z]$/.test(value)) {
    throw new InvalidOptionError('indicatorUnder', value, 'must be one letter from A to Z')
  }
  return value.toUpperCase()
}

/**
 * One letter through the row its indicator letter picks.
 *
 * @param letter - An upper case letter from A to Z.
 * @param shift - How far the cipher alphabet slides for this row.
 * @param tableau - The plain and the cipher alphabet.
 * @param operation - Plain to cipher, or back.
 * @returns {string} The other letter, upper case.
 */
function step(
  letter: string,
  shift: number,
  tableau: Alphabets,
  operation: 'encode' | 'decode',
): string {
  if (operation === 'encode') {
    return tableau.cipher[(tableau.plain.indexOf(letter) + shift) % 26]!
  }
  return tableau.plain[(tableau.cipher.indexOf(letter) - shift + 26) % 26]!
}

/**
 * Runs one Quagmire: each indicator letter, in turn, sets the cipher row for one letter of text.
 *
 * @param text - Plaintext or ciphertext.
 * @param operation - Which way the text goes.
 * @param type - Which Quagmire.
 * @param options - The call's options.
 * @returns {CipherResult} The text, with the options the call used.
 * @throws {CipherError} When an option is missing or malformed.
 */
export function quagmire(
  text: string,
  operation: 'encode' | 'decode',
  type: QuagmireType,
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  const name = `quagmire-${type}`
  try {
    const tableau = alphabets(type, options)
    const indicator = letters(options, 'indicator')
    const under = indicatorUnder(options)
    const shifts = Array.from(
      indicator,
      (letter) => (tableau.cipher.indexOf(letter) - tableau.plain.indexOf(under) + 26) % 26,
    )
    const { preserveCase, stripNonAlpha } = processBaseOptions(options)
    const input = stripNonAlpha ? text.replaceAll(/[^A-Za-z]/g, '') : text
    let position = 0
    const output = input.replaceAll(/[A-Za-z]/g, (character) => {
      const result = step(
        character.toUpperCase(),
        shifts[position++ % shifts.length]!,
        tableau,
        operation,
      )
      return preserveCase && character >= 'a' ? result.toLowerCase() : result
    })
    return {
      text: output,
      cipher: name,
      operation,
      options: {
        key: options.key,
        ...(type === 4 ? { secondKey: options.secondKey } : {}),
        indicator: options.indicator,
        indicatorUnder: under,
        preserveCase,
        stripNonAlpha,
      },
    }
  } catch (error) {
    throw normalizeError(error, name)
  }
}

const NUMERALS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' } as const

const DESCRIPTIONS = {
  1: 'a keyed plain alphabet against a straight cipher alphabet',
  2: 'a straight plain alphabet against a keyed cipher alphabet',
  3: 'one keyed alphabet on both sides',
  4: 'a keyed plain alphabet against a cipher alphabet keyed by a second keyword',
} as const

const KEY_DESCRIPTIONS = {
  1: 'Keyword for the plain alphabet, the rest of A-Z after it',
  2: 'Keyword for the cipher alphabet, the rest of A-Z after it',
  3: 'Keyword for both alphabets, the rest of A-Z after it',
  4: 'Keyword for the plain alphabet, the rest of A-Z after it',
} as const

/**
 * The options one Quagmire takes; only IV wants a second keyword.
 *
 * @param type - Which Quagmire.
 * @returns {CipherOption[]} The options, in the order `info()` lists them.
 */
function quagmireOptions(type: QuagmireType): CipherOption[] {
  return [
    { name: 'key', type: 'string', required: true, description: KEY_DESCRIPTIONS[type] },
    ...(type === 4
      ? [
          {
            name: 'secondKey',
            type: 'string' as const,
            required: true,
            description: 'Keyword for the cipher alphabet, the rest of A-Z after it',
          },
        ]
      : []),
    {
      name: 'indicator',
      type: 'string',
      required: true,
      description:
        'Indicator keyword, written down the column under indicatorUnder: each letter sets the cipher row for one letter of the text, in turn',
    },
    {
      name: 'indicatorUnder',
      type: 'string',
      required: false,
      default: 'A',
      description: 'The plain letter the indicator keyword stands under',
    },
  ]
}

/**
 * What `info()` says about one Quagmire.
 *
 * @param type - Which Quagmire.
 * @returns {CipherInfo} Its name, options and keyspace.
 */
export function quagmireInfo(type: QuagmireType): CipherInfo {
  return {
    name: `quagmire-${type}`,
    label: `Quagmire ${NUMERALS[type]}`,
    description: `ACA Quagmire ${NUMERALS[type]}: ${DESCRIPTIONS[type]}, slid row by row by an indicator keyword`,
    category: 'classical',
    family: 'polyalphabetic',
    selfInverse: false,
    worksOn: 'A-Z, the rest passes',
    options: quagmireOptions(type),
    keyspace: type === 4 ? '(26!)² × 26^indicatorLength' : '26! × 26^indicatorLength',
  }
}
