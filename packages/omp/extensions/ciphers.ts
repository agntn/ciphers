import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { ExtensionAPI } from '@oh-my-pi/pi-coding-agent'
import type * as CiphersModule from '@agntn/ciphers'
type CiphersLibrary = Pick<typeof CiphersModule, 'analyzeFrequency' | 'create' | 'resolveCipher'>
// Bound model-controlled work and returned context; Caesar brute force expands input 25×.
const MAX_TRANSFORM_TEXT_LENGTH = 10_000
const MAX_BRUTE_TEXT_LENGTH = 2_000
const MAX_FREQUENCY_TEXT_LENGTH = 100_000
const MAX_KEY_LENGTH = 1_000

type CipherParams = {
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

const sourceEntry = new URL('../../../src/index.ts', import.meta.url)
const checkoutMarker = new URL('../../../.git', import.meta.url)
let libraryPromise: Promise<CiphersLibrary> | undefined

/** Load source in a Git checkout, or the built package export after installation. */
function loadLibrary(): Promise<CiphersLibrary> {
  const isCheckout = existsSync(fileURLToPath(checkoutMarker))
  libraryPromise ??=
    isCheckout && existsSync(fileURLToPath(sourceEntry))
      ? import(sourceEntry.href)
      : import('@agntn/ciphers')
  return libraryPromise
}

/** Build library options from the parameters exposed by OMP. */
function buildOptions(params: CipherParams): Record<string, unknown> {
  const options: Record<string, unknown> = {}
  if (params.shift !== undefined) options.shift = params.shift
  if (params.key !== undefined) options.key = params.key
  if (params.rails !== undefined) options.rails = params.rails
  if (params.a !== undefined) options.a = params.a
  if (params.b !== undefined) options.b = params.b
  if (params.period !== undefined) options.period = params.period
  if (params.preserveCase !== undefined) options.preserveCase = params.preserveCase
  if (params.stripNonAlpha !== undefined) options.stripNonAlpha = params.stripNonAlpha
  if (params.positions !== undefined) options.positions = params.positions
  if (params.rings !== undefined) options.rings = params.rings
  if (params.plugboard !== undefined) options.plugboard = params.plugboard
  return options
}

/** Register local educational and puzzle-cipher tools in OMP. */
export default function ciphersExtension(omp: ExtensionAPI): void {
  const { Type } = omp.typebox
  const cipherParams = Type.Object({
    cipher: Type.String({ maxLength: 32, description: 'Exact built-in cipher name' }),
    text: Type.String({ maxLength: MAX_TRANSFORM_TEXT_LENGTH, description: 'Text to transform' }),
    shift: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 25, description: 'Caesar shift (1-25; default 3)' }),
    ),
    key: Type.Optional(
      Type.String({ maxLength: MAX_KEY_LENGTH, description: 'Key for keyed ciphers' }),
    ),
    rails: Type.Optional(
      Type.Integer({ minimum: 2, description: 'Rail Fence rails (at least 2; default 3)' }),
    ),
    a: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: 25,
        description: 'Affine multiplier, coprime with 26 (default 5)',
      }),
    ),
    b: Type.Optional(
      Type.Integer({
        minimum: 0,
        maximum: 25,
        description: 'Affine additive shift (0-25; default 8)',
      }),
    ),
    period: Type.Optional(
      Type.Integer({
        minimum: 1,
        description: 'Rotation or fractionation period for Alberti and Bifid',
      }),
    ),
    preserveCase: Type.Optional(
      Type.Boolean({ description: 'Preserve letter case (default true)' }),
    ),
    stripNonAlpha: Type.Optional(
      Type.Boolean({
        description: 'Remove non-letter characters before processing (default false)',
      }),
    ),
    positions: Type.Optional(
      Type.String({
        pattern: '^[A-Za-z]{3}$',
        description: 'Enigma initial rotor positions (default AAA)',
      }),
    ),
    rings: Type.Optional(
      Type.String({ pattern: '^[A-Za-z]{3}$', description: 'Enigma ring settings (default AAA)' }),
    ),
    plugboard: Type.Optional(
      Type.String({
        maxLength: 38,
        description: 'Enigma plugboard pairs, for example "AV BS CG"',
      }),
    ),
  })

  omp.registerTool({
    name: 'cipher_encode',
    label: 'Cipher Encode',
    description: 'Encode text with an exact-name built-in cipher.',
    parameters: cipherParams,
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      const library = await loadLibrary()
      const result = library.resolveCipher(params.cipher).encode(params.text, buildOptions(params))
      return {
        content: [{ type: 'text', text: result.text }],
        details: { cipher: result.cipher, operation: result.operation, options: result.options },
      }
    },
  })

  omp.registerTool({
    name: 'cipher_decode',
    label: 'Cipher Decode',
    description: 'Decode text with an exact-name built-in cipher.',
    parameters: cipherParams,
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      const library = await loadLibrary()
      const result = library.resolveCipher(params.cipher).decode(params.text, buildOptions(params))
      return {
        content: [{ type: 'text', text: result.text }],
        details: { cipher: result.cipher, operation: result.operation, options: result.options },
      }
    },
  })

  omp.registerTool({
    name: 'cipher_brute_caesar',
    label: 'Brute Force Caesar',
    description: 'Decode Caesar ciphertext with every shift from 1 through 25.',
    parameters: Type.Object({
      text: Type.String({
        maxLength: MAX_BRUTE_TEXT_LENGTH,
        description: 'Caesar ciphertext to brute-force',
      }),
    }),
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      const library = await loadLibrary()
      const cipher = library.create('caesar')
      const lines: string[] = []
      for (let shift = 1; shift <= 25; shift++) {
        const result = cipher.decode(params.text, { shift })
        lines.push(`shift=${String(shift).padStart(2)} -> ${result.text}`)
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] }
    },
  })

  omp.registerTool({
    name: 'cipher_frequency',
    label: 'Frequency Analysis',
    description: 'Analyze A-Z letter frequencies and compare their order with English or Polish.',
    parameters: Type.Object({
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
      lang: Type.Optional(
        Type.Union([Type.Literal('en'), Type.Literal('pl')], {
          description: 'Reference language (default en)',
        }),
      ),
    }),
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      const library = await loadLibrary()
      const analysis = library.analyzeFrequency(params.text, params.lang)
      if (analysis === undefined) {
        return { content: [{ type: 'text', text: 'No A-Z letters found in input.' }] }
      }

      const maximum = analysis.counts[0]?.[1] ?? 1
      const lines = [
        `Frequency Analysis (${analysis.total} letters, lang=${analysis.language}):`,
        '',
      ]

      for (const [character, count] of analysis.counts) {
        const percentage = ((count / analysis.total) * 100).toFixed(1)
        const bar = '#'.repeat(Math.ceil((count / maximum) * 15))
        lines.push(
          `  ${character} ${String(count).padStart(4)} (${percentage.padStart(5)}%) ${bar}`,
        )
      }
      lines.push('', `Expected (${analysis.language}): ${analysis.reference.split('').join(' ')}`)
      lines.push(`Actual:         ${analysis.counts.map(([character]) => character).join(' ')}`)
      return { content: [{ type: 'text', text: lines.join('\n') }] }
    },
  })
}
