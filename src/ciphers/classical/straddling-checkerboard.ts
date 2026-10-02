import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { getOpt, upperAscii } from '../../core/utils.ts'
import { CipherError, InvalidOptionError, normalizeError } from '../../core/errors.ts'

/** The board on the English Wikipedia page, top row ET AON RIS with 2 and 6 blank. */
const DEFAULT_BOARD = 'ETAONRISBCDFGHJKLMPQ/UVWXYZ.'
const DEFAULT_BLANKS = '26'

interface Board {
  /** Code for each character, the first cell when a filler repeats. */
  readonly codes: Readonly<Record<string, string>>
  /** Character for each code of one or two digits. */
  readonly cells: Readonly<Record<string, string>>
  readonly blanks: string
}

/**
 * Lays out the 28 cells: eight on the top row around the two blanks, then ten on each blank's row.
 *
 * @param key - The cells row by row, each letter A-Z once and two fillers such as `.` and `/`.
 * @param blanks - The two digits left blank on the top row.
 * @returns {Board} Codes both ways.
 * @throws {InvalidOptionError} When the board or the blanks break those rules.
 */
function buildBoard(key: string, blanks: string): Board {
  const board = key.toUpperCase().replaceAll(/\s/g, '')
  const cells = [...board]
  if (cells.length !== 28) {
    throw new InvalidOptionError(
      'key',
      key,
      `${cells.length} cells, the board needs 28 (26 letters and two fillers)`,
    )
  }
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const count = cells.filter((cell) => cell === letter).length
    if (count !== 1) {
      throw new InvalidOptionError(
        'key',
        key,
        `${letter} appears ${count} times, every letter A-Z needs one cell`,
      )
    }
  }
  const digits = blanks.replaceAll(/\s/g, '')
  if (!/^\d\d$/.test(digits) || digits[0] === digits[1]) {
    throw new InvalidOptionError('blanks', blanks, 'must be two different digits')
  }

  const codeList = [
    ...[...'0123456789'].filter((digit) => !digits.includes(digit)),
    ...[...'0123456789'].map((digit) => `${digits[0]}${digit}`),
    ...[...'0123456789'].map((digit) => `${digits[1]}${digit}`),
  ]
  const codes: Record<string, string> = {}
  const lookup: Record<string, string> = {}
  cells.forEach((cell, index) => {
    const code = codeList[index]!
    lookup[code] = cell
    codes[cell] ??= code
  })
  return { codes, cells: lookup, blanks: digits }
}

function encodeCheckerboard(text: string, board: Readonly<Board>): string {
  let result = ''
  for (const character of upperAscii(text)) {
    result += board.codes[character] ?? ''
  }
  return result
}

/**
 * Reads one digit as a top row cell, or two when the first is a blank.
 *
 * @param text - Digits, anything else ignored.
 * @param board - The board from `buildBoard`.
 * @returns {string} The characters of the cells read.
 * @throws {CipherError} When there are no digits, or the last one is a blank with nothing after it.
 */
function decodeCheckerboard(text: string, board: Readonly<Board>): string {
  const digits = text.replaceAll(/\D/g, '')
  if (digits === '' && text.trim() !== '') {
    throw new CipherError('Invalid straddling checkerboard code: no digits to decode')
  }
  let result = ''
  for (let i = 0; i < digits.length; i++) {
    let code = digits[i]!
    if (board.blanks.includes(code)) {
      const next = digits[i + 1]
      if (next === undefined) {
        throw new CipherError(
          `Invalid straddling checkerboard code: ends on ${code}, a blank digit with no second digit after it`,
        )
      }
      code += next
      i++
    }
    result += board.cells[code]!
  }
  return result
}

export class StraddlingCheckerboard extends Cipher {
  name(): string {
    return 'straddling-checkerboard'
  }

  info(): CipherInfo {
    return {
      name: 'straddling-checkerboard',
      label: 'Straddling Checkerboard',
      description:
        "The VIC cipher's first step: eight letters become one digit, the rest two digits starting with a blank of the top row",
      category: 'classical',
      family: 'fractionation',
      selfInverse: false,
      worksOn: 'board cells, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: false,
          default: DEFAULT_BOARD,
          description:
            'The 28 cells row by row: each letter A-Z once and two fillers such as . and /',
        },
        {
          name: 'blanks',
          type: 'string',
          required: false,
          default: DEFAULT_BLANKS,
          description: 'The two blank digits of the top row, each the first digit of a code of two',
        },
      ],
      keyspace: '28! boards × 90 ordered pairs of blanks',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const key = getOpt<string>(options ?? {}, 'key', DEFAULT_BOARD)
      const blanks = String(getOpt<string>(options ?? {}, 'blanks', DEFAULT_BLANKS))
      return {
        text: encodeCheckerboard(text, buildBoard(key, blanks)),
        cipher: 'straddling-checkerboard',
        operation: 'encode',
        options: { key, blanks },
      }
    } catch (e) {
      throw normalizeError(e, 'straddling-checkerboard')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const key = getOpt<string>(options ?? {}, 'key', DEFAULT_BOARD)
      const blanks = String(getOpt<string>(options ?? {}, 'blanks', DEFAULT_BLANKS))
      return {
        text: decodeCheckerboard(text, buildBoard(key, blanks)),
        cipher: 'straddling-checkerboard',
        operation: 'decode',
        options: { key, blanks },
      }
    } catch (e) {
      throw normalizeError(e, 'straddling-checkerboard')
    }
  }
}
