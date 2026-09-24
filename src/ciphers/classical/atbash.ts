import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types'
import { Cipher } from '../../core/cipher'
import { applyBaseOptions, processBaseOptions } from '../../core/utils'

function atbash(text: string): string {
  return Array.from(text, (c) => {
    if (c >= 'A' && c <= 'Z') return String.fromCodePoint(90 - (c.codePointAt(0)! - 65))
    if (c >= 'a' && c <= 'z') return String.fromCodePoint(122 - (c.codePointAt(0)! - 97))
    return c
  }).join('')
}

export class Atbash extends Cipher {
  name(): string {
    return 'atbash'
  }

  info(): CipherInfo {
    return {
      name: 'atbash',
      label: 'Atbash',
      description: 'Reflection cipher — A↔Z, B↔Y, etc. Hebrew origin, self-inverse',
      category: 'classical',
      family: 'substitution-reflection',
      selfInverse: true,
      options: [],
      keyspace: '0 (single deterministic mapping)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    const base = processBaseOptions(options ?? {})
    return {
      text: atbash(applyBaseOptions(text, base)),
      cipher: 'atbash',
      operation: 'encode',
      options: base,
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    const base = processBaseOptions(options ?? {})
    return {
      text: atbash(applyBaseOptions(text, base)),
      cipher: 'atbash',
      operation: 'decode',
      options: base,
    }
  }
}
