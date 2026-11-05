import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, normalizeError } from '../../core/errors.ts'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

interface Settings {
  readonly key: string
  readonly period: number
  readonly symbol: string
}

/**
 * The letters per group, 5 when not given.
 *
 * @param period - The `period` option as passed.
 * @returns {number} A positive integer.
 * @throws {InvalidOptionError} When it is anything else.
 */
function readPeriod(period: unknown): number {
  if (period === undefined) return 5
  if (typeof period !== 'number' || !Number.isInteger(period) || period < 1) {
    throw new InvalidOptionError('period', period, 'must be a positive integer')
  }
  return period
}

/**
 * The 27th cell, `+` when not given, as Delastelle and Wikipedia have it.
 *
 * @param symbol - The `symbol` option as passed.
 * @returns {string} One code point that is neither a letter A-Z nor whitespace.
 * @throws {InvalidOptionError} When it is anything else.
 */
function readSymbol(symbol: unknown): string {
  if (symbol === undefined) return '+'
  if (typeof symbol !== 'string' || Array.from(symbol).length !== 1 || /[A-Za-z\s]/.test(symbol)) {
    throw new InvalidOptionError(
      'symbol',
      symbol,
      'must be one character that is neither a letter A-Z nor whitespace',
    )
  }
  return symbol
}

/**
 * Read and check the options.
 *
 * @param options - The call's options.
 * @returns {Settings} The keyword, the period and the 27th symbol.
 * @throws {InvalidOptionError} When one of them can't build a cube or a group.
 */
function settings(options: Readonly<CipherBaseOptions>): Settings {
  const { key = '' } = options
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  return { key, period: readPeriod(options.period), symbol: readSymbol(options.symbol) }
}

/**
 * The keyword's letters without repeats, the rest of A-Z, then the symbol, three layers of nine.
 *
 * @param key - The keyword, anything but ASCII letters ignored.
 * @param symbol - The 27th cell.
 * @returns {readonly string[]} The 27 cells, layer by layer and row by row.
 */
function buildCube(key: string, symbol: string): readonly string[] {
  const letters = key.replaceAll(/[^A-Za-z]/g, '').toUpperCase()
  return [...new Set(`${letters}${ALPHABET}`), symbol]
}

/**
 * The characters the cube holds, a-z read as A-Z and the rest dropped.
 *
 * @param text - Plaintext or ciphertext.
 * @param cube - The cube from `buildCube`.
 * @returns {readonly number[]} Each kept character's cell.
 */
function cells(text: string, cube: readonly string[]): readonly number[] {
  return Array.from(text.replaceAll(/[a-z]+/g, (run) => run.toUpperCase()))
    .map((char) => cube.indexOf(char))
    .filter((cell) => cell !== -1)
}

/**
 * Where a cell sits in the cube.
 *
 * @param cell - Index 0 to 26.
 * @returns {readonly [number, number, number]} Layer, row and column, each 0 to 2.
 */
function coordinates(cell: number): readonly [number, number, number] {
  return [Math.floor(cell / 9), Math.floor(cell / 3) % 3, cell % 3]
}

/**
 * Write each cell's three coordinates under it, read the rows across in threes, look them up.
 *
 * @param group - One period's cells.
 * @returns {readonly number[]} The cells the mixed trigrams name.
 */
function encodeGroup(group: readonly number[]): readonly number[] {
  const trigrams = group.map((cell) => coordinates(cell))
  const digits = [0, 1, 2].flatMap((axis) => trigrams.map((trigram) => trigram[axis]!))
  return group.map(
    (_, index) => digits[index * 3]! * 9 + digits[index * 3 + 1]! * 3 + digits[index * 3 + 2]!,
  )
}

/**
 * Undo {@link encodeGroup}: the trigrams laid end to end are the three rows, one after another.
 *
 * @param group - One period's cells.
 * @returns {readonly number[]} The cells it was encoded from.
 */
function decodeGroup(group: readonly number[]): readonly number[] {
  const digits = group.flatMap((cell) => coordinates(cell))
  const size = group.length
  return group.map(
    (_, index) => digits[index]! * 9 + digits[size + index]! * 3 + digits[2 * size + index]!,
  )
}

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const { key, period, symbol } = settings(options)
    const cube = buildCube(key, symbol)
    const input = cells(text, cube)
    const step = operation === 'encode' ? encodeGroup : decodeGroup
    let output = ''
    for (let start = 0; start < input.length; start += period) {
      for (const cell of step(input.slice(start, start + period))) output += cube[cell]
    }
    return { text: output, cipher: 'trifid', operation, options: { key, period, symbol } }
  } catch (error) {
    throw normalizeError(error, 'trifid')
  }
}

export class Trifid extends Cipher {
  name(): string {
    return 'trifid'
  }

  info(): CipherInfo {
    return {
      name: 'trifid',
      label: 'Trifid Cipher',
      description:
        "Delastelle's Bifid in three dimensions: a keyed 3×3×3 cube turns each letter into layer, row and column, and the coordinates are mixed by period",
      category: 'classical',
      family: 'fractionation',
      selfInverse: false,
      worksOn: 'A-Z and the 27th symbol, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: false,
          default: '',
          description: 'Keyword for the cube, the rest of A-Z and the 27th symbol after it',
        },
        {
          name: 'period',
          type: 'number',
          required: false,
          default: 5,
          description: 'Letters per group',
        },
        {
          name: 'symbol',
          type: 'string',
          required: false,
          default: '+',
          description:
            'The 27th cell of the cube: one character, neither a letter A-Z nor whitespace',
        },
      ],
      keyspace: '26! × period variants',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
