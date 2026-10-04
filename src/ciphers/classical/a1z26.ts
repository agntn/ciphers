import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { CipherError, InvalidOptionError, normalizeError } from '../../core/errors.ts'
import { getOpt } from '../../core/utils.ts'

const DIGIT_LETTERS = 'ABCDEFGHI'

/** Longest separator, in code points, so it can't multiply the text it goes between. */
const MAX_SEPARATOR_LENGTH = 10

type A1z26Settings = { readonly separator: string } | { readonly zero: string }

/**
 * Check the separator of the plain form.
 *
 * @param separator - The option as given.
 * @returns {string} The separator.
 * @throws {InvalidOptionError} When it is empty, too long or has a digit.
 */
function checkSeparator(separator: unknown): string {
  if (typeof separator !== 'string' || separator === '' || /\d/.test(separator))
    throw new InvalidOptionError('separator', separator, 'must be non-empty text without digits')
  const length = Array.from(separator).length
  if (length > MAX_SEPARATOR_LENGTH)
    throw new InvalidOptionError(
      'separator',
      `${length} characters`,
      `must be at most ${MAX_SEPARATOR_LENGTH} characters`,
    )
  return separator
}

/**
 * Pick the plain form or the single digit form from the options and check them.
 *
 * @param opts - Cipher options.
 * @returns {A1z26Settings} The separator for numbers, or the letter that stands for 0.
 * @throws {InvalidOptionError} When `zero` is not one letter from J to Z, the separator is
 *   wrong, or both are given.
 */
function validate(opts: Readonly<CipherBaseOptions>): A1z26Settings {
  const zero = getOpt<unknown>(opts, 'zero', undefined)
  const separator = getOpt<unknown>(opts, 'separator', undefined)
  if (zero === undefined)
    return { separator: separator === undefined ? '-' : checkSeparator(separator) }
  if (typeof zero !== 'string' || !/^[J-Z]$/i.test(zero))
    throw new InvalidOptionError('zero', zero, 'must be one letter from J to Z')
  if (separator !== undefined)
    throw new InvalidOptionError('separator', separator, 'is not used with zero')
  return { zero: zero.toUpperCase() }
}

/**
 * Letters to numbers, the separator inside each run of letters, the rest as it is.
 *
 * @param text - Plaintext.
 * @param separator - Text between two numbers.
 * @returns {string} The numbered text.
 */
function encodeNumbers(text: string, separator: string): string {
  return text.replaceAll(/[A-Za-z]+/g, (run) =>
    Array.from(run, (letter) => letter.toUpperCase().codePointAt(0)! - 64).join(separator),
  )
}

/**
 * Numbers 1 to 26 to letters, dropping the separator between two of them.
 *
 * @param text - Numbered text.
 * @param separator - Text between two numbers.
 * @returns {string} The letters, the rest as it is.
 * @throws {CipherError} When a number is outside 1 to 26.
 */
function decodeNumbers(text: string, separator: string): string {
  const parts = text.split(/(\d+)/)
  let offset = 0
  return parts
    .map((part, index) => {
      const at = offset
      offset += Array.from(part).length
      if (index % 2 === 0) {
        const between = index > 0 && index < parts.length - 1
        return between && part === separator ? '' : part
      }
      const value = Number(part)
      if (value < 1 || value > 26) {
        const shown = part.length > 6 ? `of ${part.length} digits` : part
        throw new CipherError(
          `Invalid A1Z26 number ${shown} at character ${at + 1}: must be 1 to 26`,
        )
      }
      return String.fromCodePoint(64 + value)
    })
    .join('')
}

/**
 * Digits to letters, A to I for 1 to 9 and the zero letter for 0.
 *
 * @param text - Digits.
 * @param zero - Letter that stands for 0.
 * @returns {string} The letters, the rest as it is.
 */
function encodeDigits(text: string, zero: string): string {
  return text.replaceAll(/\d/g, (digit) =>
    digit === '0' ? zero : DIGIT_LETTERS[Number(digit) - 1]!,
  )
}

/**
 * Letters A to I and the zero letter to digits, in either case.
 *
 * @param text - Letters.
 * @param zero - Letter that stands for 0.
 * @returns {string} The digits, the rest as it is.
 */
function decodeDigits(text: string, zero: string): string {
  return text.replaceAll(new RegExp(`[A-I${zero}]`, 'gi'), (letter) => {
    const upper = letter.toUpperCase()
    return upper === zero ? '0' : String(DIGIT_LETTERS.indexOf(upper) + 1)
  })
}

export class A1z26 extends Cipher {
  name(): string {
    return 'a1z26'
  }

  info(): CipherInfo {
    return {
      name: 'a1z26',
      label: 'A1Z26',
      description:
        'Each letter as its place in the alphabet, A=1 to Z=26. With zero, the single digit form: A to I for 1 to 9 and one more letter for 0',
      category: 'classical',
      family: 'fractionation',
      selfInverse: false,
      worksOn: 'A-Z, or 0-9 with zero, the rest passes',
      options: [
        {
          name: 'separator',
          type: 'string',
          required: false,
          default: '-',
          description: 'Text between the numbers of one word, up to 10 characters without digits',
        },
        {
          name: 'zero',
          type: 'string',
          required: false,
          description:
            'Letter from J to Z that stands for 0. Setting it switches to the single digit form, where encode turns digits into letters',
        },
      ],
      keyspace: '1, or 17 in the single digit form',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const settings = validate(options ?? {})
      return {
        text:
          'zero' in settings
            ? encodeDigits(text, settings.zero)
            : encodeNumbers(text, settings.separator),
        cipher: 'a1z26',
        operation: 'encode',
        options: { ...settings },
      }
    } catch (e) {
      throw normalizeError(e, 'a1z26')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const settings = validate(options ?? {})
      return {
        text:
          'zero' in settings
            ? decodeDigits(text, settings.zero)
            : decodeNumbers(text, settings.separator),
        cipher: 'a1z26',
        operation: 'decode',
        options: { ...settings },
      }
    } catch (e) {
      throw normalizeError(e, 'a1z26')
    }
  }
}
