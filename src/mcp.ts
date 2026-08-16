import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { type TSchema, Type } from 'typebox'
import { Value } from 'typebox/value'
import { analyzeFrequency, builtinCiphers, create, resolveCipher } from './index'
import { version } from './version'

const MAX_TRANSFORM_TEXT_LENGTH = 10_000
const MAX_BRUTE_TEXT_LENGTH = 2_000
const MAX_FREQUENCY_TEXT_LENGTH = 100_000
const MAX_KEY_LENGTH = 1_000

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

type ToolDefinition = {
  name: string
  title: string
  description: string
  inputSchema: TSchema
  execute(args: Record<string, unknown>): ToolResult
}

const cipherNameSchema = Type.Union(builtinCiphers.map((name) => Type.Literal(name)))

const cipherInputSchema = Type.Object({
  cipher: cipherNameSchema,
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
  preserveCase: Type.Optional(Type.Boolean({ description: 'Preserve letter case (default true)' })),
  stripNonAlpha: Type.Optional(
    Type.Boolean({ description: 'Remove non-letter characters before processing (default false)' }),
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

function cipherOptions(args: Record<string, unknown>): Record<string, unknown> {
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
  ]) {
    if (args[name] !== undefined) options[name] = args[name]
  }
  return options
}

function transform(operation: 'encode' | 'decode', args: Record<string, unknown>): ToolResult {
  const cipher = resolveCipher(args.cipher as string)
  const result = cipher[operation](args.text as string, cipherOptions(args))
  return { content: [{ type: 'text', text: result.text }] }
}

const tools: ToolDefinition[] = [
  {
    name: 'cipher_encode',
    title: 'Cipher Encode',
    description: 'Encode text with an exact-name built-in cipher.',
    inputSchema: cipherInputSchema,
    execute: (args) => transform('encode', args),
  },
  {
    name: 'cipher_decode',
    title: 'Cipher Decode',
    description: 'Decode text with an exact-name built-in cipher.',
    inputSchema: cipherInputSchema,
    execute: (args) => transform('decode', args),
  },
  {
    name: 'cipher_brute_caesar',
    title: 'Brute Force Caesar',
    description: 'Decode Caesar ciphertext with every shift from 1 through 25.',
    inputSchema: Type.Object({
      text: Type.String({
        maxLength: MAX_BRUTE_TEXT_LENGTH,
        description: 'Caesar ciphertext to brute-force',
      }),
    }),
    execute(args) {
      const cipher = create('caesar')
      const lines: string[] = []
      for (let shift = 1; shift <= 25; shift++) {
        const result = cipher.decode(args.text as string, { shift })
        lines.push(`shift=${String(shift).padStart(2)} -> ${result.text}`)
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] }
    },
  },
  {
    name: 'cipher_frequency',
    title: 'Frequency Analysis',
    description: 'Analyze A-Z letter frequencies and compare their order with English or Polish.',
    inputSchema: Type.Object({
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
      lang: Type.Optional(
        Type.Union([Type.Literal('en'), Type.Literal('pl')], {
          description: 'Reference language (default en)',
        }),
      ),
    }),
    execute(args) {
      const analysis = analyzeFrequency(args.text as string, args.lang as 'en' | 'pl' | undefined)
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
  },
]

function validationError(schema: TSchema, value: unknown): string {
  const first = Value.Errors(schema, value)[0]
  if (!first) return 'Invalid arguments'
  return `Invalid arguments at ${first.instancePath || '/'}: ${first.message}`
}

function toCallToolResult(result: ToolResult): CallToolResult {
  return {
    content: result.content,
    ...(result.isError === undefined ? {} : { isError: result.isError }),
  }
}

/** Create an unconnected MCP server exposing the four local cipher tools. */
export function createMcpServer(): Server {
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]))
  const server = new Server({ name: 'ciphers', version }, { capabilities: { tools: {} } })

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((tool): Tool => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema as Tool['inputSchema'],
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = toolsByName.get(request.params.name)
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown cipher tool: ${request.params.name}` }],
        isError: true,
      }
    }

    const args = request.params.arguments ?? {}
    if (!Value.Check(tool.inputSchema, args)) {
      return {
        content: [{ type: 'text', text: validationError(tool.inputSchema, args) }],
        isError: true,
      }
    }

    try {
      return toCallToolResult(tool.execute(args))
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `${tool.name} failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  })

  return server
}
