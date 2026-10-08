import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../../core/errors.ts'
import { processBaseOptions } from '../../core/utils.ts'

/**
 * The shifts the key spells, one per digit, so `1234` shifts by 1, 2, 3 and 4.
 *
 * @param options - The cipher options, `key` among them.
 * @returns {number[]} The shifts, each from 0 to 9.
 */
function readShifts(options: Readonly<CipherBaseOptions>): number[] {
  const { key } = options
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  if (!/^[0-9]+$/.test(key)) throw new InvalidOptionError('key', key, 'must contain digits only')
  return Array.from(key, (digit) => digit.codePointAt(0)! - 48)
}

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const shifts = readShifts(options)
    const { preserveCase, stripNonAlpha } = processBaseOptions(options)
    const input = stripNonAlpha ? text.replaceAll(/[^A-Za-z]/g, '') : text
    const sign = operation === 'encode' ? 1 : -1
    let position = 0
    const output = Array.from(input, (character) => {
      const isUpper = character >= 'A' && character <= 'Z'
      const isLower = character >= 'a' && character <= 'z'
      if (!isUpper && !isLower) return character
      const value = character.toUpperCase().codePointAt(0)! - 65
      const shift = shifts[position % shifts.length]! * sign
      const result = String.fromCodePoint(((value + shift + 26) % 26) + 65)
      position++
      return preserveCase && isLower ? result.toLowerCase() : result
    }).join('')
    return {
      text: output,
      cipher: 'gronsfeld',
      operation,
      options: { key: options.key, preserveCase, stripNonAlpha },
    }
  } catch (error) {
    throw normalizeError(error, 'gronsfeld')
  }
}

export class Gronsfeld extends Cipher {
  name(): string {
    return 'gronsfeld'
  }

  info(): CipherInfo {
    return {
      name: 'gronsfeld',
      label: 'Gronsfeld',
      description: 'Vigenère with a number for a key: each digit shifts one letter by 0 to 9',
      category: 'classical',
      family: 'polyalphabetic',
      selfInverse: false,
      worksOn: 'A-Z, the rest passes',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Repeating digits 0 to 9, nothing else; 0123 is the Vigenère key ABCD',
        },
      ],
      keyspace: '10^keyLength',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
