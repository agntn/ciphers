import {
  assertLanguage,
  letterLogProbabilities,
  referenceCoincidences,
  referenceFits,
  type FrequencyLanguage,
} from './frequency.ts'
import { create } from './registry.ts'
import type { CipherInfo } from './types.ts'

/** How far a guess can be trusted. Statistics on few letters never come back `high`. */
export type GuessConfidence = 'high' | 'medium' | 'low'

/** One family the text may come from, with the ciphers of this package to try. */
export interface FamilyCandidate {
  /** `info().family` of the ciphers, each family once, in the order of `ciphers`. */
  readonly families: readonly CipherInfo['family'][]
  /** Built-in ciphers to try, the likeliest first. */
  readonly ciphers: readonly string[]
  readonly confidence: GuessConfidence
  /** What in the text points here. */
  readonly signal: string
  /** Options that decode the text with the first of `ciphers`, when the guess found them. */
  readonly options?: Readonly<Record<string, number>>
}

/** Ranked family candidates for one text. */
export interface FamilyGuess {
  /** Characters other than whitespace. */
  readonly length: number
  /** A-Z letters, the ones the statistics read. */
  readonly letters: number
  readonly language: FrequencyLanguage
  /** Index of coincidence of the letters, absent below two or when the layout alone decides. */
  readonly ic?: number
  /** Index of coincidence of plaintext in `language`. */
  readonly referenceIc: number
  /** Most likely first, empty when nothing in the text points anywhere. */
  readonly candidates: readonly FamilyCandidate[]
}

/** Index of coincidence of letters drawn uniformly from A-Z. */
const RANDOM_IC = 1 / 26

/** A `fitGap` above this reads as the language: moved letters, not replaced ones. */
const READS_LIKE_LANGUAGE = -0.35

/** Where `lift` splits one alphabet from several, measured at 100 letters. */
const ONE_ALPHABET = 0.65

/** One of 311 keys fits by chance, so a found key needs a closer fit and a lead. */
const KEY_READS = -0.25
const KEY_LEAD = 0.1

/** Below this fraction the text is as flat as random letters: rotor and long running keys. */
const FLAT = 0.2

/** Fewest letters the statistics read at all. */
const MIN_LETTERS = 10

/** Affine multipliers coprime with 26 and their inverses modulo 26. */
const AFFINE_INVERSES: ReadonlyArray<readonly [a: number, inverse: number]> = [
  [1, 1],
  [3, 9],
  [5, 21],
  [7, 15],
  [9, 3],
  [11, 19],
  [15, 7],
  [17, 23],
  [19, 11],
  [21, 5],
  [23, 17],
  [25, 25],
]

const MONOALPHABETIC = ['caesar', 'atbash', 'affine'] as const
const POLYALPHABETIC = [
  'vigenere',
  'gronsfeld',
  'beaufort',
  'porta',
  'autokey',
  'running-key',
  'trithemius',
  'alberti',
] as const
const BLOCK_16 = ['aes', 'aes-cbc', 'aes-lrw', 'rijndael', 'serpent', 'mars', 'lucifer'] as const
const BLOCK_8 = [
  'des',
  'desx',
  'triple-des',
  'triple-des-cbc',
  'blowfish',
  'idea',
  'cast5',
] as const
const STREAM = [
  'aes-ctr',
  'aes-cfb',
  'aes-ofb',
  'rc4',
  'xor',
  'rabbit',
  'salsa20',
  'xsalsa20',
  'chacha20',
  'xchacha20',
  'aes-ccm',
  'chacha20-poly1305',
  'aes-ocb',
  'aes-xts',
  'aes-cbc-mac',
] as const

/**
 * One confidence lower, `low` staying `low`.
 *
 * @param confidence - Confidence to lower.
 * @returns {GuessConfidence} The level below.
 */
function lower(confidence: GuessConfidence): GuessConfidence {
  return confidence === 'high' ? 'medium' : 'low'
}

/**
 * Confidence of a guess that rests on letter statistics, from how many letters there are.
 *
 * @param letters - A-Z letters in the text.
 * @param high - Fewest letters for `high`.
 * @param medium - Fewest letters for `medium`.
 * @returns {GuessConfidence} The confidence.
 */
function byLetters(letters: number, high: number, medium: number): GuessConfidence {
  if (letters >= high) return 'high'
  return letters >= medium ? 'medium' : 'low'
}

/**
 * Confidence of a layout rule, from how many symbols show the layout.
 *
 * @param symbols - The text without whitespace.
 * @param fits - Whether the count fits the layout, such as an even number of pair digits.
 * @returns {GuessConfidence} `low` below four symbols, at most `medium` below ten.
 */
function byLayout(symbols: string, fits = true): GuessConfidence {
  if (symbols.length < 4) return 'low'
  return symbols.length < 10 || !fits ? 'medium' : 'high'
}

/**
 * A candidate with the families its ciphers report through `info()`.
 *
 * @param ciphers - Built-in cipher names, the likeliest first.
 * @param confidence - How far the guess can be trusted.
 * @param signal - What in the text points here.
 * @param options - Options that decode the text with the first cipher.
 * @returns {FamilyCandidate} The candidate.
 */
function candidate(
  ciphers: readonly string[],
  confidence: GuessConfidence,
  signal: string,
  options?: Readonly<Record<string, number>>,
): FamilyCandidate {
  const families = [...new Set(ciphers.map((name) => create(name).info().family))]
  return { families, ciphers, confidence, signal, ...(options === undefined ? {} : { options }) }
}

/** One text as the rules read it. */
interface Reading {
  readonly text: string
  /** The text without whitespace. */
  readonly symbols: string
  readonly language: FrequencyLanguage
  /** Count of each letter A to Z, case folded. */
  readonly counts: readonly number[]
  readonly letters: number
  /** Index of coincidence, `NaN` below two letters. */
  readonly ic: number
  /** Where `ic` sits from uniform random (0) to the language (1). */
  readonly lift: number
  /** `fitGap` of the letters as they stand. */
  readonly gap: number
}

/**
 * Count each letter A to Z, case folded. Anything else is skipped.
 *
 * @param text - Text to count.
 * @returns {{ counts: number[]; letters: number }} 26 counts and their sum.
 */
function letterCounts(text: string): { counts: number[]; letters: number } {
  const counts = Array.from<number>({ length: 26 }).fill(0)
  let letters = 0
  for (const [letter] of text.matchAll(/[A-Za-z]/g)) {
    counts[letter.toUpperCase().codePointAt(0)! - 65]!++
    letters++
  }
  return { counts, letters }
}

/**
 * How far the letters' `fit` falls below what plaintext in the language scores on average.
 *
 * @param counts - Count of each letter A to Z.
 * @param letters - Sum of `counts`, at least one.
 * @param language - Language the plaintext reads in.
 * @returns {number} Near zero for the language, around -1 for scrambled letters.
 */
function fitGap(counts: readonly number[], letters: number, language: FrequencyLanguage): number {
  const logs = letterLogProbabilities[language]
  let score = 0
  counts.forEach((count, code) => {
    score += count * logs.get(String.fromCodePoint(65 + code))!
  })
  return score / letters - referenceFits[language]
}

/**
 * Read a text once for every rule.
 *
 * @param text - Ciphertext.
 * @param language - Language the plaintext reads in.
 * @returns {Reading} The letter statistics and the text without whitespace.
 */
function read(text: string, language: FrequencyLanguage): Reading {
  const { counts, letters } = letterCounts(text)
  let pairs = 0
  for (const count of counts) pairs += count * (count - 1)
  const ic = letters < 2 ? Number.NaN : pairs / (letters * (letters - 1))
  return {
    text,
    symbols: text.replaceAll(/\s/g, ''),
    language,
    counts,
    letters,
    ic,
    lift: (ic - RANDOM_IC) / (referenceCoincidences[language] - RANDOM_IC),
    gap: letters === 0 ? Number.NaN : fitGap(counts, letters, language),
  }
}

/**
 * Morse: dots and dashes with spaces and slashes between them.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} Morse, or nothing.
 */
function morse(reading: Readonly<Reading>): FamilyCandidate[] {
  const { text, symbols } = reading
  if (!/^[.\-/\s]+$/.test(text) || !/[.-]/.test(text)) return []
  return [candidate(['morse'], byLayout(symbols), 'Only dots, dashes, spaces and slashes.')]
}

/**
 * Polybius and tap code: digits 1 to 5, told apart by how they are spaced.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} Both ciphers, the one the spacing fits first, or nothing.
 */
function gridDigits(reading: Readonly<Reading>): FamilyCandidate[] {
  const { text, symbols } = reading
  if (!/^[1-5\s]+$/.test(text) || symbols.length === 0) return []
  const tokens = text.trim().split(/\s+/)
  if (tokens.every((token) => token.length === 2)) {
    const signal = 'Digits 1 to 5 in pairs, one grid cell each.'
    return [candidate(['polybius'], byLayout(symbols), signal)]
  }
  if (tokens.every((token) => token.length === 1)) {
    const even = tokens.length % 2 === 0
    return [
      candidate(
        ['tap-code'],
        byLayout(symbols, even),
        `Single digits 1 to 5${even ? ', a row and a column per letter' : ', an odd count'}.`,
      ),
      candidate(['polybius'], 'low', 'Digits 1 to 5, and polybius reads them in pairs too.'),
    ]
  }
  return [
    candidate(
      ['polybius'],
      lower(byLayout(symbols)),
      'Digits 1 to 5 not split in pairs. Polybius wants them spaced as pairs.',
    ),
    candidate(['tap-code'], 'low', 'Digits 1 to 5, and tap-code wants them spaced one by one.'),
  ]
}

/**
 * ADFGVX: only its six letters, with or without the transposition.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} ADFGVX, or nothing.
 */
function adfgvx(reading: Readonly<Reading>): FamilyCandidate[] {
  const { symbols } = reading
  const letters = symbols.toUpperCase()
  if (!/^[ADFGVX]+$/.test(letters) || new Set(letters).size < 3) return []
  const even = letters.length % 2 === 0
  return [
    candidate(
      ['adfgvx'],
      byLayout(symbols, even),
      `Only the letters A, D, F, G, V and X${even ? '' : ', an odd count'}.`,
    ),
  ]
}

/**
 * Bacon: two letters, five per plaintext letter.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} Bacon, or nothing.
 */
function bacon(reading: Readonly<Reading>): FamilyCandidate[] {
  const { symbols } = reading
  const letters = symbols.toUpperCase()
  const alphabet = [...new Set(letters)].sort()
  if (!/^[A-Z]{5,}$/.test(letters) || alphabet.length !== 2) return []
  const whole = letters.length % 5 === 0
  const ab = alphabet.join('') === 'AB'
  let confidence: GuessConfidence = whole ? 'high' : 'medium'
  if (letters.length < 10) confidence = 'low'
  return [
    candidate(
      ['bacon'],
      ab ? confidence : lower(confidence),
      `Two letters only, ${alphabet.join(' and ')}, ${whole ? 'in whole groups of five' : 'not a multiple of five'}${ab ? '' : ', and bacon reads only A and B'}.`,
    ),
  ]
}

/**
 * An armored OpenPGP message, what `gpg --symmetric --armor` and `gpg --encrypt --armor` write.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} `openpgp`, or nothing.
 */
function armored(reading: Readonly<Reading>): FamilyCandidate[] {
  if (!reading.text.includes('-----BEGIN PGP MESSAGE-----')) return []
  const signal =
    'An armored OpenPGP message. openpgp opens it with a passphrase, not with a private key.'
  return [candidate(['openpgp'], 'high', signal)]
}

/**
 * The OpenSSL envelope CryptoJS writes: base64 of `Salted__` and a salt.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} `aes-passphrase`, or nothing.
 */
function salted(reading: Readonly<Reading>): FamilyCandidate[] {
  const { symbols } = reading
  if (!/^U2FsdGVkX1[A-Za-z0-9+/]*={0,2}$/.test(symbols)) return []
  const signal = 'Base64 opening with U2FsdGVkX1, the Salted__ header of OpenSSL and CryptoJS.'
  return [candidate(['aes-passphrase'], 'high', signal)]
}

/**
 * Block and stream ciphers by the block lengths a count of hex digits divides.
 *
 * @param digits - Hex digits, an even number.
 * @returns {FamilyCandidate[]} The ciphers whose blocks fit first.
 */
function byBlockLength(digits: number): FamilyCandidate[] {
  const found: FamilyCandidate[] = []
  if (digits % 32 === 0) {
    found.push(
      candidate(BLOCK_16, 'high', `${digits} hex digits, whole 16-byte blocks.`),
      candidate(BLOCK_8, 'medium', `${digits} hex digits, whole 8-byte blocks too.`),
    )
  } else if (digits % 16 === 0) {
    found.push(candidate(BLOCK_8, 'high', `${digits} hex digits, whole 8-byte blocks.`))
  }
  const blocks = digits % 16 === 0
  found.push(
    candidate(
      STREAM,
      blocks ? 'low' : 'high',
      `${digits} hex digits${blocks ? '' : ', no whole number of blocks'}: a stream cipher or a block cipher in a stream mode.`,
    ),
  )
  return found
}

/**
 * Hex bytes. Without a letter from a to f they may as well be a plain number, so only `low`.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} Block and stream ciphers, or nothing.
 */
function hexBytes(reading: Readonly<Reading>): FamilyCandidate[] {
  const { symbols } = reading
  if (!/^[\da-f]{8,}$/i.test(symbols) || symbols.length % 2 !== 0) return []
  const found = byBlockLength(symbols.length)
  if (/[a-f]/i.test(symbols)) return found
  return found.map((each) => ({
    ...each,
    confidence: 'low',
    signal: `${each.signal} Only decimal digits, though, so maybe just a number.`,
  }))
}

/**
 * A1Z26: numbers 1 to 26 with something between them, which tells them from hex and plain numbers.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} A1Z26, and Nihilist too when every number is 22 to 26, or nothing.
 */
function alphabetNumbers(reading: Readonly<Reading>): FamilyCandidate[] {
  const { text, symbols } = reading
  if (!/^[\d\s\-.,:;/|]+$/.test(text)) return []
  const numbers = text.match(/\d+/g) ?? []
  if (numbers.length < 2 || numbers.some((token) => Number(token) < 1 || Number(token) > 26)) {
    return []
  }
  const separator = mostCommon(text.trim().split(/\d+/).slice(1, -1))
  const signal =
    separator === '-' || separator.length > 10
      ? 'Numbers 1 to 26, one letter each.'
      : `Numbers 1 to 26, one letter each, mostly split by ${JSON.stringify(separator)}: pass that as separator to join the words.`
  return [candidate(['a1z26'], byLayout(symbols), signal), ...nihilist(reading)]
}

/**
 * Nihilist: two square cells added up, so 22 to 110 and never ending in 1.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} Nihilist, at most `medium`: character codes can look alike.
 */
function nihilist(reading: Readonly<Reading>): FamilyCandidate[] {
  const { text } = reading
  if (!/^[\d\s,]+$/.test(text)) return []
  const numbers = (text.match(/\d+/g) ?? []).map(Number)
  if (
    numbers.length < 2 ||
    numbers.some((value) => value < 22 || value > 110 || value % 10 === 1)
  ) {
    return []
  }
  return [
    candidate(
      ['nihilist'],
      numbers.length >= 10 ? 'medium' : 'low',
      `${numbers.length} numbers from 22 to 110 and none ending in 1, as two square cells added together give.`,
    ),
  ]
}

/**
 * The value that occurs most often, the first one seen on a tie.
 *
 * @param values - Values to count, at least one.
 * @returns {string} The most frequent value.
 */
function mostCommon(values: readonly string[]): string {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best = values[0]!
  for (const [value, count] of counts) if (count > counts.get(best)!) best = value
  return best
}

/** Layout rules in order. The first that answers decides, so Bacon's A and B never read as hex. */
const LAYOUTS = [
  armored,
  morse,
  gridDigits,
  adfgvx,
  bacon,
  salted,
  alphabetNumbers,
  nihilist,
  hexBytes,
] as const

/**
 * ROT47: punctuation where letters belong, and letters that fit the language once shifted back.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} ROT47, or nothing.
 */
function rot47(reading: Readonly<Reading>): FamilyCandidate[] {
  const { text, symbols, language } = reading
  const punctuation = symbols.replaceAll(/[\dA-Za-z]/g, '').length
  if (punctuation === 0 || punctuation < symbols.length / 10) return []
  const { counts, letters } = letterCounts(create('rot47').decode(text).text)
  if (letters < MIN_LETTERS || fitGap(counts, letters, language) <= READS_LIKE_LANGUAGE) return []
  return [
    candidate(
      ['rot47'],
      byLetters(letters, 100, 30),
      `Punctuation in place of letters, and ROT47 turns it into letters that fit ${language}.`,
    ),
  ]
}

/** An affine key with how well its decoding fits the language. */
interface AffineKey {
  readonly a: number
  readonly b: number
  /** `fitGap` of the decoding. */
  readonly gap: number
  /** How far `gap` leads the next best key's. */
  readonly lead: number
}

/**
 * The affine key, Caesar and Atbash included, whose decoding reads most like the language.
 *
 * @param reading - The text.
 * @returns {AffineKey} The key, its `fitGap`, and how far that gap leads the next best key's.
 */
function bestAffine(reading: Readonly<Reading>): AffineKey {
  const { counts, letters, language } = reading
  let best = { a: 1, b: 1, gap: -Infinity }
  let next = -Infinity
  for (const [a, inverse] of AFFINE_INVERSES) {
    for (let b = a === 1 ? 1 : 0; b < 26; b++) {
      const decoded = Array.from<number>({ length: 26 }).fill(0)
      counts.forEach((count, code) => {
        decoded[(inverse * (code - b + 26)) % 26]! += count
      })
      const gap = fitGap(decoded, letters, language)
      next = Math.max(next, Math.min(gap, best.gap))
      if (gap > best.gap) best = { a, b, gap }
    }
  }
  return { ...best, lead: best.gap - next }
}

/**
 * Caesar, Atbash or affine with the key that reads, when one alphabet throughout and a key fits.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} The cipher with its key, or nothing.
 */
function keyThatReads(reading: Readonly<Reading>): FamilyCandidate[] {
  const { ic, letters, language, lift, gap } = reading
  if (gap > READS_LIKE_LANGUAGE || lift < ONE_ALPHABET) return []
  const { a, b, gap: keyGap, lead } = bestAffine(reading)
  if (keyGap <= KEY_READS || lead < KEY_LEAD) return []
  let named: [string, Record<string, number> | undefined, string] = [
    'affine',
    { a, b },
    `affine a=${a} b=${b}`,
  ]
  if (a === 1) named = ['caesar', { shift: b }, `Caesar shift ${b}${b === 13 ? ' (ROT13)' : ''}`]
  if (a === 25 && b === 25) named = ['atbash', undefined, 'Atbash']
  const [name, options, label] = named
  return [
    candidate(
      [name, ...MONOALPHABETIC.filter((other) => other !== name)],
      byLetters(letters, 100, 30),
      `IoC ${ic.toFixed(4)} is close to ${language} plaintext, one alphabet throughout, and ${label} makes the letters fit ${language}.`,
      options,
    ),
  ]
}

/**
 * Playfair, four-square and bifid: the 5×5 squares leave no J, and only Playfair never pairs a letter with itself.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} Any of the three, or nothing.
 */
function square(reading: Readonly<Reading>): FamilyCandidate[] {
  const { symbols, letters, lift } = reading
  if (!/^[A-IK-Za-ik-z]{20,}$/.test(symbols)) return []
  const doubled = /^(?:..)*?(.)\1/.test(symbols.toUpperCase())
  const several = lift < ONE_ALPHABET
  const pairs = several ? byLetters(letters, 200, 60) : lower(byLetters(letters, 200, 60))
  const even = letters % 2 === 0
  const stirred = bifid(letters, doubled, several)
  const playfair = candidate(
    ['playfair'],
    pairs,
    `${letters} letters, an even count with no J and no pair of the same letter twice.`,
  )
  return [
    ...(even && !doubled ? [playfair] : []),
    ...(stirred === undefined ? [] : [stirred]),
    ...(even ? [fourSquare(letters, doubled ? stirred?.confidence : lower(pairs), pairs)] : []),
  ]
}

/**
 * Four-square: no J and an even count; a doubled pair rules Playfair out but not bifid.
 *
 * @param letters - A-Z letters in the text.
 * @param confidence - Bifid's when a pair doubles, so the two never swap places; one below Playfair's otherwise.
 * @param fallback - Playfair's, for a doubled pair too short for bifid.
 * @returns {FamilyCandidate} Four-square.
 */
function fourSquare(
  letters: number,
  confidence: GuessConfidence | undefined,
  fallback: GuessConfidence,
): FamilyCandidate {
  return candidate(
    ['four-square'],
    confidence ?? fallback,
    `${letters} letters, an even count with no J, read in pairs across two keyed squares.`,
  )
}

/**
 * Bifid: no J, from 40 letters, and less sure without a doubled pair, which a Playfair text lacks too.
 *
 * @param letters - A-Z letters in the text.
 * @param doubled - Whether a pair holds the same letter twice.
 * @param several - Whether the counts are flatter than one alphabet's.
 * @returns {FamilyCandidate | undefined} Bifid, or nothing under 40 letters.
 */
function bifid(letters: number, doubled: boolean, several: boolean): FamilyCandidate | undefined {
  if (letters < 40) return undefined
  let confidence = byLetters(letters, 300, 100)
  if (!doubled) confidence = lower(confidence)
  return candidate(
    ['bifid'],
    several ? confidence : 'low',
    `No J in ${letters} letters, as a 5×5 square leaves it${several ? ', while several alphabets would use it' : ''}.`,
  )
}

/**
 * Hill: letters only, whole blocks of 2 or 3, flat, and a J no 5×5 square would give.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} Hill, at most `medium`, since a Vigenère without spaces looks alike.
 */
function hill(reading: Readonly<Reading>): FamilyCandidate[] {
  const { symbols, letters, lift } = reading
  if (!/^[A-Za-z]{20,}$/.test(symbols) || !/j/i.test(symbols) || lift >= ONE_ALPHABET) return []
  const blocks = [2, 3].filter((size) => letters % size === 0)
  if (blocks.length === 0) return []
  return [
    candidate(
      ['hill'],
      lower(byLetters(letters, 200, 60)),
      `${letters} letters with no spaces, whole blocks of ${blocks.join(' or ')}, flat counts and a J, as a Hill matrix leaves them.`,
    ),
  ]
}

/**
 * The monoalphabetic ciphers when no key reads, a mixed alphabet first when the IoC says one.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate} Caesar, Atbash, affine and substitution.
 */
function oneAlphabet(reading: Readonly<Reading>): FamilyCandidate {
  const { language, letters, ic, lift } = reading
  if (lift < ONE_ALPHABET) {
    const signal = `IoC ${ic.toFixed(4)} on ${letters} letters can still come from one alphabet.`
    return candidate([...MONOALPHABETIC, 'substitution'], 'low', signal)
  }
  return candidate(
    ['substitution', ...MONOALPHABETIC],
    lower(byLetters(letters, 200, 100)),
    `IoC ${ic.toFixed(4)} is close to ${language} plaintext, one alphabet throughout, but no Caesar, Atbash or affine key makes the letters fit ${language}: a mixed alphabet, or a short text.`,
  )
}

/**
 * The polyalphabetic ciphers, and Enigma when the letters are as flat as random.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} The polyalphabetic ciphers first.
 */
function severalAlphabets(reading: Readonly<Reading>): FamilyCandidate[] {
  const { symbols, language, letters, ic, lift } = reading
  if (lift >= ONE_ALPHABET) {
    const signal = `IoC ${ic.toFixed(4)} on ${letters} letters can still come from several alphabets.`
    return [candidate(POLYALPHABETIC, 'low', signal)]
  }
  let confidence = byLetters(letters, 200, 100)
  if (unsure(reading) || (letters >= 100 && !/j/i.test(symbols))) confidence = lower(confidence)
  const found = [
    candidate(
      POLYALPHABETIC,
      confidence,
      `IoC ${ic.toFixed(4)} sits below ${language} plaintext (~${referenceCoincidences[language].toFixed(3)}) toward uniform random (~0.038), so several alphabets take turns.`,
    ),
  ]
  if (lift < FLAT) {
    const signal = `IoC ${ic.toFixed(4)} is as flat as random letters, as a rotor machine leaves it.`
    found.push(candidate(['enigma'], lower(byLetters(letters, 200, 100)), signal))
  }
  return found
}

/**
 * Whether the IoC could still sit on the other side of `ONE_ALPHABET`.
 *
 * @param reading - The text.
 * @returns {boolean} True below 200 letters or close to the split.
 */
function unsure(reading: Readonly<Reading>): boolean {
  const { letters, lift } = reading
  return letters < 200 || Math.abs(lift - ONE_ALPHABET) < 0.15
}

/**
 * One alphabet or several, from the IoC; moved rather than replaced, from the fit.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} The families the statistics point to, the likeliest side first.
 */
function alphabets(reading: Readonly<Reading>): FamilyCandidate[] {
  const { language, letters, lift, gap } = reading
  if (gap > READS_LIKE_LANGUAGE) {
    return [
      candidate(
        ['rail-fence', 'columnar', 'route'],
        byLetters(letters, 100, 30),
        `The letters fit ${language} as they stand. Moved, not replaced, or not enciphered at all.`,
      ),
    ]
  }
  const one = [oneAlphabet(reading)]
  const several = severalAlphabets(reading)
  if (!unsure(reading)) return lift >= ONE_ALPHABET ? one : several
  return lift >= ONE_ALPHABET ? [...one, ...several] : [...several, ...one]
}

/**
 * Candidates from the letter statistics. ROT47 and a key that reads settle it alone.
 *
 * @param reading - The text.
 * @returns {FamilyCandidate[]} The candidates in rule order.
 */
function statistics(reading: Readonly<Reading>): FamilyCandidate[] {
  const shifted = rot47(reading)
  if (shifted.length > 0) return shifted
  if (reading.letters < MIN_LETTERS) return []
  const keyed = keyThatReads(reading)
  if (keyed.length > 0) return keyed
  return [...square(reading), ...hill(reading), ...alphabets(reading)]
}

const RANK: Readonly<Record<GuessConfidence, number>> = { high: 0, medium: 1, low: 2 }

/**
 * Rank the cipher families a text may come from, with the built-in ciphers to try next.
 *
 * @param text - Ciphertext.
 * @param language - Language the plaintext reads in.
 * @returns {FamilyGuess} The candidates, most likely first, and the statistics behind them.
 * @throws {InvalidOptionError} For a language without a table.
 */
export function guessFamily(text: string, language: FrequencyLanguage = 'en'): FamilyGuess {
  assertLanguage(language)
  const reading = read(text, language)
  let layout: FamilyCandidate[] = []
  for (const rule of LAYOUTS) {
    layout = rule(reading)
    if (layout.length > 0) break
  }
  const decided = layout.length > 0
  const candidates = (decided ? layout : statistics(reading))
    .map((found, order) => ({ found, order }))
    .sort(
      (left, right) =>
        RANK[left.found.confidence] - RANK[right.found.confidence] || left.order - right.order,
    )
    .map(({ found }) => found)
  return {
    length: reading.symbols.length,
    letters: reading.letters,
    language,
    ...(decided || reading.letters < 2 ? {} : { ic: reading.ic }),
    referenceIc: referenceCoincidences[language],
    candidates,
  }
}
