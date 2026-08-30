import type {
  AgentToolResult,
  ExtensionAPI,
  ToolRenderResultOptions,
} from '@earendil-works/pi-coding-agent'
import { defineTool } from '@earendil-works/pi-coding-agent'
import { Text } from '@earendil-works/pi-tui'
import { type Static, Type } from 'typebox'
import type * as CiphersModule from '@agntn/ciphers'
import { formatCipherInfo } from '../../../src/tool-operations'
import type { OutputTheme, RenderedToolResult } from '../../shared/tui'
import { renderToolResult } from '../../shared/tui'

function resultLine(
  result: Readonly<RenderedToolResult>,
  options: Readonly<ToolRenderResultOptions>,
  theme: Readonly<OutputTheme>,
) {
  return new Text(renderToolResult(result, options, theme), 0, 0)
}

async function loadLib() {
  const mod = await import('@agntn/ciphers').catch(() => import('../../../src/index.ts'))
  return mod as typeof CiphersModule
}

/** Shared parameter schema for encode/decode tools. */
const cipherParams = Type.Object({
  cipher: Type.String({
    description:
      'Cipher name: caesar, rot13, rot47, atbash, vigenere, trithemius, alberti, rail-fence, affine, playfair, polybius, morse, bacon, tap-code, columnar, adfgvx, bifid, enigma',
  }),
  text: Type.String({ description: 'Plaintext to encode' }),
  shift: Type.Optional(
    Type.Number({ description: 'Shift value for Caesar cipher (1-25, default 3)' }),
  ),
  key: Type.Optional(Type.String({ description: 'Keyword for keyed ciphers' })),
  rails: Type.Optional(Type.Number({ description: 'Number of rails for Rail Fence (default 3)' })),
  period: Type.Optional(
    Type.Integer({
      minimum: 1,
      description: 'Rotation or fractionation period for Alberti and Bifid',
    }),
  ),
  a: Type.Optional(Type.Number({ description: 'Multiplier for Affine cipher (coprime with 26)' })),
  b: Type.Optional(Type.Number({ description: 'Additive shift for Affine cipher (0-25)' })),
  preserveCase: Type.Optional(Type.Boolean({ description: 'Preserve letter case (default true)' })),
  stripNonAlpha: Type.Optional(
    Type.Boolean({ description: 'Remove non-letter characters before processing (default false)' }),
  ),
  positions: Type.Optional(
    Type.String({
      pattern: '^[A-Za-z]{3}$',
      description: 'Initial rotor positions for Enigma (default AAA)',
    }),
  ),
  rings: Type.Optional(
    Type.String({
      pattern: '^[A-Za-z]{3}$',
      description: 'Ring settings for Enigma (default AAA)',
    }),
  ),
  plugboard: Type.Optional(
    Type.String({ maxLength: 38, description: 'Space-separated plugboard pairs for Enigma' }),
  ),
})

type CipherParams = Static<typeof cipherParams>
type PiToolResult = AgentToolResult<Record<string, unknown>>

function textToolResult(text: string): PiToolResult {
  return { content: [{ type: 'text', text }], details: {} }
}

function withRequiredDetails(result: {
  readonly content: ReadonlyArray<{ readonly type: 'text'; readonly text: string }>
  readonly details?: Readonly<Record<string, unknown>>
}): PiToolResult {
  return { content: [...result.content], details: { ...result.details } }
}

function buildOpts(params: Readonly<CipherParams>): Record<string, unknown> {
  const opts: Record<string, unknown> = {}
  const optionNames = [
    'shift',
    'rails',
    'period',
    'a',
    'b',
    'preserveCase',
    'stripNonAlpha',
    'positions',
    'rings',
    'plugboard',
  ] as const
  for (const name of optionNames) {
    const value = params[name]
    if (value !== undefined) opts[name] = value
  }
  if (params.key) opts.key = params.key
  return opts
}

export default function ciphersExtension(pi: ExtensionAPI) {
  pi.registerTool(
    defineTool({
      name: 'cipher_encode',
      label: 'Cipher Encode',
      description: 'Encode plaintext with a local cipher (caesar, vigenere, enigma, etc.)',
      promptSnippet: 'Use cipher_encode to encode text with local educational and puzzle ciphers.',
      promptGuidelines: [
        'Specify the cipher name and the text to encode.',
        'Caesar needs --shift (default 3), Vigenère/Playfair need --key, Alberti needs --key and --period, Rail Fence needs --rails, Affine needs --a and --b.',
      ],
      parameters: cipherParams,
      renderCall(args, _theme) {
        return new Text(`🔐 encode ${args.cipher}: "${args.text}"`, 0, 0)
      },
      renderResult: resultLine,
      async execute(_toolCallId, params): Promise<PiToolResult> {
        try {
          const lib = await loadLib()
          const cipher = lib.resolveCipher(params.cipher)
          const result = cipher.encode(params.text, buildOpts(params))
          return {
            content: [{ type: 'text', text: result.text }],
            details: {
              cipher: result.cipher,
              operation: result.operation,
              options: result.options,
            },
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          return textToolResult(`Error: ${msg}`)
        }
      },
    }),
  )

  pi.registerTool(
    defineTool({
      name: 'cipher_decode',
      label: 'Cipher Decode',
      description: 'Decode ciphertext with a local educational or puzzle cipher',
      promptSnippet:
        'Use cipher_decode to decode text encoded with local educational and puzzle ciphers.',
      promptGuidelines: [
        'Specify the cipher name and the ciphertext.',
        'Same options as cipher_encode.',
      ],
      parameters: cipherParams,
      renderCall(args, _theme) {
        return new Text(`🔓 decode ${args.cipher}: "${args.text}"`, 0, 0)
      },
      renderResult: resultLine,
      async execute(_toolCallId, params): Promise<PiToolResult> {
        try {
          const lib = await loadLib()
          const cipher = lib.resolveCipher(params.cipher)
          const result = cipher.decode(params.text, buildOpts(params))
          return {
            content: [{ type: 'text', text: result.text }],
            details: {
              cipher: result.cipher,
              operation: result.operation,
              options: result.options,
            },
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          return textToolResult(`Error: ${msg}`)
        }
      },
    }),
  )

  const bruteParams = Type.Object({
    text: Type.String({ description: 'Ciphertext to brute-force' }),
  })

  pi.registerTool(
    defineTool({
      name: 'cipher_brute_caesar',
      label: 'Brute Force Caesar',
      description: 'Try all 25 Caesar shifts and show results',
      promptSnippet: 'Use cipher_brute_caesar to brute-force an unknown Caesar shift.',
      promptGuidelines: [
        'Input is ciphertext. Shows all 25 possible decodings.',
        'Look for readable English or Polish plaintext in results.',
      ],
      parameters: bruteParams,
      renderCall(args, _theme) {
        return new Text(`🔍 brute caesar: "${args.text}"`, 0, 0)
      },
      renderResult: resultLine,
      async execute(_toolCallId, params): Promise<PiToolResult> {
        try {
          const lib = await loadLib()
          const cipher = lib.create('caesar')
          const lines: string[] = []
          for (let shift = 1; shift <= 25; shift++) {
            const result = cipher.decode(params.text, { shift })
            lines.push(`shift=${String(shift).padStart(2)} → ${result.text}`)
          }
          return textToolResult(lines.join('\n'))
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          return textToolResult(`Error: ${msg}`)
        }
      },
    }),
  )

  const freqParams = Type.Object({
    text: Type.String({ description: 'Text to analyze' }),
    lang: Type.Optional(Type.String({ description: 'Reference language: en (default) or pl' })),
  })

  pi.registerTool(
    defineTool({
      name: 'cipher_frequency',
      label: 'Frequency Analysis',
      description: 'Analyze letter frequency in text for cryptanalysis',
      promptSnippet:
        'Use cipher_frequency to analyze letter distribution for cipher identification.',
      promptGuidelines: [
        'Useful for identifying substitution ciphers (frequency distribution preserved).',
        'Compare actual frequency order with expected language order (EN: ETAOIN...).',
        'An index of coincidence near 0.067 suggests monoalphabetic English; near 0.038 suggests polyalphabetic or random.',
      ],
      parameters: freqParams,
      renderCall(args, _theme) {
        return new Text(`📊 frequency: "${args.text.slice(0, 40)}..."`, 0, 0)
      },
      async execute(_toolCallId, params): Promise<PiToolResult> {
        const lib = await loadLib()
        const language = params.lang === 'pl' ? 'pl' : 'en'
        const analysis = lib.analyzeFrequency(params.text, language)
        if (analysis === undefined) {
          return textToolResult('No letters found in input.')
        }

        const maximum = analysis.counts[0]?.[1] ?? 1
        const lines = [
          `Frequency Analysis (${analysis.total} letters, lang=${analysis.language}):\n`,
        ]
        for (const [character, count] of analysis.counts) {
          const percentage = ((count / analysis.total) * 100).toFixed(1)
          const bar = '█'.repeat(Math.ceil((count / maximum) * 15))
          lines.push(
            `  ${character} ${String(count).padStart(4)} (${percentage.padStart(5)}%) ${bar}`,
          )
        }
        lines.push(
          `\nExpected (${analysis.language}): ${analysis.reference.split('').join(' ')}`,
          `Actual:         ${analysis.counts.map(([character]) => character).join(' ')}`,
        )
        if (analysis.ic !== undefined) {
          lines.push(
            `Index of coincidence: ${analysis.ic.toFixed(4)} (English ~0.067, uniform random ~0.038)`,
          )
        }
        return textToolResult(lines.join('\n'))
      },
    }),
  )

  const infoParams = Type.Object({
    cipher: Type.Optional(
      Type.String({
        maxLength: 32,
        description: 'Cipher name; omit to list every available cipher',
      }),
    ),
  })

  pi.registerTool(
    defineTool({
      name: 'cipher_info',
      label: 'Cipher Info',
      description: "List available ciphers or show one cipher's options and metadata",
      promptSnippet:
        'Use cipher_info to check cipher names and required options before encoding or decoding.',
      promptGuidelines: [
        'Without a cipher name it lists every cipher with its family and description.',
        'With a name it shows options, defaults, self-inverse, and keyspace.',
      ],
      parameters: infoParams,
      renderCall(args, _theme) {
        return new Text(`ℹ️ cipher info${args.cipher ? `: ${args.cipher}` : ''}`, 0, 0)
      },
      async execute(_toolCallId, params): Promise<PiToolResult> {
        try {
          return withRequiredDetails(formatCipherInfo(await loadLib(), params.cipher))
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          return textToolResult(`Error: ${msg}`)
        }
      },
    }),
  )
}
