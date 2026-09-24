import type * as CiphersModule from './index'
import { builtinCiphers, cipherCategories } from './core/ciphers'

export { cipherCategories }

type CiphersLibrary = Pick<
  typeof CiphersModule,
  'analyzeFrequency' | 'ciphers' | 'create' | 'resolveCipher'
>

export type CipherToolParams = {
  cipher: string
  text: string
  shift?: number
  key?: string
  transposition?: string
  rails?: number
  a?: number
  b?: number
  period?: number
  letters?: number
  preserveCase?: boolean
  stripNonAlpha?: boolean
  positions?: string
  rings?: string
  plugboard?: string
}

export type CipherToolResult = {
  content: Array<{ type: 'text'; text: string }>
  details?: Record<string, unknown>
}

/** Bound model-controlled work and returned context; Caesar brute force expands input 25×. */
export const MAX_TRANSFORM_TEXT_LENGTH = 10_000
export const MAX_BRUTE_TEXT_LENGTH = 2_000
export const MAX_FREQUENCY_TEXT_LENGTH = 100_000
export const MAX_KEY_LENGTH = 1_000

/**
 * Characters a brute-force line keeps below the top one. From this length on, scored against the
 * right language, the letter fit put the right shift first in every sampled English, Polish
 * and Japanese text, and a line this long is still enough to see whether a lower shift reads.
 */
export const BRUTE_PREVIEW_LENGTH = 80

/** Affine multipliers coprime with 26, the only values the cipher accepts for `a`. */
export const AFFINE_MULTIPLIERS = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25] as const

/**
 * What the model reads about the arguments only some ciphers take. The extensions never load a
 * cipher, so the registry cannot write these; the MCP test checks them against it.
 */
export const OPTION_DESCRIPTIONS = {
  cipher: `Exact built-in cipher name: ${builtinCiphers.join(', ')}`,
  category: `Cipher category to list: ${cipherCategories.join(', ')}. Omit to list every category`,
  key: 'Keyword, or a hex key: 32, 48 or 64 digits for aes, 32 or 48 for triple-des. Required by vigenere, beaufort, autokey, alberti, playfair, columnar, aes and triple-des; optional for polybius, adfgvx and bifid',
  transposition: 'ADFGVX only: keyword for the columnar transposition after the grid step',
  period:
    'Block length. Required by alberti (letters before the disk rotates); optional for bifid (default 5)',
} as const

function cipherOptions(params: Readonly<CipherToolParams>): Record<string, unknown> {
  const options: Record<string, unknown> = {}
  for (const name of [
    'shift',
    'key',
    'transposition',
    'rails',
    'a',
    'b',
    'period',
    'letters',
    'preserveCase',
    'stripNonAlpha',
    'positions',
    'rings',
    'plugboard',
  ] as const) {
    if (params[name] !== undefined) options[name] = params[name]
  }
  return options
}

export function transformCipher(
  library: Readonly<CiphersLibrary>,
  operation: 'encode' | 'decode',
  params: Readonly<CipherToolParams>,
): CipherToolResult {
  const result = library.resolveCipher(params.cipher)[operation](params.text, cipherOptions(params))
  return {
    content: [{ type: 'text', text: result.text }],
    details: { cipher: result.cipher, operation: result.operation, options: result.options },
  }
}

/**
 * List the registered ciphers under their category, or describe one cipher.
 *
 * @param library - The loaded cipher library.
 * @param cipherName - Cipher to describe; omit to list.
 * @param category - Category the list keeps; ignored when `cipherName` is given.
 * @returns {CipherToolResult} The listing or the cipher's options.
 */
export function formatCipherInfo(
  library: Readonly<CiphersLibrary>,
  cipherName?: string,
  category?: string,
): CipherToolResult {
  if (cipherName === undefined) {
    const names = library
      .ciphers()
      .filter((name) => category === undefined || library.create(name).info().category === category)
    const groups = Map.groupBy(names, (name) => library.create(name).info().category)
    if (groups.size === 0) {
      return { content: [{ type: 'text', text: `No ciphers in category ${category}.` }] }
    }
    const lines = [...groups].flatMap(([current, members]) => [
      `${current}:`,
      ...members.map((name) => {
        const info = library.create(name).info()
        return `  ${name} [${info.family}] — ${info.description}`
      }),
    ])
    lines.push('', 'Call cipher_info with a cipher name to see its options.')
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  const info = library.resolveCipher(cipherName).info()
  const lines = [
    `${info.label} (${info.name}) — ${info.category}, ${info.family}`,
    info.description,
    `Self-inverse: ${info.selfInverse ? 'yes' : 'no'}`,
  ]
  if (info.keyspace) lines.push(`Keyspace: ${info.keyspace}`)
  if (info.options.length > 0) {
    lines.push('Options:')
    for (const option of info.options) {
      const requirement = option.required ? 'required' : `default=${option.default ?? 'none'}`
      lines.push(`  ${option.name} (${option.type}, ${requirement}): ${option.description}`)
    }
  }
  return { content: [{ type: 'text', text: lines.join('\n') }], details: { info } }
}

/**
 * Decode with every shift, best frequency fit to the language first, so the likely plaintext
 * leads both the model's reading and the collapsed preview. Shifts that tie, including every
 * shift of a text without A-Z letters, stay in shift order. Only the top line carries the whole
 * decoding; the others stop at `BRUTE_PREVIEW_LENGTH` characters and end in `…`, so a long
 * ciphertext costs one decoding plus 24 previews instead of 25 decodings.
 *
 * @param library - The loaded cipher library.
 * @param text - Caesar ciphertext.
 * @param language - Language the plaintext should read in; English by default.
 * @returns {CipherToolResult} One `shift=N -> text` line per shift, best fit first.
 */
export function bruteForceCaesar(
  library: Readonly<CiphersLibrary>,
  text: string,
  language?: 'en' | 'pl' | 'ja',
): CipherToolResult {
  const cipher = library.create('caesar')
  const decodings: Array<{ shift: number; text: string; fit: number }> = []
  for (let shift = 1; shift <= 25; shift++) {
    const result = cipher.decode(text, { shift })
    decodings.push({
      shift,
      text: result.text,
      fit: library.analyzeFrequency(result.text, language)?.fit ?? 0,
    })
  }
  decodings.sort((left, right) => right.fit - left.fit)
  const lines = decodings.map(({ shift, text: decoded }, rank) => {
    let shown = decoded
    if (rank > 0 && decoded.length > BRUTE_PREVIEW_LENGTH) {
      const splitsPair = /[\uD800-\uDBFF]/.test(decoded[BRUTE_PREVIEW_LENGTH - 1]!)
      shown = `${decoded.slice(0, BRUTE_PREVIEW_LENGTH - (splitsPair ? 1 : 0))}…`
    }
    return `shift=${String(shift).padStart(2)} -> ${shown}`
  })
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

export function formatFrequencyAnalysis(
  library: Readonly<CiphersLibrary>,
  text: string,
  language?: 'en' | 'pl' | 'ja',
): CipherToolResult {
  const analysis = library.analyzeFrequency(text, language)
  if (analysis === undefined) {
    return { content: [{ type: 'text', text: 'No A-Z letters found in input.' }] }
  }

  const maximum = analysis.counts[0]?.[1] ?? 1
  const lines = [`Frequency Analysis (${analysis.total} letters, lang=${analysis.language}):`, '']
  for (const [character, count] of analysis.counts) {
    const percentage = ((count / analysis.total) * 100).toFixed(1)
    const bar = '#'.repeat(Math.ceil((count / maximum) * 15))
    lines.push(`  ${character} ${String(count).padStart(4)} (${percentage.padStart(5)}%) ${bar}`)
  }
  lines.push(
    '',
    `Expected (${analysis.language}): ${analysis.reference.split('').join(' ')}`,
    `Actual:         ${analysis.counts.map(([character]) => character).join(' ')}`,
  )
  if (analysis.ic !== undefined) {
    lines.push(
      `Index of coincidence: ${analysis.ic.toFixed(4)} (${analysis.language} plaintext ~${analysis.referenceIc.toFixed(3)}, uniform random ~0.038)`,
    )
  }
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}
