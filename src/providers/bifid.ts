import type { CipherProvider, CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { getOpt } from '../core/types'
import { normalizeError } from '../core/errors'
import { register } from '../core/registry'

// Bifid cipher: combines Polybius fractionation with transposition
// Uses a 5×5 Polybius square (I/J share)
// Encode: get row/col for each letter, concatenate all rows then all cols
// Group by period, interleave back, map to letters

function buildBifidSquare(key?: string): { square: string[][]; pos: Map<string, [number, number]> } {
  const seen = new Set<string>()
  const letters: string[] = []
  const src = (key ?? '').toUpperCase()
  for (const c of src) {
    if (c < 'A' || c > 'Z') continue
    const ch = c === 'J' ? 'I' : c
    if (!seen.has(ch)) { seen.add(ch); letters.push(ch) }
  }
  for (let i = 65; i <= 90; i++) {
    const ch = String.fromCharCode(i) === 'J' ? 'I' : String.fromCharCode(i)
    if (!seen.has(ch)) { seen.add(ch); letters.push(ch) }
  }
  const square: string[][] = []
  const pos = new Map<string, [number, number]>()
  for (let r = 0; r < 5; r++) {
    square[r] = []
    for (let c = 0; c < 5; c++) {
      const ch = letters[r * 5 + c]!
      square[r]![c] = ch
      pos.set(ch, [r + 1, c + 1]) // 1-indexed
    }
  }
  return { square, pos }
}

function encodeBifid(text: string, key: string, period: number): string {
  const { pos, square } = buildBifidSquare(key)
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I')
  let result = ''
  for (let i = 0; i < clean.length; i += period) {
    const chunk = clean.slice(i, i + period)
    const rows: number[] = []
    const cols: number[] = []
    for (const c of chunk) {
      const p = pos.get(c)
      if (p) { rows.push(p[0]); cols.push(p[1]) }
    }
    // Interleave: all rows then all cols
    const combined = [...rows, ...cols]
    for (let j = 0; j < combined.length; j += 2) {
      const r = combined[j]! - 1
      const c = combined[j + 1]! - 1
      result += square[r]![c]
    }
  }
  return result
}

function decodeBifid(text: string, key: string, period: number): string {
  const { pos, square } = buildBifidSquare(key)
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I')
  let result = ''
  for (let i = 0; i < clean.length; i += period) {
    const chunk = clean.slice(i, i + period)
    // Get row/col for each letter
    const coords: number[] = []
    for (const c of chunk) {
      const p = pos.get(c)
      if (p) { coords.push(p[0], p[1]) }
    }
    // Split: first half = rows, second half = cols
    const half = coords.length / 2
    for (let j = 0; j < half; j++) {
      const r = coords[j]! - 1
      const c = coords[half + j]! - 1
      result += square[r]![c]
    }
  }
  return result
}

function validate(opts: CipherBaseOptions): { key: string; period: number } {
  const key = getOpt<string>(opts ?? {}, 'key', '')
  const period = getOpt<number>(opts ?? {}, "period", 5)
  return { key, period }
}

class BifidProvider implements CipherProvider {
  name(): string { return 'bifid' }

  info(): CipherInfo {
    return {
      name: 'bifid',
      label: 'Bifid Cipher',
      description: 'Fractionation + transposition — Polybius row/col split, interleaved by period',
      family: 'fractionation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: false, default: '', description: 'Optional keyword for Polybius square' },
        { name: 'period', type: 'number', required: false, default: 5, description: 'Transposition period length' },
      ],
      keyspace: '25! × period variants',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { key, period } = validate(options ?? {})
      return { text: encodeBifid(text, key, period), cipher: 'bifid', operation: 'encode', options: { key, period } }
    } catch (e) { throw normalizeError(e, 'bifid') }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { key, period } = validate(options ?? {})
      return { text: decodeBifid(text, key, period), cipher: 'bifid', operation: 'decode', options: { key, period } }
    } catch (e) { throw normalizeError(e, 'bifid') }
  }
}

register('bifid', () => new BifidProvider())
