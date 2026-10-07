import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../../core/errors.ts'
import { applyBaseOptions, processBaseOptions } from '../../core/utils.ts'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * The cipher alphabet a key stands for, `?` where a recovered key never saw the letter.
 *
 * @param key - 26 cells of A-Z and `?`, or a keyword the rest of A-Z follows.
 * @returns {string} 26 cells, cell `i` holding the cipher letter of plaintext letter `i`.
 * @throws {InvalidOptionError} On a repeated letter in a whole alphabet, or a keyword without one.
 */
function cipherAlphabet(key: string): string {
  const upper = key.replaceAll(/[a-z]/g, (letter) => letter.toUpperCase())
  if (/^[A-Z?]{26}$/.test(upper)) {
    const letters = upper.replaceAll('?', '')
    if (new Set(letters).size !== letters.length) {
      throw new InvalidOptionError(
        'key',
        key,
        'as a whole alphabet must name each letter at most once',
      )
    }
    return upper
  }
  if (upper.includes('?')) {
    throw new InvalidOptionError('key', key, 'can hold ? only as a whole alphabet of 26 cells')
  }
  if (!/[A-Z]/.test(upper)) {
    throw new InvalidOptionError('key', key, 'must contain at least one ASCII letter')
  }
  return [...new Set(`${upper.replaceAll(/[^A-Z]/g, '')}${ALPHABET}`)].join('')
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
    const cells = cipherAlphabet(key)
    const [from, to] = operation === 'encode' ? [ALPHABET, cells] : [cells, ALPHABET]
    const base = processBaseOptions(options)
    const output = applyBaseOptions(text, base).replaceAll(/[A-Za-z]/g, (character) => {
      const index = from.indexOf(character.toUpperCase())
      const result = index === -1 ? '?' : to[index]!
      return character === character.toUpperCase() ? result : result.toLowerCase()
    })
    return { text: output, cipher: 'substitution', operation, options: { key, ...base } }
  } catch (error) {
    throw normalizeError(error, 'substitution')
  }
}

export class Substitution extends Cipher {
  name(): string {
    return 'substitution'
  }

  info(): CipherInfo {
    return {
      name: 'substitution',
      label: 'Substitution',
      description:
        'Monoalphabetic substitution: every letter swaps for its cell in a mixed alphabet',
      category: 'classical',
      family: 'substitution-keyed',
      selfInverse: false,
      worksOn: 'A-Z, the rest passes',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            'Cipher alphabet of 26 letters, ? for a letter left unknown, or a keyword the rest of A-Z follows',
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
