import type * as CiphersModule from './index'
import { builtinCiphers } from './core/ciphers'

type CiphersLibrary = Pick<
  typeof CiphersModule,
  'analyzeFrequency' | 'ciphers' | 'create' | 'resolveCipher'
>

export type CipherToolParams = {
  cipher: string
  text: string
  shift?: number
  key?: string
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

/** Affine multipliers coprime with 26, the only values the cipher accepts for `a`. */
export const AFFINE_MULTIPLIERS = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25] as const

/**
 * What the model reads about the arguments only some ciphers take. The extensions never load a
 * cipher, so the registry cannot write these; the MCP test checks them against it.
 */
export const OPTION_DESCRIPTIONS = {
  cipher: `Exact built-in cipher name: ${builtinCiphers.join(', ')}`,
  key: 'Keyword. Required by vigenere, beaufort, autokey, alberti, playfair and columnar; optional for polybius, adfgvx and bifid',
  period:
    'Block length. Required by alberti (letters before the disk rotates); optional for bifid (default 5)',
} as const

function cipherOptions(params: Readonly<CipherToolParams>): Record<string, unknown> {
  const options: Record<string, unknown> = {}
  for (const name of [
    'shift',
    'key',
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

export function formatCipherInfo(
  library: Readonly<CiphersLibrary>,
  cipherName?: string,
): CipherToolResult {
  if (cipherName === undefined) {
    const lines = [
      ...library.ciphers().map((name) => {
        const info = library.create(name).info()
        return `${name} [${info.family}] — ${info.description}`
      }),
      '',
      'Call cipher_info with a cipher name to see its options.',
    ]
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  const info = library.resolveCipher(cipherName).info()
  const lines = [
    `${info.label} (${info.name}) — ${info.family}`,
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

export function bruteForceCaesar(
  library: Readonly<CiphersLibrary>,
  text: string,
): CipherToolResult {
  const cipher = library.create('caesar')
  const lines: string[] = []
  for (let shift = 1; shift <= 25; shift++) {
    const result = cipher.decode(text, { shift })
    lines.push(`shift=${String(shift).padStart(2)} -> ${result.text}`)
  }
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

export function formatFrequencyAnalysis(
  library: Readonly<CiphersLibrary>,
  text: string,
  language?: 'en' | 'pl',
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
      `Index of coincidence: ${analysis.ic.toFixed(4)} (English ~0.067, uniform random ~0.038)`,
    )
  }
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}
