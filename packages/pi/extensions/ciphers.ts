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
  BRUTE_PREVIEW_LENGTH,
  MAX_BRUTE_TEXT_LENGTH,
  MAX_FREQUENCY_TEXT_LENGTH,
  MAX_KEY_LENGTH,
  MAX_TRANSFORM_TEXT_LENGTH,
  OPTION_DESCRIPTIONS,
  bruteForceCaesar,
  cipherCategories,
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
  iv: Type.Optional(
    Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.iv }),
  ),
  tweak: Type.Optional(
    Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.tweak }),
  ),
  nonce: Type.Optional(
    Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.nonce }),
  ),
  aad: Type.Optional(
    Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.aad }),
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
  segment: Type.Optional(Type.Enum([1, 8, 128], { description: OPTION_DESCRIPTIONS.segment })),
  blockSize: Type.Optional(
    Type.Enum([128, 160, 192, 224, 256], { description: OPTION_DESCRIPTIONS.blockSize }),
  ),
  tagLength: Type.Optional(
    Type.Enum([32, 48, 64, 80, 96, 112, 128], { description: OPTION_DESCRIPTIONS.tagLength }),
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
        'AES needs key as 32, 48 or 64 hex digits; it encodes UTF-8 text to hex and decodes hex back.',
        'AES-CBC (aes-cbc) takes the same key plus iv, 32 hex digits.',
        'AES-CFB (aes-cfb) takes the key and iv too, plus segment in bits (1, 8 or 128, default 128); nothing is padded, so the ciphertext has as many bytes as the text.',
        'AES-OFB (aes-ofb) takes the key and iv; like CFB it pads nothing.',
        'AES-CTR (aes-ctr) takes the key and iv, the initial counter block; like CFB it pads nothing.',
        'AES-CCM (aes-ccm) takes the key and nonce (14 to 26 hex digits), optional aad in hex and tagLength in bits (default 128); the hex out is the text bytes plus the tag, and decoding fails unless key, nonce, aad and tagLength all match.',
        'AES-OCB (aes-ocb) takes the same options as AES-CCM, with a nonce of 2 to 30 hex digits and tagLength 64, 96 or 128.',
        'AES-LRW (aes-lrw) takes the AES key and a 32-digit tweak key in one key, and tweak as the first block index.',
        'AES-XTS (aes-xts) takes two AES keys in one key, the data key then the tweak key (64 or 128 hex digits), and tweak as the data unit number; text must be at least 16 bytes and nothing is padded.',
        'AES-CBC-MAC (aes-cbc-mac) takes only the AES key and encrypts nothing; the hex out is the text bytes plus a 16-byte tag, and decoding fails unless the tag matches.',
        'Rijndael (rijndael) takes a key of 32, 40, 48, 56 or 64 hex digits and blockSize in bits (128, 160, 192, 224 or 256, default 128, which is AES).',
        'Triple DES (triple-des) works the same way with a key of 32 or 48 hex digits.',
        'Triple DES CBC (triple-des-cbc) takes that key plus iv, 16 hex digits.',
        'Blowfish (blowfish) works like Triple DES with a key of any even number of hex digits from 8 to 112.',
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
      description: `Decode Caesar ciphertext with every shift from 1 through 25, the best letter-frequency fit to the language first. Lines below the top stop at ${BRUTE_PREVIEW_LENGTH} characters and end in …; cipher_decode with that shift returns the whole text.`,
      promptSnippet: 'Use cipher_brute_caesar to brute-force an unknown Caesar shift.',
      promptGuidelines: [
        `Input is ciphertext. Returns all 25 shifts, the most English-like first, the most Polish-like with lang pl, the most Japanese-like with lang ja; only the top line is whole, the rest stop at ${BRUTE_PREVIEW_LENGTH} characters.`,
        'Read the top lines first; on a short text the plaintext can rank a few lines down.',
      ],
      parameters: Type.Object({
        text: Type.String({
          maxLength: MAX_BRUTE_TEXT_LENGTH,
          description: 'Caesar ciphertext to brute-force',
        }),
        lang: Type.Optional(
          Type.Enum(['en', 'pl', 'ja'], {
            description:
              'Language the plaintext should read in, ja for Hepburn romaji; ranks the shifts (default en)',
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
        'Analyze A-Z letter frequencies, compare their order with English, Polish or Japanese romaji, and report the index of coincidence.',
      promptSnippet:
        'Use cipher_frequency to analyze letter distribution for cipher identification.',
      promptGuidelines: [
        'Useful for identifying substitution ciphers (frequency distribution preserved).',
        'Compare actual frequency order with expected language order (EN: ETAOIN...).',
        'An index of coincidence near the plaintext value the result names (about 0.065 English, 0.057 Polish, 0.08 to 0.09 Japanese romaji) suggests monoalphabetic; near 0.038 suggests polyalphabetic or random.',
      ],
      parameters: Type.Object({
        text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
        lang: Type.Optional(
          Type.Enum(['en', 'pl', 'ja'], {
            description: 'Reference language, ja for Hepburn romaji (default en)',
          }),
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
      description:
        "List the built-in ciphers by category, or show one cipher's options, category, family, and keyspace.",
      promptSnippet:
        'Use cipher_info to check cipher names and required options before encoding or decoding.',
      promptGuidelines: [
        'Without a cipher name it lists every cipher under its category, with family and description; category narrows the list.',
        'With a name it shows options, defaults, self-inverse, and keyspace.',
      ],
      parameters: Type.Object({
        cipher: Type.Optional(
          Type.String({
            maxLength: 32,
            description: 'Cipher to describe; omit to list every cipher',
          }),
        ),
        category: Type.Optional(
          Type.Enum(cipherCategories, { description: OPTION_DESCRIPTIONS.category }),
        ),
      }),
      renderCall(args, _theme) {
        return new Text(`ℹ️ cipher info${args.cipher ? `: ${args.cipher}` : ''}`, 0, 0)
      },
      async execute(_toolCallId, params): Promise<PiToolResult> {
        return toPiResult(formatCipherInfo(await loadLibrary(), params.cipher, params.category))
      },
    }),
  )
}
