import type { CipherProvider, CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { InvalidOptionError, normalizeError } from '../core/errors'
import { getOpt, processBaseOptions } from '../core/utils'
import { register } from '../core/registry'

function caesarProcess(text: string, shift: number, preserveCase: boolean, stripNonAlpha: boolean): string {
  let input = text
  if (stripNonAlpha) input = input.replace(/[^A-Za-z]/g, '')
  return Array.from(input, (c) => {
    const isUpper = c >= 'A' && c <= 'Z'
    const isLower = c >= 'a' && c <= 'z'
    if (!isUpper && !isLower) return c
    const upper = isUpper ? c : c.toUpperCase()
    const x = upper.charCodeAt(0) - 65
    const code = ((x + shift) % 26 + 26) % 26
    const result = String.fromCharCode(code + 65)
    return preserveCase && isLower ? result.toLowerCase() : result
  }).join('')
}

function validate(opts: CipherBaseOptions): { shift: number; preserveCase: boolean; stripNonAlpha: boolean } {
  const shift = getOpt<number>(opts, 'shift', 3)
  if (!Number.isInteger(shift) || shift < 1 || shift > 25) {
    throw new InvalidOptionError('shift', shift, 'must be integer 1-25')
  }
  const base = processBaseOptions(opts as Record<string, unknown>)
  return { shift, ...base }
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

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { shift, preserveCase, stripNonAlpha } = validate(options ?? {})
      return { text: caesarProcess(text, shift, preserveCase, stripNonAlpha), cipher: 'caesar', operation: 'encode', options: { shift, preserveCase, stripNonAlpha } }
    } catch (e) { throw normalizeError(e, 'caesar') }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { shift, preserveCase, stripNonAlpha } = validate(options ?? {})
      return { text: caesarProcess(text, 26 - shift, preserveCase, stripNonAlpha), cipher: 'caesar', operation: 'decode', options: { shift, preserveCase, stripNonAlpha } }
    } catch (e) { throw normalizeError(e, 'caesar') }
  }
}

register('caesar', () => new CaesarProvider())
