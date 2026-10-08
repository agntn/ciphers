import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'
import { buildPolybiusSquare, upperCase } from '../../core/utils.ts'

/**
 * Letters A-Z of a text, J read as I, everything else dropped.
 *
 * @param text - Plaintext or key.
 * @returns {string[]} The letters, in capitals.
 */
function squareLetters(text: string): string[] {
  return Array.from(upperCase(text).replaceAll(/[^A-Z]/g, ''), (letter) =>
    letter === 'J' ? 'I' : letter,
  )
}

/** Both keywords as given, the square both ways and the key as numbers. */
interface Setup {
  readonly key: string
  readonly square: string
  /** Row and column of each letter as one number, 11 to 55. */
  readonly cells: ReadonlyMap<string, number>
  readonly letters: readonly (readonly string[])[]
  readonly shifts: readonly number[]
}

/**
 * The square and the key read from the options.
 *
 * @param options - Cipher options.
 * @returns {Setup} The square and the key numbers.
 * @throws {MissingOptionError} Without a key.
 * @throws {InvalidOptionError} On a key with no letter, or a key or square that isn't a string.
 */
function setup(options: Readonly<CipherBaseOptions>): Setup {
  const { key, square = '' } = options
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  if (typeof square !== 'string') throw new InvalidOptionError('square', square, 'must be a string')
  const grid = buildPolybiusSquare(square)
  const cells = new Map(
    Array.from(grid.pos, ([letter, [row, column]]) => [letter, row * 10 + column]),
  )
  const shifts = squareLetters(key).map((letter) => cells.get(letter)!)
  if (shifts.length === 0)
    throw new InvalidOptionError('key', key, 'must contain at least one letter')
  return { key, square, cells, letters: grid.square, shifts }
}

export class Nihilist extends Cipher {
  name(): string {
    return 'nihilist'
  }

  info(): CipherInfo {
    return {
      name: 'nihilist',
      label: 'Nihilist',
      description:
        'Polybius numbers plus the numbers of a repeating keyword, added without wrapping',
      category: 'classical',
      family: 'fractionation',
      selfInverse: false,
      worksOn: 'A-Z, J as I, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Keyword whose letters, as square numbers, add to the text in turn',
        },
        {
          name: 'square',
          type: 'string',
          required: false,
          default: '',
          description: 'Optional keyword for the 5×5 square, the rest of A-Z after it, I/J shared',
        },
      ],
      keyspace: '25! squares times 25^n keys of n letters',
    }
  }

  encode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const { key, square, cells, shifts } = setup(options)
      const numbers = squareLetters(text).map(
        (letter, index) => cells.get(letter)! + shifts[index % shifts.length]!,
      )
      return {
        text: numbers.join(' '),
        cipher: 'nihilist',
        operation: 'encode',
        options: { key, square },
      }
    } catch (error) {
      throw normalizeError(error, 'nihilist')
    }
  }

  decode(text: string, options: Readonly<CipherBaseOptions> = {}): CipherResult {
    try {
      const { key, square, letters, shifts } = setup(options)
      const numbers = text.match(/\d+/g) ?? []
      if (numbers.length === 0 && text.trim() !== '') {
        throw new CipherError('Invalid Nihilist ciphertext: no numbers to read')
      }
      let output = ''
      numbers.forEach((number, index) => {
        if (number.length > 3) {
          throw new CipherError(
            `Invalid Nihilist ciphertext: number ${index + 1} has ${number.length} digits, and no sum of two cells has more than 3`,
          )
        }
        const shift = shifts[index % shifts.length]!
        const cell = Number(number) - shift
        const row = Math.floor(cell / 10)
        const column = cell % 10
        if (row < 1 || row > 5 || column < 1 || column > 5) {
          throw new CipherError(
            `Invalid Nihilist ciphertext: number ${index + 1} is ${number}, and ${number} - ${shift} = ${cell} is no cell of the square (11 to 55)`,
          )
        }
        output += letters[row - 1]![column - 1]!
      })
      return { text: output, cipher: 'nihilist', operation: 'decode', options: { key, square } }
    } catch (error) {
      throw normalizeError(error, 'nihilist')
    }
  }
}
