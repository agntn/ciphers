import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'
import { upperCase } from '../../core/utils.ts'

/** The letter that fills a short last block. */
const PADDING = 'X'

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
 * Determinant of a square matrix modulo 26, by cofactors along the first row.
 *
 * @param matrix - 1×1 to 3×3 rows of numbers 0 to 25.
 * @returns {number} The determinant, 0 to 25.
 */
function determinant(matrix: readonly (readonly number[])[]): number {
  if (matrix.length === 1) return matrix[0]![0]!
  let sum = 0
  matrix[0]!.forEach((entry, column) => {
    sum += (column % 2 === 0 ? 1 : -1) * entry * determinant(minor(matrix, 0, column))
  })
  return ((sum % 26) + 26) % 26
}

/**
 * Inverse of `value` modulo 26, or nothing when they share a factor.
 *
 * @param value - Number 0 to 25.
 * @returns {number | undefined} The inverse, 1 to 25.
 */
function inverse26(value: number): number | undefined {
  for (let candidate = 1; candidate < 26; candidate++) {
    if ((value * candidate) % 26 === 1) return candidate
  }
  return undefined
}

/**
 * The key as a matrix read row by row, inverted for decoding.
 *
 * @param key - 4 or 9 letters, A as 0.
 * @param operation - `decode` takes the inverse matrix.
 * @returns {number[][]} 2×2 or 3×3 rows modulo 26.
 * @throws {InvalidOptionError} On a key of another length or one whose determinant has no inverse.
 */
function keyMatrix(key: string, operation: 'encode' | 'decode'): number[][] {
  if (!/^(?:[A-Za-z]{4}|[A-Za-z]{9})$/.test(key)) {
    throw new InvalidOptionError('key', key, 'must be 4 or 9 ASCII letters (a 2×2 or 3×3 matrix)')
  }
  const size = key.length === 4 ? 2 : 3
  const values = Array.from(upperCase(key), (letter) => letter.codePointAt(0)! - 65)
  const matrix = Array.from({ length: size }, (_, row) =>
    values.slice(row * size, row * size + size),
  )
  const det = determinant(matrix)
  const detInverse = inverse26(det)
  if (detInverse === undefined) {
    throw new InvalidOptionError(
      'key',
      key,
      `has determinant ${det} mod 26, which shares a factor with 26, so nothing it encodes could be decoded`,
    )
  }
  if (operation === 'encode') return matrix
  return matrix.map((_, row) =>
    matrix.map((__, column) => {
      const sign = (row + column) % 2 === 0 ? 1 : -1
      const cofactor = sign * determinant(minor(matrix, column, row))
      return (((cofactor * detInverse) % 26) + 26) % 26
    }),
  )
}

/**
 * The letters of the text as numbers 0 to 25, X padding a short last block on the way in.
 *
 * @param text - Plaintext or ciphertext.
 * @param size - Block length, 2 or 3.
 * @param operation - Only `encode` pads.
 * @returns {number[]} Whole blocks of letters.
 * @throws {CipherError} On ciphertext that doesn't split into whole blocks.
 */
function blockLetters(text: string, size: number, operation: 'encode' | 'decode'): number[] {
  let letters = upperCase(text).replaceAll(/[^A-Z]/g, '')
  const short = letters.length % size
  if (short !== 0 && operation === 'decode') {
    throw new CipherError(
      `Invalid Hill ciphertext: ${letters.length} letters don't split into blocks of ${size}`,
    )
  }
  if (short !== 0) letters = letters.padEnd(letters.length + size - short, PADDING)
  return Array.from(letters, (letter) => letter.codePointAt(0)! - 65)
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
    const matrix = keyMatrix(key, operation)
    const numbers = blockLetters(text, matrix.length, operation)
    let output = ''
    for (let start = 0; start < numbers.length; start += matrix.length) {
      for (const row of matrix) {
        const value = row.reduce((sum, entry, index) => sum + entry * numbers[start + index]!, 0)
        output += String.fromCodePoint(65 + (value % 26))
      }
    }
    return { text: output, cipher: 'hill', operation, options: { key } }
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
        'Polygraphic substitution: every block of 2 or 3 letters is multiplied by a key matrix mod 26',
      category: 'classical',
      family: 'polygraphic',
      selfInverse: false,
      worksOn: 'A-Z in blocks of 2 or 3, X pads the last, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            '4 or 9 letters, the 2×2 or 3×3 matrix row by row with A as 0, its determinant coprime with 26',
        },
      ],
      keyspace: '157,248 (2×2) or about 2^40.6 (3×3) invertible matrices',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
