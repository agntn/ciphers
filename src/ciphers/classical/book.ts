import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'
import { getOpt } from '../../core/utils.ts'

const ADDRESSES = [
  'word',
  'line-word',
  'page-line-word',
  'letter',
  'line-letter',
  'page-line-letter',
  'line-word-letter',
  'page-line-word-letter',
] as const
const PICKS = ['word', 'letter'] as const

type BookAddress = (typeof ADDRESSES)[number]
type LetterAddress = Extract<BookAddress, `${string}letter`>
type WordAddress = Exclude<BookAddress, LetterAddress>
type BookPick = (typeof PICKS)[number]
type Level = 'page' | 'line' | 'word' | 'letter'

/** Letters and digits with their combining marks, an inner apostrophe kept, as dCode counts. */
const WORD = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu

/** A letter or a digit, the unit `pick: letter` encodes and a letter address counts. */
const LETTER = /[\p{L}\p{N}]/u

/** One word of the book and every place it has, each counted from 0. */
interface BookWord {
  readonly text: string
  /** Place in the whole book. */
  readonly index: number
  readonly page: number
  /** Line in the whole book. */
  readonly line: number
  /** Line on its page. */
  readonly pageLine: number
  /** Word in its line. */
  readonly word: number
}

/** The book split into words, lines and pages. */
interface SplitBook {
  readonly words: readonly BookWord[]
  /** Words of every line, the lines of all pages in a row. */
  readonly lines: readonly (readonly BookWord[])[]
  /** Lines of every page. */
  readonly pages: readonly (readonly (readonly BookWord[])[])[]
}

/** A split book with its letters counted. */
interface CountedBook extends SplitBook {
  /** Letters before each word, the total last. Empty for word addresses. */
  readonly starts: readonly number[]
}

/** One letter of the book and every place it has, each counted from 0. */
interface BookLetter {
  readonly word: BookWord
  readonly inWord: number
  readonly inLine: number
  readonly inBook: number
}

/** The words an address has narrowed down to, and their name for an error. */
interface Stretch {
  readonly words: readonly BookWord[]
  readonly where: string
}

/** What a number was counting when it ran past the end. */
interface Range {
  readonly count: number
  readonly start: number
  readonly noun: string
  readonly where: string
}

interface BookSettings {
  readonly address: BookAddress
  readonly pick: BookPick
  readonly start: number
}

/** What the numbers of one address count, outermost first. */
const LEVELS: Readonly<Record<BookAddress, readonly Level[]>> = {
  word: ['word'],
  'line-word': ['line', 'word'],
  'page-line-word': ['page', 'line', 'word'],
  letter: ['letter'],
  'line-letter': ['line', 'letter'],
  'page-line-letter': ['page', 'line', 'letter'],
  'line-word-letter': ['line', 'word', 'letter'],
  'page-line-word-letter': ['page', 'line', 'word', 'letter'],
}

/**
 * Whether an address ends at a letter, not at a whole word.
 *
 * @param address - The address form.
 * @returns {boolean} True for the letter forms.
 */
function spelled(address: BookAddress): address is LetterAddress {
  return address.endsWith('letter')
}

/**
 * The letters and digits of a word in NFC, marks and apostrophes left out.
 *
 * @param word - A word of the book.
 * @returns {string[]} One code point each.
 */
function spell(word: string): string[] {
  return Array.from(word.normalize('NFC')).filter((char) => LETTER.test(char))
}

/**
 * Count the letters of every word.
 *
 * @param words - The words of the book.
 * @returns {number[]} Where each word's letters begin in the whole book, the total last.
 */
function letterStarts(words: readonly BookWord[]): number[] {
  const starts = [0]
  let total = 0
  for (const word of words) {
    total += spell(word.text).length
    starts.push(total)
  }
  return starts
}

/**
 * Split the book at form feeds, as `pdftotext` writes pages, skipping lines without a word.
 *
 * @param text - The book.
 * @returns {SplitBook} Its words, lines and pages.
 */
function splitBook(text: string): SplitBook {
  const words: BookWord[] = []
  const lines: BookWord[][] = []
  const pages = text.split('\f').map((page, pageIndex) => {
    const pageLines: BookWord[][] = []
    for (const line of page.split(/\r\n|[\n\v\r\u0085\u2028\u2029]/)) {
      const found = line.match(WORD)
      if (found === null) continue
      const lineWords = found.map((word, wordIndex): BookWord => ({
        text: word,
        index: words.length + wordIndex,
        page: pageIndex,
        line: lines.length,
        pageLine: pageLines.length,
        word: wordIndex,
      }))
      for (const word of lineWords) words.push(word)
      lines.push(lineWords)
      pageLines.push(lineWords)
    }
    return pageLines
  })
  return { words, lines, pages }
}

/**
 * Read the book option.
 *
 * @param opts - Cipher options.
 * @param address - The address form, which says whether letters get counted.
 * @returns {CountedBook} The book, split.
 * @throws {MissingOptionError} When there is no book.
 * @throws {InvalidOptionError} When it is not text or has no word in it.
 */
function readBook(opts: Readonly<CipherBaseOptions>, address: BookAddress): CountedBook {
  const book = getOpt<unknown>(opts, 'book', undefined)
  if (book === undefined || book === '') throw new MissingOptionError('book')
  if (typeof book !== 'string') throw new InvalidOptionError('book', typeof book, 'must be text')
  const split = splitBook(book)
  if (split.words.length === 0)
    throw new InvalidOptionError('book', `${book.length} characters`, 'must have a word in it')
  return { ...split, starts: spelled(address) ? letterStarts(split.words) : [] }
}

/**
 * Read `pick`, which a letter address settles on its own.
 *
 * @param opts - Cipher options.
 * @param address - The address form.
 * @returns {BookPick} `letter` for a letter address, else what was asked for, `word` by default.
 * @throws {InvalidOptionError} When it is not a known value, or `word` with a letter address.
 */
function readPick(opts: Readonly<CipherBaseOptions>, address: BookAddress): BookPick {
  const pick = getOpt<unknown>(opts, 'pick', undefined)
  if (spelled(address)) {
    if (pick === undefined || pick === 'letter') return 'letter'
    throw new InvalidOptionError('pick', pick, `must be letter with address ${address}`)
  }
  if (pick === undefined) return 'word'
  if (!PICKS.includes(pick as BookPick))
    throw new InvalidOptionError('pick', pick, `must be one of ${PICKS.join(', ')}`)
  return pick as BookPick
}

/**
 * Check the options that pick the address form.
 *
 * @param opts - Cipher options.
 * @returns {BookSettings} Address, pick and the number of the first word.
 * @throws {InvalidOptionError} When one of them is not a known value, or `pick` fights the address.
 */
function validate(opts: Readonly<CipherBaseOptions>): BookSettings {
  const address = getOpt<unknown>(opts, 'address', 'word')
  if (!ADDRESSES.includes(address as BookAddress))
    throw new InvalidOptionError('address', address, `must be one of ${ADDRESSES.join(', ')}`)
  const pick = readPick(opts, address as BookAddress)
  const start = getOpt<unknown>(opts, 'start', 1)
  if (start !== 0 && start !== 1) throw new InvalidOptionError('start', start, 'must be 0 or 1')
  return { address: address as BookAddress, pick, start }
}

/**
 * Settings and split counts for the result, without the book, which can be a whole novel.
 *
 * @param settings - Address, pick and first number.
 * @param book - The split book.
 * @returns {Record<string, unknown>} Options for the result, with `letters` for a letter address.
 */
function resultOptions(
  settings: Readonly<BookSettings>,
  book: Readonly<CountedBook>,
): Record<string, unknown> {
  const letters = book.starts.at(-1)
  return {
    ...settings,
    words: book.words.length,
    lines: book.lines.length,
    pages: book.pages.length,
    ...(letters === undefined ? {} : { letters }),
  }
}

/**
 * NFC before and after full case folding, so `ẞ` and `SS` meet `ß`, `ſ` meets `s` and both Turkish I meet `i`.
 *
 * @param unit - A word or a letter.
 * @returns {string} The folded unit.
 */
function fold(unit: string): string {
  return unit
    .normalize('NFC')
    .toLowerCase()
    .toUpperCase()
    .toLowerCase()
    .replaceAll('i\u0307', 'i')
    .normalize('NFC')
}

/**
 * The first character of a word in NFC, the one `pick: letter` reads, with a mark that composes.
 *
 * @param word - A word of the book.
 * @returns {string} Its first code point after NFC.
 */
function initial(word: string): string {
  return String.fromCodePoint(word.normalize('NFC').codePointAt(0)!)
}

/**
 * Where a word sits, in the numbers the address form uses.
 *
 * @param word - A word of the book.
 * @param address - A word address form.
 * @returns {readonly number[]} One, two or three numbers, from 0.
 */
function wordNumbers(word: Readonly<BookWord>, address: WordAddress): readonly number[] {
  const places: Readonly<Record<WordAddress, readonly number[]>> = {
    word: [word.index],
    'line-word': [word.line, word.word],
    'page-line-word': [word.page, word.pageLine, word.word],
  }
  return places[address]
}

/**
 * Where a letter sits, in the numbers the address form uses.
 *
 * @param letter - A letter of the book.
 * @param address - A letter address form.
 * @returns {readonly number[]} One to four numbers, from 0.
 */
function letterNumbers(letter: Readonly<BookLetter>, address: LetterAddress): readonly number[] {
  const { word, inWord, inLine, inBook } = letter
  const places: Readonly<Record<LetterAddress, readonly number[]>> = {
    letter: [inBook],
    'line-letter': [word.line, inLine],
    'page-line-letter': [word.page, word.pageLine, inLine],
    'line-word-letter': [word.line, word.word, inWord],
    'page-line-word-letter': [word.page, word.pageLine, word.word, inWord],
  }
  return places[address]
}

/**
 * One address as it goes into the ciphertext.
 *
 * @param numbers - Its numbers, from 0.
 * @param start - Number of the first item.
 * @returns {string} The numbers from `start`, joined by hyphens.
 */
function written(numbers: readonly number[], start: number): string {
  return numbers.map((place) => place + start).join('-')
}

/**
 * The word that holds a letter, by binary search.
 *
 * @param starts - Where each word's letters begin, the total last.
 * @param inBook - Place of the letter in the whole book, inside the total.
 * @returns {number} Place of its word in the whole book.
 */
function owner(starts: readonly number[], inBook: number): number {
  let low = 0
  let high = starts.length - 2
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (starts[middle]! <= inBook) low = middle
    else high = middle - 1
  }
  return low
}

/**
 * Every place of one letter, from its place in the whole book.
 *
 * @param inBook - Place of the letter in the whole book.
 * @param book - The split book, letters counted.
 * @returns {BookLetter} Its word and its place in the word and the line.
 */
function findLetter(inBook: number, book: Readonly<CountedBook>): BookLetter {
  const word = book.words[owner(book.starts, inBook)]!
  const lineStart = book.starts[book.lines[word.line]![0]!.index]!
  return { word, inWord: inBook - book.starts[word.index]!, inLine: inBook - lineStart, inBook }
}

/**
 * Words of the book by what they stand for: the whole word or its first letter, case-folded.
 *
 * @param book - The split book.
 * @param pick - Whole word or first letter.
 * @returns {Map<string, BookWord[]>} Every word that can stand for each unit, in book order.
 */
function indexBook(book: Readonly<SplitBook>, pick: BookPick): Map<string, BookWord[]> {
  const index = new Map<string, BookWord[]>()
  for (const word of book.words) {
    const unit = fold(pick === 'word' ? word.text : initial(word.text))
    const found = index.get(unit)
    if (found === undefined) index.set(unit, [word])
    else found.push(word)
  }
  return index
}

/**
 * Letters of the book, case-folded, with every place each one has.
 *
 * @param book - The split book.
 * @returns {Map<string, number[]>} Places in the whole book for each letter, in book order.
 */
function indexLetters(book: Readonly<SplitBook>): Map<string, number[]> {
  const index = new Map<string, number[]>()
  const folded = new Map<string, string>()
  let inBook = 0
  for (const word of book.words) {
    for (const letter of spell(word.text)) {
      const unit = folded.get(letter) ?? fold(letter)
      folded.set(letter, unit)
      const found = index.get(unit)
      if (found === undefined) index.set(unit, [inBook])
      else found.push(inBook)
      inBook += 1
    }
  }
  return index
}

/**
 * A capital that stays one letter: `ß` and `ﬃ` keep their form, not `SS` and `FFI`.
 *
 * @param letter - One code point.
 * @returns {string} The capital, or the letter itself.
 */
function capital(letter: string): string {
  const upper = letter.toUpperCase()
  return Array.from(upper).length === 1 ? upper : letter
}

/**
 * The units of the plaintext: its words, or its letters and digits.
 *
 * @param text - Plaintext.
 * @param pick - Whole word or first letter.
 * @returns {string[]} The units in order, everything else dropped.
 */
function plainUnits(text: string, pick: BookPick): string[] {
  if (pick === 'word') return text.match(WORD) ?? []
  return Array.from(text.normalize('NFC')).filter((char) => LETTER.test(char))
}

/**
 * A place in the book for each unit, a repeated unit taking the next one round the book.
 *
 * @param units - Words or letters of the plaintext.
 * @param placesOf - Every place that can stand for a folded unit.
 * @param what - What the book lacks when a unit has no place, for the error.
 * @returns {T[]} One place per unit.
 * @throws {CipherError} When the book has no place for a unit.
 */
function takeTurns<T>(
  units: readonly string[],
  placesOf: (unit: string) => readonly T[] | undefined,
  what: string,
): T[] {
  const used = new Map<string, number>()
  return units.map((unit) => {
    const key = fold(unit)
    const candidates = placesOf(key)
    if (candidates === undefined)
      throw new CipherError(`The book has no ${what} ${shownWord(unit)}`)
    const count = used.get(key) ?? 0
    used.set(key, count + 1)
    return candidates[count % candidates.length]!
  })
}

/**
 * Plaintext to addresses of words or of letters.
 *
 * @param text - Plaintext.
 * @param book - The split book.
 * @param settings - Address form, pick and first number.
 * @returns {string} The addresses, joined by spaces.
 * @throws {CipherError} When the book has no word or letter for a unit.
 */
function encodeBook(
  text: string,
  book: Readonly<CountedBook>,
  settings: Readonly<BookSettings>,
): string {
  const { address, pick, start } = settings
  const units = plainUnits(text, pick)
  if (spelled(address)) {
    const letters = indexLetters(book)
    return takeTurns(units, (unit) => letters.get(unit), 'letter')
      .map((inBook) => written(letterNumbers(findLetter(inBook, book), address), start))
      .join(' ')
  }
  const what = pick === 'word' ? 'word' : 'word starting with'
  const words = indexBook(book, pick)
  return takeTurns(units, (unit) => words.get(unit), what)
    .map((word) => written(wordNumbers(word, address), start))
    .join(' ')
}

/**
 * A plaintext unit for an error, quoted, or by its length when it is long.
 *
 * @param unit - A word or a letter of the plaintext.
 * @returns {string} The quoted unit or its length.
 */
function shownWord(unit: string): string {
  const length = Array.from(unit).length
  return length > 40 ? `of ${length} characters` : JSON.stringify(unit)
}

/**
 * A number from the ciphertext for an error, or its digit count when it is long.
 *
 * @param number - Digits as written.
 * @returns {string} The digits or their count.
 */
function shownNumber(number: string): string {
  return number.length > 9 ? `of ${number.length} digits` : number
}

/**
 * A count with its noun, singular for one.
 *
 * @param count - How many.
 * @param noun - The noun in the singular.
 * @returns {string} For example `1 line` or `342 words`.
 */
function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/**
 * The error for a number past the end of what it counts.
 *
 * @param number - The number as written in the ciphertext.
 * @param range - What it counted, how many there are and where.
 * @returns {CipherError} The error, naming the count and the first number.
 */
function outOfRange(number: string, range: Readonly<Range>): CipherError {
  const { count, start, noun, where } = range
  const label = `${noun[0]!.toUpperCase()}${noun.slice(1)}`
  return new CipherError(
    `${label} ${shownNumber(number)} is out of range: ${where} has ${counted(count, noun)}, numbered from ${start}`,
  )
}

/**
 * The item a number points at, in a list counted from `start`.
 *
 * @param items - Words, lines or pages.
 * @param number - The number as written in the ciphertext.
 * @param start - Number of the first item.
 * @param noun - What the items are, in the singular.
 * @param where - What holds them, for the error.
 * @returns {T} The item.
 * @throws {CipherError} When the number is outside the list.
 */
function nth<T>(
  items: readonly T[],
  number: string,
  start: number,
  noun: string,
  where: string,
): T {
  const item = items[Number(number) - start]
  if (item !== undefined) return item
  throw outOfRange(number, { count: items.length, start, noun, where })
}

/**
 * Follow the page, line and word numbers of one address, leaving a letter number for later.
 *
 * @param parts - The numbers of the address, as written.
 * @param book - The split book.
 * @param settings - Address form and first number.
 * @returns {Stretch} One word for a word address, else the words the letter is counted in.
 * @throws {CipherError} When a number is out of range.
 */
function lookUp(
  parts: readonly string[],
  book: Readonly<SplitBook>,
  settings: Readonly<BookSettings>,
): Stretch {
  const { address, start } = settings
  let { lines, words } = book
  let where = 'the book'
  for (const [place, level] of LEVELS[address].entries()) {
    if (level === 'letter') break
    const number = parts[place]!
    if (level === 'page') lines = nth(book.pages, number, start, level, where)
    else if (level === 'line') words = nth(lines, number, start, level, where)
    else words = [nth(words, number, start, level, where)]
    const here = `${level} ${shownNumber(number)}`
    where = where === 'the book' ? here : `${here} of ${where}`
  }
  return { words, where }
}

/**
 * A reader of letter addresses that spells each word it lands on once.
 *
 * @param book - The split book, letters counted.
 * @param settings - Address form and first number.
 * @returns {(parts: readonly string[]) => string} The letter one address points at.
 */
function letterReader(
  book: Readonly<CountedBook>,
  settings: Readonly<BookSettings>,
): (parts: readonly string[]) => string {
  const { starts } = book
  const spelt = new Map<number, string[]>()
  return (parts) => {
    const { words, where } = lookUp(parts, book, settings)
    const number = parts.at(-1)!
    const first = starts[words[0]!.index]!
    const count = starts[words.at(-1)!.index + 1]! - first
    const inBook = first + Number(number) - settings.start
    if (inBook < first || inBook >= first + count)
      throw outOfRange(number, { count, start: settings.start, noun: 'letter', where })
    const word = book.words[owner(starts, inBook)]!
    const letters = spelt.get(word.index) ?? spell(word.text)
    spelt.set(word.index, letters)
    return letters[inBook - starts[word.index]!]!
  }
}

/**
 * Addresses to words or letters, reading every number in order and ignoring what is between.
 *
 * @param text - Ciphertext.
 * @param book - The split book.
 * @param settings - Address form, pick and first number.
 * @returns {string} The words joined by spaces, or the letters run together.
 * @throws {CipherError} When there is no number, an address is incomplete or out of range.
 */
function decodeBook(
  text: string,
  book: Readonly<CountedBook>,
  settings: Readonly<BookSettings>,
): string {
  const numbers = text.match(/\d+/g) ?? []
  const size = LEVELS[settings.address].length
  if (numbers.length === 0) throw new CipherError('No numbers to look up in the book')
  if (numbers.length % size !== 0)
    throw new CipherError(
      `${settings.address} addresses take ${size} numbers each, and the text has ${numbers.length}`,
    )
  const addresses = Array.from({ length: numbers.length / size }, (_, i) =>
    numbers.slice(i * size, i * size + size),
  )
  if (spelled(settings.address))
    return addresses.map(letterReader(book, settings)).map(capital).join('')
  const found = addresses.map((parts) => lookUp(parts, book, settings).words[0]!)
  return settings.pick === 'word'
    ? found.map((word) => word.text).join(' ')
    : found.map((word) => capital(initial(word.text))).join('')
}

export class Book extends Cipher {
  name(): string {
    return 'book'
  }

  info(): CipherInfo {
    return {
      name: 'book',
      label: 'Book Cipher',
      description:
        'Each word or letter as a place in a text both sides have: the number of a word or of a letter, alone or under its line, or its page and line',
      category: 'classical',
      family: 'homophonic',
      selfInverse: false,
      worksOn:
        'letters and digits in any script, as words or one by one with pick letter, the rest dropped',
      options: [
        {
          name: 'book',
          type: 'string',
          required: true,
          description:
            'The text to count in. A form feed starts a new page, and a line without a word is not counted',
        },
        {
          name: 'address',
          type: 'string',
          required: false,
          default: 'word',
          description: `What one address counts: ${ADDRESSES.join(', ')}`,
        },
        {
          name: 'pick',
          type: 'string',
          required: false,
          default: 'word',
          description:
            'word for the whole word, letter for its first letter. A letter address gives the letter it points at',
        },
        {
          name: 'start',
          type: 'number',
          required: false,
          default: 1,
          description: 'Number of the first letter, word, line and page: 1 or 0',
        },
      ],
      keyspace: 'every text both sides have',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const settings = validate(options ?? {})
      const book = readBook(options ?? {}, settings.address)
      return {
        text: encodeBook(text, book, settings),
        cipher: 'book',
        operation: 'encode',
        options: resultOptions(settings, book),
      }
    } catch (e) {
      throw normalizeError(e, 'book')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const settings = validate(options ?? {})
      const book = readBook(options ?? {}, settings.address)
      return {
        text: decodeBook(text, book, settings),
        cipher: 'book',
        operation: 'decode',
        options: resultOptions(settings, book),
      }
    } catch (e) {
      throw normalizeError(e, 'book')
    }
  }
}
