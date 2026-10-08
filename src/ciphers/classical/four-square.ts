import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'
import { buildPolybiusSquare, upperCase } from '../../core/utils.ts'

/** The letter that fills a short last pair. */
const PADDING = 'X'

/** The plain square, A-Z without J, row by row. */
const PLAIN = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'

/**
 * A keyed square as its 25 letters row by row, built as Playfair builds its table.
 *
 * @param key - Keyword.
 * @returns {string} 25 letters, J left out.
 */
function keyedSquare(key: string): string {
  return buildPolybiusSquare(key).square.flat().join('')
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
 * The letters of the text, J as I, cut into pairs; encoding pads a short last pair with X.
 *
 * @param text - Plaintext or ciphertext.
 * @param operation - Only `encode` pads.
 * @returns {string[]} Pairs of letters from the 25-letter alphabet.
 * @throws {CipherError} On ciphertext with an odd number of letters.
 */
function pairs(text: string, operation: 'encode' | 'decode'): string[] {
  let letters = upperCase(text)
    .replaceAll(/[^A-Z]/g, '')
    .replaceAll('J', 'I')
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
    const plainSquares = [PLAIN, PLAIN] as const
    const keyedSquares = [keyedSquare(key), keyedSquare(secondKey)] as const
    const [from, to] =
      operation === 'encode' ? [plainSquares, keyedSquares] : [keyedSquares, plainSquares]
    const output = pairs(text, operation)
      .map((pair) => corners(pair, from, to))
      .join('')
    return { text: output, cipher: 'four-square', operation, options: { key, secondKey } }
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
        "Digraph substitution: Delastelle's two plain and two keyed 5×5 squares, each pair read across the corners (I/J share a cell)",
      category: 'classical',
      family: 'digraph',
      selfInverse: false,
      worksOn: 'A-Z in pairs, J as I, X pads an odd length, the rest dropped',
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
