import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { register } from '../core/registry'

function rot13(text: string, stripNonAlpha: boolean): string {
  let input = text
  if (stripNonAlpha) input = input.replace(/[^A-Za-z]/g, '')
  return Array.from(input, (c) => {
    if (c >= 'A' && c <= 'Z') return String.fromCharCode(((c.charCodeAt(0) - 65 + 13) % 26) + 65)
    if (c >= 'a' && c <= 'z') return String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97)
    return c
  }).join('')
}

class Rot13 extends Cipher {
  name(): string { return 'rot13' }

  info(): CipherInfo {
    return {
      name: 'rot13',
      label: 'ROT-13',
      description: 'Fixed shift by 13 — self-inverse (encode = decode)',
      family: 'substitution-shift',
      selfInverse: true,
      options: [],
      keyspace: '1 (fixed shift=13)',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    return { text: rot13(text, options?.stripNonAlpha ?? false), cipher: 'rot13', operation: 'encode', options: {} }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    return { text: rot13(text, options?.stripNonAlpha ?? false), cipher: 'rot13', operation: 'decode', options: {} }
  }
}

register('rot13', Rot13)
