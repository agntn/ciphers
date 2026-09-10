import type { CipherBaseOptions, CipherInfo, CipherResult } from '../core/types'
import { Cipher } from '../core/cipher'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'
import { processBaseOptions } from '../core/utils'

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const { key } = options
    if (key === undefined || key === '') throw new MissingOptionError('key')
    if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
    const letters = key.replaceAll(/[^A-Za-z]/g, '').toUpperCase()
    if (letters.length === 0)
      throw new InvalidOptionError('key', key, 'must contain at least one ASCII letter')
    const { preserveCase, stripNonAlpha } = processBaseOptions(options)
    const input = stripNonAlpha ? text.replaceAll(/[^A-Za-z]/g, '') : text
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const stream = new Uint8Array(Array.from(letters, (letter) => alphabet.indexOf(letter)))
    let position = 0
    const output = Array.from(input, (character) => {
      if (!/[A-Za-z]/.test(character)) return character
      const isLower = character >= 'a' && character <= 'z'
      const value = alphabet.indexOf(character.toUpperCase())
      const shift = stream.at(position)
      if (shift === undefined) throw new RangeError('Autokey stream position out of bounds')
      const plain = operation === 'decode' ? (value - shift + 26) % 26 : value
      const result = String.fromCodePoint(
        (operation === 'decode' ? plain : (value + shift) % 26) + 65,
      )
      stream[position] = plain
      position = (position + 1) % stream.length
      return preserveCase && isLower ? result.toLowerCase() : result
    }).join('')
    return {
      text: output,
      cipher: 'autokey',
      operation,
      options: { key, preserveCase, stripNonAlpha },
    }
  } catch (error) {
    throw normalizeError(error, 'autokey')
  }
}

class Autokey extends Cipher {
  name(): string {
    return 'autokey'
  }

  info(): CipherInfo {
    return {
      name: 'autokey',
      label: 'Autokey',
      description: 'Vigenère with a primer key followed by the plaintext, not a repeating keyword',
      family: 'polyalphabetic',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Primer keyword; only ASCII letters are used, ignoring case',
        },
      ],
      keyspace: '26^keyLength',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}

register('autokey', Autokey)
