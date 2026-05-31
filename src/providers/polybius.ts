import type { CipherProvider, CipherInfo, CipherResult, EncodeOptions, DecodeOptions } from '../core/types'
import { normalizeError } from '../core/errors'
import { register } from '../core/registry'

function buildSquare(key?: string): { square: string[][]; pos: Map<string, string> } {
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
  const pos = new Map<string, string>()
  for (let r = 0; r < 5; r++) {
    square[r] = []
    for (let c = 0; c < 5; c++) {
      const ch = letters[r * 5 + c]
      square[r][c] = ch
      pos.set(ch, `${r + 1}${c + 1}`)
    }
  }
  return { square, pos }
}

class PolybiusProvider implements CipherProvider {
  name(): string { return 'polybius' }

  info(): CipherInfo {
    return {
      name: 'polybius',
      label: 'Polybius Square',
      description: 'Fractionation — each letter → two digits (row,col) in a 5×5 grid (I/J share)',
      family: 'fractionation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: false, default: '', description: 'Optional keyword for the 5×5 table' },
      ],
      keyspace: '1 (standard) or 25! (keyed)',
    }
  }

  encode(text: string, options?: EncodeOptions): CipherResult {
    try {
      const key = (options?.key as string) ?? ''
      const { pos } = buildSquare(key)
      const result = Array.from(text.toUpperCase(), (c) => {
        const ch = c === 'J' ? 'I' : c
        return pos.get(ch) ?? c
      }).join('')
      return { text: result, cipher: 'polybius', operation: 'encode', options: { key } }
    } catch (e) { throw normalizeError(e, 'polybius') }
  }

  decode(text: string, options?: DecodeOptions): CipherResult {
    try {
      const key = (options?.key as string) ?? ''
      const { square } = buildSquare(key)
      const digits = text.replace(/[^0-9]/g, '')
      let result = ''
      for (let i = 0; i + 1 < digits.length; i += 2) {
        const r = parseInt(digits[i]) - 1
        const c = parseInt(digits[i + 1]) - 1
        if (r >= 0 && r < 5 && c >= 0 && c < 5) result += square[r][c]
        else result += digits[i] + digits[i + 1]
      }
      return { text: result, cipher: 'polybius', operation: 'decode', options: { key } }
    } catch (e) { throw normalizeError(e, 'polybius') }
  }
}

register('polybius', () => new PolybiusProvider())
