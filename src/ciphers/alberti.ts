import type { CipherBaseOptions, CipherInfo, CipherResult } from '../core/types'
import { Cipher } from '../core/cipher'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'
import { getOpt, processBaseOptions } from '../core/utils'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function isAsciiLetter(character: string): boolean {
  const point = character.codePointAt(0)!
  return (point >= 65 && point <= 90) || (point >= 97 && point <= 122)
}

function parseOptions(options: Readonly<CipherBaseOptions>): {
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
  const input = stripNonAlpha ? text.replaceAll(/[^A-Za-z]/g, '') : text
  let sourceDisk = ALPHABET
  let targetDisk = innerDisk
  let direction = 1
  if (decrypt) {
    sourceDisk = innerDisk
    targetDisk = ALPHABET
    direction = -1
  }

  let output = ''
  let position = 0
  for (const character of input) {
    if (!isAsciiLetter(character)) {
      output += character
      continue
    }

    const isLower = character >= 'a'
    const upper = isLower ? character.toUpperCase() : character
    const rotation = Math.floor(position / period) % 26
    const index = (sourceDisk.indexOf(upper) + direction * rotation + 26) % 26
    const transformed = targetDisk[index]!
    output += preserveCase && isLower ? transformed.toLowerCase() : transformed
    position++
  }
  return output
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

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
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

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
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
