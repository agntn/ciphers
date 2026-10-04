import type * as CiphersModule from './index.ts'
import { cipherCategories } from './core/ciphers.ts'
import {
  DEFAULT_COLUMNAR_KEY_LENGTH,
  DEFAULT_KEY_CANDIDATES,
  MAX_COLUMNAR_KEY_LENGTH,
  MAX_KEY_CANDIDATES,
  keyRecoveryCiphers,
  periodicKeyRecoveryCiphers,
  type KeyRecoveryCipher,
} from './core/recover-options.ts'

export {
  DEFAULT_COLUMNAR_KEY_LENGTH,
  DEFAULT_KEY_CANDIDATES,
  MAX_COLUMNAR_KEY_LENGTH,
  MAX_KEY_CANDIDATES,
  cipherCategories,
  keyRecoveryCiphers,
  periodicKeyRecoveryCiphers,
}

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
  counter?: number
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
  separator?: string
  zero?: string
  book?: string
  address?: 'word' | 'line-word' | 'page-line-word'
  pick?: 'word' | 'letter'
  start?: 0 | 1
  tagLength?: number
  digest?: 'md5' | 'sha1' | 'ripemd160' | 'sha256' | 'sha384' | 'sha512'
  algorithm?: 'idea' | '3des' | 'cast5' | 'blowfish' | 'aes128' | 'aes192' | 'aes256'
  count?: number
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
/** Longest book the book cipher takes from a tool call, a long novel. */
export const MAX_BOOK_LENGTH = 1_000_000
/** Longest key length `ciphers_period_estimate` tries. */
export const MAX_PERIOD = 100
/** Key lengths the period estimate prints, most likely first. */
export const PERIOD_LINES = 10
/** Kasiski factors the period estimate prints. */
export const KASISKI_FACTORS = 5
/** Ciphertexts one crib drag takes; each one is checked at every place. */
export const MAX_CRIB_CIPHERTEXTS = 16
/** Hex digits per ciphertext of a crib drag, 2048 bytes. */
export const MAX_CRIB_CIPHERTEXT_DIGITS = 4_096
/** Characters per ciphertext before whitespace goes, room for a space or line break per byte. */
export const MAX_CRIB_CIPHERTEXT_LENGTH = MAX_CRIB_CIPHERTEXT_DIGITS * 2
/** Characters of a crib. */
export const MAX_CRIB_LENGTH = 100
/** Placements a crib drag carries in `known`. */
export const MAX_CRIB_KNOWN = 100
/** Characters of a known placement's text, as many as the longest ciphertext has bytes. */
export const MAX_CRIB_KNOWN_LENGTH = MAX_CRIB_CIPHERTEXT_DIGITS / 2
/** Most places a crib drag returns. */
export const MAX_CRIB_LIMIT = 50
/** Longest list of each kind a passphrase probe takes. */
export const PROBE_LIST_LIMITS = { digests: 3, keyLengths: 29, iterations: 32 } as const
/** Hex digits a probe hit shows of plaintext that is not UTF-8. */
const PROBE_HEX_PREVIEW = 32
/** Hidden text readings the ranking prints, most like the language first. */
export const HIDDEN_TEXT_LINES = 10

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
  key: 'Keyword, the passphrase for aes-passphrase and openpgp (any text), or a hex key: 32, 48 or 64 digits for aes, aes-cbc, aes-cfb, aes-ofb, aes-ctr, aes-ccm, aes-ocb and aes-cbc-mac, 64, 80 or 96 for aes-lrw, 64 or 128 for aes-xts, 32, 40, 48, 56 or 64 for rijndael, 16 for des, 48 for desx, 32 or 48 for triple-des and triple-des-cbc, 8 to 112 (an even number) for blowfish, 32 for idea and lucifer, 32 to 112 in steps of 8 for mars, 32, 48 or 64 for serpent, 10 to 32 (an even number) for cast5, 32 for rabbit, 2 to 512 (an even number) for rc4, any nonzero even number for xor, 32 or 64 for salsa20, 64 for xsalsa20, chacha20, xchacha20 and chacha20-poly1305. Required by vigenere, beaufort, autokey, alberti, playfair, columnar, aes, aes-cbc, aes-cfb, aes-ofb, aes-ctr, aes-ccm, aes-ocb, aes-lrw, aes-xts, aes-cbc-mac, aes-passphrase, rijndael, des, desx, triple-des, triple-des-cbc, blowfish, idea, lucifer, mars, serpent, cast5, openpgp, rabbit, rc4, xor, salsa20, xsalsa20, chacha20, xchacha20 and chacha20-poly1305; optional for polybius, adfgvx, bifid and straddling-checkerboard (the 28 cells row by row, each letter A-Z once and two fillers such as . and /)',
  transposition: 'ADFGVX only: keyword for the columnar transposition after the grid step',
  iv: 'Initialization vector in hex. Required by AES-CBC, AES-CFB, AES-OFB and AES-CTR (32 digits, the initial counter block for AES-CTR) and triple-des-cbc (16 digits); optional for rabbit (16 digits, IV setup skipped without it). Openpgp encoding only: the random first block, 16 digits or 32 for AES (default random)',
  endian:
    'Rabbit only: byte order of key, IV and keystream, big as in RFC 4503 and CyberChef (default) or little as in Crypto++',
  bytes:
    'Block and stream ciphers only: text for UTF-8 text on the plain side (default), or hex to read and write hex there, for bytes that are not text',
  blanks:
    'Straddling checkerboard only: the two blank digits of the top row, each of which starts a code of two digits (default 26)',
  separator:
    'A1Z26 only: text between the numbers of one word, 1 to 10 characters without digits; decoding drops it only between two numbers (default -)',
  zero: 'A1Z26 only: letter J to Z that stands for 0. Setting it switches to the single digit form, A to I for 1 to 9, where decoding turns those letters into digits',
  book: 'Book cipher only, and required there: the text to count in, whole. A form feed starts a new page, as pdftotext writes them, and a line without a word is not counted',
  address:
    'Book cipher only: what one address counts, word for its place in the book (default), line-word for its line and place in the line, page-line-word for page, line on the page and place in the line',
  pick: 'Book cipher only: word for the whole word (default), letter for its first letter',
  start: 'Book cipher only: number of the first word, line and page, 1 (default) or 0',
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
    'Nonce in hex, never reused under one key. Required by AES-CCM (14 to 26 digits), AES-OCB (2 to 30), salsa20 (16), xsalsa20 and xchacha20 (48), chacha20 and chacha20-poly1305 (24)',
  aad: 'AES-CCM, AES-OCB and chacha20-poly1305 only: associated data in hex, covered by the tag but not encrypted; decoding needs the same value (default none)',
  counter:
    'Salsa20 and ChaCha only: block counter of the first 64 bytes (default 0), at most 4294967295 for chacha20 and xchacha20; decoding needs the same value',
  tagLength:
    'AES-CCM and AES-OCB only: tag length in bits, 32 to 128 in steps of 16 for AES-CCM, 64, 96 or 128 for AES-OCB (default 128); decoding needs the same value',
  digest:
    'AES-passphrase: hash for EVP_BytesToKey, md5 as in CryptoJS (default), sha256 as in openssl enc since 1.1.0, or sha1; decoding needs the same value. Openpgp encoding only: the S2K hash, md5, sha1, ripemd160, sha256, sha384 or sha512 (default sha512); decoding reads it from the message',
  algorithm:
    'Openpgp encoding only: idea, 3des, cast5, blowfish, aes128, aes192 or aes256 (default aes256); decoding reads it from the message',
  count:
    'Openpgp encoding only: bytes the S2K hashes, 1024 to 65011712, rounded up to a count OpenPGP can write (default 65011712)',
  keyLength:
    'AES-passphrase only: key length in bits, 128 to 1024 in steps of 32, CryptoJS keySize times 32 (default 256); decoding needs the same value',
  iterations:
    'AES-passphrase only: hash passes per derived block, 1 to 100000, CryptoJS EvpKDF iterations (default 1); decoding needs the same value',
  salt: 'AES-passphrase and openpgp encoding only: 16 hex digits (default random); decoding reads it from the ciphertext',
  maxPeriod: `Longest key length to try, 2 to ${MAX_PERIOD} (default 20)`,
  probeDigests: 'EVP_BytesToKey hashes to try: md5, sha1, sha256 (default all three)',
  probeKeyLengths:
    'Key lengths in bits to try, each 128 to 1024 in steps of 32, CryptoJS keySize times 32 (default 128, 192 and 256)',
  probeIterations: `Hash passes per derived block to try, each 1 to 100000, up to ${PROBE_LIST_LIMITS.iterations} counts adding up to at most 1000000 across the digests (default 1)`,
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
    'counter',
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
    'separator',
    'zero',
    'book',
    'address',
    'pick',
    'start',
    'tagLength',
    'digest',
    'algorithm',
    'count',
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
    `Works on: ${info.worksOn}`,
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
 * A ranked line below the top one: the first `BRUTE_PREVIEW_LENGTH` characters and `…`, without
 * cutting a surrogate pair in half.
 *
 * @param text - The whole line.
 * @returns {string} The line, or its start when it is longer.
 */
export function preview(text: string): string {
  if (text.length <= BRUTE_PREVIEW_LENGTH) return text
  const splitsPair = /[\uD800-\uDBFF]/.test(text[BRUTE_PREVIEW_LENGTH - 1]!)
  return `${text.slice(0, BRUTE_PREVIEW_LENGTH - (splitsPair ? 1 : 0))}…`
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
  const lines = rankCaesarShifts(library, text, language).map(
    ({ shift, text: decoded }, rank) =>
      `shift=${String(shift).padStart(2)} -> ${rank === 0 ? decoded : preview(decoded)}`,
  )
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
    return 'ciphers_key_recover with cipher vigenere searches the key; ciphers_period_estimate shows the key lengths.'
  }
  if (first === 'caesar' && found.options === undefined) {
    return 'ciphers_caesar_brute ranks all 25 shifts; ciphers_key_recover with cipher substitution solves a mixed alphabet.'
  }
  const given = Object.entries(found.options ?? {}).map(([name, value]) => `${name}=${value}`)
  const needed = library
    .create(first!)
    .info()
    .options.filter(({ name, required }) => required && !Object.hasOwn(found.options ?? {}, name))
    .map(({ name }) => name)
  const known = given.length === 0 ? '' : ` and ${given.join(', ')}`
  const missing = needed.length === 0 ? '' : `, which needs ${needed.join(' and ')}`
  const search =
    first === 'rail-fence'
      ? ' ciphers_key_recover with cipher columnar searches a columnar key.'
      : ''
  return `ciphers_decode with cipher ${first}${known}${missing}.${search}`
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

/**
 * Decrypted text on one line: JSON quotes, with DEL, C1, separators and format controls escaped.
 *
 * @param text - Decrypted text, which the ciphertext's author controls.
 * @param length - Code points kept inside the quotes; `…` follows when the text is longer.
 * @returns {string} The quoted preview.
 */
export function quotedPreview(text: string, length: number = BRUTE_PREVIEW_LENGTH): string {
  const characters = Array.from(text)
  const shown = JSON.stringify(characters.slice(0, length).join('')).replaceAll(
    /[\u007F-\u009F\u2028\u2029\p{Cf}]/gu,
    (character) => `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`,
  )
  return characters.length > length ? `${shown}…` : shown
}

/**
 * One probe hit on one line: its settings, the padding, how much prints and the start of the text.
 *
 * @param hit - A setting whose padding held.
 * @returns {string} The line, indented.
 */
function probeHitLine(hit: Readonly<CiphersModule.PassphraseProbeHit>): string {
  const settings = `digest ${hit.digest}, keyLength ${hit.keyLength}, iterations ${hit.iterations}`
  const reading =
    hit.text === undefined
      ? `not UTF-8, hex ${hit.hex.slice(0, PROBE_HEX_PREVIEW)}${hit.hex.length > PROBE_HEX_PREVIEW ? '…' : ''}`
      : quotedPreview(hit.text)
  return `  ${settings}: pad ${hit.padLength}, ${Math.round(hit.printable * 100)}% printable, ${reading}`
}

/**
 * Probe a `Salted__` blob for a model, with the error class from `library`.
 *
 * @param library - The loaded cipher library.
 * @param text - Base64 starting `U2FsdGVkX1`.
 * @param passphrase - The passphrase to try.
 * @param grid - Digests, key lengths and iteration counts; each defaults as `probePassphrase` says.
 * @returns {CipherToolResult} The hits, most printable first, against the count expected by chance.
 * @throws {InvalidOptionError} When a list is longer than `PROBE_LIST_LIMITS` allows.
 */
export function formatPassphraseProbe(
  /* oxlint-disable-next-line typescript/prefer-readonly-parameter-types */
  library: Readonly<Pick<typeof CiphersModule, 'probePassphrase' | 'InvalidOptionError'>>,
  text: string,
  passphrase: string,
  grid: Readonly<CiphersModule.PassphraseProbeGrid> = {},
): CipherToolResult {
  for (const [name, limit] of Object.entries(PROBE_LIST_LIMITS)) {
    const list = grid[name as keyof typeof PROBE_LIST_LIMITS]
    if (list !== undefined && list.length > limit) {
      throw new library.InvalidOptionError(name, list.length, `must list at most ${limit} values`)
    }
  }
  const probe = library.probePassphrase(text, passphrase, grid)
  const expected = `about ${Number(probe.expected.toPrecision(2))} expected by chance`
  const lines = [
    `Passphrase probe (salt ${probe.salt}, ${probe.blocks} ${probe.blocks === 1 ? 'block' : 'blocks'}, ${probe.tries} tries: digests ${probe.digests.join(', ')} × keyLength ${probe.keyLengths.join(', ')} × iterations ${probe.iterations.join(', ')}):`,
  ]
  if (probe.hits.length === 0) {
    lines.push(
      `Padding held in none of ${probe.tries} tries (${expected}): a wrong passphrase, settings outside this grid, or not this format. openssl enc -pbkdf2 and -iter derive the key with PBKDF2, which aes-passphrase does not take.`,
    )
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }
  lines.push(
    `Padding held in ${probe.hits.length} of ${probe.tries} tries, ${expected}. Most printable first:`,
    '',
    ...probe.hits.map((hit) => probeHitLine(hit)),
    '',
    'A wrong setting passes the padding check about once in 255 tries, nearly always with pad 1, and decrypts to bytes that are not text. ciphers_decode with cipher aes-passphrase, the same key and the digest, keyLength and iterations of a hit returns its whole text.',
  )
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

export type CribToolParams = {
  readonly ciphertexts: readonly string[]
  readonly crib?: string
  readonly known?: ReadonlyArray<Readonly<{ message: number; offset: number; text: string }>>
  readonly lang?: 'en' | 'pl' | 'ja'
  readonly limit?: number
}

/**
 * Characters of a text as JSON Schema's `maxLength` counts them: code points, not UTF-16 units.
 *
 * @param text - The text.
 * @returns {number} Its code points.
 */
function codePoints(text: string): number {
  return Array.from(text).length
}

type BrokenBound = readonly [option: string, value: unknown, reason: string]
type CribShow = Readonly<Pick<typeof CiphersModule, 'showCribBytes'>>
type CribDragResult = ReturnType<typeof CiphersModule.dragCrib>

/**
 * The first bound of the crib drag the arguments break, the same ones the schema states.
 *
 * @param params - Arguments of `ciphers_crib_drag`.
 * @returns {BrokenBound | undefined} The option, its value and the bound, or nothing when all hold.
 */
function cribBoundError(params: Readonly<CribToolParams>): BrokenBound | undefined {
  const known = params.known ?? []
  const bounds: ReadonlyArray<readonly [boolean, string, unknown, string]> = [
    [
      params.ciphertexts.length > MAX_CRIB_CIPHERTEXTS,
      'ciphertexts',
      params.ciphertexts.length,
      `must hold at most ${MAX_CRIB_CIPHERTEXTS}`,
    ],
    [
      params.ciphertexts.some((text) => text.length > MAX_CRIB_CIPHERTEXT_LENGTH),
      'ciphertexts',
      'one',
      `must each be at most ${MAX_CRIB_CIPHERTEXT_LENGTH} characters`,
    ],
    [
      params.ciphertexts.some(
        (text) => text.replaceAll(/\s/g, '').length > MAX_CRIB_CIPHERTEXT_DIGITS,
      ),
      'ciphertexts',
      'one',
      `must each be at most ${MAX_CRIB_CIPHERTEXT_DIGITS} hex digits`,
    ],
    [
      codePoints(params.crib ?? '') > MAX_CRIB_LENGTH,
      'crib',
      codePoints(params.crib ?? ''),
      `must be at most ${MAX_CRIB_LENGTH} characters`,
    ],
    [known.length > MAX_CRIB_KNOWN, 'known', known.length, `must hold at most ${MAX_CRIB_KNOWN}`],
    [
      known.some(({ text }) => codePoints(text) > MAX_CRIB_KNOWN_LENGTH),
      'known',
      'one',
      `text must be at most ${MAX_CRIB_KNOWN_LENGTH} characters`,
    ],
    [
      (params.limit ?? 0) > MAX_CRIB_LIMIT,
      'limit',
      params.limit,
      `must be at most ${MAX_CRIB_LIMIT}`,
    ],
  ]
  const broken = bounds.find(([fails]) => fails)
  return broken === undefined ? undefined : [broken[1], broken[2], broken[3]]
}

/**
 * The ranked places of a crib drag, one line each.
 *
 * @param library - The loaded cipher library.
 * @param drag - The drag's result.
 * @param crib - The crib as given.
 * @param count - How many ciphertexts there are.
 * @returns {string[]} The header, the places and a note on what was left out.
 */
function cribPlaceLines(
  library: CribShow,
  drag: CribDragResult,
  crib: string,
  count: number,
): string[] {
  const shown = library.showCribBytes([...new TextEncoder().encode(crib)])
  if (drag.total === 0) {
    return [
      `Crib "${shown}" fits no new place: it is longer than every ciphertext, contradicts the known key everywhere, or lies only on known key bytes.`,
    ]
  }
  const lines = [
    `Crib "${shown}" across ${count} ciphertexts (lang=${drag.language}), ${drag.total} places, most readable first:`,
    '',
  ]
  drag.candidates.forEach(({ message, offset, score, reveals }, index) => {
    const read = reveals
      .map((reveal) => `#${reveal.message} "${library.showCribBytes(reveal.bytes)}"`)
      .join(', ')
    lines.push(`${index + 1}. #${message} at ${offset} (score ${score.toFixed(2)}): ${read}`)
  })
  if (drag.total > drag.candidates.length) {
    lines.push(`(${drag.total - drag.candidates.length} more places ranked lower)`)
  }
  if (count === 2) {
    lines.push(
      'With two ciphertexts a place shows up once per side with the same reading: the crib is in one of them, the reading in the other.',
    )
  }
  return lines
}

/**
 * The key and plaintexts the known placements give.
 *
 * @param library - The loaded cipher library.
 * @param drag - The drag's result.
 * @returns {string[]} The key in hex and each plaintext, or a line saying nothing is known.
 */
function cribKnownLines(library: CribShow, drag: CribDragResult): string[] {
  if (drag.key.every((byte) => byte === undefined)) {
    return [
      'Nothing known yet. To accept a place, add { message, offset, text } to known and call again.',
    ]
  }
  const key = drag.key
    .map((byte) => (byte === undefined ? '??' : byte.toString(16).padStart(2, '0')))
    .join('')
  return [
    `Key (?? unknown): ${key}`,
    'Plaintexts (· unknown):',
    ...drag.plaintexts.map((bytes, message) => `#${message} "${library.showCribBytes(bytes)}"`),
    'To accept another place, add it to known and call again.',
  ]
}

/**
 * Drag a crib for a model: the ranked places, then the key and plaintexts `known` gives.
 *
 * @param library - The loaded cipher library.
 * @param params - Arguments of `ciphers_crib_drag`.
 * @returns {CipherToolResult} The ranked places and the state of the drag.
 * @throws {InvalidOptionError} When an argument breaks a bound or a placement does not fit.
 */
export function formatCribDrag(
  /* oxlint-disable-next-line typescript/prefer-readonly-parameter-types */
  library: Readonly<
    Pick<typeof CiphersModule, 'dragCrib' | 'showCribBytes' | 'InvalidOptionError'>
  >,
  params: Readonly<CribToolParams>,
): CipherToolResult {
  const broken = cribBoundError(params)
  if (broken !== undefined) throw new library.InvalidOptionError(...broken)
  const drag = library.dragCrib(params.ciphertexts, {
    ...(params.crib === undefined ? {} : { crib: params.crib }),
    ...(params.known === undefined ? {} : { known: params.known }),
    ...(params.lang === undefined ? {} : { language: params.lang }),
    ...(params.limit === undefined ? {} : { limit: params.limit }),
  })
  const lines =
    params.crib === undefined
      ? []
      : [...cribPlaceLines(library, drag, params.crib, params.ciphertexts.length), '']
  lines.push(...cribKnownLines(library, drag))
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

export type HiddenTextToolParams = {
  text: string
  pick?: CiphersModule.HiddenTextPick
  letter?: number
  every?: number
  start?: number
  direction?: CiphersModule.HiddenTextDirection
  lang?: 'en' | 'pl' | 'ja'
}

/**
 * The arguments that read one candidate again.
 *
 * @param options - A reading of `rankHiddenText`.
 * @returns {string} `pick=... name=value`, in the order the options were set.
 */
function readingArguments(options: Readonly<CiphersModule.HiddenTextOptions>): string {
  return Object.entries(options)
    .map(([name, value]) => `${name}=${String(value)}`)
    .join(' ')
}

/**
 * Rank the usual hiding places of a text for a model, best first, with the arguments that read
 * each one again; only the top line is whole.
 *
 * @param library - The loaded cipher library.
 * @param text - Text that may hide a message.
 * @param language - Language the message should read in; English by default.
 * @returns {CipherToolResult} One line per reading, at most `HIDDEN_TEXT_LINES`.
 */
function formatHiddenTextRanking(
  library: Readonly<Pick<typeof CiphersModule, 'rankHiddenText'>>,
  text: string,
  language?: 'en' | 'pl' | 'ja',
): CipherToolResult {
  const ranking = library.rankHiddenText(text, language)
  const { candidates } = ranking
  if (candidates.length === 0) {
    return {
      content: [{ type: 'text', text: 'No reading has 5 or more A-Z letters.' }],
    }
  }
  const lift = candidates[0]!.lift
  const lines = [
    `Hidden text readings (${ranking.tried} tried, ${candidates.length} with 5 or more A-Z letters, lang=${ranking.language}), most like the language first:`,
    '',
    ...candidates.slice(0, HIDDEN_TEXT_LINES).map(({ options, text: reading, score }, rank) => {
      const scored = lift ? `${score.toFixed(2).padStart(5)}  ` : ''
      return `  ${scored}${readingArguments(options)} -> ${rank === 0 ? reading : preview(reading)}`
    }),
  ]
  if (candidates.length > HIDDEN_TEXT_LINES) {
    lines.push(`  (${candidates.length - HIDDEN_TEXT_LINES} more readings ranked lower)`)
  }
  lines.push(
    '',
    lift
      ? 'The number is how much likelier the letter pairs are than the same letters apart: above 0 reads like English, near 0 or below like letters picked at random. A short reading can rank high by chance, so read the top lines.'
      : `Without a pair table for ${ranking.language} the letters alone rank the readings, and a sample of the text fits as well as a message, so read past the top line.`,
    'Every nth word is not ranked, since words picked from a text read as the language anyway; pick every-word with every reads them.',
  )
  return {
    content: [{ type: 'text', text: lines.join('\n') }],
    details: { language: ranking.language, tried: ranking.tried, candidates },
  }
}

/**
 * Read the letters or words at the positions a model names, or rank the usual hiding places
 * when it names none. The error classes come from `library`, as in `formatPeriodEstimate`.
 *
 * @param library - The loaded cipher library.
 * @param params - The tool arguments.
 * @returns {CipherToolResult} The reading, or the ranking without `pick`.
 * @throws {MissingOptionError} When a reading option comes without `pick`, or `every` is missing.
 * @throws {InvalidOptionError} When an option, `lang` included, does not apply to `pick` or is out
 * of range.
 */
export function formatHiddenText(
  /* oxlint-disable-next-line typescript/prefer-readonly-parameter-types */
  library: Readonly<
    Pick<
      typeof CiphersModule,
      'readHiddenText' | 'rankHiddenText' | 'InvalidOptionError' | 'MissingOptionError'
    >
  >,
  params: Readonly<HiddenTextToolParams>,
): CipherToolResult {
  const { text, pick, letter, every, start, direction, lang } = params
  if (pick === undefined) {
    const stray = Object.entries({ letter, every, start, direction }).find(
      ([, value]) => value !== undefined,
    )
    if (stray !== undefined) throw new library.MissingOptionError('pick')
    return formatHiddenTextRanking(library, text, lang)
  }
  if (lang !== undefined) {
    throw new library.InvalidOptionError(
      'lang',
      lang,
      'ranks the readings, so it does not apply with pick',
    )
  }
  const options = { pick, letter, every, start, direction }
  const reading = library.readHiddenText(text, options)
  return {
    content: [{ type: 'text', text: reading === '' ? 'Nothing at those positions.' : reading }],
    details: {
      options: Object.fromEntries(
        Object.entries(options).filter(([, value]) => value !== undefined),
      ),
    },
  }
}

export type KeyRecoverToolParams = {
  readonly text: string
  readonly cipher: KeyRecoveryCipher
  readonly period?: number
  readonly keyLength?: number
  readonly lang?: 'en' | 'pl' | 'ja'
  readonly limit?: number
}

/** How the reply names each cipher, and the call that decodes the text with a key it found. */
const keyRecoveryTexts: Readonly<
  Record<KeyRecoveryCipher, readonly [label: string, next: string]>
> = {
  vigenere: ['Vigenère', 'ciphers_decode with cipher vigenere and the key reads the text.'],
  beaufort: ['Beaufort', 'ciphers_decode with cipher beaufort and the key reads the text.'],
  'variant-beaufort': [
    'Variant Beaufort',
    'Variant Beaufort decrypts as Vigenère encrypts: ciphers_encode with cipher vigenere and the key reads the text.',
  ],
  substitution: [
    'Substitution',
    'The key is the cipher letter of each plaintext letter A to Z; ? marks a letter the text never uses.',
  ],
  columnar: ['Columnar', 'ciphers_decode with cipher columnar and the key reads the text.'],
}

const languageNames = { en: 'English', pl: 'Polish', ja: 'Japanese romaji' } as const

/**
 * The first bound of a key recovery the arguments break, the same ones the schema states.
 *
 * @param params - Arguments of `ciphers_key_recover`.
 * @returns {BrokenBound | undefined} The option, its value and the bound, or nothing when all hold.
 */
function keyRecoverBoundError(params: Readonly<KeyRecoverToolParams>): BrokenBound | undefined {
  const length = codePoints(params.text)
  if (length > MAX_TRANSFORM_TEXT_LENGTH) {
    return ['text', length, `must be at most ${MAX_TRANSFORM_TEXT_LENGTH} characters`]
  }
  if (params.period !== undefined && params.period > MAX_PERIOD) {
    return ['period', params.period, `must be at most ${MAX_PERIOD}`]
  }
  return undefined
}

/**
 * Recover a key for a model: the keys found, best first, each with what it decodes to.
 *
 * @param library - The loaded cipher library.
 * @param params - Arguments of `ciphers_key_recover`.
 * @returns {CipherToolResult} The ranked keys, the fit plaintext and random letters score, and
 *   the call that reads the text.
 * @throws {InvalidOptionError} When an argument breaks a bound or belongs to another cipher.
 */
export function formatKeyRecovery(
  /* oxlint-disable-next-line typescript/prefer-readonly-parameter-types */
  library: Readonly<Pick<typeof CiphersModule, 'recoverKey' | 'InvalidOptionError'>>,
  params: Readonly<KeyRecoverToolParams>,
): CipherToolResult {
  const broken = keyRecoverBoundError(params)
  if (broken !== undefined) throw new library.InvalidOptionError(...broken)
  const recovery = library.recoverKey(params.text, {
    cipher: params.cipher,
    ...(params.lang === undefined ? {} : { language: params.lang }),
    ...(params.period === undefined ? {} : { period: params.period }),
    ...(params.keyLength === undefined ? {} : { keyLength: params.keyLength }),
    ...(params.limit === undefined ? {} : { limit: params.limit }),
  })
  const [label, next] = keyRecoveryTexts[recovery.cipher]
  if (recovery.candidates.length === 0) {
    const text = `No ${label} key: ${recovery.letters} letters are too few to search.`
    return { content: [{ type: 'text', text }] }
  }
  const order =
    recovery.scoredBy === 'quadgrams'
      ? 'best fit first. Fit is the mean log probability per quadgram'
      : 'best first, a longer key below a shorter one that fits almost as well. Fit is the mean log probability per letter'
  const lines = [
    `${label} keys for ${recovery.letters} letters (lang=${recovery.language}), ${order}: ${languageNames[recovery.language]} plaintext scores about ${recovery.referenceFit.toFixed(2)}, random letters ${recovery.randomFit.toFixed(2)}.`,
    '',
    ...recovery.candidates.map(
      ({ key, fit, text }, index) =>
        `${index + 1}. key ${key}, fit ${fit.toFixed(2)}: ${index === 0 ? quotedPreview(text, Infinity) : quotedPreview(text)}`,
    ),
    '',
    `Only the top text is whole, the others stop at ${BRUTE_PREVIEW_LENGTH} characters. ${next}`,
  ]
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}
