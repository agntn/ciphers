/** The cipher tools, declared once for MCP, Pi, OMP and the AI SDK. The library loads on the first call. */

import {
  Type,
  ToolInputError,
  defineTool,
  type InputIssue,
  type ToolDefinition,
  type ToolResult,
} from '@agntn/tools'
import { builtinCiphers, cipherCategories } from './core/ciphers.ts'
import { InvalidOptionError, MissingOptionError } from './core/errors.ts'
import type { ZeroWidthSchemeName } from './core/zero-width-options.ts'
import {
  AFFINE_MULTIPLIERS,
  MAX_ALIGNMENT_CELLS,
  MAX_ALIGNMENT_ROWS,
  MAX_BITS_PER_LINE,
  alignmentCompares,
  alignmentOperations,
  alignmentTokens,
  formatAlignment,
  BRUTE_PREVIEW_LENGTH,
  CHARACTER_LINES,
  DEFAULT_COLUMNAR_KEY_LENGTH,
  DEFAULT_HOMOPHONIC_STARTS,
  DEFAULT_KEY_CANDIDATES,
  HIDDEN_TEXT_LINES,
  MAX_BRUTE_TEXT_LENGTH,
  MAX_CRIB_CIPHERTEXTS,
  MAX_CRIB_CIPHERTEXT_DIGITS,
  MAX_CRIB_CIPHERTEXT_LENGTH,
  MAX_CRIB_KNOWN,
  MAX_CRIB_KNOWN_LENGTH,
  MAX_CRIB_LENGTH,
  MAX_CRIB_LIMIT,
  MAX_COLUMNAR_KEY_LENGTH,
  MAX_FREQUENCY_TEXT_LENGTH,
  MAX_KEY_CANDIDATES,
  BOOK_ADDRESSES,
  MAX_BOOK_LENGTH,
  MAX_HOMOPHONIC_STARTS,
  MAX_KEY_LENGTH,
  MAX_PERIOD,
  MAX_SEED,
  MAX_SYMBOL_WIDTH,
  MAX_TRANSFORM_TEXT_LENGTH,
  MAX_ZERO_WIDTH_DIGITS,
  OPTION_DESCRIPTIONS,
  PROBE_LIST_LIMITS,
  SENTENCE_BOUNDARIES,
  WHITESPACE_LINES,
  bruteForceCaesar,
  formatCharacters,
  formatCipherInfo,
  formatCribDrag,
  formatFamilyGuess,
  formatFrequencyAnalysis,
  formatPassphraseProbe,
  formatHiddenText,
  formatKeyRecovery,
  formatPeriodEstimate,
  formatZeroWidthHide,
  formatZeroWidthRead,
  formatWhitespaceHide,
  formatWhitespaceRead,
  keyRecoveryCiphers,
  periodicKeyRecoveryCiphers,
  transformCipher,
  whitespaceChannels,
  whitespaceOrders,
  whitespaceUnmapped,
  zeroWidthSchemes,
  zeroWidthUnits,
  type CipherToolParams,
} from './tool-operations.ts'

let library: Promise<typeof import('./index.ts')> | undefined

/**
 * Loads the cipher library once.
 *
 * @returns {Promise<typeof import('./index.ts')>} The library.
 */
function loadLibrary(): Promise<typeof import('./index.ts')> {
  library ??= import('./index.ts')
  return library
}

/**
 * A shared executor's result with `details` always present, as every host expects it.
 *
 * @param result - Result from a shared executor.
 * @returns {ToolResult<Record<string, unknown>>} The same text, `details` empty when it had none.
 */
function answer(result: {
  readonly content: ReadonlyArray<{ readonly type: 'text'; readonly text: string }>
  readonly details?: Readonly<Record<string, unknown>>
}): ToolResult<Record<string, unknown>> {
  return { content: [...result.content], details: { ...result.details } }
}

/** Library options a tool takes under another name. */
const argumentNames: Readonly<Record<string, string>> = { language: 'lang', message: 'text' }

/**
 * Where a library refusal points, down to the list item it names as `#<index>`.
 *
 * @param field - The argument.
 * @param value - The value the library reports.
 * @returns {string} A JSON pointer, such as `/known/1`.
 */
function argumentPointer(field: string, value: unknown): string {
  const item = typeof value === 'string' ? /^#(\d+)$/.exec(value)?.[1] : undefined
  return item === undefined ? `/${field}` : `/${field}/${item}`
}

/**
 * A library refusal of one of the tool's arguments, moved there so the CLI names the flag.
 *
 * @param error - What the executor threw.
 * @param fields - The tool's argument names.
 * @returns {unknown} A `ToolInputError` that keeps the library's line, or the error as it came.
 */
function refusalAtArgument(error: unknown, fields: readonly string[]): unknown {
  if (!(error instanceof InvalidOptionError || error instanceof MissingOptionError)) return error
  const field = Object.hasOwn(argumentNames, error.option)
    ? argumentNames[error.option]
    : error.option
  if (field === undefined || !fields.includes(field)) return error
  const issue: InputIssue =
    error instanceof MissingOptionError
      ? missingIssue(error, field)
      : { at: argumentPointer(field, error.value), problem: error.reason, line: error.message }
  return new ToolInputError([error.message], [issue])
}

/**
 * A missing option as an issue, kept at its argument when it has a hint so the CLI prints it.
 *
 * @param error - The library refusal.
 * @param field - The argument it names.
 * @returns {InputIssue} The issue.
 */
function missingIssue(
  error: Pick<MissingOptionError, 'hint' | 'message'>,
  field: string,
): InputIssue {
  if (error.hint !== undefined) {
    return { at: `/${field}`, problem: `missing. ${error.hint}`, line: error.message }
  }
  return {
    at: '',
    problem: `must have required properties ${field}`,
    missing: [field],
    line: error.message,
  }
}

/**
 * `defineTool` for this package: a library refusal of one of the tool's arguments lands on it.
 *
 * @param tool - Tool definition.
 * @returns {ToolDefinition<Input, Details>} The same tool, its executor wrapped.
 */
function defineCipherTool<const Input extends ToolDefinition['input'], Details>(
  /* oxlint-disable-next-line typescript/prefer-readonly-parameter-types */
  tool: ToolDefinition<Input, Details>,
): ToolDefinition<Input, Details> {
  const fields = Object.keys(tool.input.properties)
  return defineTool({
    ...tool,
    execute: async (params, context) => {
      try {
        return await tool.execute(params, context)
      } catch (error) {
        throw refusalAtArgument(error, fields)
      }
    },
  })
}

type CipherOptionRequirement = {
  readonly ciphers: readonly string[]
  readonly required: readonly (
    | 'key'
    | 'secondKey'
    | 'indicator'
    | 'iv'
    | 'nonce'
    | 'period'
    | 'width'
    | 'book'
  )[]
  readonly key?: {
    readonly pattern: RegExp
    readonly error: string
  }
  /** The `digest` values the cipher takes, when it takes fewer than the schema lists. */
  readonly digests?: readonly string[]
}

const AES_KEY = {
  pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
  error: 'must be 32, 48 or 64 hex digits (AES-128, AES-192 or AES-256)',
}

const TRIPLE_DES_KEY = {
  pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16})?$/,
  error: 'must be 32 or 48 hex digits (two-key or three-key Triple DES)',
}

/** The options a `key` rule checks: `key`, plus `secondKey` and `indicator` where required. */
const KEYWORDS = ['key', 'secondKey', 'indicator'] as const

/** What the schema can't say per cipher: the options it needs and the shape of its key. */
const cipherOptionRequirements: readonly CipherOptionRequirement[] = [
  {
    ciphers: ['alberti'],
    required: ['key', 'period'],
    key: { pattern: /^[A-Za-z]+$/, error: 'must contain ASCII letters only' },
  },
  {
    ciphers: [
      'vigenere',
      'beaufort',
      'porta',
      'autokey',
      'running-key',
      'playfair',
      'nihilist',
      'fractionated-morse',
    ],
    required: ['key'],
    key: { pattern: /[A-Za-z]/, error: 'must contain at least one ASCII letter' },
  },
  {
    ciphers: ['quagmire-1', 'quagmire-2', 'quagmire-3'],
    required: ['key', 'indicator'],
    key: { pattern: /[A-Za-z]/, error: 'must contain at least one ASCII letter' },
  },
  {
    ciphers: ['quagmire-4'],
    required: ['key', 'secondKey', 'indicator'],
    key: { pattern: /[A-Za-z]/, error: 'must contain at least one ASCII letter' },
  },
  {
    ciphers: ['four-square', 'two-square', 'chaocipher'],
    required: ['key', 'secondKey'],
    key: { pattern: /[A-Za-z]/, error: 'must contain at least one ASCII letter' },
  },
  {
    ciphers: ['gronsfeld'],
    required: ['key'],
    key: { pattern: /^[0-9]+$/, error: 'must contain digits only' },
  },
  {
    ciphers: ['substitution'],
    required: ['key'],
    key: { pattern: /[A-Za-z?]/, error: 'must contain at least one ASCII letter or ?' },
  },
  {
    ciphers: ['hill'],
    required: ['key'],
    key: {
      pattern: /^(?:\S{4}|\S{9})$/u,
      error: 'must be 4 or 9 symbols of the alphabet, A-Z unless set (a 2×2 or 3×3 matrix)',
    },
  },
  { ciphers: ['columnar'], required: ['key'] },
  { ciphers: ['tridigital'], required: ['key', 'secondKey'] },
  { ciphers: ['route'], required: ['width'] },
  { ciphers: ['book'], required: ['book'] },
  { ciphers: ['aes', 'aes-cbc-mac'], required: ['key'], key: AES_KEY },
  { ciphers: ['aes-cbc', 'aes-cfb', 'aes-ofb', 'aes-ctr'], required: ['key', 'iv'], key: AES_KEY },
  { ciphers: ['aes-ccm', 'aes-ocb'], required: ['key', 'nonce'], key: AES_KEY },
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
  { ciphers: ['aes-passphrase'], required: ['key'], digests: ['md5', 'sha1', 'sha256'] },
  { ciphers: ['openpgp'], required: ['key'] },
  {
    ciphers: ['rijndael'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){8}){0,4}$/,
      error: 'must be 32, 40, 48, 56 or 64 hex digits (a 128 to 256-bit Rijndael key)',
    },
  },
  {
    ciphers: ['des'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){16}$/,
      error: 'must be 16 hex digits (a 64-bit DES key, 56 bits without parity)',
    },
  },
  {
    ciphers: ['desx'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){48}$/,
      error:
        'must be 48 hex digits (a DES key, then the input and the output whitening key, 16 digits each)',
    },
  },
  { ciphers: ['triple-des'], required: ['key'], key: TRIPLE_DES_KEY },
  { ciphers: ['triple-des-cbc'], required: ['key', 'iv'], key: TRIPLE_DES_KEY },
  {
    ciphers: ['blowfish'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:(?:[0-9A-Fa-f]\s*){2}){4,56}$/,
      error: 'must be an even number of hex digits from 8 to 112 (a 32 to 448-bit Blowfish key)',
    },
  },
  {
    ciphers: ['idea'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}$/,
      error: 'must be 32 hex digits (a 128-bit IDEA key)',
    },
  },
  {
    ciphers: ['lucifer'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}$/,
      error: 'must be 32 hex digits (a 128-bit Lucifer key)',
    },
  },
  {
    ciphers: ['mars'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:(?:[0-9A-Fa-f]\s*){8}){4,14}$/,
      error: 'must be 32 to 112 hex digits in steps of 8 (a MARS key of 4 to 14 words)',
    },
  },
  {
    ciphers: ['serpent'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
      error: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit Serpent key)',
    },
  },
  {
    ciphers: ['rabbit'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}$/,
      error: 'must be 32 hex digits (a 128-bit Rabbit key)',
    },
  },
  {
    ciphers: ['cast5'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:(?:[0-9A-Fa-f]\s*){2}){5,16}$/,
      error: 'must be an even number of hex digits from 10 to 32 (a 40 to 128-bit CAST5 key)',
    },
  },
  {
    ciphers: ['camellia'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
      error: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit Camellia key)',
    },
  },
  {
    ciphers: ['aria'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
      error: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit ARIA key)',
    },
  },
  {
    ciphers: ['sm4'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}$/,
      error: 'must be 32 hex digits (a 128-bit SM4 key)',
    },
  },
  {
    ciphers: ['rc4'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:(?:[0-9A-Fa-f]\s*){2}){1,256}$/,
      error: 'must be an even number of hex digits from 2 to 512 (a 1 to 256-byte RC4 key)',
    },
  },
  {
    ciphers: ['salsa20'],
    required: ['key', 'nonce'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){32})?$/,
      error: 'must be 32 or 64 hex digits (a 128 or 256-bit Salsa20 key)',
    },
  },
  {
    ciphers: ['xsalsa20', 'chacha20', 'xchacha20', 'chacha20-poly1305'],
    required: ['key', 'nonce'],
    key: {
      pattern: /^\s*(?:[0-9A-Fa-f]\s*){64}$/,
      error: 'must be 64 hex digits (a 256-bit key)',
    },
  },
  {
    ciphers: ['xor'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:(?:[0-9A-Fa-f]\s*){2})+$/,
      error: 'must be a nonzero even number of hex digits (a key of whole bytes)',
    },
  },
]

/**
 * A refusal at one argument, with the place apart so the CLI can name the flag.
 *
 * @param field - The argument that broke the rule.
 * @param problem - What is wrong with it.
 * @returns {InputIssue} The issue, its line spelled like a schema failure.
 */
function argumentIssue(field: string, problem: string): InputIssue {
  return { at: `/${field}`, problem, line: `Invalid arguments at /${field}: ${problem}` }
}

/**
 * The first rule the cipher sets beyond the schema that the arguments break.
 *
 * @param params - Arguments that passed the schema.
 * @returns {InputIssue | undefined} The broken rule, or nothing when they hold.
 */
function cipherInputError(params: Readonly<CipherToolParams>): InputIssue | undefined {
  const requirement = cipherOptionRequirements.find((candidate) =>
    candidate.ciphers.includes(params.cipher),
  )
  if (requirement === undefined) return undefined
  for (const field of requirement.required) {
    if (params[field] === undefined || params[field] === '') {
      return argumentIssue(field, `required for ${params.cipher}`)
    }
  }
  const rule = requirement.key
  if (rule !== undefined) {
    const fields = KEYWORDS.filter((field) => requirement.required.includes(field))
    const bad = fields.find((field) => {
      const value = params[field]
      return value !== undefined && !rule.pattern.test(value)
    })
    if (bad !== undefined) return argumentIssue(bad, rule.error)
  }
  return digestError(requirement.digests, params)
}

/**
 * Refuses a `digest` the schema lists for another cipher.
 *
 * @param digests - The digests the cipher takes, when it names them.
 * @param params - Arguments that passed the schema.
 * @returns {InputIssue | undefined} The error, or nothing when the digest fits.
 */
function digestError(
  digests: readonly string[] | undefined,
  params: Readonly<CipherToolParams>,
): InputIssue | undefined {
  if (digests === undefined || params.digest === undefined || digests.includes(params.digest)) {
    return undefined
  }
  return argumentIssue('digest', `${params.cipher} takes ${digests.join(', ')}`)
}

/**
 * Encodes or decodes once the per-cipher rules hold; a broken one reads like a schema failure.
 *
 * @param operation - Which direction.
 * @param params - Arguments that passed the schema.
 * @returns {Promise<ToolResult<Record<string, unknown>>>} The transformed text.
 * @throws {ToolInputError} When the cipher needs an option the arguments lack or reject.
 */
async function transform(
  operation: 'encode' | 'decode',
  params: Readonly<CipherToolParams>,
): Promise<ToolResult<Record<string, unknown>>> {
  const issue = cipherInputError(params)
  if (issue !== undefined) throw new ToolInputError([issue.line], [issue])
  return answer(transformCipher(await loadLibrary(), operation, params))
}

/** Plain keywords only: hosts flatten or drop `allOf`. See `cipherInputError` for the rest. */
const cipherInput = Type.Object(
  {
    cipher: Type.Enum(builtinCiphers, { description: 'Built-in cipher name' }),
    text: Type.String({ maxLength: MAX_TRANSFORM_TEXT_LENGTH, description: 'Text to transform' }),
    shift: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 25, description: 'Caesar shift (1-25; default 3)' }),
    ),
    key: Type.Optional(
      Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.key }),
    ),
    secondKey: Type.Optional(
      Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.secondKey }),
    ),
    transposition: Type.Optional(
      Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.transposition }),
    ),
    square: Type.Optional(
      Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.square }),
    ),
    rotation: Type.Optional(
      Type.Enum(['left', 'right'], { description: OPTION_DESCRIPTIONS.rotation }),
    ),
    omit: Type.Optional(Type.Enum(['j', 'q'], { description: OPTION_DESCRIPTIONS.omit })),
    orientation: Type.Optional(
      Type.Enum(['vertical', 'horizontal'], { description: OPTION_DESCRIPTIONS.orientation }),
    ),
    indicator: Type.Optional(
      Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.indicator }),
    ),
    indicatorUnder: Type.Optional(
      Type.String({ pattern: '^[A-Za-z]$', description: OPTION_DESCRIPTIONS.indicatorUnder }),
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
    counter: Type.Optional(
      Type.Integer({
        minimum: 0,
        maximum: Number.MAX_SAFE_INTEGER,
        description: OPTION_DESCRIPTIONS.counter,
      }),
    ),
    rails: Type.Optional(
      Type.Integer({
        minimum: 2,
        maximum: MAX_TRANSFORM_TEXT_LENGTH,
        description: 'Rail Fence rails (at least 2; default 3)',
      }),
    ),
    width: Type.Optional(
      Type.Integer({
        minimum: 2,
        maximum: MAX_TRANSFORM_TEXT_LENGTH,
        description: OPTION_DESCRIPTIONS.width,
      }),
    ),
    corner: Type.Optional(
      Type.Enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'], {
        description: OPTION_DESCRIPTIONS.corner,
      }),
    ),
    path: Type.Optional(
      Type.Enum(
        ['spiral-clockwise', 'spiral-counterclockwise', 'snake-rows', 'snake-columns', 'columns'],
        { description: OPTION_DESCRIPTIONS.path },
      ),
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
    lowercase: Type.Optional(
      Type.String({
        pattern: '^[ABab]$',
        description:
          'Bacon decoding only: A or B, the symbol a lowercase letter of the text stands for, uppercase being the other',
      }),
    ),
    segment: Type.Optional(Type.Enum([1, 8, 128], { description: OPTION_DESCRIPTIONS.segment })),
    blockSize: Type.Optional(
      Type.Enum([128, 160, 192, 224, 256], { description: OPTION_DESCRIPTIONS.blockSize }),
    ),
    tagLength: Type.Optional(
      Type.Enum([32, 48, 64, 80, 96, 112, 128], { description: OPTION_DESCRIPTIONS.tagLength }),
    ),
    digest: Type.Optional(
      Type.Enum(
        [
          'md5',
          'sha1',
          'ripemd160',
          'sha224',
          'sha256',
          'sha384',
          'sha512',
          'sha3-256',
          'sha3-512',
        ],
        {
          description: OPTION_DESCRIPTIONS.digest,
        },
      ),
    ),
    algorithm: Type.Optional(
      Type.Enum(
        [
          'idea',
          '3des',
          'cast5',
          'blowfish',
          'aes128',
          'aes192',
          'aes256',
          'camellia128',
          'camellia192',
          'camellia256',
        ],
        {
          description: OPTION_DESCRIPTIONS.algorithm,
        },
      ),
    ),
    count: Type.Optional(
      Type.Integer({ minimum: 1024, maximum: 65_011_712, description: OPTION_DESCRIPTIONS.count }),
    ),
    keys: Type.Optional(
      Type.String({
        pattern: '^\\s*(?:[0-9A-Fa-f]\\s*){24}$',
        description: OPTION_DESCRIPTIONS.keys,
      }),
    ),
    entry: Type.Optional(
      Type.String({ minLength: 1, maxLength: 0xff_ff, description: OPTION_DESCRIPTIONS.entry }),
    ),
    method: Type.Optional(
      Type.Enum(['stored', 'deflate'], { description: OPTION_DESCRIPTIONS.method }),
    ),
    keyLength: Type.Optional(
      Type.Integer({
        minimum: 128,
        maximum: 1024,
        multipleOf: 32,
        description: OPTION_DESCRIPTIONS.keyLength,
      }),
    ),
    iterations: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100_000, description: OPTION_DESCRIPTIONS.iterations }),
    ),
    salt: Type.Optional(
      Type.String({ maxLength: MAX_KEY_LENGTH, description: OPTION_DESCRIPTIONS.salt }),
    ),
    endian: Type.Optional(
      Type.Enum(['big', 'little'], { description: OPTION_DESCRIPTIONS.endian }),
    ),
    bytes: Type.Optional(Type.Enum(['text', 'hex'], { description: OPTION_DESCRIPTIONS.bytes })),
    blanks: Type.Optional(
      Type.String({ pattern: '^\\s*[0-9]\\s*[0-9]\\s*$', description: OPTION_DESCRIPTIONS.blanks }),
    ),
    symbol: Type.Optional(
      Type.String({ pattern: '^[^A-Za-z\\s]$', description: OPTION_DESCRIPTIONS.symbol }),
    ),
    alphabet: Type.Optional(
      Type.String({
        maxLength: MAX_KEY_LENGTH,
        pattern: '^\\S{2,}$',
        description: OPTION_DESCRIPTIONS.alphabet,
      }),
    ),
    separator: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 10,
        pattern: '^\\D+$',
        description: OPTION_DESCRIPTIONS.separator,
      }),
    ),
    zero: Type.Optional(
      Type.String({ pattern: '^[J-Zj-z]$', description: OPTION_DESCRIPTIONS.zero }),
    ),
    book: Type.Optional(
      Type.String({ maxLength: MAX_BOOK_LENGTH, description: OPTION_DESCRIPTIONS.book }),
    ),
    address: Type.Optional(
      Type.Enum([...BOOK_ADDRESSES], { description: OPTION_DESCRIPTIONS.address }),
    ),
    pick: Type.Optional(Type.Enum(['word', 'letter'], { description: OPTION_DESCRIPTIONS.pick })),
    start: Type.Optional(Type.Enum([0, 1], { description: OPTION_DESCRIPTIONS.start })),
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
  { additionalProperties: false },
)

/**
 * The `lang` argument of the analysis tools.
 *
 * @param description - What the language does for this tool.
 * @returns {TOptional<TEnum<['en', 'pl', 'ja']>>} The optional enum schema.
 */
function language(description: string) {
  return Type.Optional(Type.Enum(['en', 'pl', 'ja'], { description }))
}

export const encodeTool = defineCipherTool({
  name: 'ciphers_encode',
  title: 'Cipher Encode',
  description: 'Encode text with an exact-name built-in cipher. ciphers_info lists the options.',
  snippet: 'Use ciphers_encode to encode text with local educational and puzzle ciphers.',
  guidelines: [
    'Vigenère, Gronsfeld (digits 0 to 9 only), Beaufort, Porta, Autokey, Running key, Playfair, Nihilist and Columnar need key, Alberti needs key and period, Four-square (four-square) and Two-square (two-square) need key and secondKey.',
    'Quagmire I to III (quagmire-1, quagmire-2, quagmire-3) need key and indicator, Quagmire IV (quagmire-4) needs secondKey too. The indicator stands under plain A unless indicatorUnder names another letter, as an ACA puzzle sometimes does.',
    'Chaocipher (chaocipher) needs key, the left (ciphertext) alphabet, and secondKey, the right (plaintext) one, each 26 letters or a keyword the rest of A-Z follows. Both alphabets permute after every letter, so one dropped or extra letter garbles the rest of the text.',
    "Fractionated Morse (fractionated-morse) needs key, the cipher alphabet over the 26 triples of dots, dashes and x, as 26 letters or a keyword the rest of A-Z follows. It enciphers letters and digits only, as the ACA does: punctuation drops out, so a puzzle that kept it won't match.",
    'Running key (running-key) never repeats its key: the passage needs at least one ASCII letter per letter of the text, and the letters past that are left unused.',
    'Porta (porta) follows the ACA table; a text from dCode with its default table needs rotation right.',
    'Four-square (four-square) folds J into I; squares without Q, as on the English Wikipedia page, need omit q.',
    'Two-square (two-square) stacks its squares by default, as the English Wikipedia page does; a puzzle from the ACA or dCode sets them side by side and needs orientation horizontal. Without Q in the squares it needs omit q too.',
    'Route (route) needs width, the cells per row. Decoding reads the grid along path from corner, so a grid copied row by row from a puzzle goes to ciphers_decode. Line breaks are not cells.',
    'A1Z26 (a1z26) turns letters into their numbers, 1 to 26, joined by separator (default -). With zero it is the single digit form instead: A to I for 1 to 9 and zero for 0, so letters like BEF go to ciphers_decode and come back as 256.',
    'Book cipher (book) needs book, the whole text both sides count in. Decoding reads every number in order, one per address, or two or three with address line-word or page-line-word, and pick letter takes first letters, as Beale cipher 2 does. An address ending in letter, such as line-word-letter or page-line-letter, points at one letter inside the text, as an Ottendorf cipher does. Encoding takes the next matching word each time, so a repeated letter gets a new number.',
    'Straddling checkerboard (straddling-checkerboard) turns letters into digits, one for the eight on the top row and two for the rest. key is the board of 28 cells and blanks its two blank digits.',
    'Tridigital (tridigital) needs key, a 10-letter keyword or the digits 0 to 9 in any order, and secondKey, the alphabet in the block. A digit stands for up to three letters, so decoding gives a character class such as [AET] per letter and a space per separator digit.',
    'AES (aes) needs key as 32, 48 or 64 hex digits; it encodes UTF-8 text to hex and decodes hex back.',
    'AES-CBC (aes-cbc) takes the same key plus iv, 32 hex digits.',
    'AES-CFB (aes-cfb) takes the key and iv too, plus segment in bits (1, 8 or 128, default 128); nothing is padded, so the ciphertext has as many bytes as the text.',
    'AES-OFB (aes-ofb) takes the key and iv; like CFB it pads nothing.',
    'AES-CTR (aes-ctr) takes the key and iv, the initial counter block; like CFB it pads nothing.',
    'AES-CCM (aes-ccm) takes the key and nonce (14 to 26 hex digits), optional aad in hex and tagLength in bits (default 128); the hex out is the text bytes plus the tag, and decoding fails unless key, nonce, aad and tagLength all match.',
    'AES-OCB (aes-ocb) takes the same options as AES-CCM, with a nonce of 2 to 30 hex digits and tagLength 64, 96 or 128.',
    'AES-LRW (aes-lrw) takes the AES key and a 32-digit tweak key in one key, and tweak as the first block index.',
    'AES-XTS (aes-xts) takes two AES keys in one key, the data key then the tweak key (64 or 128 hex digits), and tweak as the data unit number; text must be at least 16 bytes and nothing is padded.',
    'AES-CBC-MAC (aes-cbc-mac) takes only the AES key and encrypts nothing; the hex out is the text bytes plus a 16-byte tag, and decoding fails unless the tag matches.',
    'AES passphrase (aes-passphrase) reads and writes what CryptoJS.AES.encrypt(message, passphrase) and openssl enc -a give, base64 starting U2FsdGVkX1: key is the passphrase as plain text, digest the EVP_BytesToKey hash (md5 by default as in CryptoJS, sha256 for openssl enc since 1.1.0), keyLength is CryptoJS keySize times 32 (default 256) and iterations its EvpKDF iterations (default 1); salt fixes the otherwise random salt when encoding.',
    'Rijndael (rijndael) takes a key of 32, 40, 48, 56 or 64 hex digits and blockSize in bits (128, 160, 192, 224 or 256, default 128, which is AES).',
    'DES (des) works the same way with a key of 16 hex digits.',
    'DESX (desx) is DES between two XORs; its key is 48 hex digits, the DES key, then the input and the output whitening key.',
    'Triple DES (triple-des) works the same way with a key of 32 or 48 hex digits.',
    'Triple DES CBC (triple-des-cbc) takes that key plus iv, 16 hex digits.',
    'Blowfish (blowfish) works like Triple DES with a key of any even number of hex digits from 8 to 112.',
    'IDEA (idea) works like Triple DES with a key of 32 hex digits.',
    'Lucifer (lucifer) works like AES with a key of 32 hex digits.',
    'MARS (mars) works like AES with a key of 32 to 112 hex digits in steps of 8.',
    'Serpent (serpent) works like AES, with the same key lengths.',
    'CAST5 (cast5) works like Triple DES with a key of any even number of hex digits from 10 to 32.',
    'Camellia (camellia) works like AES, with the same key lengths.',
    'ARIA (aria) works like AES, with the same key lengths.',
    'SM4 (sm4) works like AES with a key of 32 hex digits.',
    'OpenPGP (openpgp) reads and writes what gpg --symmetric gives: key is the passphrase as plain text, ciphers_decode takes the armored -----BEGIN PGP MESSAGE----- block (or its packets in base64 or hex) and reads algorithm, S2K, compression and AEAD mode (OCB, EAX or GCM) from it, ciphers_encode writes armor with algorithm (default aes256), digest (default sha512), count, and salt and iv to fix the random values.',
    'Rabbit (rabbit) is a stream cipher with a key of 32 hex digits and an optional iv of 16; it pads nothing, and endian picks the byte order (big as in RFC 4503, the default, or little as in Crypto++).',
    'RC4 (rc4) is a stream cipher with a key of any even number of hex digits from 2 to 512 and no IV; it pads nothing.',
    'XOR (xor) repeats a key of any nonzero even number of hex digits over the bytes.',
    'Salsa20 (salsa20) is a stream cipher with a key of 32 or 64 hex digits and a nonce of 16, XSalsa20 (xsalsa20) one with a key of 64 and a nonce of 48; they pad nothing, and counter numbers the first 64-byte block (default 0).',
    'ChaCha20 (chacha20) takes a key of 64 hex digits and a nonce of 24, XChaCha20 (xchacha20) the same key and a nonce of 48; both take counter like Salsa20.',
    'ChaCha20-Poly1305 (chacha20-poly1305) takes the ChaCha20 key and nonce and optional aad in hex; the hex out is the text bytes plus a 16-byte tag, and decoding fails unless key, nonce and aad all match.',
    'ZipCrypto (zipcrypto) is what zip -e and 7-Zip write by default: ciphers_decode takes the ZIP archive in hex or base64 with key, the password, or keys, the three internal keys bkcrack recovers, and opens one stored, deflate or bzip2 entry (entry, default the first encrypted one). It answers only once the CRC-32 and size match, and returns the keys and the method with the text. ciphers_encode writes an archive of one entry in hex, deflate unless method is stored.',
    'Every block and stream cipher, aes-passphrase and openpgp too, takes bytes: hex to read and write the plain side as hex, for bytes that are not UTF-8 text.',
    'ciphers_info lists every option with its default.',
  ],
  effect: 'read',
  input: cipherInput,
  cli: {
    description: 'Encode plaintext with a cipher',
    positional: ['cipher', 'text'],
    stdin: ['text', 'book'],
  },
  execute: (params) => transform('encode', params),
})

export const decodeTool = defineCipherTool({
  name: 'ciphers_decode',
  title: 'Cipher Decode',
  description: 'Decode text with an exact-name built-in cipher. ciphers_info lists the options.',
  snippet: 'Use ciphers_decode to decode text encoded with local educational and puzzle ciphers.',
  guidelines: ['Same options as ciphers_encode.'],
  effect: 'read',
  input: cipherInput,
  cli: {
    description: 'Decode ciphertext with a cipher',
    positional: ['cipher', 'text'],
    stdin: ['text', 'book'],
  },
  execute: (params) => transform('decode', params),
})

export const caesarBruteTool = defineCipherTool({
  name: 'ciphers_caesar_brute',
  title: 'Brute Force Caesar',
  description: `Decode Caesar ciphertext with every shift from 1 through 25, the one that reads most like the language first. Lines below the top stop at ${BRUTE_PREVIEW_LENGTH} characters and end in …; ciphers_decode with that shift returns the whole text.`,
  snippet: 'Use ciphers_caesar_brute to brute-force an unknown Caesar shift.',
  guidelines: [
    `Input is ciphertext. Returns all 25 shifts, the most English-like first, the most Polish-like with lang pl, the most Japanese-like with lang ja; only the top line is whole, the rest stop at ${BRUTE_PREVIEW_LENGTH} characters.`,
    'Read the top lines first; on a short text the plaintext can rank a few lines down.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({
        maxLength: MAX_BRUTE_TEXT_LENGTH,
        description: 'Caesar ciphertext to brute-force',
      }),
      lang: language(
        'Language the plaintext should read in, ja for Hepburn romaji; ranks the shifts (default en)',
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'brute',
    description: 'Brute-force a Caesar shift, best fit to --lang first',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) =>
    answer(bruteForceCaesar(await loadLibrary(), params.text, params.lang)),
})

export const frequencyTool = defineCipherTool({
  name: 'ciphers_frequency',
  title: 'Frequency Analysis',
  description:
    'Analyze A-Z letter frequencies, compare their order with English, Polish or Japanese romaji, and report the index of coincidence; for English also the quadgram fit.',
  snippet: 'Use ciphers_frequency to analyze letter distribution for cipher identification.',
  guidelines: [
    'Useful for identifying substitution ciphers (frequency distribution preserved).',
    'Compare actual frequency order with expected language order (EN: ETAOIN...).',
    'An index of coincidence near the plaintext value the result names (about 0.065 English, 0.057 Polish, 0.08 to 0.09 Japanese romaji) suggests monoalphabetic; near 0.038 suggests polyalphabetic or random.',
    'The quadgram fit is the scale ciphers_key_recover ranks keys by: near -9.44 reads as English, near -13.95 as random letters, so a decoding found any other way compares with its candidates directly.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
      lang: language('Reference language, ja for Hepburn romaji (default en)'),
    },
    { additionalProperties: false },
  ),
  cli: {
    description: 'Count the letters and compare their order with the language',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) =>
    answer(formatFrequencyAnalysis(await loadLibrary(), params.text, params.lang)),
})

export const periodEstimateTool = defineCipherTool({
  name: 'ciphers_period_estimate',
  title: 'Key Length Estimate',
  description:
    'Estimate the key length of a Vigenère ciphertext from column index of coincidence and Kasiski repeats, most likely length first, with the key for the top three. ciphers_decode with cipher vigenere and that key checks it.',
  snippet:
    'Use ciphers_period_estimate when ciphers_frequency puts the index of coincidence near 0.038.',
  guidelines: [
    'Input is ciphertext. Returns key lengths by column IoC, most likely first, with the Vigenère key for the top three, then the Kasiski factors.',
    'Try the top key with ciphers_decode and cipher vigenere; Beaufort shares the length, not the key, and autokey has no length.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Ciphertext' }),
      lang: language(
        'Language the plaintext should read in, ja for Hepburn romaji; picks the keys (default en)',
      ),
      maxPeriod: Type.Optional(
        Type.Integer({
          minimum: 2,
          maximum: MAX_PERIOD,
          description: OPTION_DESCRIPTIONS.maxPeriod,
        }),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'period',
    description: 'Estimate a Vigenère key length, with the key for the top three',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) =>
    answer(formatPeriodEstimate(await loadLibrary(), params.text, params.lang, params.maxPeriod)),
})

export const familyGuessTool = defineCipherTool({
  name: 'ciphers_family_guess',
  title: 'Cipher Family Guess',
  description:
    'Guess which cipher family a ciphertext comes from, by its alphabet and layout, then index of coincidence and how the letters fit the language. Candidates, most likely first, each with its confidence, the signal behind it and the call to try next.',
  snippet: 'Use ciphers_family_guess first on a ciphertext whose cipher nobody named.',
  guidelines: [
    'Input is ciphertext. Returns candidate families with the built-in ciphers to try, most likely first, each with high, medium or low confidence, its signal and the next call.',
    'Treat the list as candidates: a short text comes back with low confidence, and only a decode that reads settles it.',
    'Decimal character codes, hex and base64 that spell text, UTF-8 in any script included, come back decoded, ahead of the ciphers: that text is encoded, so encodings_decode reads it.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Ciphertext' }),
      lang: language('Language the plaintext should read in, ja for Hepburn romaji (default en)'),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'guess',
    description: 'Guess the cipher family of a ciphertext, with the next step',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) =>
    answer(formatFamilyGuess(await loadLibrary(), params.text, params.lang)),
})

export const passphraseProbeTool = defineCipherTool({
  name: 'ciphers_passphrase_probe',
  title: 'Probe Passphrase Settings',
  description:
    'Try one passphrase on a Salted__ blob (base64 starting U2FsdGVkX1, from CryptoJS.AES.encrypt or openssl enc -a) under every EVP_BytesToKey digest, key length and iteration count of a grid. Lists the settings whose padding held, most printable first, next to how many a wrong passphrase would give by chance.',
  snippet:
    'Use ciphers_passphrase_probe when a passphrase is known but not the digest, key length or iterations of a Salted__ blob.',
  guidelines: [
    'Input is the blob and the passphrase as key. The grid defaults to md5, sha1 and sha256, key lengths 128, 192 and 256, and 1 iteration: 9 tries.',
    'A wrong setting passes the padding check about once in 255 tries, so read the hits against the expected count: one that reads as text is the setting, and pad 1 with half the bytes unprintable is noise.',
    'ciphers_decode with cipher aes-passphrase and the digest, keyLength and iterations of a hit returns the whole text.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({
        maxLength: MAX_TRANSFORM_TEXT_LENGTH,
        description: 'The blob: base64 starting U2FsdGVkX1, line breaks allowed',
      }),
      key: Type.String({
        minLength: 1,
        maxLength: MAX_KEY_LENGTH,
        description: 'The passphrase to try, any text, read as UTF-8',
      }),
      digests: Type.Optional(
        Type.Array(Type.Enum(['md5', 'sha1', 'sha256']), {
          minItems: 1,
          maxItems: PROBE_LIST_LIMITS.digests,
          description: OPTION_DESCRIPTIONS.probeDigests,
        }),
      ),
      keyLengths: Type.Optional(
        Type.Array(Type.Integer({ minimum: 128, maximum: 1024, multipleOf: 32 }), {
          minItems: 1,
          maxItems: PROBE_LIST_LIMITS.keyLengths,
          description: OPTION_DESCRIPTIONS.probeKeyLengths,
        }),
      ),
      iterations: Type.Optional(
        Type.Array(Type.Integer({ minimum: 1, maximum: 100_000 }), {
          minItems: 1,
          maxItems: PROBE_LIST_LIMITS.iterations,
          description: OPTION_DESCRIPTIONS.probeIterations,
        }),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'probe',
    description: 'Try one passphrase on a Salted__ blob under a grid of settings',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async ({ text, key, ...grid }) =>
    answer(formatPassphraseProbe(await loadLibrary(), text, key, grid)),
})

export const cribDragTool = defineCipherTool({
  name: 'ciphers_crib_drag',
  title: 'Drag Crib',
  description:
    'Slide a crib, a guessed piece of plaintext, across hex ciphertexts XORed with one reused key (a many-time pad, a reused stream cipher key or CTR nonce). Each place the crib could sit gives key bytes that decrypt the other ciphertexts there; places are ranked by how much that reads like the language. known holds the places accepted so far: they fix key bytes, places that contradict them drop out, and the reply shows the key and every plaintext they give.',
  snippet:
    'Use ciphers_crib_drag on two or more ciphertexts encrypted under the same XOR keystream.',
  guidelines: [
    'Start with a common word with spaces around it, such as " the ", and read the top places: the one that reveals readable text in the other ciphertexts is likely right.',
    'To accept a place, add { message, offset, text } to known, with the crib as text, and call again with the next crib; a drag grows one call at a time, the state is in the arguments.',
    'Extend a plaintext the reply shows half known by adding a longer text at the same place to known.',
    'Without a crib the call just applies known and shows the key and plaintexts.',
    'Ciphertexts are numbered from 0 in the order given, offsets count bytes from 0.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      ciphertexts: Type.Array(
        Type.String({
          maxLength: MAX_CRIB_CIPHERTEXT_LENGTH,
          description: `One ciphertext in hex, at most ${MAX_CRIB_CIPHERTEXT_DIGITS} digits; whitespace between them is ignored`,
        }),
        {
          minItems: 2,
          maxItems: MAX_CRIB_CIPHERTEXTS,
          description: `Two to ${MAX_CRIB_CIPHERTEXTS} hex ciphertexts encrypted under the same keystream from their first byte`,
        },
      ),
      crib: Type.Optional(
        Type.String({
          minLength: 1,
          maxLength: MAX_CRIB_LENGTH,
          description: 'Plaintext guess to slide across every ciphertext, as UTF-8 text',
        }),
      ),
      known: Type.Optional(
        Type.Array(
          Type.Object(
            {
              message: Type.Integer({
                minimum: 0,
                maximum: MAX_CRIB_CIPHERTEXTS - 1,
                description: 'Ciphertext the text is in, from 0',
              }),
              offset: Type.Integer({
                minimum: 0,
                maximum: MAX_CRIB_CIPHERTEXT_DIGITS / 2 - 1,
                description: 'Byte the text starts at, from 0',
              }),
              text: Type.String({
                minLength: 1,
                maxLength: MAX_CRIB_KNOWN_LENGTH,
                description: 'Plaintext at that place, as UTF-8 text',
              }),
            },
            { additionalProperties: false },
          ),
          {
            maxItems: MAX_CRIB_KNOWN,
            description:
              'Places accepted so far; they must agree with each other on every key byte',
          },
        ),
      ),
      lang: language(
        'Language the plaintexts read in, ja for Hepburn romaji; ranks the places (default en)',
      ),
      limit: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: MAX_CRIB_LIMIT,
          description: `How many places to list, 1 to ${MAX_CRIB_LIMIT} (default 10)`,
        }),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'crib',
    description: 'Slide a crib across hex ciphertexts under one reused key',
    positional: ['ciphertexts'],
  },
  execute: async (params) => answer(formatCribDrag(await loadLibrary(), params)),
})

export const hiddenTextReadTool = defineCipherTool({
  name: 'ciphers_hidden_text_read',
  title: 'Read Hidden Text',
  description: `Read a message hidden in plain text by position: a letter of each line, word, sentence or paragraph (acrostics, telestichs, null ciphers), every nth letter or word, or a diagonal down the lines. Without pick, try the usual places and rank the readings by how much they look like the language, the top ${HIDDEN_TEXT_LINES} with the arguments that read each again.`,
  snippet:
    'Use ciphers_hidden_text_read on a poem or a letter that may spell a message by position.',
  guidelines: [
    'Without pick it ranks the first, second and last letter of every line, word, sentence and paragraph, both diagonals and every nth letter up to 10, most like the language first; with English the number before each reading is above 0 for text that reads like it.',
    'With pick it returns that reading alone. letter takes 1 for the first letter of each unit, 2 for the second, -1 for the last; every-letter and every-word need every and start at the start-th one (default 1); diagonal takes the start-th letter of the first line, the next of the second, counted from the end of each line with direction down-left.',
    'Only letters count: spaces, digits and punctuation are never picked, lines without letters are skipped, and words are what lies between whitespace.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({
        maxLength: MAX_FREQUENCY_TEXT_LENGTH,
        description: 'Text that may hide a message, line breaks kept',
      }),
      pick: Type.Optional(
        Type.Enum(
          ['line', 'word', 'sentence', 'paragraph', 'every-letter', 'every-word', 'diagonal'],
          {
            description:
              'Where the message sits: a letter of each line, word, sentence or paragraph, every nth letter or word, or a diagonal. Omit to rank them all',
          },
        ),
      ),
      letter: Type.Optional(
        Type.Integer({
          minimum: -MAX_FREQUENCY_TEXT_LENGTH,
          maximum: MAX_FREQUENCY_TEXT_LENGTH,
          description:
            'line, word, sentence and paragraph only: the letter taken from each, 1 the first (default), 2 the second, -1 the last; never 0',
        }),
      ),
      every: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: MAX_FREQUENCY_TEXT_LENGTH,
          description: 'every-letter and every-word only, and required there: the step',
        }),
      ),
      start: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: MAX_FREQUENCY_TEXT_LENGTH,
          description:
            'every-letter and every-word: position of the first one taken. diagonal: letter of the first line. Default 1',
        }),
      ),
      direction: Type.Optional(
        Type.Enum(['down-right', 'down-left'], {
          description:
            'diagonal only: down-right counts the letters of each line from its start (default), down-left from its end',
        }),
      ),
      lang: language(
        'Language the message should read in, ja for Hepburn romaji; ranks the readings without pick (default en)',
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'hidden',
    description: 'Read a message hidden in plain text by position',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) => answer(formatHiddenText(await loadLibrary(), params)),
})

/**
 * The arguments that spell out a zero-width scheme, shared by reading and hiding.
 *
 * @param fallback - What happens when neither `scheme` nor `symbols` is given.
 * @returns {object} The optional `scheme`, `symbols`, `separator`, `digits` and `unit` schemas.
 */
function zeroWidthSchemeArguments(fallback: string) {
  return {
    scheme: Type.Optional(
      Type.Enum(Object.keys(zeroWidthSchemes) as [ZeroWidthSchemeName, ...ZeroWidthSchemeName[]], {
        description: `A scheme another tool writes: binary (U+200B is 0, U+200C is 1, eight to a UTF-8 byte), 330k (the Unicode Steganography page), zwsp-steg or zero-width-lib. ${fallback}`,
      }),
    ),
    symbols: Type.Optional(
      Type.String({
        maxLength: 400,
        description:
          'A scheme of your own instead of scheme: the character for each digit, digit 0 first, as U+200C U+200B or as the characters themselves. Two for binary, more for a higher base',
      }),
    ),
    separator: Type.Optional(
      Type.String({
        maxLength: 8,
        description:
          'With symbols: the one character between two numbers, as U+200D or itself, for numbers of any length',
      }),
    ),
    digits: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: MAX_ZERO_WIDTH_DIGITS,
        description:
          'With symbols: digits per number, 8 for binary bytes. Required without separator; with one, the width shorter numbers are padded to',
      }),
    ),
    unit: Type.Optional(
      Type.Enum(zeroWidthUnits, {
        description:
          'With symbols: what one number is, byte for UTF-8 bytes (default), code-unit for UTF-16 code units, code-point for whole code points',
      }),
    ),
  }
}

export const charactersInspectTool = defineCipherTool({
  name: 'ciphers_characters_inspect',
  title: 'Inspect Characters',
  description: `Find the characters of a text that are not what they seem: invisible ones (zero-width, format and control characters, odd spaces), lookalikes of ASCII such as a Cyrillic o or fullwidth digits, combining marks and letters of another script. Each code point comes with its name, its places and the ASCII it passes for, then the words that mix scripts with their UTS #39 skeleton, the listed characters in order and the message the invisible ones spell. Up to ${CHARACTER_LINES} code points are listed.`,
  snippet:
    'Use ciphers_characters_inspect on a clue, a tweet or a password that may carry invisible or lookalike characters.',
  guidelines: [
    'Run it before hashing or comparing text copied from a page: one zero-width space or one Cyrillic letter changes every digest.',
    'Positions count code points from 1. Nothing invisible is printed raw; every listed character shows as U+XXXX.',
    'The text is held against the script most of its letters share. Pass script when a short text is mostly lookalikes and the guess goes wrong.',
    'A skeleton is for comparing two words that look alike, never for display: it also folds m into rn and 1 into l.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({
        maxLength: MAX_FREQUENCY_TEXT_LENGTH,
        description: 'Text to check, exactly as copied',
      }),
      script: Type.Optional(
        Type.String({
          maxLength: 40,
          description:
            'Unicode script the text is written in, such as Latin, Cyrillic or Greek (default the script most of its letters share)',
        }),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'inspect',
    description: 'Find invisible and lookalike characters in a text',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) => answer(formatCharacters(await loadLibrary(), params)),
})

export const zeroWidthReadTool = defineCipherTool({
  name: 'ciphers_zero_width_read',
  title: 'Read Zero-Width Message',
  description:
    'Read a message hidden in invisible characters between the visible ones: each invisible character is a digit, the digits spell bytes or code points. Without scheme or symbols, try the built-in schemes and list every reading that comes out as text, with the arguments that read it again.',
  snippet: 'Use ciphers_zero_width_read on text whose invisible characters may spell a message.',
  guidelines: [
    'Only the scheme characters count, so pass the whole text as copied; the visible part is skipped.',
    'For a scheme of your own, ciphers_characters_inspect lists which invisible characters the text has. Two of them are usually 0 and 1 with digits 8; a third one that shows up at regular gaps is the separator.',
    'A reading that stops with characters left over means another scheme, or a text that lost part of its invisible characters on the way.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({
        maxLength: MAX_FREQUENCY_TEXT_LENGTH,
        description: 'Text that carries invisible characters, exactly as copied',
      }),
      ...zeroWidthSchemeArguments('Omit it and symbols to try them all'),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'reveal',
    description: 'Read a message hidden in invisible characters',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) => answer(formatZeroWidthRead(await loadLibrary(), params)),
})

export const zeroWidthHideTool = defineCipherTool({
  name: 'ciphers_zero_width_hide',
  title: 'Hide Zero-Width Message',
  description:
    'Hide a message in invisible characters, on their own or inside a cover text, where they go in after the first character. The answer is the text alone and looks like the cover: the message is in characters that show nothing.',
  snippet: 'Use ciphers_zero_width_hide to put a message into a text as invisible characters.',
  guidelines: [
    'ciphers_zero_width_read with the same scheme reads it back. Plenty of sites and chats strip invisible characters, so check after pasting.',
    'A cover that already carries characters of the scheme is refused, since they would read as part of the message. An emoji joined with U+200D is one.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({
        maxLength: MAX_TRANSFORM_TEXT_LENGTH,
        description: 'The message to hide',
      }),
      cover: Type.Optional(
        Type.String({
          maxLength: MAX_TRANSFORM_TEXT_LENGTH,
          description: 'Visible text to carry it (default none, the bare invisible characters)',
        }),
      ),
      ...zeroWidthSchemeArguments('Default binary'),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'conceal',
    description: 'Hide a message in invisible characters',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) => answer(formatZeroWidthHide(await loadLibrary(), params)),
})

/**
 * The arguments for how bits group, shared by reading and hiding.
 *
 * @returns {object} The optional `digits`, `order` and `unit` schemas.
 */
function whitespaceFramingArguments() {
  return {
    digits: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: MAX_ZERO_WIDTH_DIGITS,
        description: 'Bits per group (default 8)',
      }),
    ),
    order: Type.Optional(
      Type.Enum(whitespaceOrders, {
        description: 'Which bit of a group comes first in the text: msb (default) or lsb',
      }),
    ),
    unit: Type.Optional(
      Type.Enum(zeroWidthUnits, {
        description:
          'What one group is: byte for UTF-8 bytes (default), code-unit for UTF-16 code units, code-point for whole code points',
      }),
    ),
  }
}

export const whitespaceReadTool = defineCipherTool({
  name: 'ciphers_whitespace_read',
  title: 'Read Whitespace',
  description: `List where a text keeps its ordinary whitespace, or read one channel of it as bits. Four channels: line-ending (lf, crlf, cr), trailing (spaces and tabs before a line ends), interior (gaps inside a line: single, double, wide, tab, mixed) and sentence (interior gaps right after ${SENTENCE_BOUNDARIES}). Without zero and one, the answer counts each class and gives line, column and [start,end) UTF-16 offsets for what stands out, up to ${WHITESPACE_LINES} per channel. With channel, zero and one, each place becomes a bit and the bits decode as text; bits that fill no group are reported, never dropped.`,
  snippet:
    'Use ciphers_whitespace_read on text whose trailing spaces, double spaces or line endings may spell bits.',
  guidelines: [
    'Pass the text exactly as it came: one trimmed line or one normalized line ending and the channel is gone.',
    'The mapping is yours to state, nothing guesses it: zero space with one tab, then the other way round, are two readings of one trailing channel.',
    'A trailing run is read one character at a time as space or tab. A gap is read whole, so three spaces are wide, not three bits.',
    'A place whose class has no bit stops the reading with its position. unmapped skip leaves such places out and lists them.',
    'Only U+0020, tab, CR and LF count here. ciphers_characters_inspect finds no-break and zero-width spaces, and ciphers_zero_width_read reads spaces and tabs as digits wherever they sit.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({
        maxLength: MAX_FREQUENCY_TEXT_LENGTH,
        description: 'Text to look at, exactly as it came, line endings included',
      }),
      channel: Type.Optional(
        Type.Enum(whitespaceChannels, {
          description:
            'The channel to list whole, or to read with zero and one (default all four, listed)',
        }),
      ),
      zero: Type.Optional(
        Type.String({
          maxLength: 64,
          description:
            'Classes of the channel read as 0, parted by spaces or commas, such as space, lf or single',
        }),
      ),
      one: Type.Optional(
        Type.String({
          maxLength: 64,
          description: 'Classes read as 1, such as tab, "crlf cr" or double',
        }),
      ),
      unmapped: Type.Optional(
        Type.Enum(whitespaceUnmapped, {
          description:
            'A place whose class has no bit: refuse stops with its position (default), skip leaves it out and lists it',
        }),
      ),
      offset: Type.Optional(
        Type.Integer({
          minimum: 0,
          maximum: MAX_FREQUENCY_TEXT_LENGTH,
          description: 'Bits to pass over before the first group (default 0)',
        }),
      ),
      ...whitespaceFramingArguments(),
      boundaries: Type.Optional(
        Type.String({
          maxLength: 64,
          description: `Sentence channel: the characters a gap follows (default ${SENTENCE_BOUNDARIES})`,
        }),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'whitespace',
    description: 'List spaces, tabs and line endings by position, or read them as bits',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) => answer(formatWhitespaceRead(await loadLibrary(), params)),
})

export const whitespaceHideTool = defineCipherTool({
  name: 'ciphers_whitespace_hide',
  title: 'Hide Whitespace Message',
  description:
    'Hide a message at the line ends of a cover text, one space or tab per bit, eight bits a line from the first line on unless perLine says otherwise. The answer is the text alone: the cover with its own characters and line endings untouched, and trailing runs added. A cover with too few lines is refused, and so is one whose lines already end in a space or tab.',
  snippet: 'Use ciphers_whitespace_hide to put a message into the trailing whitespace of a text.',
  guidelines: [
    'ciphers_whitespace_read with channel trailing and the same zero, one, digits, order and unit reads it back.',
    'Each line takes perLine bits, so a message of n bytes needs n lines at the default 8.',
    'Editors, formatters and chat boxes strip trailing whitespace, so check after pasting.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({
        maxLength: MAX_TRANSFORM_TEXT_LENGTH,
        description: 'The message to hide',
      }),
      cover: Type.String({
        maxLength: MAX_FREQUENCY_TEXT_LENGTH,
        description: 'Text of several lines to carry it, none ending in a space or tab',
      }),
      zero: Type.String({
        maxLength: 16,
        description: 'What a 0 is written as: space or tab',
      }),
      one: Type.String({
        maxLength: 16,
        description: 'What a 1 is written as: the other of space and tab',
      }),
      ...whitespaceFramingArguments(),
      perLine: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: MAX_BITS_PER_LINE,
          description: `Bits put on one line, 1 to ${MAX_BITS_PER_LINE} (default 8)`,
        }),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'trail',
    description: 'Hide a message in spaces and tabs at the line ends of a text',
    positional: ['text'],
    stdin: ['text', 'cover'],
  },
  execute: async (params) => answer(formatWhitespaceHide(await loadLibrary(), params)),
})

/**
 * One side of a row a caller passes back. The span is optional there, the token numbers are not.
 *
 * @returns {object} The schema of `left` and `right`.
 */
function alignmentRangeArgument() {
  return Type.Object(
    {
      from: Type.Integer({ minimum: 0, description: 'First token, counted from 0' }),
      to: Type.Integer({ minimum: 0, description: 'The token after the last one' }),
      start: Type.Optional(Type.Integer({ minimum: 0, description: 'UTF-16 offset of the span' })),
      end: Type.Optional(Type.Integer({ minimum: 0, description: 'UTF-16 offset past the span' })),
    },
    { additionalProperties: false },
  )
}

export const textsAlignTool = defineCipherTool({
  name: 'ciphers_texts_align',
  title: 'Align Texts',
  description: `Align two versions of a text word by word and say what stayed, what changed, what was added and what was dropped. Each row names the tokens and the [start,end) UTF-16 span on both sides, so the place can be cut out of either text. Words pair up so that as many as possible match, and a repeated word that could pair another way is marked ambiguous. With rows, check a map you wrote or edited instead: gaps, overlaps, rows out of order, wrong token counts and false equalities are listed. Texts over ${MAX_ALIGNMENT_CELLS} token comparisons or ${MAX_ALIGNMENT_ROWS} rows are refused, never cut short.`,
  snippet:
    'Use ciphers_texts_align on two versions of a text to see which words changed and where.',
  guidelines: [
    'left is the earlier or reference text, right the other. Offsets go into each text as passed, so pass them exactly as copied.',
    'compare loosens what counts as the same word: canonical ignores how accents are encoded, caseless also case, unaccented also the accents. A row with = matched only that way.',
    'To check rows of your own, pass rows with the same texts, tokens and compare: operation, then left and right as { from, to }.',
    'Whitespace and punctuation between tokens are not compared. tokens whitespace keeps punctuation inside the tokens.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      left: Type.String({
        maxLength: MAX_FREQUENCY_TEXT_LENGTH,
        description: 'The first version, exactly as copied',
      }),
      right: Type.String({
        maxLength: MAX_FREQUENCY_TEXT_LENGTH,
        description: 'The second version, exactly as copied',
      }),
      tokens: Type.Optional(
        Type.Enum(alignmentTokens, {
          description:
            'Where the texts are cut: words for runs of letters, marks and digits (default), whitespace for anything between spaces',
        }),
      ),
      compare: Type.Optional(
        Type.Enum(alignmentCompares, {
          description:
            'When two tokens are the same: exact (default), canonical (NFC), caseless (NFC, lower case), unaccented (caseless without combining marks)',
        }),
      ),
      rows: Type.Optional(
        Type.Array(
          Type.Object(
            {
              operation: Type.Enum(alignmentOperations, {
                description:
                  'equal and replace take tokens on both sides, insert only on the right, delete only on the left',
              }),
              left: alignmentRangeArgument(),
              right: alignmentRangeArgument(),
              exact: Type.Optional(
                Type.Boolean({ description: 'On equal: whether the raw tokens match too' }),
              ),
              ambiguous: Type.Optional(Type.Boolean({ description: 'Carried along, not checked' })),
            },
            { additionalProperties: false },
          ),
          {
            maxItems: MAX_ALIGNMENT_ROWS,
            description:
              'Rows to check instead of aligning. They must cover every token of both texts, in order',
          },
        ),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'align',
    description: 'Align two versions of a text word by word',
    positional: ['left', 'right'],
    stdin: ['left', 'right'],
  },
  execute: async (params) => answer(formatAlignment(await loadLibrary(), params)),
})

export const keyRecoverTool = defineCipherTool({
  name: 'ciphers_key_recover',
  title: 'Recover Key',
  description: `Search for the key of a Vigenère, Beaufort, variant Beaufort, monoalphabetic substitution, columnar transposition or homophonic substitution ciphertext, and rank the keys found by how much the text each one decodes to reads like the language: quadgrams for English, letter frequencies for Polish and Japanese romaji. Best first, each with its plaintext; the reply gives the fit plaintext and random letters score, so a wrong cipher shows as every key scoring near random.`,
  snippet:
    'Use ciphers_key_recover to find the key once ciphers_family_guess or ciphers_period_estimate has named the cipher.',
  guidelines: [
    'Input is ciphertext and the cipher. Returns up to limit keys, best first; only the top text is whole.',
    `Vigenère, Beaufort and variant Beaufort try the five likeliest key lengths unless period gives one; ciphers_period_estimate shows the lengths.`,
    `Columnar tries every column order of each length from 2 to ${DEFAULT_COLUMNAR_KEY_LENGTH}, or of keyLength up to ${MAX_COLUMNAR_KEY_LENGTH}; substitution, columnar and homophonic need English.`,
    'Homophonic reads symbols split by whitespace or commas, or runs of symbolWidth characters; its random score is the same symbols shuffled, since a many-to-one map squeezes some English out of any stream. It wants about 600 symbols: at half that most keys come back wrong.',
    'Short texts, around 150 letters, give ranked guesses rather than one answer: read the top few.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({ maxLength: MAX_TRANSFORM_TEXT_LENGTH, description: 'Ciphertext' }),
      cipher: Type.Enum(keyRecoveryCiphers, {
        description:
          'Cipher the text was encrypted with: vigenere, beaufort, variant-beaufort (plaintext minus key), substitution (any mixed alphabet), columnar or homophonic (many symbols per letter)',
      }),
      period: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: MAX_PERIOD,
          description: `${periodicKeyRecoveryCiphers.join(', ')} only: key length, 1 to ${MAX_PERIOD}; without it the five likeliest are tried`,
        }),
      ),
      keyLength: Type.Optional(
        Type.Integer({
          minimum: 2,
          maximum: MAX_COLUMNAR_KEY_LENGTH,
          description: `Columnar only: key length, 2 to ${MAX_COLUMNAR_KEY_LENGTH}; without it every length from 2 to ${DEFAULT_COLUMNAR_KEY_LENGTH}`,
        }),
      ),
      symbolWidth: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: MAX_SYMBOL_WIDTH,
          description: `Homophonic only: characters per symbol, 1 to ${MAX_SYMBOL_WIDTH}, whitespace and commas skipped; without it whitespace and commas split the symbols`,
        }),
      ),
      starts: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: MAX_HOMOPHONIC_STARTS,
          description: `Homophonic only: random starts, 1 to ${MAX_HOMOPHONIC_STARTS} (default ${DEFAULT_HOMOPHONIC_STARTS}); more look further`,
        }),
      ),
      seed: Type.Optional(
        Type.Integer({
          minimum: 0,
          maximum: MAX_SEED,
          description: `Homophonic only: seed, 0 to ${MAX_SEED}; another one gives other starts`,
        }),
      ),
      lang: language(
        'Language the plaintext reads in, ja for Hepburn romaji; substitution, columnar and homophonic take en only (default en)',
      ),
      limit: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: MAX_KEY_CANDIDATES,
          description: `How many keys to list, 1 to ${MAX_KEY_CANDIDATES} (default ${DEFAULT_KEY_CANDIDATES})`,
        }),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    command: 'recover',
    description:
      'Search the key of a Vigenère, Beaufort, substitution, columnar or homophonic text',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) => answer(formatKeyRecovery(await loadLibrary(), params)),
})

export const infoTool = defineCipherTool({
  name: 'ciphers_info',
  title: 'Cipher Info',
  description:
    "List the built-in ciphers by category, or show one cipher's options, category, family, and keyspace.",
  snippet:
    'Use ciphers_info to check cipher names and required options before encoding or decoding.',
  guidelines: [
    'Without a cipher name it lists every cipher under its category, with family and description; category narrows the list.',
    'With a name it shows options, defaults, self-inverse, and keyspace.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      cipher: Type.Optional(
        Type.String({
          maxLength: 32,
          description: 'Registered cipher to describe; omit to list every cipher',
        }),
      ),
      category: Type.Optional(
        Type.Enum(cipherCategories, { description: OPTION_DESCRIPTIONS.category }),
      ),
    },
    { additionalProperties: false },
  ),
  cli: {
    aliases: ['ciphers'],
    description: "List the ciphers, or show one cipher's options",
    positional: ['cipher'],
  },
  execute: async (params) =>
    answer(formatCipherInfo(await loadLibrary(), params.cipher, params.category)),
})

/** Every cipher tool, in the order each surface lists them. */
export const ciphersTools: readonly ToolDefinition[] = [
  encodeTool,
  decodeTool,
  caesarBruteTool,
  frequencyTool,
  periodEstimateTool,
  familyGuessTool,
  passphraseProbeTool,
  cribDragTool,
  hiddenTextReadTool,
  charactersInspectTool,
  zeroWidthReadTool,
  zeroWidthHideTool,
  whitespaceReadTool,
  whitespaceHideTool,
  textsAlignTool,
  keyRecoverTool,
  infoTool,
]

/** Characters of a text argument the status line shows. */
const SUMMARY_TEXT_LENGTH = 40

/**
 * The start of a text argument for the status line.
 *
 * @param text - The argument, whatever the host passed.
 * @returns {string} At most `SUMMARY_TEXT_LENGTH` characters, quoted.
 */
function excerpt(text: unknown): string {
  const value = typeof text === 'string' ? text : ''
  if (value.length <= SUMMARY_TEXT_LENGTH) return JSON.stringify(value)
  const splitsPair = /[\uD800-\uDBFF]/.test(value[SUMMARY_TEXT_LENGTH - 1]!)
  return JSON.stringify(`${value.slice(0, SUMMARY_TEXT_LENGTH - (splitsPair ? 1 : 0))}…`)
}

/**
 * A name argument for the status line.
 *
 * @param value - The argument, whatever the host passed.
 * @returns {string} The name, or nothing when it is not a string.
 */
function named(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** One-line call summaries for the Pi and OMP status lines. The adapters sanitize them. */
export const callSummaries: Readonly<
  Record<string, (args: Readonly<Record<string, unknown>>) => string>
> = {
  ciphers_encode: (args) => `${named(args['cipher'])} ${excerpt(args['text'])}`,
  ciphers_decode: (args) => `${named(args['cipher'])} ${excerpt(args['text'])}`,
  ciphers_caesar_brute: (args) => excerpt(args['text']),
  ciphers_frequency: (args) => excerpt(args['text']),
  ciphers_period_estimate: (args) => excerpt(args['text']),
  ciphers_family_guess: (args) => excerpt(args['text']),
  ciphers_passphrase_probe: (args) => excerpt(args['text']),
  ciphers_crib_drag: (args) => (typeof args['crib'] === 'string' ? excerpt(args['crib']) : 'known'),
  ciphers_hidden_text_read: (args) => `${named(args['pick']) || 'all'} ${excerpt(args['text'])}`,
  ciphers_characters_inspect: (args) => excerpt(args['text']),
  ciphers_zero_width_read: (args) =>
    `${named(args['scheme']) || (args['symbols'] === undefined ? 'all' : 'own')} ${excerpt(args['text'])}`,
  ciphers_zero_width_hide: (args) =>
    `${named(args['scheme']) || (args['symbols'] === undefined ? 'binary' : 'own')} ${excerpt(args['text'])}`,
  ciphers_whitespace_read: (args) => `${named(args['channel']) || 'all'} ${excerpt(args['text'])}`,
  ciphers_whitespace_hide: (args) => excerpt(args['text']),
  ciphers_texts_align: (args) =>
    `${args['rows'] === undefined ? 'align' : 'check'} ${excerpt(args['left'])}`,
  ciphers_key_recover: (args) => `${named(args['cipher'])} ${excerpt(args['text'])}`,
  ciphers_info: (args) => named(args['cipher']) || named(args['category']) || 'all',
}
