import type * as CiphersModule from './index.ts'
import { cipherCategories } from './core/ciphers.ts'

export { cipherCategories }

type CiphersLibrary = Pick<
  typeof CiphersModule,
  'analyzeFrequency' | 'ciphers' | 'create' | 'resolveCipher'
>

export type CipherToolParams = {
  cipher: string
  text: string
  shift?: number
  key?: string
  transposition?: string
  iv?: string
  tweak?: string
  nonce?: string
  aad?: string
  rails?: number
  width?: number
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  path?: 'spiral-clockwise' | 'spiral-counterclockwise' | 'snake-rows' | 'snake-columns' | 'columns'
  a?: number
  b?: number
  period?: number
  letters?: number
  segment?: number
  blockSize?: number
  endian?: 'big' | 'little'
  bytes?: 'text' | 'hex'
  blanks?: string
  tagLength?: number
  digest?: 'md5' | 'sha1' | 'sha256'
  keyLength?: number
  iterations?: number
  salt?: string
  preserveCase?: boolean
  stripNonAlpha?: boolean
  positions?: string
  rings?: string
  plugboard?: string
}

export type CipherToolResult = {
  content: Array<{ type: 'text'; text: string }>
  details?: Record<string, unknown>
}

/** Bound model-controlled work and returned context; Caesar brute force expands input 25×. */
export const MAX_TRANSFORM_TEXT_LENGTH = 10_000
export const MAX_BRUTE_TEXT_LENGTH = 2_000
export const MAX_FREQUENCY_TEXT_LENGTH = 100_000
export const MAX_KEY_LENGTH = 1_000
/** Longest key length `ciphers_period_estimate` tries. */
export const MAX_PERIOD = 100
/** Key lengths the period estimate prints, most likely first. */
export const PERIOD_LINES = 10
/** Kasiski factors the period estimate prints. */
export const KASISKI_FACTORS = 5

/**
 * Characters a brute-force line keeps below the top one. From this length on, scored against the
 * right language, the ranking put the right shift first in every sampled English, Polish
 * and Japanese text, and a line this long is still enough to see whether a lower shift reads.
 */
export const BRUTE_PREVIEW_LENGTH = 80

/** Affine multipliers coprime with 26, the only values the cipher accepts for `a`. */
export const AFFINE_MULTIPLIERS = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25] as const

/**
 * What the model reads about the arguments only some ciphers take. The extensions never load a
 * cipher, so the registry cannot write these; the MCP test checks them against it.
 */
export const OPTION_DESCRIPTIONS = {
  category: `Cipher category to list: ${cipherCategories.join(', ')}. Omit to list every category`,
  key: 'Keyword, the passphrase for aes-passphrase (any text), or a hex key: 32, 48 or 64 digits for aes, aes-cbc, aes-cfb, aes-ofb, aes-ctr, aes-ccm, aes-ocb and aes-cbc-mac, 64, 80 or 96 for aes-lrw, 64 or 128 for aes-xts, 32, 40, 48, 56 or 64 for rijndael, 16 for des, 48 for desx, 32 or 48 for triple-des and triple-des-cbc, 8 to 112 (an even number) for blowfish, 32 for idea and lucifer, 32 to 112 in steps of 8 for mars, 32, 48 or 64 for serpent, 32 for rabbit, 2 to 512 (an even number) for rc4, any nonzero even number for xor. Required by vigenere, beaufort, autokey, alberti, playfair, columnar, aes, aes-cbc, aes-cfb, aes-ofb, aes-ctr, aes-ccm, aes-ocb, aes-lrw, aes-xts, aes-cbc-mac, aes-passphrase, rijndael, des, desx, triple-des, triple-des-cbc, blowfish, idea, lucifer, mars, serpent, rabbit, rc4 and xor; optional for polybius, adfgvx, bifid and straddling-checkerboard (the 28 cells row by row, each letter A-Z once and two fillers such as . and /)',
  transposition: 'ADFGVX only: keyword for the columnar transposition after the grid step',
  iv: 'Initialization vector in hex. Required by AES-CBC, AES-CFB, AES-OFB and AES-CTR (32 digits, the initial counter block for AES-CTR) and triple-des-cbc (16 digits); optional for rabbit (16 digits, IV setup skipped without it)',
  endian:
    'Rabbit only: byte order of key, IV and keystream, big as in RFC 4503 and CyberChef (default) or little as in Crypto++',
  bytes:
    'XOR only: text for UTF-8 text on the plain side (default), or hex to read and write hex both ways, for bytes that are not text',
  blanks:
    'Straddling checkerboard only: the two blank digits of the top row, each of which starts a code of two digits (default 26)',
  width:
    'Route only, and required there: cells per row of the grid the text fills row by row (at least 2)',
  corner: 'Route only: corner the path starts from (default top-left)',
  path: 'Route only: path through the grid, decoding reads along it and encoding writes along it (default spiral-clockwise)',
  segment: 'AES-CFB only: bits fed back per step, 1, 8 or 128 (default 128)',
  blockSize:
    'Rijndael only: block length in bits, 128, 160, 192, 224 or 256 (default 128, which is AES)',
  tweak:
    'Up to 32 hex digits. AES-LRW: index of the first block (default 1). AES-XTS: the data unit number (default 0)',
  nonce:
    'AES-CCM and AES-OCB only, and required there: 14 to 26 hex digits (7 to 13 bytes) for AES-CCM, 2 to 30 (1 to 15 bytes) for AES-OCB, never reused under one key',
  aad: 'AES-CCM and AES-OCB only: associated data in hex, covered by the tag but not encrypted; decoding needs the same value (default none)',
  tagLength:
    'AES-CCM and AES-OCB only: tag length in bits, 32 to 128 in steps of 16 for AES-CCM, 64, 96 or 128 for AES-OCB (default 128); decoding needs the same value',
  digest:
    'AES-passphrase only: hash for EVP_BytesToKey, md5 as in CryptoJS (default), sha256 as in openssl enc since 1.1.0, or sha1; decoding needs the same value',
  keyLength:
    'AES-passphrase only: key length in bits, 128 to 1024 in steps of 32, CryptoJS keySize times 32 (default 256); decoding needs the same value',
  iterations:
    'AES-passphrase only: hash passes per derived block, 1 to 100000, CryptoJS EvpKDF iterations (default 1); decoding needs the same value',
  salt: 'AES-passphrase encoding only: 16 hex digits (default random); decoding reads it from the ciphertext',
  maxPeriod: `Longest key length to try, 2 to ${MAX_PERIOD} (default 20)`,
  period:
    'Block length. Required by alberti (letters before the disk rotates); optional for bifid (default 5)',
} as const

function cipherOptions(params: Readonly<CipherToolParams>): Record<string, unknown> {
  const options: Record<string, unknown> = {}
  for (const name of [
    'shift',
    'key',
    'transposition',
    'iv',
    'tweak',
    'nonce',
    'aad',
    'rails',
    'width',
    'corner',
    'path',
    'a',
    'b',
    'period',
    'letters',
    'segment',
    'blockSize',
    'endian',
    'bytes',
    'blanks',
    'tagLength',
    'digest',
    'keyLength',
    'iterations',
    'salt',
    'preserveCase',
    'stripNonAlpha',
    'positions',
    'rings',
    'plugboard',
  ] as const) {
    if (params[name] !== undefined) options[name] = params[name]
  }
  return options
}

export function transformCipher(
  library: Readonly<CiphersLibrary>,
  operation: 'encode' | 'decode',
  params: Readonly<CipherToolParams>,
): CipherToolResult {
  const result = library.resolveCipher(params.cipher)[operation](params.text, cipherOptions(params))
  return {
    content: [{ type: 'text', text: result.text }],
    details: { cipher: result.cipher, operation: result.operation, options: result.options },
  }
}

/**
 * List the registered ciphers under their category, or describe one cipher.
 *
 * @param library - The loaded cipher library.
 * @param cipherName - Cipher to describe; omit to list.
 * @param category - Category the list keeps; ignored when `cipherName` is given.
 * @returns {CipherToolResult} The listing or the cipher's options.
 */
export function formatCipherInfo(
  library: Readonly<CiphersLibrary>,
  cipherName?: string,
  category?: string,
): CipherToolResult {
  if (cipherName === undefined) {
    const names = library
      .ciphers()
      .filter((name) => category === undefined || library.create(name).info().category === category)
    const groups = Map.groupBy(names, (name) => library.create(name).info().category)
    if (groups.size === 0) {
      return { content: [{ type: 'text', text: `No ciphers in category ${category}.` }] }
    }
    const lines = [...groups].flatMap(([current, members]) => [
      `${current}:`,
      ...members.map((name) => {
        const info = library.create(name).info()
        return `  ${name} [${info.family}] — ${info.description}`
      }),
    ])
    lines.push('', 'Call ciphers_info with a cipher name to see its options.')
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  const info = library.resolveCipher(cipherName).info()
  const lines = [
    `${info.label} (${info.name}) — ${info.category}, ${info.family}`,
    info.description,
    `Self-inverse: ${info.selfInverse ? 'yes' : 'no'}`,
  ]
  if (info.keyspace) lines.push(`Keyspace: ${info.keyspace}`)
  if (info.options.length > 0) {
    lines.push('Options:')
    for (const option of info.options) {
      const requirement = option.required ? 'required' : `default=${option.default ?? 'none'}`
      lines.push(`  ${option.name} (${option.type}, ${requirement}): ${option.description}`)
    }
  }
  return { content: [{ type: 'text', text: lines.join('\n') }], details: { info } }
}

/**
 * Decode with every shift and sort the decodings by `pairFit`, or `fit` without one, best first.
 * Shifts that tie, including every shift of a text without A-Z letters, stay in shift order.
 *
 * @param library - The loaded cipher library.
 * @param text - Caesar ciphertext.
 * @param language - Language the plaintext should read in; English by default.
 * @returns {Array<{ shift: number; text: string }>} All 25 decodings, best fit first.
 */
export function rankCaesarShifts(
  library: Readonly<Pick<CiphersLibrary, 'analyzeFrequency' | 'create'>>,
  text: string,
  language?: 'en' | 'pl' | 'ja',
): Array<{ shift: number; text: string }> {
  const cipher = library.create('caesar')
  const decodings: Array<{ shift: number; text: string; fit: number }> = []
  for (let shift = 1; shift <= 25; shift++) {
    const result = cipher.decode(text, { shift })
    const analysis = library.analyzeFrequency(result.text, language)
    decodings.push({ shift, text: result.text, fit: analysis?.pairFit ?? analysis?.fit ?? 0 })
  }
  decodings.sort((left, right) => right.fit - left.fit)
  return decodings.map(({ shift, text: decoded }) => ({ shift, text: decoded }))
}

/**
 * Brute-force a Caesar ciphertext for a model, best fit first as `rankCaesarShifts` orders it, so
 * the likely plaintext leads both the model's reading and the collapsed preview. Only the top line
 * carries the whole decoding; the others stop at `BRUTE_PREVIEW_LENGTH` characters and end in `…`,
 * so a long ciphertext costs one decoding plus 24 previews instead of 25 decodings.
 *
 * @param library - The loaded cipher library.
 * @param text - Caesar ciphertext.
 * @param language - Language the plaintext should read in; English by default.
 * @returns {CipherToolResult} One `shift=N -> text` line per shift, best fit first.
 */
export function bruteForceCaesar(
  library: Readonly<CiphersLibrary>,
  text: string,
  language?: 'en' | 'pl' | 'ja',
): CipherToolResult {
  const lines = rankCaesarShifts(library, text, language).map(({ shift, text: decoded }, rank) => {
    let shown = decoded
    if (rank > 0 && decoded.length > BRUTE_PREVIEW_LENGTH) {
      const splitsPair = /[\uD800-\uDBFF]/.test(decoded[BRUTE_PREVIEW_LENGTH - 1]!)
      shown = `${decoded.slice(0, BRUTE_PREVIEW_LENGTH - (splitsPair ? 1 : 0))}…`
    }
    return `shift=${String(shift).padStart(2)} -> ${shown}`
  })
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

export function formatFrequencyAnalysis(
  library: Readonly<CiphersLibrary>,
  text: string,
  language?: 'en' | 'pl' | 'ja',
): CipherToolResult {
  const analysis = library.analyzeFrequency(text, language)
  if (analysis === undefined) {
    return { content: [{ type: 'text', text: 'No A-Z letters found in input.' }] }
  }

  const maximum = analysis.counts[0]?.[1] ?? 1
  const lines = [`Frequency Analysis (${analysis.total} letters, lang=${analysis.language}):`, '']
  for (const [character, count] of analysis.counts) {
    const percentage = ((count / analysis.total) * 100).toFixed(1)
    const bar = '#'.repeat(Math.ceil((count / maximum) * 15))
    lines.push(`  ${character} ${String(count).padStart(4)} (${percentage.padStart(5)}%) ${bar}`)
  }
  lines.push(
    '',
    `Expected (${analysis.language}): ${analysis.reference.split('').join(' ')}`,
    `Actual:         ${analysis.counts.map(([character]) => character).join(' ')}`,
  )
  if (analysis.ic !== undefined) {
    lines.push(
      `Index of coincidence: ${analysis.ic.toFixed(4)} (${analysis.language} plaintext ~${analysis.referenceIc.toFixed(3)}, uniform random ~0.038)`,
    )
  }
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

/**
 * Rank key lengths for a model. The error class comes from `library`: the tarball has no errors.ts.
 *
 * @param library - The loaded cipher library.
 * @param text - Vigenère ciphertext.
 * @param language - Language the plaintext should read in; English by default.
 * @param maxPeriod - Longest key length to try, 2 to `MAX_PERIOD`; 20 by default.
 * @returns {CipherToolResult} The ranked lengths and the Kasiski factors.
 * @throws {InvalidOptionError} When `maxPeriod` is above `MAX_PERIOD`.
 */
export function formatPeriodEstimate(
  /* oxlint-disable-next-line typescript/prefer-readonly-parameter-types */
  library: Readonly<Pick<typeof CiphersModule, 'estimatePeriod' | 'InvalidOptionError'>>,
  text: string,
  language?: 'en' | 'pl' | 'ja',
  maxPeriod?: number,
): CipherToolResult {
  if (maxPeriod !== undefined && maxPeriod > MAX_PERIOD) {
    throw new library.InvalidOptionError('maxPeriod', maxPeriod, `must be at most ${MAX_PERIOD}`)
  }
  const analysis = library.estimatePeriod(text, language, maxPeriod)
  if (analysis.total === 0) {
    return { content: [{ type: 'text', text: 'No A-Z letters found in input.' }] }
  }
  if (analysis.periods.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `Need at least 4 A-Z letters for a key length, got ${analysis.total}.`,
        },
      ],
    }
  }

  const last = analysis.periods.reduce((longest, { period }) => Math.max(longest, period), 2)
  const width = String(last).length
  const lines = [
    `Key length estimate (${analysis.total} letters, lang=${analysis.language}, lengths 2-${last}), most likely first:`,
    '',
  ]
  for (const { period, ic, key } of analysis.periods.slice(0, PERIOD_LINES)) {
    const keyText = key === undefined ? '' : `  key ${key}`
    lines.push(`  length ${String(period).padStart(width)}  IoC ${ic.toFixed(4)}${keyText}`)
  }
  if (analysis.periods.length > PERIOD_LINES) {
    lines.push(`  (${analysis.periods.length - PERIOD_LINES} more lengths ranked lower)`)
  }
  lines.push(
    '',
    `Column IoC near ${analysis.language} plaintext (~${analysis.referenceIc.toFixed(3)}) means one Caesar alphabet per column, near 0.038 a mix. A multiple of a length ranks right behind it.`,
  )
  const factors = analysis.factors
    .filter(({ distances }) => distances > 0)
    .slice(0, KASISKI_FACTORS)
    .map(({ factor, distances }) => `${factor} (${distances})`)
  lines.push(
    analysis.distances === 0
      ? 'Kasiski: no trigram repeats.'
      : `Kasiski: ${analysis.distances} distances between repeated trigrams; factors dividing the most: ${factors.join(', ')}.`,
    'Keys are Vigenère shifts: ciphers_decode with cipher vigenere and one of them reads the text. Beaufort shares the length, not the key.',
  )
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

/**
 * What to call next for a candidate: the decode its first cipher needs, or the analysis before it.
 *
 * @param library - The loaded cipher library.
 * @param found - One candidate of `guessFamily`.
 * @returns {string} One sentence naming a tool.
 */
function nextStep(
  library: Readonly<Pick<CiphersLibrary, 'create'>>,
  found: Readonly<CiphersModule.FamilyCandidate>,
): string {
  const [first] = found.ciphers
  if (first === 'vigenere') {
    return 'ciphers_period_estimate gives the key length and a Vigenère key.'
  }
  if (first === 'caesar' && found.options === undefined) {
    return 'ciphers_caesar_brute ranks all 25 shifts.'
  }
  const given = Object.entries(found.options ?? {}).map(([name, value]) => `${name}=${value}`)
  const needed = library
    .create(first!)
    .info()
    .options.filter(({ name, required }) => required && !Object.hasOwn(found.options ?? {}, name))
    .map(({ name }) => name)
  const known = given.length === 0 ? '' : ` and ${given.join(', ')}`
  const missing = needed.length === 0 ? '' : `, which needs ${needed.join(' and ')}`
  return `ciphers_decode with cipher ${first}${known}${missing}.`
}

/**
 * Rank the cipher families a text may come from, for a model.
 *
 * @param library - The loaded cipher library.
 * @param text - Ciphertext.
 * @param language - Language the plaintext should read in; English by default.
 * @returns {CipherToolResult} The candidates, each with its signal and the next call.
 */
export function formatFamilyGuess(
  library: Readonly<Pick<CiphersLibrary, 'create'> & Pick<typeof CiphersModule, 'guessFamily'>>,
  text: string,
  language?: 'en' | 'pl' | 'ja',
): CipherToolResult {
  const guess = library.guessFamily(text, language)
  const counted = `${guess.length} characters, ${guess.letters} A-Z letters`
  if (guess.candidates.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No family fits (${counted}): no layout this package knows, and too few letters for statistics.`,
        },
      ],
    }
  }

  const ic =
    guess.ic === undefined
      ? ''
      : `, IoC ${guess.ic.toFixed(4)} (${guess.language} plaintext ~${guess.referenceIc.toFixed(3)}, uniform random ~0.038)`
  const lines = [`Family guess (${counted}, lang=${guess.language}${ic}), most likely first:`, '']
  guess.candidates.forEach((found, index) => {
    lines.push(
      `${index + 1}. ${found.families.join(', ')} (${found.confidence}): ${found.ciphers.join(', ')}`,
      `   ${found.signal}`,
      `   Next: ${nextStep(library, found)}`,
    )
  })
  lines.push('', 'Candidates, not a verdict: only a decode that reads settles it.')
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}
