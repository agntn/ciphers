import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { normalizeError } from '../core/errors'
import { register } from '../core/registry'
import { buildPolybiusSquare, getOpt } from '../core/utils'

class Polybius extends Cipher {
  name(): string {
    return 'polybius'
  }

  info(): CipherInfo {
    return {
      name: 'polybius',
      label: 'Polybius Square',
      description: 'Fractionation — each letter → two digits (row,col) in a 5×5 grid (I/J share)',
      family: 'fractionation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: false,
          default: '',
          description: 'Optional keyword for the 5×5 table',
        },
      ],
      keyspace: '1 (standard) or 25! (keyed)',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const key = getOpt<string>(options ?? {}, 'key', '')
      const { pos } = buildPolybiusSquare(key)
      const encoded: string[] = []
      for (const c of text.toUpperCase()) {
        const ch = c === 'J' ? 'I' : c
        const p = pos.get(ch)
        if (p) {
          encoded.push(`${p[0]}${p[1]}`)
        }
      }
      return { text: encoded.join(' '), cipher: 'polybius', operation: 'encode', options: { key } }
    } catch (e) {
      throw normalizeError(e, 'polybius')
    }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const key = getOpt<string>(options ?? {}, 'key', '')
      const { square } = buildPolybiusSquare(key)
      const pairs = text.trim().split(/\s+/)
      let result = ''
      for (const pair of pairs) {
        if (/^\d{2}$/.test(pair)) {
          const r = parseInt(pair[0]!) - 1
          const c = parseInt(pair[1]!) - 1
          if (r >= 0 && r < 5 && c >= 0 && c < 5) {
            result += square[r]![c]
          } else {
            result += pair
          }
        } else {
          result += pair
        }
      }
      return { text: result, cipher: 'polybius', operation: 'decode', options: { key } }
    } catch (e) {
      throw normalizeError(e, 'polybius')
    }
  }
}

register('polybius', Polybius)
