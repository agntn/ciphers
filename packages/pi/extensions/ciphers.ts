import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type {
  AgentToolResult,
  ExtensionAPI,
  ToolRenderResultOptions,
} from '@earendil-works/pi-coding-agent'
import { defineTool } from '@earendil-works/pi-coding-agent'
import { Text } from '@earendil-works/pi-tui'
import { Type } from 'typebox'
import type * as CiphersModule from '@agntn/ciphers'
import {
  AFFINE_MULTIPLIERS,
  MAX_BRUTE_TEXT_LENGTH,
  MAX_FREQUENCY_TEXT_LENGTH,
  MAX_KEY_LENGTH,
  MAX_TRANSFORM_TEXT_LENGTH,
  OPTION_DESCRIPTIONS,
  bruteForceCaesar,
  formatCipherInfo,
  formatFrequencyAnalysis,
  transformCipher,
} from '../../../src/tool-operations'
import type { OutputTheme, RenderedToolResult } from '../../shared/tui'
import { renderToolResult } from '../../shared/tui'

type CiphersLibrary = Pick<
  typeof CiphersModule,
  'analyzeFrequency' | 'ciphers' | 'create' | 'resolveCipher'
>
type PiToolResult = AgentToolResult<Record<string, unknown>>

const sourcePath = fileURLToPath(new URL('../../../src/index.ts', import.meta.url))
const checkoutMarker = new URL('../../../.git', import.meta.url)
let libraryPromise: Promise<CiphersLibrary> | undefined

/**
 * Same rule as the OMP loader: a checkout runs its source, an install runs the package.
 *
 * @returns {Promise<CiphersLibrary>} The library, loaded once per process.
 */
function loadLibrary(): Promise<CiphersLibrary> {
  const isCheckout = existsSync(fileURLToPath(checkoutMarker))
  libraryPromise ??=
    isCheckout && existsSync(sourcePath)
      ? import('../../../src/index.ts')
      : import('@agntn/ciphers')
  return libraryPromise
}

function resultLine(
  result: Readonly<RenderedToolResult>,
  options: Readonly<ToolRenderResultOptions>,
  theme: Readonly<OutputTheme>,
) {
  return new Text(renderToolResult(result, options, theme), 0, 0)
}

/**
 * Pi wants `details` on every result; the shared executors leave it optional.
 *
 * @param result - Result from a shared executor.
 * @returns {PiToolResult} The same result with `details` always present.
 */
function toPiResult(result: {
  readonly content: ReadonlyArray<{ readonly type: 'text'; readonly text: string }>
  readonly details?: Readonly<Record<string, unknown>>
}): PiToolResult {
  return { content: [...result.content], details: { ...result.details } }
}

/** Same schema as the OMP extension, so both harnesses reject the same input. */
const cipherParams = Type.Object({
  cipher: Type.String({ maxLength: 32, description: OPTION_DESCRIPTIONS.cipher }),
  text: Type.String({ maxLength: MAX_TRANSFORM_TEXT_LENGTH, description: 'Text to transform' }),
  shift: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 25, description: 'Caesar shift (1-25; default 3)' }),
  ),
  key: Type.Optional(
    Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.key }),
  ),
  transposition: Type.Optional(
    Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.transposition }),
  ),
  rails: Type.Optional(
    Type.Integer({ minimum: 2, description: 'Rail Fence rails (at least 2; default 3)' }),
  ),
  a: Type.Optional(
    Type.Enum(AFFINE_MULTIPLIERS, {
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
  period: Type.Optional(Type.Integer({ minimum: 1, description: OPTION_DESCRIPTIONS.period })),
  letters: Type.Optional(
    Type.Enum([24, 26], {
      description: 'Bacon alphabet size: 26 (default) or 24 with I/J and U/V shared',
    }),
  ),
  preserveCase: Type.Optional(Type.Boolean({ description: 'Preserve letter case (default true)' })),
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

export default function ciphersExtension(pi: ExtensionAPI) {
  pi.registerTool(
    defineTool({
      name: 'cipher_encode',
      label: 'Cipher Encode',
      description: 'Encode text with an exact-name built-in cipher. cipher_info lists the options.',
      promptSnippet: 'Use cipher_encode to encode text with local educational and puzzle ciphers.',
      promptGuidelines: [
        'Vigenère, Beaufort, Autokey, Playfair and Columnar need key, Alberti needs key and period.',
        'cipher_info lists every option with its default.',
      ],
      parameters: cipherParams,
      renderCall(args, _theme) {
        return new Text(`🔐 encode ${args.cipher}: "${args.text}"`, 0, 0)
      },
      renderResult: resultLine,
      async execute(_toolCallId, params): Promise<PiToolResult> {
        return toPiResult(transformCipher(await loadLibrary(), 'encode', params))
      },
    }),
  )

  pi.registerTool(
    defineTool({
      name: 'cipher_decode',
      label: 'Cipher Decode',
      description: 'Decode text with an exact-name built-in cipher. cipher_info lists the options.',
      promptSnippet:
        'Use cipher_decode to decode text encoded with local educational and puzzle ciphers.',
      promptGuidelines: ['Same options as cipher_encode.'],
      parameters: cipherParams,
      renderCall(args, _theme) {
        return new Text(`🔓 decode ${args.cipher}: "${args.text}"`, 0, 0)
      },
      renderResult: resultLine,
      async execute(_toolCallId, params): Promise<PiToolResult> {
        return toPiResult(transformCipher(await loadLibrary(), 'decode', params))
      },
    }),
  )

  pi.registerTool(
    defineTool({
      name: 'cipher_brute_caesar',
      label: 'Brute Force Caesar',
      description:
        'Decode Caesar ciphertext with every shift from 1 through 25, the best letter-frequency fit to the language first.',
      promptSnippet: 'Use cipher_brute_caesar to brute-force an unknown Caesar shift.',
      promptGuidelines: [
        'Input is ciphertext. Returns all 25 decodings, the most English-like first, or the most Polish-like with lang pl.',
        'Read the top lines first; on a short text the plaintext can rank a few lines down.',
      ],
      parameters: Type.Object({
        text: Type.String({
          maxLength: MAX_BRUTE_TEXT_LENGTH,
          description: 'Caesar ciphertext to brute-force',
        }),
        lang: Type.Optional(
          Type.Enum(['en', 'pl'], {
            description: 'Language the plaintext should read in; ranks the shifts (default en)',
          }),
        ),
      }),
      renderCall(args, _theme) {
        return new Text(`🔍 brute caesar: "${args.text}"`, 0, 0)
      },
      renderResult: resultLine,
      async execute(_toolCallId, params): Promise<PiToolResult> {
        return toPiResult(bruteForceCaesar(await loadLibrary(), params.text, params.lang))
      },
    }),
  )

  pi.registerTool(
    defineTool({
      name: 'cipher_frequency',
      label: 'Frequency Analysis',
      description:
        'Analyze A-Z letter frequencies, compare their order with English or Polish, and report the index of coincidence.',
      promptSnippet:
        'Use cipher_frequency to analyze letter distribution for cipher identification.',
      promptGuidelines: [
        'Useful for identifying substitution ciphers (frequency distribution preserved).',
        'Compare actual frequency order with expected language order (EN: ETAOIN...).',
        'An index of coincidence near 0.067 suggests monoalphabetic English; near 0.038 suggests polyalphabetic or random.',
      ],
      parameters: Type.Object({
        text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
        lang: Type.Optional(
          Type.Enum(['en', 'pl'], { description: 'Reference language (default en)' }),
        ),
      }),
      renderCall(args, _theme) {
        return new Text(`📊 frequency: "${args.text.slice(0, 40)}..."`, 0, 0)
      },
      async execute(_toolCallId, params): Promise<PiToolResult> {
        return toPiResult(formatFrequencyAnalysis(await loadLibrary(), params.text, params.lang))
      },
    }),
  )

  pi.registerTool(
    defineTool({
      name: 'cipher_info',
      label: 'Cipher Info',
      description: "List the built-in ciphers, or show one cipher's options, family, and keyspace.",
      promptSnippet:
        'Use cipher_info to check cipher names and required options before encoding or decoding.',
      promptGuidelines: [
        'Without a cipher name it lists every cipher with its family and description.',
        'With a name it shows options, defaults, self-inverse, and keyspace.',
      ],
      parameters: Type.Object({
        cipher: Type.Optional(
          Type.String({
            maxLength: 32,
            description: 'Cipher to describe; omit to list every cipher',
          }),
        ),
      }),
      renderCall(args, _theme) {
        return new Text(`ℹ️ cipher info${args.cipher ? `: ${args.cipher}` : ''}`, 0, 0)
      },
      async execute(_toolCallId, params): Promise<PiToolResult> {
        return toPiResult(formatCipherInfo(await loadLibrary(), params.cipher))
      },
    }),
  )
}
