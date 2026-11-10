import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, normalizeError } from '../../core/errors.ts'
import { buildPolybiusSquare, getOpt } from '../../core/utils.ts'

/** The options a Bifid run reads. */
interface Setup {
  readonly key: unknown
  /** The key as text, an absent one empty. */
  readonly word: string
  readonly period: number
  readonly alphabet: unknown
}

/**
 * Rows above columns per block of `period`, read back in pairs.
 *
 * @param text - Plaintext.
 * @param setup - Checked options.
 * @returns {string} The ciphertext.
 */
function encodeBifid(text: string, setup: Readonly<Setup>): string {
  const { square, locate } = buildPolybiusSquare(setup.word, setup.alphabet)
  const cells = locate(text)
  let result = ''
  for (let i = 0; i < cells.length; i += setup.period) {
    const chunk = cells.slice(i, i + setup.period)
    const combined = [...chunk.map(([row]) => row), ...chunk.map(([, column]) => column)]
    for (let j = 0; j + 1 < combined.length; j += 2) {
      result += square[combined[j]! - 1]![combined[j + 1]! - 1]
    }
  }
  return result
}

/**
 * Each block's coordinates, rows first, then columns.
 *
 * @param text - Ciphertext.
 * @param setup - Checked options.
 * @returns {string} The plaintext.
 */
function decodeBifid(text: string, setup: Readonly<Setup>): string {
  const { square, locate } = buildPolybiusSquare(setup.word, setup.alphabet)
  const cells = locate(text)
  let result = ''
  for (let i = 0; i < cells.length; i += setup.period) {
    const coords = cells.slice(i, i + setup.period).flat()
    const half = coords.length / 2
    for (let j = 0; j < half; j++) {
      result += square[coords[j]! - 1]![coords[half + j]! - 1]
    }
  }
  return result
}

/**
 * The options checked.
 *
 * @param opts - Cipher options.
 * @returns {Setup} The options to run on.
 * @throws {InvalidOptionError} On a bad key or period.
 */
function validate(opts: Readonly<CipherBaseOptions>): Setup {
  const { key = '', alphabet } = opts
  const word = key ?? ''
  if (typeof word !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  const period = getOpt<number>(opts, 'period', 5)
  if (!Number.isInteger(period) || period < 1) {
    throw new InvalidOptionError('period', period, 'must be a positive integer')
  }
  return { key, word, period, alphabet }
}

/**
 * The options a result echoes, the alphabet only when set.
 *
 * @param setup - Checked options.
 * @returns {Record<string, unknown>} The echo.
 */
function echo(setup: Readonly<Setup>): Record<string, unknown> {
  const { key, period, alphabet } = setup
  return alphabet === undefined ? { key, period } : { key, period, alphabet }
}

export class Bifid extends Cipher {
  name(): string {
    return 'bifid'
  }

  info(): CipherInfo {
    return {
      name: 'bifid',
      label: 'Bifid Cipher',
      description:
        'Fractionation and transposition: Polybius rows written above columns per block of period, read back in pairs',
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
            'Distinct symbols that fill a square, 4 for 2×2, 36 for 6×6 and so on, A-Z with J as I by default',
        },
        {
          name: 'period',
          type: 'number',
          required: false,
          default: 5,
          description: 'Transposition period length',
        },
      ],
      keyspace: '25! × period variants, 36! on a 6×6',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const setup = validate(options ?? {})
      return {
        text: encodeBifid(text, setup),
        cipher: 'bifid',
        operation: 'encode',
        options: echo(setup),
      }
    } catch (e) {
      throw normalizeError(e, 'bifid')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const setup = validate(options ?? {})
      return {
        text: decodeBifid(text, setup),
        cipher: 'bifid',
        operation: 'decode',
        options: echo(setup),
      }
    } catch (e) {
      throw normalizeError(e, 'bifid')
    }
  }
}
