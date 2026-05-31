import type { CipherProvider, CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { getOpt, processBaseOptions } from '../core/utils'
import { InvalidOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b) }

function modInverse(a: number, m: number): number {
  let [old_r, r] = [a % m, m]
  let [old_s, s] = [1, 0]
  while (r !== 0) {
    const q = Math.floor(old_r / r)
    ;[old_r, r] = [r, old_r - q * r]
    ;[old_s, s] = [s, old_s - q * s]
  }
  return ((old_s % m) + m) % m
}

function affineProcess(text: string, a: number, b: number, decrypt: boolean, preserveCase: boolean, stripNonAlpha: boolean): string {
  let input = text
  if (stripNonAlpha) input = input.replace(/[^A-Za-z]/g, '')
  const aInv = decrypt ? modInverse(a, 26) : a
  return Array.from(input, (c) => {
    const isUpper = c >= 'A' && c <= 'Z'
    const isLower = c >= 'a' && c <= 'z'
    if (!isUpper && !isLower) return c
    const upper = isUpper ? c : c.toUpperCase()
    const x = upper.charCodeAt(0) - 65
    const result = decrypt
      ? (aInv * ((x - b + 26) % 26)) % 26
      : (a * x + b) % 26
    const code = String.fromCharCode(((result % 26) + 26) % 26 + 65)
    return preserveCase && isLower ? code.toLowerCase() : code
  }).join('')
}

function validate(opts: CipherBaseOptions): { a: number; b: number; preserveCase: boolean; stripNonAlpha: boolean } {
  const a = getOpt<number>(opts, "a", 5)
  const b = getOpt<number>(opts, "b", 8)
  if (!Number.isInteger(a) || a < 1 || a > 25) throw new InvalidOptionError('a', a, 'must be integer 1-25')
  if (!Number.isInteger(b) || b < 0 || b > 25) throw new InvalidOptionError('b', b, 'must be integer 0-25')
  if (gcd(a, 26) !== 1) throw new InvalidOptionError('a', a, 'must be coprime with 26 (gcd(a,26)=1)')
  const base = processBaseOptions(opts as Record<string, unknown>)
  return { a, b, ...base }
}

class AffineProvider implements CipherProvider {
  name(): string { return 'affine' }

  info(): CipherInfo {
    return {
      name: 'affine',
      label: 'Affine Cipher',
      description: 'Monoalphabetic arithmetic — E(x) = (a·x + b) mod 26, requires gcd(a,26)=1',
      family: 'substitution-multiplicative',
      selfInverse: false,
      options: [
        { name: 'a', type: 'number', required: false, default: 5, description: 'Multiplier (must be coprime with 26: 1,3,5,7,9,11,15,17,19,21,23,25)' },
        { name: 'b', type: 'number', required: false, default: 8, description: 'Additive shift (0-25)' },
      ],
      keyspace: '12 × 26 = 312 (12 valid multipliers × 26 shifts)',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { a, b, preserveCase, stripNonAlpha } = validate(options ?? {})
      return { text: affineProcess(text, a, b, false, preserveCase, stripNonAlpha), cipher: 'affine', operation: 'encode', options: { a, b } }
    } catch (e) { throw normalizeError(e, 'affine') }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { a, b, preserveCase, stripNonAlpha } = validate(options ?? {})
      return { text: affineProcess(text, a, b, true, preserveCase, stripNonAlpha), cipher: 'affine', operation: 'decode', options: { a, b } }
    } catch (e) { throw normalizeError(e, 'affine') }
  }
}

register('affine', () => new AffineProvider())
