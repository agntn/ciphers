import type { CipherProvider, CipherInfo, CipherResult, EncodeOptions, DecodeOptions } from '../core/types'
import { MissingOptionError, InvalidOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

function vigenere(text: string, key: string, decrypt: boolean): string {
  const keyUpper = key.toUpperCase().replace(/[^A-Z]/g, '')
  if (keyUpper.length === 0) throw new InvalidOptionError('key', key, 'must contain at least one letter')
  let ki = 0
  return Array.from(text, (c) => {
    const isUpper = c >= 'A' && c <= 'Z'
    const isLower = c >= 'a' && c <= 'z'
    if (!isUpper && !isLower) return c
    const base = isUpper ? 65 : 97
    const shift = keyUpper.charCodeAt(ki % keyUpper.length) - 65
    const effective = decrypt ? (26 - shift) % 26 : shift
    const code = (c.charCodeAt(0) - base + effective) % 26
    ki++
    return String.fromCharCode(code + base)
  }).join('')
}

class VigenereProvider implements CipherProvider {
  name(): string { return 'vigenere' }

  info(): CipherInfo {
    return {
      name: 'vigenere',
      label: 'Vigenère',
      description: 'Polyalphabetic substitution — repeating keyword shifts letters',
      family: 'polyalphabetic',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true, description: 'Keyword (letters only, case-insensitive)' },
      ],
      keyspace: '26^keyLength',
    }
  }

  encode(text: string, options?: EncodeOptions): CipherResult {
    try {
      const key = options?.key as string
      if (!key) throw new MissingOptionError('key')
      return { text: vigenere(text, key, false), cipher: 'vigenere', operation: 'encode', options: { key } }
    } catch (e) { throw normalizeError(e, 'vigenere') }
  }

  decode(text: string, options?: DecodeOptions): CipherResult {
    try {
      const key = options?.key as string
      if (!key) throw new MissingOptionError('key')
      return { text: vigenere(text, key, true), cipher: 'vigenere', operation: 'decode', options: { key } }
    } catch (e) { throw normalizeError(e, 'vigenere') }
  }
}

register('vigenere', () => new VigenereProvider())
