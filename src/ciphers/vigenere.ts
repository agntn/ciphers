import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { getOpt, processBaseOptions } from '../core/utils'
import { MissingOptionError, InvalidOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

function vigenereProcess(
  text: string,
  key: string,
  decrypt: boolean,
  preserveCase: boolean,
  stripNonAlpha: boolean,
): string {
  let input = text
  if (stripNonAlpha) input = input.replaceAll(/[^A-Za-z]/g, '')
  const keyUpper = key.toUpperCase().replaceAll(/[^A-Z]/g, '')
  if (keyUpper.length === 0)
    throw new InvalidOptionError('key', key, 'must contain at least one letter')
  let ki = 0
  return Array.from(input, (c) => {
    const isUpper = c >= 'A' && c <= 'Z'
    const isLower = c >= 'a' && c <= 'z'
    if (!isUpper && !isLower) return c
    const upper = isUpper ? c : c.toUpperCase()
    const x = upper.codePointAt(0)! - 65
    const shift = keyUpper.codePointAt(ki % keyUpper.length)! - 65
    const effective = decrypt ? (26 - shift) % 26 : shift
    const code = (((x + effective) % 26) + 26) % 26
    ki++
    const result = String.fromCodePoint(code + 65)
    return preserveCase && isLower ? result.toLowerCase() : result
  }).join('')
}

function validate(opts: Readonly<CipherBaseOptions>): {
  key: string
  preserveCase: boolean
  stripNonAlpha: boolean
} {
  const key = getOpt<string | undefined>(opts, 'key', undefined)
  if (!key) throw new MissingOptionError('key')
  const base = processBaseOptions(opts)
  return { key, ...base }
}

class Vigenere extends Cipher {
  name(): string {
    return 'vigenere'
  }

  info(): CipherInfo {
    return {
      name: 'vigenere',
      label: 'Vigenère',
      description: 'Polyalphabetic substitution — repeating keyword shifts letters',
      family: 'polyalphabetic',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Keyword (letters only, case-insensitive)',
        },
      ],
      keyspace: '26^keyLength',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { key, preserveCase, stripNonAlpha } = validate(options ?? {})
      return {
        text: vigenereProcess(text, key, false, preserveCase, stripNonAlpha),
        cipher: 'vigenere',
        operation: 'encode',
        options: { key, preserveCase, stripNonAlpha },
      }
    } catch (e) {
      throw normalizeError(e, 'vigenere')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { key, preserveCase, stripNonAlpha } = validate(options ?? {})
      return {
        text: vigenereProcess(text, key, true, preserveCase, stripNonAlpha),
        cipher: 'vigenere',
        operation: 'decode',
        options: { key, preserveCase, stripNonAlpha },
      }
    } catch (e) {
      throw normalizeError(e, 'vigenere')
    }
  }
}

register('vigenere', Vigenere)
