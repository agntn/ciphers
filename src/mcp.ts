import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { type TSchema, Type } from 'typebox'
import { Value } from 'typebox/value'
import {
  bruteForceCaesar,
  formatCipherInfo,
  formatFrequencyAnalysis,
  transformCipher,
  type CipherToolParams,
} from './tool-operations'
import * as ciphersLibrary from './index'
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
  execute(args: Readonly<Record<string, unknown>>): ToolResult
}

type CipherOptionRequirement = {
  readonly ciphers: readonly string[]
  readonly required: readonly ('key' | 'period')[]
  readonly key?: {
    readonly minLength?: number
    readonly pattern?: RegExp
    readonly error?: string
  }
}

const cipherOptionRequirements: readonly CipherOptionRequirement[] = [
  {
    ciphers: ['alberti'],
    required: ['key', 'period'],
    key: {
      minLength: 1,
      pattern: /^[A-Za-z]+$/,
      error: 'must contain ASCII letters only',
    },
  },
  {
    ciphers: ['vigenere'],
    required: ['key'],
    key: {
      pattern: /[A-Za-z]/,
      error: 'must contain at least one ASCII letter',
    },
  },
  {
    ciphers: ['playfair', 'columnar'],
    required: ['key'],
    key: { minLength: 1 },
  },
]

const cipherOptionConditionals = cipherOptionRequirements.map((requirement) => {
  const cipherMatch =
    requirement.ciphers.length === 1
      ? { const: requirement.ciphers[0] }
      : { enum: [...requirement.ciphers] }
  const keySchema = requirement.key
    ? {
        type: 'string',
        ...(requirement.key.minLength === undefined
          ? {}
          : { minLength: requirement.key.minLength }),
        ...(requirement.key.pattern === undefined
          ? {}
          : { pattern: requirement.key.pattern.source }),
      }
    : undefined

  return {
    if: {
      properties: { cipher: cipherMatch },
      required: ['cipher'],
    },
    // oxlint-disable-next-line unicorn/no-thenable -- JSON Schema conditional keyword.
    ['then']: {
      ...(keySchema === undefined ? {} : { properties: { key: keySchema } }),
      required: [...requirement.required],
    },
  }
})

const cipherNameSchema = Type.Union(ciphersLibrary.builtinCiphers.map((name) => Type.Literal(name)))

const cipherInputSchema = Type.Object(
  {
    cipher: cipherNameSchema,
    text: Type.String({ maxLength: MAX_TRANSFORM_TEXT_LENGTH, description: 'Text to transform' }),
    shift: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 25, description: 'Caesar shift (1-25; default 3)' }),
    ),
    key: Type.Optional(
      Type.String({ maxLength: MAX_KEY_LENGTH, description: 'Key for keyed ciphers' }),
    ),
    rails: Type.Optional(
      Type.Integer({
        minimum: 2,
        maximum: MAX_TRANSFORM_TEXT_LENGTH,
        description: 'Rail Fence rails (at least 2; default 3)',
      }),
    ),
    a: Type.Optional(
      Type.Union(
        [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25].map((value) => Type.Literal(value)),
        { description: 'Affine multiplier, coprime with 26 (default 5)' },
      ),
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
        maximum: MAX_TRANSFORM_TEXT_LENGTH,
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
  },
  {
    allOf: cipherOptionConditionals,
  },
)

const tools: ToolDefinition[] = [
  {
    name: 'cipher_encode',
    title: 'Cipher Encode',
    description: 'Encode text with an exact-name built-in cipher. cipher_info lists the options.',
    inputSchema: cipherInputSchema,
    execute: (args) => transformCipher(ciphersLibrary, 'encode', args as CipherToolParams),
  },
  {
    name: 'cipher_decode',
    title: 'Cipher Decode',
    description: 'Decode text with an exact-name built-in cipher. cipher_info lists the options.',
    inputSchema: cipherInputSchema,
    execute: (args) => transformCipher(ciphersLibrary, 'decode', args as CipherToolParams),
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
    execute: (args) => bruteForceCaesar(ciphersLibrary, args.text as string),
  },
  {
    name: 'cipher_frequency',
    title: 'Frequency Analysis',
    description:
      'Analyze A-Z letter frequencies, compare their order with English or Polish, and report the index of coincidence.',
    inputSchema: Type.Object({
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
      lang: Type.Optional(
        Type.Union([Type.Literal('en'), Type.Literal('pl')], {
          description: 'Reference language (default en)',
        }),
      ),
    }),
    execute: (args) =>
      formatFrequencyAnalysis(
        ciphersLibrary,
        args.text as string,
        args.lang as 'en' | 'pl' | undefined,
      ),
  },
  {
    name: 'cipher_info',
    title: 'Cipher Info',
    description: "List the built-in ciphers, or show one cipher's options, family, and keyspace.",
    inputSchema: Type.Object({
      cipher: Type.Optional(
        Type.String({
          maxLength: 32,
          description: 'Registered cipher to describe; omit to list every cipher',
        }),
      ),
    }),
    execute: (args) => formatCipherInfo(ciphersLibrary, args.cipher as string | undefined),
  },
]

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null
}

function requiredOptionError(
  args: Readonly<Record<string, unknown>>,
  required: readonly ('key' | 'period')[],
  cipher: string,
): string | undefined {
  for (const field of required) {
    const missing = args[field] === undefined
    const emptyKey = field === 'key' && args.key === ''
    if (missing || emptyKey) return `Invalid arguments at /${field}: required for ${cipher}`
  }
  return undefined
}

function invalidKeyError(
  key: unknown,
  matches: (value: string) => boolean,
  message?: string,
): string | undefined {
  if (typeof key !== 'string') return undefined
  if (matches(key)) return undefined
  return `Invalid arguments at /key: ${message ?? 'invalid key'}`
}

function cipherInputError(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.cipher !== 'string') return undefined
  const cipher = value.cipher
  const requirement = cipherOptionRequirements.find((candidate) =>
    candidate.ciphers.includes(cipher),
  )
  if (requirement === undefined) return undefined
  const requiredError = requiredOptionError(value, requirement.required, cipher)
  if (requiredError !== undefined) return requiredError

  const keyRule = requirement.key
  if (keyRule?.pattern === undefined) return undefined
  return invalidKeyError(value.key, keyRule.pattern.test.bind(keyRule.pattern), keyRule.error)
}

function validationError(schema: TSchema, value: unknown): string {
  if (schema === cipherInputSchema) {
    const inputError = cipherInputError(value)
    if (inputError !== undefined) return inputError
  }

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

/**
 * Create an unconnected MCP server exposing the local cipher tools.
 *
 * @returns {Server} A server ready to connect to an MCP transport.
 */
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
