/** The cipher tools, declared once for MCP, Pi and OMP. The library loads on the first call. */

import {
  Type,
  ToolInputError,
  defineTool,
  type ToolDefinition,
  type ToolResult,
} from '@agntn/tools'
import { builtinCiphers, cipherCategories } from './core/ciphers.ts'
import {
  AFFINE_MULTIPLIERS,
  BRUTE_PREVIEW_LENGTH,
  MAX_BRUTE_TEXT_LENGTH,
  MAX_FREQUENCY_TEXT_LENGTH,
  MAX_KEY_LENGTH,
  MAX_PERIOD,
  MAX_TRANSFORM_TEXT_LENGTH,
  OPTION_DESCRIPTIONS,
  bruteForceCaesar,
  formatCipherInfo,
  formatFamilyGuess,
  formatFrequencyAnalysis,
  formatPeriodEstimate,
  transformCipher,
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

type CipherOptionRequirement = {
  readonly ciphers: readonly string[]
  readonly required: readonly ('key' | 'iv' | 'nonce' | 'period' | 'width')[]
  readonly key?: {
    readonly pattern: RegExp
    readonly error: string
  }
}

const AES_KEY = {
  pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16}){0,2}$/,
  error: 'must be 32, 48 or 64 hex digits (AES-128, AES-192 or AES-256)',
}

const TRIPLE_DES_KEY = {
  pattern: /^\s*(?:[0-9A-Fa-f]\s*){32}(?:(?:[0-9A-Fa-f]\s*){16})?$/,
  error: 'must be 32 or 48 hex digits (two-key or three-key Triple DES)',
}

/** What the schema can't say per cipher: the options it needs and the shape of its key. */
const cipherOptionRequirements: readonly CipherOptionRequirement[] = [
  {
    ciphers: ['alberti'],
    required: ['key', 'period'],
    key: { pattern: /^[A-Za-z]+$/, error: 'must contain ASCII letters only' },
  },
  {
    ciphers: ['vigenere', 'beaufort', 'autokey', 'playfair'],
    required: ['key'],
    key: { pattern: /[A-Za-z]/, error: 'must contain at least one ASCII letter' },
  },
  { ciphers: ['columnar'], required: ['key'] },
  { ciphers: ['route'], required: ['width'] },
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
  { ciphers: ['aes-passphrase'], required: ['key'] },
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
    ciphers: ['rc4'],
    required: ['key'],
    key: {
      pattern: /^\s*(?:(?:[0-9A-Fa-f]\s*){2}){1,256}$/,
      error: 'must be an even number of hex digits from 2 to 512 (a 1 to 256-byte RC4 key)',
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
 * The first rule the cipher sets beyond the schema that the arguments break.
 *
 * @param params - Arguments that passed the schema.
 * @returns {string | undefined} One validation line, or nothing when they hold.
 */
function cipherInputError(params: Readonly<CipherToolParams>): string | undefined {
  const requirement = cipherOptionRequirements.find((candidate) =>
    candidate.ciphers.includes(params.cipher),
  )
  if (requirement === undefined) return undefined
  for (const field of requirement.required) {
    if (params[field] === undefined || params[field] === '') {
      return `Invalid arguments at /${field}: required for ${params.cipher}`
    }
  }
  const rule = requirement.key
  if (rule === undefined || params.key === undefined || rule.pattern.test(params.key)) {
    return undefined
  }
  return `Invalid arguments at /key: ${rule.error}`
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
  const error = cipherInputError(params)
  if (error !== undefined) throw new ToolInputError([error])
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
    segment: Type.Optional(Type.Enum([1, 8, 128], { description: OPTION_DESCRIPTIONS.segment })),
    blockSize: Type.Optional(
      Type.Enum([128, 160, 192, 224, 256], { description: OPTION_DESCRIPTIONS.blockSize }),
    ),
    tagLength: Type.Optional(
      Type.Enum([32, 48, 64, 80, 96, 112, 128], { description: OPTION_DESCRIPTIONS.tagLength }),
    ),
    digest: Type.Optional(
      Type.Enum(['md5', 'sha1', 'sha256'], { description: OPTION_DESCRIPTIONS.digest }),
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

export const encodeTool = defineTool({
  name: 'ciphers_encode',
  title: 'Cipher Encode',
  description: 'Encode text with an exact-name built-in cipher. ciphers_info lists the options.',
  snippet: 'Use ciphers_encode to encode text with local educational and puzzle ciphers.',
  guidelines: [
    'Vigenère, Beaufort, Autokey, Playfair and Columnar need key, Alberti needs key and period.',
    'Route (route) needs width, the cells per row. Decoding reads the grid along path from corner, so a grid copied row by row from a puzzle goes to ciphers_decode. Line breaks are not cells.',
    'Straddling checkerboard (straddling-checkerboard) turns letters into digits, one for the eight on the top row and two for the rest. key is the board of 28 cells and blanks its two blank digits.',
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
    'Rabbit (rabbit) is a stream cipher with a key of 32 hex digits and an optional iv of 16; it pads nothing, and endian picks the byte order (big as in RFC 4503, the default, or little as in Crypto++).',
    'RC4 (rc4) is a stream cipher with a key of any even number of hex digits from 2 to 512 and no IV; it pads nothing.',
    'XOR (xor) repeats a key of any nonzero even number of hex digits over the bytes; bytes: hex reads and writes hex on both sides, for bytes that are not UTF-8 text.',
    'ciphers_info lists every option with its default.',
  ],
  effect: 'read',
  input: cipherInput,
  execute: (params) => transform('encode', params),
})

export const decodeTool = defineTool({
  name: 'ciphers_decode',
  title: 'Cipher Decode',
  description: 'Decode text with an exact-name built-in cipher. ciphers_info lists the options.',
  snippet: 'Use ciphers_decode to decode text encoded with local educational and puzzle ciphers.',
  guidelines: ['Same options as ciphers_encode.'],
  effect: 'read',
  input: cipherInput,
  execute: (params) => transform('decode', params),
})

export const caesarBruteTool = defineTool({
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
  execute: async (params) =>
    answer(bruteForceCaesar(await loadLibrary(), params.text, params.lang)),
})

export const frequencyTool = defineTool({
  name: 'ciphers_frequency',
  title: 'Frequency Analysis',
  description:
    'Analyze A-Z letter frequencies, compare their order with English, Polish or Japanese romaji, and report the index of coincidence.',
  snippet: 'Use ciphers_frequency to analyze letter distribution for cipher identification.',
  guidelines: [
    'Useful for identifying substitution ciphers (frequency distribution preserved).',
    'Compare actual frequency order with expected language order (EN: ETAOIN...).',
    'An index of coincidence near the plaintext value the result names (about 0.065 English, 0.057 Polish, 0.08 to 0.09 Japanese romaji) suggests monoalphabetic; near 0.038 suggests polyalphabetic or random.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Text to analyze' }),
      lang: language('Reference language, ja for Hepburn romaji (default en)'),
    },
    { additionalProperties: false },
  ),
  execute: async (params) =>
    answer(formatFrequencyAnalysis(await loadLibrary(), params.text, params.lang)),
})

export const periodEstimateTool = defineTool({
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
  execute: async (params) =>
    answer(formatPeriodEstimate(await loadLibrary(), params.text, params.lang, params.maxPeriod)),
})

export const familyGuessTool = defineTool({
  name: 'ciphers_family_guess',
  title: 'Cipher Family Guess',
  description:
    'Guess which cipher family a ciphertext comes from, by its alphabet and layout, then index of coincidence and how the letters fit the language. Candidates, most likely first, each with its confidence, the signal behind it and the call to try next.',
  snippet: 'Use ciphers_family_guess first on a ciphertext whose cipher nobody named.',
  guidelines: [
    'Input is ciphertext. Returns candidate families with the built-in ciphers to try, most likely first, each with high, medium or low confidence, its signal and the next call.',
    'Treat the list as candidates: a short text comes back with low confidence, and only a decode that reads settles it.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({ maxLength: MAX_FREQUENCY_TEXT_LENGTH, description: 'Ciphertext' }),
      lang: language('Language the plaintext should read in, ja for Hepburn romaji (default en)'),
    },
    { additionalProperties: false },
  ),
  execute: async (params) =>
    answer(formatFamilyGuess(await loadLibrary(), params.text, params.lang)),
})

export const infoTool = defineTool({
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
  ciphers_info: (args) => named(args['cipher']) || named(args['category']) || 'all',
}
