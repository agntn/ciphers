import type { CipherProvider, CipherInfo, CipherResult, EncodeOptions, DecodeOptions } from '../core/types'
import { register } from '../core/registry'

function rot13(text: string): string {
  return Array.from(text, (c) => {
    if (c >= 'A' && c <= 'Z') return String.fromCharCode(((c.charCodeAt(0) - 65 + 13) % 26) + 65)
    if (c >= 'a' && c <= 'z') return String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97)
    return c
  }).join('')
}

class Rot13Provider implements CipherProvider {
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

  encode(text: string, _options?: EncodeOptions): CipherResult {
    return { text: rot13(text), cipher: 'rot13', operation: 'encode', options: {} }
  }

  decode(text: string, _options?: DecodeOptions): CipherResult {
    return { text: rot13(text), cipher: 'rot13', operation: 'decode', options: {} }
  }
}

register('rot13', () => new Rot13Provider())
