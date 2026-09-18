import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { applyBaseOptions, processBaseOptions } from '../core/utils'

function rot13(text: string): string {
  return Array.from(text, (c) => {
    if (c >= 'A' && c <= 'Z') return String.fromCodePoint(((c.codePointAt(0)! - 65 + 13) % 26) + 65)
    if (c >= 'a' && c <= 'z') return String.fromCodePoint(((c.codePointAt(0)! - 97 + 13) % 26) + 97)
    return c
  }).join('')
}

export class Rot13 extends Cipher {
  name(): string {
    return 'rot13'
  }

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

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    const base = processBaseOptions(options ?? {})
    return {
      text: rot13(applyBaseOptions(text, base)),
      cipher: 'rot13',
      operation: 'encode',
      options: base,
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    const base = processBaseOptions(options ?? {})
    return {
      text: rot13(applyBaseOptions(text, base)),
      cipher: 'rot13',
      operation: 'decode',
      options: base,
    }
  }
}
