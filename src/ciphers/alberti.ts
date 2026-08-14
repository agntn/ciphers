import type { CipherBaseOptions, CipherInfo, CipherResult } from '../core/types'
import { Cipher } from '../core/cipher'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'
import { getOpt, processBaseOptions } from '../core/utils'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function parseOptions(options: CipherBaseOptions): {
  key: string
  period: number
  preserveCase: boolean
  stripNonAlpha: boolean
} {
  const rawKey = getOpt<string | undefined>(options, 'key', undefined)
  if (rawKey === undefined || rawKey === '') throw new MissingOptionError('key')
  if (typeof rawKey !== 'string' || !/^[A-Za-z]+$/.test(rawKey)) {
    throw new InvalidOptionError('key', rawKey, 'must contain ASCII letters only')
  }

  const period = getOpt<number | undefined>(options, 'period', undefined)
  if (period === undefined) throw new MissingOptionError('period')
  if (!Number.isInteger(period) || period < 1) {
    throw new InvalidOptionError('period', period, 'must be a positive integer')
  }

  const key = [...new Set(rawKey.toUpperCase())].join('')
  return { key, period, ...processBaseOptions(options) }
}

function transform(
  text: string,
  key: string,
  period: number,
  decrypt: boolean,
  preserveCase: boolean,
  stripNonAlpha: boolean,
): string {
  const innerDisk =
    key + Array.from(ALPHABET, (letter) => (key.includes(letter) ? '' : letter)).join('')
  const input = stripNonAlpha ? text.replace(/[^A-Za-z]/g, '') : text
  let position = 0

  return Array.from(input, (character) => {
    const isUpper = character >= 'A' && character <= 'Z'
    const isLower = character >= 'a' && character <= 'z'
    if (!isUpper && !isLower) return character

    const rotation = Math.floor(position / period) % 26
    const upper = isUpper ? character : character.toUpperCase()
    const index = decrypt
      ? (innerDisk.indexOf(upper) - rotation + 26) % 26
      : (ALPHABET.indexOf(upper) + rotation) % 26
    const transformed = decrypt ? ALPHABET[index]! : innerDisk[index]!
    position++
    return preserveCase && isLower ? transformed.toLowerCase() : transformed
  }).join('')
}

class Alberti extends Cipher {
  name(): string {
    return 'alberti'
  }

  info(): CipherInfo {
    return {
      name: 'alberti',
      label: 'Alberti',
      description:
        'Simplified Alberti disk cipher with a keyed inner alphabet rotated at a fixed period',
      family: 'polyalphabetic',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Keyword used to construct the movable inner disk',
        },
        {
          name: 'period',
          type: 'number',
          required: true,
          description: 'Letters processed before rotating the inner disk',
        },
      ],
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { key, period, preserveCase, stripNonAlpha } = parseOptions(options ?? {})
      return {
        text: transform(text, key, period, false, preserveCase, stripNonAlpha),
        cipher: 'alberti',
        operation: 'encode',
        options: { key, period, preserveCase, stripNonAlpha },
      }
    } catch (error) {
      throw normalizeError(error, 'alberti')
    }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { key, period, preserveCase, stripNonAlpha } = parseOptions(options ?? {})
      return {
        text: transform(text, key, period, true, preserveCase, stripNonAlpha),
        cipher: 'alberti',
        operation: 'decode',
        options: { key, period, preserveCase, stripNonAlpha },
      }
    } catch (error) {
      throw normalizeError(error, 'alberti')
    }
  }
}

register('alberti', Alberti)
