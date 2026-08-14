import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { getOpt } from '../core/utils'
import { InvalidOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

function encodeRailFence(text: string, rails: number): string {
  const chars = Array.from(text)
  if (chars.length < 2 || rails >= chars.length) return text
  const rows: string[][] = Array.from({ length: rails }, () => [])
  let row = 0
  let dir = 1
  for (const c of chars) {
    rows[row]!.push(c)
    if (row === 0) dir = 1
    else if (row === rails - 1) dir = -1
    row += dir
  }
  return rows.map((r) => r.join('')).join('')
}

function decodeRailFence(cipher: string, rails: number): string {
  const chars = Array.from(cipher)
  if (chars.length < 2 || rails >= chars.length) return cipher
  const n = chars.length
  const pattern: number[] = []
  let row = 0
  let dir = 1
  for (let i = 0; i < n; i++) {
    pattern.push(row)
    if (row === 0) dir = 1
    else if (row === rails - 1) dir = -1
    row += dir
  }
  const railPositions: number[][] = Array.from({ length: rails }, () => [])
  for (let i = 0; i < n; i++) railPositions[pattern[i]!]!.push(i)
  const result = Array.from({ length: n }, () => '')
  let idx = 0
  for (let r = 0; r < rails; r++) {
    for (const pos of railPositions[r]!) {
      result[pos] = chars[idx++]!
    }
  }
  return result.join('')
}

function validate(opts: CipherBaseOptions): { rails: number } {
  const rails = getOpt<number>(opts, 'rails', 3)
  if (!Number.isInteger(rails) || rails < 2)
    throw new InvalidOptionError('rails', rails, 'must be integer >= 2')
  return { rails }
}

class RailFence extends Cipher {
  name(): string {
    return 'rail-fence'
  }

  info(): CipherInfo {
    return {
      name: 'rail-fence',
      label: 'Rail Fence',
      description: 'Transposition cipher — text written in zigzag pattern across N rails',
      family: 'transposition',
      selfInverse: false,
      options: [
        {
          name: 'rails',
          type: 'number',
          required: false,
          default: 3,
          description: 'Number of rails (2 or more)',
        },
      ],
      keyspace: '~n (number of rails)',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { rails } = validate(options ?? {})
      return {
        text: encodeRailFence(text, rails),
        cipher: 'rail-fence',
        operation: 'encode',
        options: { rails },
      }
    } catch (e) {
      throw normalizeError(e, 'rail-fence')
    }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { rails } = validate(options ?? {})
      return {
        text: decodeRailFence(text, rails),
        cipher: 'rail-fence',
        operation: 'decode',
        options: { rails },
      }
    } catch (e) {
      throw normalizeError(e, 'rail-fence')
    }
  }
}

register('rail-fence', RailFence)
