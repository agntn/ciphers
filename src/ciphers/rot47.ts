import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'

function rot47(text: string): string {
  return Array.from(text, (c) => {
    const code = c.codePointAt(0)!
    if (code >= 33 && code <= 126) return String.fromCodePoint(33 + ((code - 33 + 47) % 94))
    return c
  }).join('')
}

export class Rot47 extends Cipher {
  name(): string {
    return 'rot47'
  }

  info(): CipherInfo {
    return {
      name: 'rot47',
      label: 'ROT-47',
      description: 'Shift by 47 over printable ASCII (33-126) — self-inverse',
      family: 'substitution-shift',
      selfInverse: true,
      options: [],
      keyspace: '1 (fixed shift=47)',
    }
  }

  encode(text: string, _options?: Readonly<CipherBaseOptions>): CipherResult {
    return { text: rot47(text), cipher: 'rot47', operation: 'encode', options: {} }
  }

  decode(text: string, _options?: Readonly<CipherBaseOptions>): CipherResult {
    return { text: rot47(text), cipher: 'rot47', operation: 'decode', options: {} }
  }
}
