import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { CipherError, InvalidOptionError, normalizeError } from '../../core/errors.ts'
import { getOpt, upperCase } from '../../core/utils.ts'

/** The two Bacon tables: his own 24-letter one shares I/J and U/V, the 26-letter one codes every letter. */
const BACON_ALPHABETS = {
  24: 'ABCDEFGHIKLMNOPQRSTUWXYZ',
  26: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const

type BaconLetters = keyof typeof BACON_ALPHABETS

type BaconSymbol = 'A' | 'B'

type BaconSettings = {
  letters: BaconLetters
  alphabet: string
  lowercase: BaconSymbol | undefined
}

function toBacon(char: string, alphabet: string): string | null {
  const upper = upperCase(char)
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
  for (const c of upperCase(input)) {
    const code = toBacon(c, alphabet)
    if (code) result += code
  }
  return result
}

/**
 * A and B off the case of a carrier's letters, the rest ignored.
 *
 * @param text - Carrier text.
 * @param lowercase - Symbol a lowercase letter stands for.
 * @returns {string} One A or B per ASCII letter.
 * @throws {CipherError} On a letter outside A-Z, which would shift every group after it.
 */
function caseCode(text: string, lowercase: BaconSymbol): string {
  const foreign = /[^\P{L}A-Za-z]/u.exec(text)?.[0]
  if (foreign !== undefined) {
    const point = foreign.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')
    throw new CipherError(
      `Invalid Bacon code: ${foreign} (U+${point}) is a letter outside A-Z, so its case isn't read`,
    )
  }
  const uppercase = lowercase === 'A' ? 'B' : 'A'
  return text
    .replaceAll(/[^A-Za-z]/g, '')
    .replaceAll(/[A-Za-z]/g, (letter) => (letter < 'a' ? uppercase : lowercase))
}

/**
 * Refuses text that isn't whole groups of five, instead of an empty or shorter answer.
 *
 * @param text - Bacon code, or the carrier whose letter case spells it.
 * @param settings - Table the groups index into, and the case reading when one is set.
 * @returns {string} The decoded letters.
 */
function decodeBacon(text: string, settings: Readonly<BaconSettings>): string {
  const carried = settings.lowercase !== undefined
  const clean = carried
    ? caseCode(text, settings.lowercase)
    : upperCase(text).replaceAll(/[^AB]/g, '')
  if (clean === '' && text.trim() !== '') {
    throw new CipherError(
      `Invalid Bacon code: no ${carried ? 'A-Z letter to read the case of' : 'A or B to decode'}`,
    )
  }
  if (clean.length % 5 !== 0) {
    const counted = carried ? 'A-Z letters' : 'letters A and B'
    throw new CipherError(`Invalid Bacon code: ${clean.length} ${counted}, not a multiple of five`)
  }
  let result = ''
  for (let i = 0; i + 4 < clean.length; i += 5) {
    result += fromBacon(clean.slice(i, i + 5), settings.alphabet)
  }
  return result
}

/**
 * The symbol lowercase stands for, when the code rides on letter case.
 *
 * @param opts - Options as passed.
 * @returns {BaconSymbol | undefined} A or B, or nothing for literal A and B.
 * @throws {InvalidOptionError} When `lowercase` is not A or B.
 */
function caseReading(opts: Readonly<CipherBaseOptions>): BaconSymbol | undefined {
  const lowercase = getOpt<unknown>(opts, 'lowercase', undefined)
  if (lowercase === undefined) return undefined
  if (typeof lowercase !== 'string' || !/^[AB]$/i.test(lowercase)) {
    throw new InvalidOptionError('lowercase', lowercase, 'must be A or B')
  }
  return upperCase(lowercase) === 'A' ? 'A' : 'B'
}

function validate(opts: Readonly<CipherBaseOptions>): BaconSettings {
  const letters = getOpt<unknown>(opts, 'letters', 26)
  if (letters !== 24 && letters !== 26) {
    throw new InvalidOptionError('letters', letters, 'must be 24 or 26')
  }
  return { letters, alphabet: BACON_ALPHABETS[letters], lowercase: caseReading(opts) }
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
      worksOn: 'A-Z, the rest dropped',
      options: [
        {
          name: 'letters',
          type: 'number',
          required: false,
          default: 26,
          description: "26 codes every letter; 24 is Bacon's own table with I/J and U/V shared",
        },
        {
          name: 'lowercase',
          type: 'string',
          required: false,
          description:
            'Decoding only: A or B, the symbol a lowercase letter of the text stands for, uppercase being the other',
        },
      ],
      keyspace: '2 (24- or 26-letter table)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { letters, alphabet, lowercase } = validate(options ?? {})
      if (lowercase !== undefined) {
        throw new InvalidOptionError(
          'lowercase',
          lowercase,
          'only decodes, encoding has no text to carry the case',
        )
      }
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
      const settings = validate(options ?? {})
      const { letters, lowercase } = settings
      return {
        text: decodeBacon(text, settings),
        cipher: 'bacon',
        operation: 'decode',
        options: lowercase === undefined ? { letters } : { letters, lowercase },
      }
    } catch (e) {
      throw normalizeError(e, 'bacon')
    }
  }
}
