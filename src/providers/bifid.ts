import type { CipherProvider, CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { normalizeError } from '../core/errors'
import { register } from '../core/registry'
import { buildPolybiusSquare, getOpt } from '../core/utils'

// Bifid cipher: combines Polybius fractionation with transposition
// Encode: get row/col for each letter, concatenate all rows then all cols
// Group by period, interleave back, map to letters

function encodeBifid(text: string, key: string, period: number): string {
  const { pos, square } = buildPolybiusSquare(key)
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
    const combined = [...rows, ...cols]
    for (let j = 0; j + 1 < combined.length; j += 2) {
      const r = combined[j]! - 1
      const c = combined[j + 1]! - 1
      result += square[r]![c]
    }
  }
  return result
}

function decodeBifid(text: string, key: string, period: number): string {
  const { pos, square } = buildPolybiusSquare(key)
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I')
  let result = ''
  for (let i = 0; i < clean.length; i += period) {
    const chunk = clean.slice(i, i + period)
    const coords: number[] = []
    for (const c of chunk) {
      const p = pos.get(c)
      if (p) { coords.push(p[0], p[1]) }
    }
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
  return {
    key: getOpt<string>(opts, 'key', ''),
    period: getOpt<number>(opts, 'period', 5),
  }
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
