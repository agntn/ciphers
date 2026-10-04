import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import {
  CipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../core/errors.ts'
import { getOpt } from '../../core/utils.ts'

const ADDRESSES = ['word', 'line-word', 'page-line-word'] as const
const PICKS = ['word', 'letter'] as const

type BookAddress = (typeof ADDRESSES)[number]
type BookPick = (typeof PICKS)[number]

/** Letters and digits in a row, an apostrophe inside a word kept, as the dCode examples count. */
const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu

/** A letter or a digit of the plaintext, the unit `pick: letter` encodes. */
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

interface BookSettings {
  readonly address: BookAddress
  readonly pick: BookPick
  readonly start: number
}

/** How many numbers one address has. */
const ADDRESS_PARTS: Readonly<Record<BookAddress, number>> = {
  word: 1,
  'line-word': 2,
  'page-line-word': 3,
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
      words.push(...lineWords)
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
 * @returns {SplitBook} The book, split.
 * @throws {MissingOptionError} When there is no book.
 * @throws {InvalidOptionError} When it is not text or has no word in it.
 */
function readBook(opts: Readonly<CipherBaseOptions>): SplitBook {
  const book = getOpt<unknown>(opts, 'book', undefined)
  if (book === undefined || book === '') throw new MissingOptionError('book')
  if (typeof book !== 'string') throw new InvalidOptionError('book', typeof book, 'must be text')
  const split = splitBook(book)
  if (split.words.length === 0)
    throw new InvalidOptionError('book', `${book.length} characters`, 'must have a word in it')
  return split
}

/**
 * Check the options that pick the address form.
 *
 * @param opts - Cipher options.
 * @returns {BookSettings} Address, pick and the number of the first word.
 * @throws {InvalidOptionError} When one of them is not a known value.
 */
function validate(opts: Readonly<CipherBaseOptions>): BookSettings {
  const address = getOpt<unknown>(opts, 'address', 'word')
  if (!ADDRESSES.includes(address as BookAddress))
    throw new InvalidOptionError('address', address, `must be one of ${ADDRESSES.join(', ')}`)
  const pick = getOpt<unknown>(opts, 'pick', 'word')
  if (!PICKS.includes(pick as BookPick))
    throw new InvalidOptionError('pick', pick, `must be one of ${PICKS.join(', ')}`)
  const start = getOpt<unknown>(opts, 'start', 1)
  if (start !== 0 && start !== 1) throw new InvalidOptionError('start', start, 'must be 0 or 1')
  return { address: address as BookAddress, pick: pick as BookPick, start }
}

/**
 * Settings and split counts for the result, without the book, which can be a whole novel.
 *
 * @param settings - Address, pick and first number.
 * @param book - The split book.
 * @returns {Record<string, unknown>} Options for the result.
 */
function resultOptions(
  settings: Readonly<BookSettings>,
  book: Readonly<SplitBook>,
): Record<string, unknown> {
  return {
    ...settings,
    words: book.words.length,
    lines: book.lines.length,
    pages: book.pages.length,
  }
}

/**
 * Full case folding, so `ẞ` and `SS` meet `ß`, `ſ` meets `s` and both Turkish I meet `i`.
 *
 * @param unit - A word or a letter.
 * @returns {string} The folded unit.
 */
function fold(unit: string): string {
  return unit.toLowerCase().toUpperCase().toLowerCase().replaceAll('i\u0307', 'i')
}

/**
 * The first character of a word, the one `pick: letter` reads.
 *
 * @param word - A word of the book.
 * @returns {string} Its first code point.
 */
function initial(word: string): string {
  return String.fromCodePoint(word.codePointAt(0)!)
}

/**
 * Where a word sits, in the numbers the address form uses.
 *
 * @param word - A word of the book.
 * @param settings - Address form and first number.
 * @returns {string} One number, or two or three joined by hyphens.
 */
function formatAddress(word: Readonly<BookWord>, settings: Readonly<BookSettings>): string {
  const places: Readonly<Record<BookAddress, readonly number[]>> = {
    word: [word.index],
    'line-word': [word.line, word.word],
    'page-line-word': [word.page, word.pageLine, word.word],
  }
  return places[settings.address].map((place) => place + settings.start).join('-')
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
 * The units of the plaintext: its words, or its letters and digits.
 *
 * @param text - Plaintext.
 * @param pick - Whole word or first letter.
 * @returns {string[]} The units in order, everything else dropped.
 */
function plainUnits(text: string, pick: BookPick): string[] {
  if (pick === 'word') return text.match(WORD) ?? []
  return Array.from(text).filter((char) => LETTER.test(char))
}

/**
 * Plaintext to addresses, a repeated unit taking the next matching word round the book.
 *
 * @param text - Plaintext.
 * @param book - The split book.
 * @param settings - Address form, pick and first number.
 * @returns {string} The addresses, joined by spaces.
 * @throws {CipherError} When the book has no word for a unit.
 */
function encodeBook(
  text: string,
  book: Readonly<SplitBook>,
  settings: Readonly<BookSettings>,
): string {
  const units = plainUnits(text, settings.pick)
  const index = indexBook(book, settings.pick)
  const used = new Map<string, number>()
  return units
    .map((unit) => {
      const key = fold(unit)
      const candidates = index.get(key)
      if (candidates === undefined) {
        const what = settings.pick === 'word' ? 'word' : 'word starting with'
        throw new CipherError(`The book has no ${what} ${shownWord(unit)}`)
      }
      const count = used.get(key) ?? 0
      used.set(key, count + 1)
      return formatAddress(candidates[count % candidates.length]!, settings)
    })
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
  const label = `${noun[0]!.toUpperCase()}${noun.slice(1)}`
  throw new CipherError(
    `${label} ${shownNumber(number)} is out of range: ${where} has ${counted(items.length, noun)}, numbered from ${start}`,
  )
}

/**
 * The word one address points at.
 *
 * @param parts - The numbers of the address, as written.
 * @param book - The split book.
 * @param settings - Address form and first number.
 * @returns {BookWord} The word.
 * @throws {CipherError} When a number is out of range.
 */
function lookUp(
  parts: readonly string[],
  book: Readonly<SplitBook>,
  settings: Readonly<BookSettings>,
): BookWord {
  const { start } = settings
  if (settings.address === 'word') return nth(book.words, parts[0]!, start, 'word', 'the book')
  if (settings.address === 'line-word') {
    const line = nth(book.lines, parts[0]!, start, 'line', 'the book')
    return nth(line, parts[1]!, start, 'word', `line ${shownNumber(parts[0]!)}`)
  }
  const page = nth(book.pages, parts[0]!, start, 'page', 'the book')
  const line = nth(page, parts[1]!, start, 'line', `page ${shownNumber(parts[0]!)}`)
  return nth(
    line,
    parts[2]!,
    start,
    'word',
    `line ${shownNumber(parts[1]!)} of page ${shownNumber(parts[0]!)}`,
  )
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
  book: Readonly<SplitBook>,
  settings: Readonly<BookSettings>,
): string {
  const numbers = text.match(/\d+/g) ?? []
  const size = ADDRESS_PARTS[settings.address]
  if (numbers.length === 0) throw new CipherError('No numbers to look up in the book')
  if (numbers.length % size !== 0)
    throw new CipherError(
      `${settings.address} addresses take ${size} numbers each, and the text has ${numbers.length}`,
    )
  const found = Array.from({ length: numbers.length / size }, (_, i) =>
    lookUp(numbers.slice(i * size, i * size + size), book, settings),
  )
  return settings.pick === 'word'
    ? found.map((word) => word.text).join(' ')
    : found.map((word) => initial(word.text).toUpperCase()).join('')
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
        'Each word or letter as the place of a word in a text both sides have: its number, its line and word, or its page, line and word',
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
          description: 'word for the whole word, letter for its first letter',
        },
        {
          name: 'start',
          type: 'number',
          required: false,
          default: 1,
          description: 'Number of the first word, line and page: 1 or 0',
        },
      ],
      keyspace: 'every text both sides have',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const settings = validate(options ?? {})
      const book = readBook(options ?? {})
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
      const book = readBook(options ?? {})
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
