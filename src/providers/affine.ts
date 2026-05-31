import type { CipherProvider, CipherInfo, CipherResult, EncodeOptions, DecodeOptions } from '../core/types'
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

function affineProcess(text: string, a: number, b: number, decrypt: boolean): string {
  return Array.from(text, (c) => {
    const isUpper = c >= 'A' && c <= 'Z'
    const isLower = c >= 'a' && c <= 'z'
    if (!isUpper && !isLower) return c
    const base = isUpper ? 65 : 97
    const x = c.charCodeAt(0) - base
    const result = decrypt
      ? (modInverse(a, 26) * (x - b + 26)) % 26
      : (a * x + b) % 26
    return String.fromCharCode(((result % 26) + 26) % 26 + base)
  }).join('')
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

  encode(text: string, options?: EncodeOptions): CipherResult {
    try {
      const a = (options?.a as number) ?? 5
      const b = (options?.b as number) ?? 8
      if (!Number.isInteger(a) || a < 1 || a > 25) throw new InvalidOptionError('a', a, 'must be integer 1-25')
      if (!Number.isInteger(b) || b < 0 || b > 25) throw new InvalidOptionError('b', b, 'must be integer 0-25')
      if (gcd(a, 26) !== 1) throw new InvalidOptionError('a', a, 'must be coprime with 26 (gcd(a,26)=1)')
      return { text: affineProcess(text, a, b, false), cipher: 'affine', operation: 'encode', options: { a, b } }
    } catch (e) { throw normalizeError(e, 'affine') }
  }

  decode(text: string, options?: DecodeOptions): CipherResult {
    try {
      const a = (options?.a as number) ?? 5
      const b = (options?.b as number) ?? 8
      if (!Number.isInteger(a) || a < 1 || a > 25) throw new InvalidOptionError('a', a, 'must be integer 1-25')
      if (!Number.isInteger(b) || b < 0 || b > 25) throw new InvalidOptionError('b', b, 'must be integer 0-25')
      if (gcd(a, 26) !== 1) throw new InvalidOptionError('a', a, 'must be coprime with 26 (gcd(a,26)=1)')
      return { text: affineProcess(text, a, b, true), cipher: 'affine', operation: 'decode', options: { a, b } }
    } catch (e) { throw normalizeError(e, 'affine') }
  }
}

register('affine', () => new AffineProvider())
