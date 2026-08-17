import type * as CiphersModule from './index'

type CiphersLibrary = Pick<typeof CiphersModule, 'analyzeFrequency' | 'create' | 'resolveCipher'>

export type CipherToolParams = {
  cipher: string
  text: string
  shift?: number
  key?: string
  rails?: number
  a?: number
  b?: number
  period?: number
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

function cipherOptions(params: CipherToolParams): Record<string, unknown> {
  const options: Record<string, unknown> = {}
  for (const name of [
    'shift',
    'key',
    'rails',
    'a',
    'b',
    'period',
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
  library: CiphersLibrary,
  operation: 'encode' | 'decode',
  params: CipherToolParams,
): CipherToolResult {
  const result = library.resolveCipher(params.cipher)[operation](params.text, cipherOptions(params))
  return {
    content: [{ type: 'text', text: result.text }],
    details: { cipher: result.cipher, operation: result.operation, options: result.options },
  }
}

export function bruteForceCaesar(library: CiphersLibrary, text: string): CipherToolResult {
  const cipher = library.create('caesar')
  const lines: string[] = []
  for (let shift = 1; shift <= 25; shift++) {
    const result = cipher.decode(text, { shift })
    lines.push(`shift=${String(shift).padStart(2)} -> ${result.text}`)
  }
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

export function formatFrequencyAnalysis(
  library: CiphersLibrary,
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
  lines.push('', `Expected (${analysis.language}): ${analysis.reference.split('').join(' ')}`)
  lines.push(`Actual:         ${analysis.counts.map(([character]) => character).join(' ')}`)
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}
