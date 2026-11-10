import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, normalizeError } from '../../core/errors.ts'
import { buildPolybiusSquare, type PolybiusSquare } from '../../core/utils.ts'

/** A coordinate is one digit, so the square stops at 9×9. */
const WIDEST = 9

/** The square and the options a result echoes. */
interface Setup {
  readonly grid: PolybiusSquare
  readonly options: Record<string, unknown>
}

/**
 * The square read from the options.
 *
 * @param options - Cipher options.
 * @returns {Setup} The square and the options to echo.
 * @throws {InvalidOptionError} On a bad key or alphabet.
 */
function setup(options: Readonly<CipherBaseOptions>): Setup {
  const { key = '', alphabet } = options
  const word = key ?? ''
  if (typeof word !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  const grid = buildPolybiusSquare(word, alphabet)
  if (grid.side > WIDEST) {
    throw new InvalidOptionError('alphabet', alphabet, 'can hold 81 symbols at most, 9×9')
  }
  return { grid, options: alphabet === undefined ? { key } : { key, alphabet } }
}

/**
 * The cell a pair of digits points at.
 *
 * @param pair - One token between whitespace.
 * @param rows - The square, row by row.
 * @returns {string} The cell, or the token when it points nowhere.
 */
function cellAt(pair: string, rows: readonly (readonly string[])[]): string {
  if (!/^[1-9]{2}$/.test(pair)) return pair
  return rows[Number(pair[0]) - 1]?.[Number(pair[1]) - 1] ?? pair
}

export class Polybius extends Cipher {
  name(): string {
    return 'polybius'
  }

  info(): CipherInfo {
    return {
      name: 'polybius',
      label: 'Polybius Square',
      description:
        'Fractionation: each symbol becomes two digits, its row and column in a square, 5×5 with I and J sharing by default',
      category: 'classical',
      family: 'fractionation',
      selfInverse: false,
      worksOn: 'A-Z with J as I, or the symbols of alphabet, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: false,
          default: '',
          description: 'Optional keyword that fills the square first',
        },
        {
          name: 'alphabet',
          type: 'string',
          required: false,
          description:
            'Distinct symbols that fill a square, 4 for 2×2 up to 81 for 9×9, A-Z with J as I by default',
        },
      ],
      keyspace: '1 (standard) or 25! (keyed), 36! on a 6×6',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { grid, options: used } = setup(options ?? {})
      const pairs = grid.locate(text).map(([row, column]) => `${row}${column}`)
      return { text: pairs.join(' '), cipher: 'polybius', operation: 'encode', options: used }
    } catch (e) {
      throw normalizeError(e, 'polybius')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { grid, options: used } = setup(options ?? {})
      const cells = text
        .trim()
        .split(/\s+/)
        .map((pair) => cellAt(pair, grid.square))
      return { text: cells.join(''), cipher: 'polybius', operation: 'decode', options: used }
    } catch (e) {
      throw normalizeError(e, 'polybius')
    }
  }
}
