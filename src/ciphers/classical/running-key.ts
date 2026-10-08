import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../../core/errors.ts'
import { processBaseOptions } from '../../core/utils.ts'

/**
 * The shifts the key spells, one per ASCII letter, with A as 0.
 *
 * @param options - The cipher options, `key` among them.
 * @returns {number[]} The shifts, each from 0 to 25.
 */
function readShifts(options: Readonly<CipherBaseOptions>): number[] {
  const { key } = options
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', typeof key, 'must be text')
  const letters = key.replaceAll(/[^A-Za-z]/g, '').toUpperCase()
  if (letters.length === 0)
    throw new InvalidOptionError('key', `${key.length} characters`, 'must contain an ASCII letter')
  return Array.from(letters, (letter) => letter.codePointAt(0)! - 65)
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
    const needed = input.replaceAll(/[^A-Za-z]/g, '').length
    if (needed > shifts.length)
      throw new InvalidOptionError(
        'key',
        `${shifts.length} letters`,
        `the text has ${needed}, and a running key never goes round again`,
      )
    const sign = operation === 'encode' ? 1 : -1
    let position = 0
    const output = Array.from(input, (character) => {
      const isUpper = character >= 'A' && character <= 'Z'
      const isLower = character >= 'a' && character <= 'z'
      if (!isUpper && !isLower) return character
      const value = character.toUpperCase().codePointAt(0)! - 65
      const result = String.fromCodePoint(((value + shifts[position]! * sign + 26) % 26) + 65)
      position++
      return preserveCase && isLower ? result.toLowerCase() : result
    }).join('')
    return {
      text: output,
      cipher: 'running-key',
      operation,
      options: { keyUsed: needed, preserveCase, stripNonAlpha },
    }
  } catch (error) {
    throw normalizeError(error, 'running-key')
  }
}

export class RunningKey extends Cipher {
  name(): string {
    return 'running-key'
  }

  info(): CipherInfo {
    return {
      name: 'running-key',
      label: 'Running key',
      description:
        'Vigenère with a passage of a book for a key, as long as the text and never repeated',
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
            'Passage with at least one ASCII letter per letter of the text; only its letters count, ignoring case',
        },
      ],
      keyspace: '26^textLength',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
