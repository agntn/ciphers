import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { register } from '../core/registry'

function atbash(text: string, stripNonAlpha: boolean): string {
  let input = text
  if (stripNonAlpha) input = input.replaceAll(/[^A-Za-z]/g, '')
  return Array.from(input, (c) => {
    if (c >= 'A' && c <= 'Z') return String.fromCodePoint(90 - (c.codePointAt(0)! - 65))
    if (c >= 'a' && c <= 'z') return String.fromCodePoint(122 - (c.codePointAt(0)! - 97))
    return c
  }).join('')
}

class Atbash extends Cipher {
  name(): string {
    return 'atbash'
  }

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

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return {
      text: atbash(text, options?.stripNonAlpha ?? false),
      cipher: 'atbash',
      operation: 'encode',
      options: {},
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return {
      text: atbash(text, options?.stripNonAlpha ?? false),
      cipher: 'atbash',
      operation: 'decode',
      options: {},
    }
  }
}

register('atbash', Atbash)
