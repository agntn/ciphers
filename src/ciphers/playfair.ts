import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { buildPolybiusSquare, getOpt } from '../core/utils'
import { MissingOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

// Uses shared buildPolybiusSquare (1-indexed positions)

function prepareText(text: string): string[] {
  const clean = text
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .replace(/J/g, 'I')
  const bigrams: string[] = []
  let i = 0
  while (i < clean.length) {
    const a = clean[i]!
    const b = i + 1 < clean.length ? clean[i + 1]! : 'X'
    if (a === b) {
      bigrams.push(a + 'X')
      i++
    } else {
      bigrams.push(a + b)
      i += 2
    }
  }
  if (bigrams.length > 0 && bigrams[bigrams.length - 1]!.length === 1) {
    bigrams[bigrams.length - 1]! += 'X'
  }
  return bigrams
}

function pairCiphertext(text: string): string[] {
  const clean = text
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .replace(/J/g, 'I')
  const bigrams: string[] = []
  for (let i = 0; i < clean.length; i += 2) {
    bigrams.push(clean[i]! + (clean[i + 1] ?? 'X'))
  }
  return bigrams
}

function processPlayfair(text: string, key: string, decrypt: boolean): string {
  const { square: table, pos: pos1 } = buildPolybiusSquare(key)
  // Convert 1-indexed to 0-indexed for Playfair table lookups
  const pos = new Map<string, [number, number]>()
  for (const [k, [r, c]] of pos1) pos.set(k, [r - 1, c - 1])
  const bigrams = decrypt ? pairCiphertext(text) : prepareText(text)
  const at = (r: number, c: number) => table[(r + 5) % 5]![(c + 5) % 5]!
  const result: string[] = []
  for (const bg of bigrams) {
    const [r1, c1] = pos.get(bg[0]!)!
    const [r2, c2] = pos.get(bg[1]!)!
    if (r1 === r2) {
      const dir = decrypt ? -1 : 1
      result.push(at(r1, c1 + dir) + at(r2, c2 + dir))
    } else if (c1 === c2) {
      const dir = decrypt ? 1 : -1
      result.push(at(r1 + dir, c1) + at(r2 + dir, c2))
    } else {
      result.push(at(r1, c2) + at(r2, c1))
    }
  }
  return result.join('')
}

function validate(opts: CipherBaseOptions): { key: string } {
  const key = getOpt<string | undefined>(opts, 'key', undefined)
  if (!key) throw new MissingOptionError('key')
  return { key }
}

class Playfair extends Cipher {
  name(): string {
    return 'playfair'
  }

  info(): CipherInfo {
    return {
      name: 'playfair',
      label: 'Playfair',
      description:
        'Digraph substitution — encrypts letter pairs using a 5×5 key table (I/J share cell)',
      family: 'digraph',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Keyword for the 5×5 table (letters only)',
        },
      ],
      keyspace: '25! ≈ 1.5×10²⁵',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { key } = validate(options ?? {})
      return {
        text: processPlayfair(text, key, false),
        cipher: 'playfair',
        operation: 'encode',
        options: { key },
      }
    } catch (e) {
      throw normalizeError(e, 'playfair')
    }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { key } = validate(options ?? {})
      return {
        text: processPlayfair(text, key, true),
        cipher: 'playfair',
        operation: 'decode',
        options: { key },
      }
    } catch (e) {
      throw normalizeError(e, 'playfair')
    }
  }
}

register('playfair', Playfair)
