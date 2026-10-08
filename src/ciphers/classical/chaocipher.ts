import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../../core/errors.ts'
import { processBaseOptions } from '../../core/utils.ts'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Byrne's nadir: the 14th place, where each step drops the letter it pulls out. */
const NADIR = 13

/** The left (ciphertext) and the right (plaintext) alphabet, both turned to the same zenith. */
type Disks = Readonly<{ left: string; right: string }>

/**
 * One alphabet option: the keyword's letters, repeats dropped, then the rest of A-Z.
 *
 * @param options - The call's options.
 * @param name - `key` for the left alphabet, `secondKey` for the right one.
 * @returns {string} All 26 letters; a whole alphabet comes back as it was.
 * @throws {MissingOptionError} When it is absent or empty.
 * @throws {InvalidOptionError} When it is not a string or holds no ASCII letter.
 */
function alphabet(options: Readonly<CipherBaseOptions>, name: 'key' | 'secondKey'): string {
  const value = options[name]
  if (value === undefined || value === '') throw new MissingOptionError(name)
  if (typeof value !== 'string') throw new InvalidOptionError(name, value, 'must be a string')
  const letters = value.replaceAll(/[^A-Za-z]/g, '').toUpperCase()
  if (letters.length === 0) {
    throw new InvalidOptionError(name, value, 'must contain at least one ASCII letter')
  }
  return [...new Set(`${letters}${ALPHABET}`)].join('')
}

/**
 * Rubin's permute: `zenith` to the front, then the letter `offset` after it down to the nadir.
 *
 * @param disk - 26 letters.
 * @param zenith - Index of the letter that goes to the front.
 * @param offset - 1 for the left alphabet, 2 for the right one.
 * @returns {string} The permuted alphabet.
 */
function permute(disk: string, zenith: number, offset: 1 | 2): string {
  const turned = disk.slice(zenith) + disk.slice(0, zenith)
  return (
    turned.slice(0, offset) +
    turned.slice(offset + 1, NADIR + 1) +
    turned[offset]! +
    turned.slice(NADIR + 1)
  )
}

/**
 * One letter through the disks, which permute the same way whichever way the text goes.
 *
 * @param letter - An upper case letter from A to Z.
 * @param disks - The alphabets before this letter.
 * @param operation - Plain to cipher, or back.
 * @returns {[string, Disks]} The other letter, upper case, and the alphabets for the next one.
 */
function step(letter: string, disks: Disks, operation: 'encode' | 'decode'): [string, Disks] {
  const { left, right } = disks
  const index = (operation === 'encode' ? right : left).indexOf(letter)
  return [
    (operation === 'encode' ? left : right)[index]!,
    { left: permute(left, index, 1), right: permute(right, (index + 1) % 26, 2) },
  ]
}

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    let disks: Disks = { left: alphabet(options, 'key'), right: alphabet(options, 'secondKey') }
    const { preserveCase, stripNonAlpha } = processBaseOptions(options)
    const input = stripNonAlpha ? text.replaceAll(/[^A-Za-z]/g, '') : text
    const output = input.replaceAll(/[A-Za-z]/g, (character) => {
      const [result, next] = step(character.toUpperCase(), disks, operation)
      disks = next
      return preserveCase && character >= 'a' ? result.toLowerCase() : result
    })
    return {
      text: output,
      cipher: 'chaocipher',
      operation,
      options: { key: options.key, secondKey: options.secondKey, preserveCase, stripNonAlpha },
    }
  } catch (error) {
    throw normalizeError(error, 'chaocipher')
  }
}

export class Chaocipher extends Cipher {
  name(): string {
    return 'chaocipher'
  }

  info(): CipherInfo {
    return {
      name: 'chaocipher',
      label: 'Chaocipher',
      description:
        "Byrne's Chaocipher: two alphabets that permute themselves after every letter, as Rubin's 2010 paper describes",
      category: 'classical',
      family: 'polyalphabetic',
      selfInverse: false,
      worksOn: 'A-Z, the rest passes',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            'The left (ciphertext) alphabet: 26 letters, or a keyword the rest of A-Z follows',
        },
        {
          name: 'secondKey',
          type: 'string',
          required: true,
          description:
            'The right (plaintext) alphabet: 26 letters, or a keyword the rest of A-Z follows',
        },
      ],
      keyspace: '26! × 25! (about 2^172), since turning both alphabets together changes nothing',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
