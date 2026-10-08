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
  DEFAULT_COLUMNAR_KEY_LENGTH,
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
  MAX_BOOK_LENGTH,
  MAX_KEY_LENGTH,
  MAX_PERIOD,
  MAX_TRANSFORM_TEXT_LENGTH,
  OPTION_DESCRIPTIONS,
  PROBE_LIST_LIMITS,
  bruteForceCaesar,
  formatCipherInfo,
  formatCribDrag,
  formatFamilyGuess,
  formatFrequencyAnalysis,
  formatPassphraseProbe,
  formatHiddenText,
  formatKeyRecovery,
  formatPeriodEstimate,
  keyRecoveryCiphers,
  periodicKeyRecoveryCiphers,
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
    ciphers: ['vigenere', 'beaufort', 'porta', 'autokey', 'running-key', 'playfair', 'nihilist'],
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
    ciphers: ['four-square', 'two-square'],
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
      pattern: /^(?:[A-Za-z]{4}|[A-Za-z]{9})$/,
      error: 'must be 4 or 9 ASCII letters (a 2×2 or 3×3 matrix)',
    },
  },
  { ciphers: ['columnar'], required: ['key'] },
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
  if (rule !== undefined) {
    const fields = KEYWORDS.filter((field) => requirement.required.includes(field))
    const bad = fields.find((field) => {
      const value = params[field]
      return value !== undefined && !rule.pattern.test(value)
    })
    if (bad !== undefined) return `Invalid arguments at /${bad}: ${rule.error}`
  }
  return digestError(requirement.digests, params)
}

/**
 * Refuses a `digest` the schema lists for another cipher.
 *
 * @param digests - The digests the cipher takes, when it names them.
 * @param params - Arguments that passed the schema.
 * @returns {string | undefined} The error, or nothing when the digest fits.
 */
function digestError(
  digests: readonly string[] | undefined,
  params: Readonly<CipherToolParams>,
): string | undefined {
  if (digests === undefined || params.digest === undefined || digests.includes(params.digest)) {
    return undefined
  }
  return `Invalid arguments at /digest: ${params.cipher} takes ${digests.join(', ')}`
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
      Type.Enum(['idea', '3des', 'cast5', 'blowfish', 'aes128', 'aes192', 'aes256'], {
        description: OPTION_DESCRIPTIONS.algorithm,
      }),
    ),
    count: Type.Optional(
      Type.Integer({ minimum: 1024, maximum: 65_011_712, description: OPTION_DESCRIPTIONS.count }),
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
      Type.Enum(['word', 'line-word', 'page-line-word'], {
        description: OPTION_DESCRIPTIONS.address,
      }),
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

export const encodeTool = defineTool({
  name: 'ciphers_encode',
  title: 'Cipher Encode',
  description: 'Encode text with an exact-name built-in cipher. ciphers_info lists the options.',
  snippet: 'Use ciphers_encode to encode text with local educational and puzzle ciphers.',
  guidelines: [
    'Vigenère, Gronsfeld (digits 0 to 9 only), Beaufort, Porta, Autokey, Running key, Playfair, Nihilist and Columnar need key, Alberti needs key and period, Four-square (four-square) and Two-square (two-square) need key and secondKey.',
    'Quagmire I to III (quagmire-1, quagmire-2, quagmire-3) need key and indicator, Quagmire IV (quagmire-4) needs secondKey too. The indicator stands under plain A unless indicatorUnder names another letter, as an ACA puzzle sometimes does.',
    'Running key (running-key) never repeats its key: the passage needs at least one ASCII letter per letter of the text, and the letters past that are left unused.',
    'Porta (porta) follows the ACA table; a text from dCode with its default table needs rotation right.',
    'Four-square (four-square) folds J into I; squares without Q, as on the English Wikipedia page, need omit q.',
    'Two-square (two-square) stacks its squares by default, as the English Wikipedia page does; a puzzle from the ACA or dCode sets them side by side and needs orientation horizontal. Without Q in the squares it needs omit q too.',
    'Route (route) needs width, the cells per row. Decoding reads the grid along path from corner, so a grid copied row by row from a puzzle goes to ciphers_decode. Line breaks are not cells.',
    'A1Z26 (a1z26) turns letters into their numbers, 1 to 26, joined by separator (default -). With zero it is the single digit form instead: A to I for 1 to 9 and zero for 0, so letters like BEF go to ciphers_decode and come back as 256.',
    'Book cipher (book) needs book, the whole text both sides count in. Decoding reads every number in order, one per address, or two or three with address line-word or page-line-word, and pick letter takes first letters, as Beale cipher 2 does. Encoding takes the next matching word each time, so a repeated letter gets a new number.',
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
    'CAST5 (cast5) works like Triple DES with a key of any even number of hex digits from 10 to 32.',
    'OpenPGP (openpgp) reads and writes what gpg --symmetric gives: key is the passphrase as plain text, ciphers_decode takes the armored -----BEGIN PGP MESSAGE----- block (or its packets in base64 or hex) and reads algorithm, S2K, compression and AEAD mode (OCB, EAX or GCM) from it, ciphers_encode writes armor with algorithm (default aes256), digest (default sha512), count, and salt and iv to fix the random values.',
    'Rabbit (rabbit) is a stream cipher with a key of 32 hex digits and an optional iv of 16; it pads nothing, and endian picks the byte order (big as in RFC 4503, the default, or little as in Crypto++).',
    'RC4 (rc4) is a stream cipher with a key of any even number of hex digits from 2 to 512 and no IV; it pads nothing.',
    'XOR (xor) repeats a key of any nonzero even number of hex digits over the bytes.',
    'Salsa20 (salsa20) is a stream cipher with a key of 32 or 64 hex digits and a nonce of 16, XSalsa20 (xsalsa20) one with a key of 64 and a nonce of 48; they pad nothing, and counter numbers the first 64-byte block (default 0).',
    'ChaCha20 (chacha20) takes a key of 64 hex digits and a nonce of 24, XChaCha20 (xchacha20) the same key and a nonce of 48; both take counter like Salsa20.',
    'ChaCha20-Poly1305 (chacha20-poly1305) takes the ChaCha20 key and nonce and optional aad in hex; the hex out is the text bytes plus a 16-byte tag, and decoding fails unless key, nonce and aad all match.',
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

export const decodeTool = defineTool({
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
  cli: {
    command: 'brute',
    description: 'Brute-force a Caesar shift, best fit to --lang first',
    positional: ['text'],
    stdin: ['text'],
  },
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
  cli: {
    description: 'Count the letters and compare their order with the language',
    positional: ['text'],
    stdin: ['text'],
  },
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
  cli: {
    command: 'period',
    description: 'Estimate a Vigenère key length, with the key for the top three',
    positional: ['text'],
    stdin: ['text'],
  },
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
  cli: {
    command: 'guess',
    description: 'Guess the cipher family of a ciphertext, with the next step',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) =>
    answer(formatFamilyGuess(await loadLibrary(), params.text, params.lang)),
})

export const passphraseProbeTool = defineTool({
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

export const cribDragTool = defineTool({
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

export const hiddenTextReadTool = defineTool({
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

export const keyRecoverTool = defineTool({
  name: 'ciphers_key_recover',
  title: 'Recover Key',
  description: `Search for the key of a Vigenère, Beaufort, variant Beaufort, monoalphabetic substitution or columnar transposition ciphertext, and rank the keys found by how much the text each one decodes to reads like the language: quadgrams for English, letter frequencies for Polish and Japanese romaji. Best first, each with its plaintext; the reply gives the fit plaintext and random letters score, so a wrong cipher shows as every key scoring near random.`,
  snippet:
    'Use ciphers_key_recover to find the key once ciphers_family_guess or ciphers_period_estimate has named the cipher.',
  guidelines: [
    'Input is ciphertext and the cipher. Returns up to limit keys, best first; only the top text is whole.',
    `Vigenère, Beaufort and variant Beaufort try the five likeliest key lengths unless period gives one; ciphers_period_estimate shows the lengths.`,
    `Columnar tries every column order of each length from 2 to ${DEFAULT_COLUMNAR_KEY_LENGTH}, or of keyLength up to ${MAX_COLUMNAR_KEY_LENGTH}; substitution and columnar need English.`,
    'Short texts, around 150 letters, give ranked guesses rather than one answer: read the top few.',
  ],
  effect: 'read',
  input: Type.Object(
    {
      text: Type.String({ maxLength: MAX_TRANSFORM_TEXT_LENGTH, description: 'Ciphertext' }),
      cipher: Type.Enum(keyRecoveryCiphers, {
        description:
          'Cipher the text was encrypted with: vigenere, beaufort, variant-beaufort (plaintext minus key), substitution (any mixed alphabet) or columnar',
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
      lang: language(
        'Language the plaintext reads in, ja for Hepburn romaji; substitution and columnar take en only (default en)',
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
    description: 'Search the key of a Vigenère, Beaufort, substitution or columnar text',
    positional: ['text'],
    stdin: ['text'],
  },
  execute: async (params) => answer(formatKeyRecovery(await loadLibrary(), params)),
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
  ciphers_key_recover: (args) => `${named(args['cipher'])} ${excerpt(args['text'])}`,
  ciphers_info: (args) => named(args['cipher']) || named(args['category']) || 'all',
}
