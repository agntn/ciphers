import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'

/** A to Z, A as 0, when no `alphabet` is given. */
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** The letter that fills a short last block, when the alphabet has it. */
const PADDING = 'X'

/** The symbols in order and the number each one stands for. */
interface Alphabet {
  readonly symbols: readonly string[]
  /** The number of one character, or nothing when the alphabet lacks it. */
  readonly numberOf: (character: string) => number | undefined
  /** How the key's length error names the symbols. */
  readonly label: string
}

/**
 * A character and its case partners that map straight back, so `a` finds `A` and `ı` never `I`.
 *
 * @param character - One code point.
 * @returns {string[]} The character, then its upper and lower case when they round trip.
 */
function spellings(character: string): string[] {
  const upper = character.toUpperCase()
  const lower = character.toLowerCase()
  return [
    character,
    ...(upper.toLowerCase() === character ? [upper] : []),
    ...(lower.toUpperCase() === character ? [lower] : []),
  ]
}

/**
 * The `alphabet` option checked and indexed: the first symbol is 0, the modulus is its length.
 *
 * @param alphabet - The option as passed.
 * @returns {Alphabet} The symbols with a lookup that also takes the other case.
 * @throws {InvalidOptionError} On anything but a string, under 2 symbols, whitespace or a repeat.
 */
function readAlphabet(alphabet: unknown): Alphabet {
  if (alphabet === undefined) return indexAlphabet(LATIN, 'letters A-Z')
  if (typeof alphabet !== 'string') {
    throw new InvalidOptionError('alphabet', alphabet, 'must be a string')
  }
  const symbols = Array.from(alphabet)
  if (symbols.length < 2) {
    throw new InvalidOptionError('alphabet', alphabet, 'must hold at least 2 symbols')
  }
  if (symbols.some((symbol) => /\s/u.test(symbol))) {
    throw new InvalidOptionError(
      'alphabet',
      alphabet,
      "can't hold whitespace, which decoding skips",
    )
  }
  const seen = new Set<string>()
  const repeated = symbols.find((symbol) => {
    if (seen.has(symbol)) return true
    seen.add(symbol)
    return false
  })
  if (repeated !== undefined) {
    throw new InvalidOptionError('alphabet', alphabet, `has ${repeated} twice`)
  }
  return indexAlphabet(alphabet, `of the alphabet's ${symbols.length} symbols`)
}

/**
 * Numbers the symbols of a checked alphabet.
 *
 * @param alphabet - Distinct symbols without whitespace.
 * @param label - How errors name the symbols.
 * @returns {Alphabet} The lookup.
 */
function indexAlphabet(alphabet: string, label: string): Alphabet {
  const symbols = Array.from(alphabet)
  const numbers = new Map(symbols.map((symbol, index) => [symbol, index]))
  return {
    symbols,
    label,
    numberOf: (character) => {
      for (const spelling of spellings(character)) {
        const number = numbers.get(spelling)
        if (number !== undefined) return number
      }
      return undefined
    },
  }
}

/**
 * `value` brought into 0 to `modulus` - 1, negatives included.
 *
 * @param value - Any integer.
 * @param modulus - The alphabet length.
 * @returns {number} The remainder.
 */
function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

/**
 * The matrix without one row and one column.
 *
 * @param matrix - Square rows.
 * @param row - Row to drop.
 * @param column - Column to drop.
 * @returns {number[][]} One size smaller.
 */
function minor(matrix: readonly (readonly number[])[], row: number, column: number): number[][] {
  return matrix
    .filter((_, index) => index !== row)
    .map((cells) => cells.filter((_, index) => index !== column))
}

/**
 * Determinant by cofactors, reduced at every step so no product passes the modulus squared.
 *
 * @param matrix - 1×1 to 3×3 rows of numbers 0 to `modulus` - 1.
 * @param modulus - The alphabet length.
 * @returns {number} The determinant, 0 to `modulus` - 1.
 */
function determinant(matrix: readonly (readonly number[])[], modulus: number): number {
  if (matrix.length === 1) return matrix[0]![0]!
  let sum = 0
  matrix[0]!.forEach((entry, column) => {
    const term = mod(entry * determinant(minor(matrix, 0, column), modulus), modulus)
    sum = mod(column % 2 === 0 ? sum + term : sum - term, modulus)
  })
  return sum
}

/**
 * Inverse of `value` modulo `modulus`, or nothing when they share a factor.
 *
 * @param value - Number 0 to `modulus` - 1.
 * @param modulus - The alphabet length.
 * @returns {number | undefined} The inverse.
 */
function inverse(value: number, modulus: number): number | undefined {
  for (let candidate = 1; candidate < modulus; candidate++) {
    if ((value * candidate) % modulus === 1) return candidate
  }
  return undefined
}

/**
 * The key as a matrix read row by row in the alphabet, inverted for decoding.
 *
 * @param key - 4 or 9 symbols of the alphabet.
 * @param alphabet - The symbols and their numbers.
 * @param operation - `decode` takes the inverse matrix.
 * @returns {number[][]} 2×2 or 3×3 rows modulo the alphabet length.
 * @throws {InvalidOptionError} On a wrong length, a stray symbol or a determinant with no inverse.
 */
function keyMatrix(key: string, alphabet: Alphabet, operation: 'encode' | 'decode'): number[][] {
  const modulus = alphabet.symbols.length
  const characters = Array.from(key)
  if (characters.length !== 4 && characters.length !== 9) {
    throw new InvalidOptionError(
      'key',
      key,
      `must be 4 or 9 ${alphabet.label} (a 2×2 or 3×3 matrix)`,
    )
  }
  const values = characters.map((character) => {
    const value = alphabet.numberOf(character)
    if (value === undefined) {
      throw new InvalidOptionError('key', key, `has ${character}, which isn't in the alphabet`)
    }
    return value
  })
  const size = characters.length === 4 ? 2 : 3
  const matrix = Array.from({ length: size }, (_, row) =>
    values.slice(row * size, row * size + size),
  )
  const det = determinant(matrix, modulus)
  const detInverse = inverse(det, modulus)
  if (detInverse === undefined) {
    throw new InvalidOptionError(
      'key',
      key,
      `has determinant ${det} mod ${modulus}, which shares a factor with ${modulus}, so nothing it encodes could be decoded`,
    )
  }
  if (operation === 'encode') return matrix
  return matrix.map((_, row) =>
    matrix.map((__, column) => {
      const sign = (row + column) % 2 === 0 ? 1 : -1
      return mod(sign * determinant(minor(matrix, column, row), modulus) * detInverse, modulus)
    }),
  )
}

/**
 * The plaintext as numbers: symbols outside the alphabet drop out, a short last block gets padded.
 *
 * @param text - Plaintext.
 * @param size - Block length, 2 or 3.
 * @param alphabet - The symbols and their numbers.
 * @returns {number[]} Whole blocks.
 */
function plainNumbers(text: string, size: number, alphabet: Alphabet): number[] {
  const numbers = Array.from(text, (character) => alphabet.numberOf(character)).filter(
    (value) => value !== undefined,
  )
  const padding = alphabet.numberOf(PADDING) ?? alphabet.symbols.length - 1
  while (numbers.length % size !== 0) numbers.push(padding)
  return numbers
}

/**
 * The ciphertext as numbers. Whitespace drops out, anything else outside the alphabet is refused.
 *
 * @param text - Ciphertext.
 * @param size - Block length, 2 or 3.
 * @param alphabet - The symbols and their numbers.
 * @returns {number[]} Whole blocks.
 * @throws {CipherError} On a stray symbol or ciphertext that isn't whole blocks.
 */
function cipherNumbers(text: string, size: number, alphabet: Alphabet): number[] {
  const numbers: number[] = []
  Array.from(text).forEach((character, index) => {
    if (/\s/u.test(character)) return
    const value = alphabet.numberOf(character)
    if (value === undefined) {
      const point = character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
      throw new CipherError(
        `Invalid Hill ciphertext: ${JSON.stringify(character)} (U+${point}) at character ${index + 1} isn't in the alphabet`,
      )
    }
    numbers.push(value)
  })
  if (numbers.length % size !== 0) {
    throw new CipherError(
      `Invalid Hill ciphertext: ${numbers.length} symbols don't split into blocks of ${size}`,
    )
  }
  return numbers
}

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const { key } = options
    if (key === undefined || key === '') throw new MissingOptionError('key')
    if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
    const alphabet = readAlphabet(options.alphabet)
    const matrix = keyMatrix(key, alphabet, operation)
    const modulus = alphabet.symbols.length
    const numbers =
      operation === 'encode'
        ? plainNumbers(text, matrix.length, alphabet)
        : cipherNumbers(text, matrix.length, alphabet)
    let output = ''
    for (let start = 0; start < numbers.length; start += matrix.length) {
      for (const row of matrix) {
        const value = row.reduce((sum, entry, index) => sum + entry * numbers[start + index]!, 0)
        output += alphabet.symbols[value % modulus]!
      }
    }
    return {
      text: output,
      cipher: 'hill',
      operation,
      options: { key, alphabet: alphabet.symbols.join('') },
    }
  } catch (error) {
    throw normalizeError(error, 'hill')
  }
}

export class Hill extends Cipher {
  name(): string {
    return 'hill'
  }

  info(): CipherInfo {
    return {
      name: 'hill',
      label: 'Hill',
      description:
        'Polygraphic substitution: every block of 2 or 3 symbols is multiplied by a key matrix mod the alphabet length, 26 by default',
      category: 'classical',
      family: 'polygraphic',
      selfInverse: false,
      worksOn:
        'The alphabet, A-Z unless set, in blocks of 2 or 3, X or its last symbol pads the last, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            '4 or 9 symbols of the alphabet, the 2×2 or 3×3 matrix row by row, its determinant coprime with the alphabet length',
        },
        {
          name: 'alphabet',
          type: 'string',
          required: false,
          default: LATIN,
          description:
            'At least 2 distinct symbols in order, the first one 0, its length the modulus',
        },
      ],
      keyspace:
        '157,248 (2×2) or about 2^40.6 (3×3) invertible matrices over A-Z, more or fewer with another alphabet',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
