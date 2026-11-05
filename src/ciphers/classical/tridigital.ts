import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'
import { buildColumnOrder } from '../../core/utils.ts'
import { keyword } from './squares.ts'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** The block is ten columns wide, and the last one stays empty for the word separator. */
const LETTER_COLUMNS = 9

interface Block {
  /** The digit over each letter's column. */
  readonly digits: Readonly<Record<string, string>>
  /** The letters under each digit, top row first. */
  readonly columns: Readonly<Record<string, string>>
  /** The digit over the empty column. */
  readonly separator: string
}

/**
 * The digits over the ten columns, from a keyword or as given.
 *
 * @param options - The call's options.
 * @returns {string} The digits 0 to 9, each once, left to right.
 * @throws {MissingOptionError} When `key` is absent or empty.
 * @throws {InvalidOptionError} When `key` is neither 10 ASCII letters nor the ten digits.
 */
function numericKey(options: Readonly<CipherBaseOptions>): string {
  const { key } = options
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  const compact = key.replaceAll(/\s/g, '')
  if (/^\d{10}$/.test(compact) && new Set(compact).size === 10) return compact
  if (!/^[A-Za-z]{10}$/.test(compact)) {
    throw new InvalidOptionError(
      'key',
      key,
      'must be 10 ASCII letters, or the digits 0 to 9 once each',
    )
  }
  return buildColumnOrder(compact)
    .map((rank) => String((rank + 1) % 10))
    .join('')
}

/**
 * Writes the keyed alphabet into the first nine columns, row by row, under the digits.
 *
 * @param options - The call's options.
 * @returns {Block} Lookups both ways and the separator digit.
 * @throws {MissingOptionError} When `key` or `secondKey` is absent or empty.
 * @throws {InvalidOptionError} When either of them breaks its rule.
 */
function buildBlock(options: Readonly<CipherBaseOptions>): Block {
  const header = numericKey(options)
  const letters = keyword(options, 'secondKey')
    .replaceAll(/[^A-Za-z]/g, '')
    .toUpperCase()
  const digits: Record<string, string> = {}
  const columns: Record<string, string> = {}
  ;[...new Set(`${letters}${ALPHABET}`)].forEach((letter, index) => {
    const digit = header[index % LETTER_COLUMNS]!
    digits[letter] = digit
    columns[digit] = (columns[digit] ?? '') + letter
  })
  return { digits, columns, separator: header[LETTER_COLUMNS]! }
}

function encode(text: string, block: Readonly<Block>): string {
  return text
    .split(/\s+/)
    .map((word) =>
      word
        .replaceAll(/[^A-Za-z]/g, '')
        .toUpperCase()
        .replaceAll(/[A-Z]/g, (letter) => block.digits[letter]!),
    )
    .filter((word) => word !== '')
    .join(block.separator)
}

/**
 * Every digit back to the letters of its column, as a regex character class.
 *
 * @param text - Digits, anything else ignored.
 * @param block - The block from `buildBlock`.
 * @returns {string} `[DBQ]` for each letter, a space for each separator.
 * @throws {CipherError} When the text has characters but no digit.
 */
function decode(text: string, block: Readonly<Block>): string {
  const digits = text.replaceAll(/\D/g, '')
  if (digits === '' && text.trim() !== '') {
    throw new CipherError('Invalid tridigital code: no digits to decode')
  }
  return digits.replaceAll(/\d/g, (digit) =>
    digit === block.separator ? ' ' : `[${block.columns[digit]}]`,
  )
}

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const block = buildBlock(options)
    return {
      text: operation === 'encode' ? encode(text, block) : decode(text, block),
      cipher: 'tridigital',
      operation,
      options: { key: options.key, secondKey: options.secondKey },
    }
  } catch (error) {
    throw normalizeError(error, 'tridigital')
  }
}

export class Tridigital extends Cipher {
  name(): string {
    return 'tridigital'
  }

  info(): CipherInfo {
    return {
      name: 'tridigital',
      label: 'Tridigital',
      description:
        "The ACA's Tridigital: a keyed alphabet in nine columns under ten digits, each letter its column's digit and the tenth digit between words; decoding can only say which letters each digit could be",
      category: 'classical',
      family: 'substitution-keyed',
      selfInverse: false,
      worksOn: 'A-Z, spaces between words, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            'The digits over the columns: a 10-letter keyword numbered in alphabetical order 1 to 9 then 0, or the digits 0 to 9 in any order',
        },
        {
          name: 'secondKey',
          type: 'string',
          required: true,
          description:
            'The alphabet written into the block: 26 letters, or a keyword the rest of A-Z follows',
        },
      ],
      keyspace: '10! digit orders × 26! alphabets',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
