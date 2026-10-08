import type { CipherBaseOptions } from '../../core/types.ts'
import { CipherError, InvalidOptionError, MissingOptionError } from '../../core/errors.ts'
import { getOpt, upperCase } from '../../core/utils.ts'

/** The letter that fills a short last pair. */
const PADDING = 'X'

/** The letter the squares leave out: J folds into I, Q drops out. */
export type Omitted = 'j' | 'q'

/** The plain square for each omitted letter, row by row. */
export const PLAIN: Readonly<Record<Omitted, string>> = {
  j: 'ABCDEFGHIKLMNOPQRSTUVWXYZ',
  q: 'ABCDEFGHIJKLMNOPRSTUVWXYZ',
}

/**
 * Capital letters with the omitted one gone: J turns into I, Q vanishes.
 *
 * @param letters - Capitals A-Z.
 * @param omit - The letter the squares leave out.
 * @returns {string} Letters that all sit in a 25-letter square.
 */
function fold(letters: string, omit: Omitted): string {
  return omit === 'j' ? letters.replaceAll('J', 'I') : letters.replaceAll('Q', '')
}

/**
 * A keyed square as its 25 letters row by row, built as Playfair builds its table.
 *
 * @param key - Keyword.
 * @param omit - The letter the square leaves out.
 * @returns {string} The keyword's letters, repeats dropped, then the rest of the plain square.
 */
export function keyedSquare(key: string, omit: Omitted): string {
  const letters = fold(key.toUpperCase().replaceAll(/[^A-Z]/g, ''), omit)
  return [...new Set(letters + PLAIN[omit])].join('')
}

/**
 * The `omit` option, J unless it says Q.
 *
 * @param options - The call's options.
 * @returns {Omitted} The letter the squares leave out.
 * @throws {InvalidOptionError} On anything but `j` or `q`.
 */
export function omitted(options: Readonly<CipherBaseOptions>): Omitted {
  const omit = getOpt<unknown>(options, 'omit', 'j')
  if (omit !== 'j' && omit !== 'q') throw new InvalidOptionError('omit', omit, 'must be j or q')
  return omit
}

/**
 * One keyword option, read and checked.
 *
 * @param options - The call's options.
 * @param name - `key` or `secondKey`.
 * @returns {string} The keyword as given.
 * @throws {MissingOptionError} When it is absent or empty.
 * @throws {InvalidOptionError} When it is not a string or holds no ASCII letter.
 */
export function keyword(options: Readonly<CipherBaseOptions>, name: 'key' | 'secondKey'): string {
  const value = options[name]
  if (value === undefined || value === '') throw new MissingOptionError(name)
  if (typeof value !== 'string') throw new InvalidOptionError(name, value, 'must be a string')
  if (!/[A-Za-z]/.test(value)) {
    throw new InvalidOptionError(name, value, 'must contain at least one ASCII letter')
  }
  return value
}

/**
 * The letters of the text, folded into the squares, in pairs; encoding pads a short one with X.
 *
 * @param text - Plaintext or ciphertext.
 * @param operation - Only `encode` pads.
 * @param omit - The letter the squares leave out.
 * @param cipher - Name for the error.
 * @returns {string[]} Pairs of letters from the 25-letter alphabet.
 * @throws {CipherError} On ciphertext with an odd number of letters.
 */
export function pairs(
  text: string,
  operation: 'encode' | 'decode',
  omit: Omitted,
  cipher: string,
): string[] {
  let letters = fold(upperCase(text).replaceAll(/[^A-Z]/g, ''), omit)
  if (letters.length % 2 !== 0) {
    if (operation === 'decode') {
      throw new CipherError(
        `Invalid ${cipher} ciphertext: ${letters.length} letters don't split into pairs`,
      )
    }
    letters += PADDING
  }
  return letters.match(/../g) ?? []
}

/**
 * Reads one pair across the corners of the rectangle it spans.
 *
 * @param pair - Two letters.
 * @param from - Squares that hold the first and the second letter, 25 letters each.
 * @param to - Squares the first and the second letter of the result come from.
 * @returns {string} The first letter's row at the second's column, then the reverse.
 */
export function corners(
  pair: string,
  from: readonly [string, string],
  to: readonly [string, string],
): string {
  const first = from[0].indexOf(pair[0]!)
  const second = from[1].indexOf(pair[1]!)
  const [row1, column1] = [Math.floor(first / 5), first % 5]
  const [row2, column2] = [Math.floor(second / 5), second % 5]
  return to[0][row1 * 5 + column2]! + to[1][row2 * 5 + column1]!
}
