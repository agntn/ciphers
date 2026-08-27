import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { CipherError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

// Tap code uses a 5×5 Polybius square (C/K share)
//   1  2  3  4  5
// 1 A  B  C  D  E
// 2 F  G  H  I  J
// 3 L  M  N  O  P
// 4 Q  R  S  T  U
// 5 V  W  X  Y  Z
// C and K share position (1,3)

const TAP_TABLE = [
  ['A', 'B', 'C', 'D', 'E'],
  ['F', 'G', 'H', 'I', 'J'],
  ['L', 'M', 'N', 'O', 'P'],
  ['Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z'],
]

function tapLookup(char: string): string | null {
  const c = char.toUpperCase()
  const effective = c === 'K' ? 'C' : c
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < 5; col++) {
      if (TAP_TABLE[r]![col] === effective) {
        return `${r + 1} ${col + 1}`
      }
    }
  }
  return null
}

function tapReverse(r: number, c: number): string {
  if (r >= 1 && r <= 5 && c >= 1 && c <= 5) return TAP_TABLE[r - 1]![c - 1]!
  return '?'
}

function encodeTapCode(text: string): string {
  const parts: string[] = []
  for (const c of text.toUpperCase()) {
    if (c === ' ') continue // spaces dropped (tap code is positional)
    const pair = tapLookup(c)
    if (pair) parts.push(pair)
  }
  return parts.join(' ')
}

function decodeTapCode(text: string): string {
  // Input: space-separated digit pairs like "2 3 1 5 3 1 3 1 3 4"
  const trimmed = text.trim()
  if (trimmed === '') return ''
  const tokens = trimmed.split(/\s+/)
  const nums: number[] = []
  for (const token of tokens) {
    const n = Number(token)
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new CipherError(`Invalid tap code coordinate: ${token}`)
    }
    nums.push(n)
  }
  if (nums.length % 2 !== 0) {
    throw new CipherError(`Invalid tap code: odd number of coordinates (${nums.length})`)
  }
  let result = ''
  for (let i = 0; i < nums.length; i += 2) {
    result += tapReverse(nums[i]!, nums[i + 1]!)
  }
  return result
}

class TapCode extends Cipher {
  name(): string {
    return 'tap-code'
  }

  info(): CipherInfo {
    return {
      name: 'tap-code',
      label: 'Tap Code',
      description: '5×5 grid pairs (C/K share) — used by Vietnam War POWs, communicated via knocks',
      family: 'fractionation',
      selfInverse: false,
      options: [],
      keyspace: '1 (fixed 5×5 grid)',
    }
  }

  encode(text: string, _options?: CipherBaseOptions): CipherResult {
    try {
      return { text: encodeTapCode(text), cipher: 'tap-code', operation: 'encode', options: {} }
    } catch (e) {
      throw normalizeError(e, 'tap-code')
    }
  }

  decode(text: string, _options?: CipherBaseOptions): CipherResult {
    try {
      return { text: decodeTapCode(text), cipher: 'tap-code', operation: 'decode', options: {} }
    } catch (e) {
      throw normalizeError(e, 'tap-code')
    }
  }
}

register('tap-code', TapCode)
