import type { CipherProvider, CipherInfo, CipherResult, EncodeOptions, DecodeOptions } from '../core/types'
import { InvalidOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

function shiftChar(c: string, shift: number, preserveCase: boolean): string {
  const isUpper = c >= 'A' && c <= 'Z'
  const isLower = c >= 'a' && c <= 'z'
  if (!isUpper && !isLower) return c
  const base = isUpper ? 65 : 97
  const preserve = preserveCase ?? true
  const effectiveBase = preserve ? base : 65
  const code = (c.charCodeAt(0) - effectiveBase + shift) % 26
  return String.fromCharCode((code < 0 ? code + 26 : code) + effectiveBase)
}

function process(text: string, shift: number, preserveCase: boolean): string {
  return Array.from(text, (c) => shiftChar(c, shift, preserveCase)).join('')
}

class CaesarProvider implements CipherProvider {
  name(): string { return 'caesar' }

  info(): CipherInfo {
    return {
      name: 'caesar',
      label: 'Caesar Cipher',
      description: 'Shift cipher — each letter shifted by N positions in the alphabet',
      family: 'substitution-shift',
      selfInverse: false,
      options: [
        { name: 'shift', type: 'number', required: false, default: 3, description: 'Number of positions to shift (1-25)' },
      ],
      keyspace: '25 (shift 0 is identity)',
    }
  }

  encode(text: string, options?: EncodeOptions): CipherResult {
    try {
      const shift = (options?.shift as number) ?? 3
      if (!Number.isInteger(shift) || shift < 1 || shift > 25) {
        throw new InvalidOptionError('shift', shift, 'must be integer 1-25')
      }
      const preserveCase = options?.preserveCase ?? true
      return { text: process(text, shift, preserveCase), cipher: 'caesar', operation: 'encode', options: { shift, preserveCase } }
    } catch (e) { throw normalizeError(e, 'caesar') }
  }

  decode(text: string, options?: DecodeOptions): CipherResult {
    try {
      const shift = (options?.shift as number) ?? 3
      if (!Number.isInteger(shift) || shift < 1 || shift > 25) {
        throw new InvalidOptionError('shift', shift, 'must be integer 1-25')
      }
      const preserveCase = options?.preserveCase ?? true
      return { text: process(text, 26 - shift, preserveCase), cipher: 'caesar', operation: 'decode', options: { shift, preserveCase } }
    } catch (e) { throw normalizeError(e, 'caesar') }
  }
}

register('caesar', () => new CaesarProvider())
