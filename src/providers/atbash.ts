import type { CipherProvider, CipherInfo, CipherResult, EncodeOptions, DecodeOptions } from '../core/types'
import { register } from '../core/registry'

function atbash(text: string): string {
  return Array.from(text, (c) => {
    if (c >= 'A' && c <= 'Z') return String.fromCharCode(90 - (c.charCodeAt(0) - 65))
    if (c >= 'a' && c <= 'z') return String.fromCharCode(122 - (c.charCodeAt(0) - 97))
    return c
  }).join('')
}

class AtbashProvider implements CipherProvider {
  name(): string { return 'atbash' }

  info(): CipherInfo {
    return {
      name: 'atbash',
      label: 'Atbash',
      description: 'Reflection cipher — A↔Z, B↔Y, etc. Hebrew origin, self-inverse',
      family: 'substitution-reflection',
      selfInverse: true,
      options: [],
      keyspace: '0 (single deterministic mapping)',
    }
  }

  encode(text: string, _options?: EncodeOptions): CipherResult {
    return { text: atbash(text), cipher: 'atbash', operation: 'encode', options: {} }
  }

  decode(text: string, _options?: DecodeOptions): CipherResult {
    return { text: atbash(text), cipher: 'atbash', operation: 'decode', options: {} }
  }
}

register('atbash', () => new AtbashProvider())
