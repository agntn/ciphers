import type { CipherBaseOptions, CipherInfo, CipherResult } from '../core/types'
import { Cipher } from '../core/cipher'
import { normalizeError } from '../core/errors'
import { register } from '../core/registry'
import { processBaseOptions } from '../core/utils'

function transform(text: string, decrypt: boolean, preserveCase: boolean, stripNonAlpha: boolean): string {
  const input = stripNonAlpha ? text.replace(/[^A-Za-z]/g, '') : text
  let position = 0

  return Array.from(input, (character) => {
    const isUpper = character >= 'A' && character <= 'Z'
    const isLower = character >= 'a' && character <= 'z'
    if (!isUpper && !isLower) return character

    const code = character.toUpperCase().charCodeAt(0) - 65
    const shift = decrypt ? -position : position
    const transformed = String.fromCharCode(((code + shift) % 26 + 26) % 26 + 65)
    position++
    return preserveCase && isLower ? transformed.toLowerCase() : transformed
  }).join('')
}

class Trithemius extends Cipher {
  name(): string { return 'trithemius' }

  info(): CipherInfo {
    return {
      name: 'trithemius',
      label: 'Trithemius',
      description: 'Progressive polyalphabetic substitution with shifts 0, 1, 2, ...',
      family: 'polyalphabetic',
      selfInverse: false,
      options: [],
      keyspace: 'fixed',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { preserveCase, stripNonAlpha } = processBaseOptions(options ?? {})
      return { text: transform(text, false, preserveCase, stripNonAlpha), cipher: 'trithemius', operation: 'encode', options: { preserveCase, stripNonAlpha } }
    } catch (error) { throw normalizeError(error, 'trithemius') }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { preserveCase, stripNonAlpha } = processBaseOptions(options ?? {})
      return { text: transform(text, true, preserveCase, stripNonAlpha), cipher: 'trithemius', operation: 'decode', options: { preserveCase, stripNonAlpha } }
    } catch (error) { throw normalizeError(error, 'trithemius') }
  }
}

register('trithemius', Trithemius)
