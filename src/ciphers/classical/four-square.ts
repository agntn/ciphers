import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'
import { getOpt, upperCase } from '../../core/utils.ts'

/** The letter that fills a short last pair. */
const PADDING = 'X'

/** The letter the squares leave out: J folds into I, Q drops out. */
type Omitted = 'j' | 'q'

/** The plain square for each omitted letter, row by row. */
const PLAIN: Readonly<Record<Omitted, string>> = {
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
function keyedSquare(key: string, omit: Omitted): string {
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
function omitted(options: Readonly<CipherBaseOptions>): Omitted {
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
function keyword(options: Readonly<CipherBaseOptions>, name: 'key' | 'secondKey'): string {
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
 * @returns {string[]} Pairs of letters from the 25-letter alphabet.
 * @throws {CipherError} On ciphertext with an odd number of letters.
 */
function pairs(text: string, operation: 'encode' | 'decode', omit: Omitted): string[] {
  let letters = fold(upperCase(text).replaceAll(/[^A-Z]/g, ''), omit)
  if (letters.length % 2 !== 0) {
    if (operation === 'decode') {
      throw new CipherError(
        `Invalid four-square ciphertext: ${letters.length} letters don't split into pairs`,
      )
    }
    letters += PADDING
  }
  return letters.match(/../g) ?? []
}

/**
 * Reads one pair across the corners: from the plain squares to the keyed ones, or back.
 *
 * @param pair - Two letters.
 * @param from - Squares that hold the first and the second letter, 25 letters each.
 * @param to - Squares the first and the second letter of the result come from.
 * @returns {string} The other two corners of the rectangle.
 */
function corners(
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

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const key = keyword(options, 'key')
    const secondKey = keyword(options, 'secondKey')
    const omit = omitted(options)
    const plainSquares = [PLAIN[omit], PLAIN[omit]] as const
    const keyedSquares = [keyedSquare(key, omit), keyedSquare(secondKey, omit)] as const
    const [from, to] =
      operation === 'encode' ? [plainSquares, keyedSquares] : [keyedSquares, plainSquares]
    const output = pairs(text, operation, omit)
      .map((pair) => corners(pair, from, to))
      .join('')
    return {
      text: output,
      cipher: 'four-square',
      operation,
      options: omit === 'q' ? { key, secondKey, omit } : { key, secondKey },
    }
  } catch (error) {
    throw normalizeError(error, 'four-square')
  }
}

export class FourSquare extends Cipher {
  name(): string {
    return 'four-square'
  }

  info(): CipherInfo {
    return {
      name: 'four-square',
      label: 'Four-square',
      description:
        "Digraph substitution: Delastelle's two plain and two keyed 5×5 squares, each pair read across the corners (I/J share a cell, or Q is left out)",
      category: 'classical',
      family: 'digraph',
      selfInverse: false,
      worksOn: 'A-Z in pairs, J as I (or Q dropped), X pads an odd length, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            'Keyword for the keyed square at the top right, which gives the first letter',
        },
        {
          name: 'secondKey',
          type: 'string',
          required: true,
          description:
            'Keyword for the keyed square at the bottom left, which gives the second letter',
        },
        {
          name: 'omit',
          type: 'string',
          required: false,
          default: 'j',
          description:
            'The letter the squares leave out: j folds J into I, q drops Q from squares and text as Wikipedia does',
        },
      ],
      keyspace: '(25!)² ≈ 2.4×10⁵⁰',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
