import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { ExtensionAPI } from '@oh-my-pi/pi-coding-agent'
import type * as CiphersModule from '@agntn/ciphers'
import {
  AFFINE_MULTIPLIERS,
  BRUTE_PREVIEW_LENGTH,
  MAX_BRUTE_TEXT_LENGTH,
  MAX_FREQUENCY_TEXT_LENGTH,
  MAX_KEY_LENGTH,
  MAX_TRANSFORM_TEXT_LENGTH,
  OPTION_DESCRIPTIONS,
  bruteForceCaesar,
  formatCipherInfo,
  formatFrequencyAnalysis,
  transformCipher,
  type CipherToolParams,
} from '../../../src/tool-operations'
import type { OutputTheme, RenderedToolResult, RenderOptions } from '../../shared/tui'
import { renderToolResult } from '../../shared/tui'
type CiphersLibrary = Pick<
  typeof CiphersModule,
  'analyzeFrequency' | 'ciphers' | 'create' | 'resolveCipher'
>

const sourcePath = fileURLToPath(new URL('../../../src/index.ts', import.meta.url))
const checkoutMarker = new URL('../../../.git', import.meta.url)
let libraryPromise: Promise<CiphersLibrary> | undefined

function loadLibrary(): Promise<CiphersLibrary> {
  const isCheckout = existsSync(fileURLToPath(checkoutMarker))
  libraryPromise ??=
    isCheckout && existsSync(sourcePath)
      ? import('../../../src/index.ts')
      : import('@agntn/ciphers')
  return libraryPromise
}

/**
 * Register local educational and puzzle-cipher tools in OMP.
 *
 * @param omp - OMP extension API supplied by the host.
 */
export default function ciphersExtension(omp: ExtensionAPI): void {
  const { Type } = omp.typebox
  // The host injects its own TUI exports, so the wrapper renders with the
  // running Text component instead of pulling in a second copy of it.
  const { Text } = omp.pi

  const resultLine = (
    result: Readonly<RenderedToolResult>,
    options: Readonly<RenderOptions>,
    theme: Readonly<OutputTheme>,
  ) => new Text(renderToolResult(result, options, theme), 0, 0)

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
    description: 'Encode text with an exact-name built-in cipher. cipher_info lists the options.',
    parameters: cipherParams,
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      return transformCipher(await loadLibrary(), 'encode', params as CipherToolParams)
    },
    renderResult: resultLine,
  })

  omp.registerTool({
    name: 'cipher_decode',
    label: 'Cipher Decode',
    description: 'Decode text with an exact-name built-in cipher. cipher_info lists the options.',
    parameters: cipherParams,
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      return transformCipher(await loadLibrary(), 'decode', params as CipherToolParams)
    },
    renderResult: resultLine,
  })

  omp.registerTool({
    name: 'cipher_brute_caesar',
    label: 'Brute Force Caesar',
    description: `Decode Caesar ciphertext with every shift from 1 through 25, the best letter-frequency fit to the language first. Lines below the top stop at ${BRUTE_PREVIEW_LENGTH} characters and end in …; cipher_decode with that shift returns the whole text.`,
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
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      return bruteForceCaesar(await loadLibrary(), params.text, params.lang)
    },
    renderResult: resultLine,
  })

  omp.registerTool({
    name: 'cipher_frequency',
    label: 'Frequency Analysis',
    description:
      'Analyze A-Z letter frequencies, compare their order with English or Polish, and report the index of coincidence.',
    parameters: Type.Object({
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
      lang: Type.Optional(
        Type.Enum(['en', 'pl'], { description: 'Reference language (default en)' }),
      ),
    }),
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      return formatFrequencyAnalysis(await loadLibrary(), params.text, params.lang)
    },
  })

  omp.registerTool({
    name: 'cipher_info',
    label: 'Cipher Info',
    description: "List the built-in ciphers, or show one cipher's options, family, and keyspace.",
    parameters: Type.Object({
      cipher: Type.Optional(
        Type.String({
          maxLength: 32,
          description: 'Cipher to describe; omit to list every cipher',
        }),
      ),
    }),
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      return formatCipherInfo(await loadLibrary(), params.cipher)
    },
  })
}
