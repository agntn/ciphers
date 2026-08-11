import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { normalizeError } from '../core/errors'
import { register } from '../core/registry'

const BACON_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' // 26 letters (standard Bacon uses 24 with I/J merged; this variant keeps all 26)
// Standard: A=AAAAA, B=AAAAB, C=AAABA, D=AAABB, E=AABAA, ...
// For encoding: uppercase=A(0), lowercase=B(1) in hidden message

function toBacon(char: string): string | null {
  const idx = BACON_ALPHABET.indexOf(char.toUpperCase())
  if (idx < 0) return null
  return idx.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B')
}

function fromBacon(code: string): string {
  const binary = code.replace(/A/g, '0').replace(/B/g, '1')
  const idx = parseInt(binary, 2)
  return BACON_ALPHABET[idx] ?? '?'
}

function encodeBacon(text: string, stripNonAlpha: boolean): string {
  let input = text
  if (stripNonAlpha) input = input.replace(/[^A-Za-z]/g, '')
  let result = ''
  for (const c of input.toUpperCase()) {
    const code = toBacon(c)
    if (code) result += code
  }
  return result
}

function decodeBacon(text: string): string {
  const clean = text.toUpperCase().replace(/[^AB]/g, '')
  let result = ''
  for (let i = 0; i + 4 < clean.length; i += 5) {
    result += fromBacon(clean.slice(i, i + 5))
  }
  return result
}

class Bacon extends Cipher {
  name(): string { return 'bacon' }

  info(): CipherInfo {
    return {
      name: 'bacon',
      label: "Bacon's Cipher",
      description: 'Binary encoding — each letter → 5-bit A/B pattern (steganographic origin)',
      family: 'fractionation',
      selfInverse: false,
      options: [],
      keyspace: '1 (fixed 5-bit encoding)',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      return { text: encodeBacon(text, options?.stripNonAlpha ?? false), cipher: 'bacon', operation: 'encode', options: {} }
    } catch (e) { throw normalizeError(e, 'bacon') }
  }

  decode(text: string, _options?: CipherBaseOptions): CipherResult {
    try {
      return { text: decodeBacon(text), cipher: 'bacon', operation: 'decode', options: {} }
    } catch (e) { throw normalizeError(e, 'bacon') }
  }
}

register('bacon', Bacon)
