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
} from './tool-operations'
import * as ciphersLibrary from './index'
import { version } from './version'

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

type ToolDefinition = {
  name: string
  title: string
  description: string
  inputSchema: TSchema
  /** Rules the schema does not carry, checked once the schema has passed. */
  validate?(args: Readonly<Record<string, unknown>>): string | undefined
  execute(args: Readonly<Record<string, unknown>>): ToolResult
}

type CipherOptionRequirement = {
  readonly ciphers: readonly string[]
  readonly required: readonly ('key' | 'iv' | 'nonce' | 'period')[]
  readonly key?: {
    readonly pattern: RegExp
    readonly error: string
  }
}

const cipherOptionRequirements: readonly CipherOptionRequirement[] = [
  {
    ciphers: ['alberti'],
    required: ['key', 'period'],
    key: { pattern: /^[A-Za-z]+$/, error: 'must contain ASCII letters only' },
  },
  {
    ciphers: ['vigenere', 'beaufort', 'autokey'],
    required: ['key'],
    key: { pattern: /[A-Za-z]/, error: 'must contain at least one ASCII letter' },
  },
  {
    ciphers: ['playfair', 'columnar'],
    required: ['key'],
  },
  {
    ciphers: ['aes', 'aes-cbc-mac'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
      error: 'must be 32, 48 or 64 hex digits (AES-128, AES-192 or AES-256)',
    },
  },
  {
    ciphers: ['aes-cbc', 'aes-cfb', 'aes-ofb', 'aes-ctr'],
    required: ['key', 'iv'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
      error: 'must be 32, 48 or 64 hex digits (AES-128, AES-192 or AES-256)',
    },
  },
  {
    ciphers: ['aes-ccm', 'aes-ocb'],
    required: ['key', 'nonce'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
      error: 'must be 32, 48 or 64 hex digits (AES-128, AES-192 or AES-256)',
    },
  },
  {
    ciphers: ['aes-lrw'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){64}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
      error:
        'must be 64, 80 or 96 hex digits (the AES-128, AES-192 or AES-256 key, then the tweak key)',
    },
  },
  {
    ciphers: ['aes-xts'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){64}(?:(?:[0-9A-Fa-f]\s*){64})?$/,
      error:
        'must be 64 or 128 hex digits (two AES-128 or two AES-256 keys: data key, then tweak key)',
    },
  },
  {
    ciphers: ['rijndael'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){8}){0,4}$/,
      error: 'must be 32, 40, 48, 56 or 64 hex digits (a 128 to 256-bit Rijndael key)',
    },
  },
  {
    ciphers: ['triple-des'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16})?$/,
      error: 'must be 32 or 48 hex digits (two-key or three-key Triple DES)',
    },
  },
  {
    ciphers: ['triple-des-cbc'],
    required: ['key', 'iv'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16})?$/,
      error: 'must be 32 or 48 hex digits (two-key or three-key Triple DES)',
    },
  },
]

/**
 * Plain keywords only: hosts flatten or drop `allOf` conditionals, so which cipher needs a key is
 * said in the descriptions and enforced by `cipherInputError`.
 */
const cipherInputSchema = Type.Object({
  cipher: Type.Enum(ciphersLibrary.builtinCiphers, { description: 'Built-in cipher name' }),
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
    Type.Integer({
      minimum: 2,
      maximum: MAX_TRANSFORM_TEXT_LENGTH,
      description: 'Rail Fence rails (at least 2; default 3)',
    }),
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
  period: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: MAX_TRANSFORM_TEXT_LENGTH,
      description: OPTION_DESCRIPTIONS.period,
    }),
  ),
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

const tools: ToolDefinition[] = [
  {
    name: 'cipher_encode',
    title: 'Cipher Encode',
    description: 'Encode text with an exact-name built-in cipher. cipher_info lists the options.',
    inputSchema: cipherInputSchema,
    validate: cipherInputError,
    execute: (args) => transformCipher(ciphersLibrary, 'encode', args as CipherToolParams),
  },
  {
    name: 'cipher_decode',
    title: 'Cipher Decode',
    description: 'Decode text with an exact-name built-in cipher. cipher_info lists the options.',
    inputSchema: cipherInputSchema,
    validate: cipherInputError,
    execute: (args) => transformCipher(ciphersLibrary, 'decode', args as CipherToolParams),
  },
  {
    name: 'cipher_brute_caesar',
    title: 'Brute Force Caesar',
    description: `Decode Caesar ciphertext with every shift from 1 through 25, the best letter-frequency fit to the language first. Lines below the top stop at ${BRUTE_PREVIEW_LENGTH} characters and end in …; cipher_decode with that shift returns the whole text.`,
    inputSchema: Type.Object({
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
    execute: (args) =>
      bruteForceCaesar(
        ciphersLibrary,
        args.text as string,
        args.lang as 'en' | 'pl' | 'ja' | undefined,
      ),
  },
  {
    name: 'cipher_frequency',
    title: 'Frequency Analysis',
    description:
      'Analyze A-Z letter frequencies, compare their order with English, Polish or Japanese romaji, and report the index of coincidence.',
    inputSchema: Type.Object({
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
      lang: Type.Optional(
        Type.Enum(['en', 'pl', 'ja'], {
          description: 'Reference language, ja for Hepburn romaji (default en)',
        }),
      ),
    }),
    execute: (args) =>
      formatFrequencyAnalysis(
        ciphersLibrary,
        args.text as string,
        args.lang as 'en' | 'pl' | 'ja' | undefined,
      ),
  },
  {
    name: 'cipher_info',
    title: 'Cipher Info',
    description:
      "List the built-in ciphers by category, or show one cipher's options, category, family, and keyspace.",
    inputSchema: Type.Object({
      cipher: Type.Optional(
        Type.String({
          maxLength: 32,
          description: 'Registered cipher to describe; omit to list every cipher',
        }),
      ),
      category: Type.Optional(
        Type.Enum(ciphersLibrary.cipherCategories, { description: OPTION_DESCRIPTIONS.category }),
      ),
    }),
    execute: (args) =>
      formatCipherInfo(
        ciphersLibrary,
        args.cipher as string | undefined,
        args.category as string | undefined,
      ),
  },
]

function requiredOptionError(
  args: Readonly<Record<string, unknown>>,
  required: readonly ('key' | 'iv' | 'nonce' | 'period')[],
  cipher: string,
): string | undefined {
  for (const field of required) {
    const missing = args[field] === undefined
    const empty = field !== 'period' && args[field] === ''
    if (missing || empty) return `Invalid arguments at /${field}: required for ${cipher}`
  }
  return undefined
}

function invalidKeyError(
  key: unknown,
  matches: (value: string) => boolean,
  message: string,
): string | undefined {
  if (typeof key !== 'string') return undefined
  if (matches(key)) return undefined
  return `Invalid arguments at /key: ${message}`
}

function cipherInputError(value: Readonly<Record<string, unknown>>): string | undefined {
  if (typeof value.cipher !== 'string') return undefined
  const cipher = value.cipher
  const requirement = cipherOptionRequirements.find((candidate) =>
    candidate.ciphers.includes(cipher),
  )
  if (requirement === undefined) return undefined
  const requiredError = requiredOptionError(value, requirement.required, cipher)
  if (requiredError !== undefined) return requiredError

  const keyRule = requirement.key
  if (keyRule === undefined) return undefined
  return invalidKeyError(value.key, keyRule.pattern.test.bind(keyRule.pattern), keyRule.error)
}

function validationError(schema: TSchema, value: unknown): string {
  const first = Value.Errors(schema, value)[0]
  if (!first) return 'Invalid arguments'
  const allowed = first.keyword === 'enum' ? first.params.allowedValues : undefined
  const message = Array.isArray(allowed) ? `must be one of ${allowed.join(', ')}` : first.message
  return `Invalid arguments at ${first.instancePath || '/'}: ${message}`
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
        content: [
          { type: 'text', text: `Unknown cipher tool: ${JSON.stringify(request.params.name)}` },
        ],
        isError: true,
      }
    }

    const args = request.params.arguments ?? {}
    const inputError = Value.Check(tool.inputSchema, args)
      ? tool.validate?.(args)
      : validationError(tool.inputSchema, args)
    if (inputError !== undefined) {
      return { content: [{ type: 'text', text: inputError }], isError: true }
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
