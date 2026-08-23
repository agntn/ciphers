import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { ExtensionAPI } from '@oh-my-pi/pi-coding-agent'
import type * as CiphersModule from '@agntn/ciphers'
import {
  bruteForceCaesar,
  formatCipherInfo,
  formatFrequencyAnalysis,
  transformCipher,
  type CipherToolParams,
} from '../../../src/tool-operations'
type CiphersLibrary = Pick<
  typeof CiphersModule,
  'analyzeFrequency' | 'ciphers' | 'create' | 'resolveCipher'
>
// Bound model-controlled work and returned context; Caesar brute force expands input 25×.
const MAX_TRANSFORM_TEXT_LENGTH = 10_000
const MAX_BRUTE_TEXT_LENGTH = 2_000
const MAX_FREQUENCY_TEXT_LENGTH = 100_000
const MAX_KEY_LENGTH = 1_000

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
    description: 'Encode text with an exact-name built-in cipher. cipher_info lists the options.',
    parameters: cipherParams,
    approval: 'read',
    loadMode: 'essential',
    async execute(_toolCallId, params) {
      return transformCipher(await loadLibrary(), 'encode', params as CipherToolParams)
    },
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
      return bruteForceCaesar(await loadLibrary(), params.text)
    },
  })

  omp.registerTool({
    name: 'cipher_frequency',
    label: 'Frequency Analysis',
    description:
      'Analyze A-Z letter frequencies and the index of coincidence against English or Polish.',
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
