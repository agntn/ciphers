import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, normalizeError } from '../../core/errors.ts'
import { getOpt } from '../../core/utils.ts'

/** The two Bacon tables: his own 24-letter one shares I/J and U/V, the 26-letter one codes every letter. */
const BACON_ALPHABETS = {
  24: 'ABCDEFGHIKLMNOPQRSTUWXYZ',
  26: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const

type BaconLetters = keyof typeof BACON_ALPHABETS

function toBacon(char: string, alphabet: string): string | null {
  const upper = char.toUpperCase()
  const folded = alphabet.length === 24 ? upper.replace('J', 'I').replace('V', 'U') : upper
  const idx = alphabet.indexOf(folded)
  if (idx < 0) return null
  return idx.toString(2).padStart(5, '0').replaceAll('0', 'A').replaceAll('1', 'B')
}

function fromBacon(code: string, alphabet: string): string {
  const binary = code.replaceAll('A', '0').replaceAll('B', '1')
  const idx = parseInt(binary, 2)
  return alphabet[idx] ?? '?'
}

function encodeBacon(text: string, alphabet: string, stripNonAlpha: boolean): string {
  let input = text
  if (stripNonAlpha) input = input.replaceAll(/[^A-Za-z]/g, '')
  let result = ''
  for (const c of input.toUpperCase()) {
    const code = toBacon(c, alphabet)
    if (code) result += code
  }
  return result
}

function decodeBacon(text: string, alphabet: string): string {
  const clean = text.toUpperCase().replaceAll(/[^AB]/g, '')
  let result = ''
  for (let i = 0; i + 4 < clean.length; i += 5) {
    result += fromBacon(clean.slice(i, i + 5), alphabet)
  }
  return result
}

function validate(opts: Readonly<CipherBaseOptions>): { letters: BaconLetters; alphabet: string } {
  const letters = getOpt<unknown>(opts, 'letters', 26)
  if (letters !== 24 && letters !== 26) {
    throw new InvalidOptionError('letters', letters, 'must be 24 or 26')
  }
  return { letters, alphabet: BACON_ALPHABETS[letters] }
}

export class Bacon extends Cipher {
  name(): string {
    return 'bacon'
  }

  info(): CipherInfo {
    return {
      name: 'bacon',
      label: "Bacon's Cipher",
      description: 'Binary encoding — each letter → 5-bit A/B pattern (steganographic origin)',
      category: 'classical',
      family: 'fractionation',
      selfInverse: false,
      options: [
        {
          name: 'letters',
          type: 'number',
          required: false,
          default: 26,
          description: "26 codes every letter; 24 is Bacon's own table with I/J and U/V shared",
        },
      ],
      keyspace: '2 (24- or 26-letter table)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { letters, alphabet } = validate(options ?? {})
      return {
        text: encodeBacon(text, alphabet, options?.stripNonAlpha ?? false),
        cipher: 'bacon',
        operation: 'encode',
        options: { letters },
      }
    } catch (e) {
      throw normalizeError(e, 'bacon')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { letters, alphabet } = validate(options ?? {})
      return {
        text: decodeBacon(text, alphabet),
        cipher: 'bacon',
        operation: 'decode',
        options: { letters },
      }
    } catch (e) {
      throw normalizeError(e, 'bacon')
    }
  }
}
