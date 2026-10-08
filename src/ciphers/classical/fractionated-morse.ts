import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'
import { CHAR_TO_MORSE, MORSE_TO_CHAR } from './morse.ts'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const SYMBOLS = ['.', '-', 'x'] as const

/** The 26 triples in the ACA's order, dot before dash before x; `xxx` never happens. */
const TRIPLES: readonly string[] = /* @__PURE__ */ SYMBOLS.flatMap((first) =>
  SYMBOLS.flatMap((second) =>
    SYMBOLS.map((third) => first + second + third).filter((triple) => triple !== 'xxx'),
  ),
)

/**
 * The keyed alphabet: the keyword's letters, repeats dropped, then the rest of A-Z.
 *
 * @param options - The call's options.
 * @returns {string} All 26 letters; a whole alphabet comes back as it was.
 * @throws {MissingOptionError} When `key` is absent or empty.
 * @throws {InvalidOptionError} When `key` is not a string or holds no ASCII letter.
 */
function alphabet(options: Readonly<CipherBaseOptions>): string {
  const { key } = options
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  const letters = key.replaceAll(/[^A-Za-z]/g, '').toUpperCase()
  if (letters.length === 0) {
    throw new InvalidOptionError('key', key, 'must contain at least one ASCII letter')
  }
  return [...new Set(`${letters}${ALPHABET}`)].join('')
}

/**
 * Letters and digits in Morse, `x` between them, padded with `x` to whole triples; the rest drops.
 *
 * @param text - The plaintext.
 * @returns {string} Dots, dashes and x, a multiple of three long.
 */
function toMorse(text: string): string {
  const morse = text
    .split(/\s+/)
    .map((word) =>
      word
        .replaceAll(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .split('')
        .map((character) => CHAR_TO_MORSE[character])
        .join('x'),
    )
    .filter((word) => word !== '')
    .join('xx')
  return morse.padEnd(Math.ceil(morse.length / 3) * 3, 'x')
}

/**
 * One Morse character back from its code.
 *
 * @param code - Dots and dashes.
 * @returns {string} The character.
 * @throws {CipherError} When no character has that code.
 */
function fromCode(code: string): string {
  const character = MORSE_TO_CHAR.get(code)
  if (character === undefined) {
    throw new CipherError(
      code === ''
        ? 'Invalid fractionated Morse code: it starts with x, which no text gives; check the key'
        : `Invalid fractionated Morse code: no character is ${code} in Morse; check the key`,
    )
  }
  return character
}

/**
 * Morse with x separators back to text, the padding at the end dropped.
 *
 * @param morse - Dots, dashes and x.
 * @returns {string} Upper case words with single spaces between them.
 * @throws {CipherError} On three x in a row or a code Morse doesn't have.
 */
function fromMorse(morse: string): string {
  const trimmed = morse.replace(/x+$/, '')
  if (trimmed.includes('xxx')) {
    throw new CipherError(
      'Invalid fractionated Morse code: three x in a row, which no text gives; check the key',
    )
  }
  return trimmed
    .split('xx')
    .map((word) => word.split('x').map(fromCode).join(''))
    .join(' ')
}

function encode(text: string, key: string): string {
  return toMorse(text).replaceAll(/.{3}/g, (triple) => key[TRIPLES.indexOf(triple)]!)
}

function decode(text: string, key: string): string {
  const letters = text.replaceAll(/[^A-Za-z]/g, '').toUpperCase()
  if (letters === '') return ''
  return fromMorse(
    letters
      .split('')
      .map((letter) => TRIPLES[key.indexOf(letter)]!)
      .join(''),
  )
}

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const key = alphabet(options)
    return {
      text: operation === 'encode' ? encode(text, key) : decode(text, key),
      cipher: 'fractionated-morse',
      operation,
      options: { key: options.key },
    }
  } catch (error) {
    throw normalizeError(error, 'fractionated-morse')
  }
}

export class FractionatedMorse extends Cipher {
  name(): string {
    return 'fractionated-morse'
  }

  info(): CipherInfo {
    return {
      name: 'fractionated-morse',
      label: 'Fractionated Morse',
      description:
        "The ACA's Fractionated Morse: Morse with x between letters and xx between words, cut into triples, each triple one letter of a keyed alphabet",
      category: 'classical',
      family: 'fractionation',
      selfInverse: false,
      worksOn: 'A-Z and 0-9, spaces between words, x pads the last triple, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            'The cipher alphabet over the 26 triples: 26 letters, or a keyword the rest of A-Z follows',
        },
      ],
      keyspace: '26! (about 2^88)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
