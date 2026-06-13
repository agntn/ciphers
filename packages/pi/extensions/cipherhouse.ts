import type { AgentToolResult, ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { defineTool } from '@earendil-works/pi-coding-agent'
import { Text } from '@earendil-works/pi-tui'
import { type Static, Type } from 'typebox'
import type * as CipherhouseModule from 'cipherhouse'

/** Lazy-load the library (registers all providers on import). */
async function loadLib() {
  const mod = await import('cipherhouse').catch(() => {
    // @ts-expect-error — dev fallback when library isn't built yet
    return import('../../../src/index.ts')
  })
  return mod as typeof CipherhouseModule
}

/** Shared parameter schema for encode/decode tools. */
const cipherParams = Type.Object({
  cipher: Type.String({ description: 'Cipher name: caesar, rot13, rot47, atbash, vigenere, rail-fence, affine, playfair, polybius' }),
  text: Type.String({ description: 'Plaintext to encode' }),
  shift: Type.Optional(Type.Number({ description: 'Shift value for Caesar cipher (1-25, default 3)' })),
  key: Type.Optional(Type.String({ description: 'Keyword for Vigenère, Playfair, Polybius' })),
  rails: Type.Optional(Type.Number({ description: 'Number of rails for Rail Fence (default 3)' })),
  a: Type.Optional(Type.Number({ description: 'Multiplier for Affine cipher (coprime with 26)' })),
  b: Type.Optional(Type.Number({ description: 'Additive shift for Affine cipher (0-25)' })),
})

type CipherParams = Static<typeof cipherParams>

/** Extract cipher-specific options from tool params. */
function buildOpts(params: CipherParams): Record<string, unknown> {
  const opts: Record<string, unknown> = {}
  if (params.shift !== undefined) opts.shift = params.shift
  if (params.key) opts.key = params.key
  if (params.rails !== undefined) opts.rails = params.rails
  if (params.a !== undefined) opts.a = params.a
  if (params.b !== undefined) opts.b = params.b
  return opts
}

export default function cipherhouseExtension(pi: ExtensionAPI) {
  pi.registerTool(defineTool({
    name: 'cipher_encode',
    label: 'Cipher Encode',
    description: 'Encode plaintext with a classical cipher (caesar, rot13, vigenere, playfair, etc.)',
    promptSnippet: 'Use cipher_encode to encode text with classical ciphers.',
    promptGuidelines: [
      'Specify the cipher name and the text to encode.',
      'Caesar needs --shift (default 3), Vigenère/Playfair need --key, Rail Fence needs --rails, Affine needs --a and --b.',
    ],
    parameters: cipherParams,
    renderCall(args, _theme) {
      return new Text(`🔐 encode ${args.cipher}: "${args.text}"`, 0, 0)
    },
    async execute(_toolCallId, params): Promise<AgentToolResult> {
      try {
        const lib = await loadLib()
        const provider = lib.resolveCipher(params.cipher)
        const result = provider.encode(params.text, buildOpts(params))
        return {
          content: [{ type: 'text', text: result.text }],
          details: { cipher: result.cipher, operation: result.operation, options: result.options },
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { content: [{ type: 'text', text: `Error: ${msg}` }] }
      }
    },
  }))

  pi.registerTool(defineTool({
    name: 'cipher_decode',
    label: 'Cipher Decode',
    description: 'Decode ciphertext with a classical cipher',
    promptSnippet: 'Use cipher_decode to decode text encoded with classical ciphers.',
    promptGuidelines: [
      'Specify the cipher name and the ciphertext.',
      'Same options as cipher_encode.',
    ],
    parameters: cipherParams,
    renderCall(args, _theme) {
      return new Text(`🔓 decode ${args.cipher}: "${args.text}"`, 0, 0)
    },
    async execute(_toolCallId, params): Promise<AgentToolResult> {
      try {
        const lib = await loadLib()
        const provider = lib.resolveCipher(params.cipher)
        const result = provider.decode(params.text, buildOpts(params))
        return {
          content: [{ type: 'text', text: result.text }],
          details: { cipher: result.cipher, operation: result.operation, options: result.options },
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { content: [{ type: 'text', text: `Error: ${msg}` }] }
      }
    },
  }))

  const bruteParams = Type.Object({
    text: Type.String({ description: 'Ciphertext to brute-force' }),
  })

  pi.registerTool(defineTool({
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
    async execute(_toolCallId, params): Promise<AgentToolResult> {
      try {
        const lib = await loadLib()
        const provider = lib.create('caesar')
        const lines: string[] = []
        for (let shift = 1; shift <= 25; shift++) {
          const result = provider.decode(params.text, { shift })
          lines.push(`shift=${String(shift).padStart(2)} → ${result.text}`)
        }
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { content: [{ type: 'text', text: `Error: ${msg}` }] }
      }
    },
  }))

  const freqParams = Type.Object({
    text: Type.String({ description: 'Text to analyze' }),
    lang: Type.Optional(Type.String({ description: 'Reference language: en (default) or pl' })),
  })

  pi.registerTool(defineTool({
    name: 'cipher_frequency',
    label: 'Frequency Analysis',
    description: 'Analyze letter frequency in text for cryptanalysis',
    promptSnippet: 'Use cipher_frequency to analyze letter distribution for cipher identification.',
    promptGuidelines: [
      'Useful for identifying substitution ciphers (frequency distribution preserved).',
      'Compare actual frequency order with expected language order (EN: ETAOIN...).',
    ],
    parameters: freqParams,
    renderCall(args, _theme) {
      return new Text(`📊 frequency: "${args.text.slice(0, 40)}..."`, 0, 0)
    },
    async execute(_toolCallId, params): Promise<AgentToolResult> {
      const text = params.text.toUpperCase().replace(/[^A-Z]/g, '')
      const total = text.length
      if (total === 0) return { content: [{ type: 'text', text: 'No letters found in input.' }] }

      const freq = new Map<string, number>()
      for (const c of text) freq.set(c, (freq.get(c) ?? 0) + 1)
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])

      const langRef: Record<string, string> = {
        en: 'ETAOINSHRDLCUMWFGYPBVKJXQZ',
        pl: 'AIOEZNSWRCYTKLDPMJUBGFHV',
      }
      const lang = params.lang ?? 'en'
      const ref = langRef[lang] ?? langRef['en']!

      const lines = [`Frequency Analysis (${total} letters, lang=${lang}):\n`]
      for (const [char, count] of sorted) {
        const pct = ((count / total) * 100).toFixed(1)
        const bar = '█'.repeat(Math.ceil((count / sorted[0]![1]) * 15))
        lines.push(`  ${char} ${String(count).padStart(4)} (${pct.padStart(5)}%) ${bar}`)
      }
      lines.push(`\nExpected (${lang}): ${ref.split('').join(' ')}`)
      lines.push(`Actual:         ${sorted.map(([c]) => c).join(' ')}`)
      return { content: [{ type: 'text', text: lines.join('\n') }] }
    },
  }))
}
