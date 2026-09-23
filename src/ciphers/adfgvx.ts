import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { decodeColumnar, encodeColumnar, getOpt } from '../core/utils'
import { normalizeError } from '../core/errors'

const ADFGVX_LETTERS = 'ADFGVX'
const GRID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// 6×6 grid: 26 letters + 10 digits, keyed
function buildAdfgvxGrid(key?: string): { grid: string[][]; pos: Map<string, [number, number]> } {
  const seen = new Set<string>()
  const chars: string[] = []
  const candidates = `${(key ?? '').toUpperCase()}${GRID_ALPHABET}`
  for (const character of candidates) {
    if (!GRID_ALPHABET.includes(character) || seen.has(character)) continue
    seen.add(character)
    chars.push(character)
  }
  const grid: string[][] = []
  const pos = new Map<string, [number, number]>()
  for (let r = 0; r < 6; r++) {
    grid[r] = []
    for (let c = 0; c < 6; c++) {
      const ch = chars[r * 6 + c]!
      grid[r]![c] = ch
      pos.set(ch, [r, c])
    }
  }
  return { grid, pos }
}

function encodeAdfgvx(text: string, key: string, transposition: string): string {
  const { pos } = buildAdfgvxGrid(key)
  const normalized = text.toUpperCase().replaceAll(/[^A-Z0-9]/g, '')
  let result = ''
  for (const c of normalized) {
    const p = pos.get(c)
    if (p) {
      result += (ADFGVX_LETTERS[p[0]] ?? '') + (ADFGVX_LETTERS[p[1]] ?? '')
    }
  }
  return transposition ? encodeColumnar(result, transposition) : result
}

function decodeAdfgvx(text: string, key: string, transposition: string): string {
  const { grid } = buildAdfgvxGrid(key)
  const letters = text.toUpperCase().replaceAll(/[^ADFGVX]/g, '')
  const clean = transposition ? decodeColumnar(letters, transposition) : letters
  let result = ''
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const r = ADFGVX_LETTERS.indexOf(clean[i]!)
    const c = ADFGVX_LETTERS.indexOf(clean[i + 1]!)
    if (r >= 0 && c >= 0) result += grid[r]![c]
  }
  return result
}

export class Adfgvx extends Cipher {
  name(): string {
    return 'adfgvx'
  }

  info(): CipherInfo {
    return {
      name: 'adfgvx',
      label: 'ADFGVX',
      description:
        'WWI fractionation cipher: a 6×6 grid (letters+digits) coded as ADFGVX pairs, then an optional columnar transposition',
      family: 'fractionation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: false,
          default: '',
          description: 'Optional keyword for the 6×6 grid',
        },
        {
          name: 'transposition',
          type: 'string',
          required: false,
          default: '',
          description: 'Keyword for the columnar transposition step; empty skips it',
        },
      ],
      keyspace: '36! grids × n! column orders',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const key = getOpt<string>(options ?? {}, 'key', '')
      const transposition = getOpt<string>(options ?? {}, 'transposition', '')
      return {
        text: encodeAdfgvx(text, key, transposition),
        cipher: 'adfgvx',
        operation: 'encode',
        options: { key, transposition },
      }
    } catch (e) {
      throw normalizeError(e, 'adfgvx')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const key = getOpt<string>(options ?? {}, 'key', '')
      const transposition = getOpt<string>(options ?? {}, 'transposition', '')
      return {
        text: decodeAdfgvx(text, key, transposition),
        cipher: 'adfgvx',
        operation: 'decode',
        options: { key, transposition },
      }
    } catch (e) {
      throw normalizeError(e, 'adfgvx')
    }
  }
}
