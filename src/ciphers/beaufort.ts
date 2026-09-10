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
    let position = 0
    const output = Array.from(input, (character) => {
      const isUpper = character >= 'A' && character <= 'Z'
      const isLower = character >= 'a' && character <= 'z'
      if (!isUpper && !isLower) return character
      const value = character.toUpperCase().codePointAt(0)! - 65
      const keyValue = letters.codePointAt(position % letters.length)! - 65
      const result = String.fromCodePoint(((keyValue - value + 26) % 26) + 65)
      position++
      return preserveCase && isLower ? result.toLowerCase() : result
    }).join('')
    return {
      text: output,
      cipher: 'beaufort',
      operation,
      options: { key, preserveCase, stripNonAlpha },
    }
  } catch (error) {
    throw normalizeError(error, 'beaufort')
  }
}

class Beaufort extends Cipher {
  name(): string {
    return 'beaufort'
  }

  info(): CipherInfo {
    return {
      name: 'beaufort',
      label: 'Beaufort',
      description: 'Standard Beaufort: subtract each input letter from the repeating key',
      family: 'polyalphabetic',
      selfInverse: true,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            'Repeating keyword, case-insensitive; non-ASCII letters and punctuation ignored',
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

register('beaufort', Beaufort)
