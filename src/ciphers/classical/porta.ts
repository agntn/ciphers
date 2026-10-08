import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { getOpt } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../../core/errors.ts'
import { processBaseOptions } from '../../core/utils.ts'

type PortaRotation = 'left' | 'right'

const ROTATIONS: readonly PortaRotation[] = ['left', 'right']

/**
 * One letter across to the other half of A-Z and back again under the same table.
 *
 * @param value - The letter, A as 0.
 * @param pair - The key pair, 0 for A and B up to 12 for Y and Z.
 * @param rotation - Which way the N-Z half turns.
 * @returns {number} The other letter, A as 0.
 */
function swap(value: number, pair: number, rotation: PortaRotation): number {
  const turn = rotation === 'left' ? pair : 13 - pair
  return value < 13 ? 13 + ((value + turn) % 13) : (value - turn + 13) % 13
}

function readKey(options: Readonly<CipherBaseOptions>): string {
  const { key } = options
  if (key === undefined || key === '') throw new MissingOptionError('key')
  if (typeof key !== 'string') throw new InvalidOptionError('key', key, 'must be a string')
  const letters = key.replaceAll(/[^A-Za-z]/g, '').toUpperCase()
  if (letters.length === 0)
    throw new InvalidOptionError('key', key, 'must contain at least one ASCII letter')
  return letters
}

function readRotation(options: Readonly<CipherBaseOptions>): PortaRotation {
  const rotation = getOpt<unknown>(options, 'rotation', 'left')
  if (!ROTATIONS.includes(rotation as PortaRotation)) {
    throw new InvalidOptionError('rotation', rotation, 'must be left or right')
  }
  return rotation as PortaRotation
}

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const letters = readKey(options)
    const rotation = readRotation(options)
    const { preserveCase, stripNonAlpha } = processBaseOptions(options)
    const input = stripNonAlpha ? text.replaceAll(/[^A-Za-z]/g, '') : text
    let position = 0
    const output = Array.from(input, (character) => {
      const isUpper = character >= 'A' && character <= 'Z'
      const isLower = character >= 'a' && character <= 'z'
      if (!isUpper && !isLower) return character
      const value = character.toUpperCase().codePointAt(0)! - 65
      const pair = (letters.codePointAt(position % letters.length)! - 65) >> 1
      const result = String.fromCodePoint(swap(value, pair, rotation) + 65)
      position++
      return preserveCase && isLower ? result.toLowerCase() : result
    }).join('')
    return {
      text: output,
      cipher: 'porta',
      operation,
      options: { key: options.key, rotation, preserveCase, stripNonAlpha },
    }
  } catch (error) {
    throw normalizeError(error, 'porta')
  }
}

export class Porta extends Cipher {
  name(): string {
    return 'porta'
  }

  info(): CipherInfo {
    return {
      name: 'porta',
      label: 'Porta',
      description:
        'Della Porta: 13 reciprocal tables, one per pair of key letters, swap A-M with N-Z',
      category: 'classical',
      family: 'polyalphabetic',
      selfInverse: true,
      worksOn: 'A-Z, the rest passes',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            'Repeating keyword, case-insensitive; A and B pick the same table, and so on up to Y and Z',
        },
        {
          name: 'rotation',
          type: 'string',
          required: false,
          default: 'left',
          description:
            'Which way the N-Z half turns from table to table: left as the ACA prints it, right as dCode does by default',
        },
      ],
      keyspace: '13^keyLength',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
