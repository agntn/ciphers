import { CipherError, InvalidOptionError, MissingOptionError } from './errors.ts'
import {
  MAX_ZERO_WIDTH_DIGITS,
  zeroWidthSchemes,
  zeroWidthUnits,
  type ZeroWidthScheme,
  type ZeroWidthSchemeName,
  type ZeroWidthUnit,
} from './zero-width-options.ts'

export {
  MAX_ZERO_WIDTH_DIGITS,
  zeroWidthSchemes,
  zeroWidthUnits,
  type ZeroWidthScheme,
  type ZeroWidthSchemeName,
  type ZeroWidthUnit,
}

/** Which scheme to read or write: one of `zeroWidthSchemes` by name, or your own. */
export interface ZeroWidthOptions {
  readonly scheme: ZeroWidthSchemeName | ZeroWidthScheme
}

/** What `hideZeroWidth` takes besides the scheme. */
export interface HideZeroWidthOptions extends ZeroWidthOptions {
  /** Visible text to carry the message, which goes in after its first character. */
  readonly cover?: string
}

/** One reading of `rankZeroWidth`. */
export interface ZeroWidthCandidate {
  /** The name in `zeroWidthSchemes`; absent for `binary` with its two symbols swapped. */
  readonly name?: ZeroWidthSchemeName
  readonly scheme: ZeroWidthScheme
  readonly text: string
}

/** The schemes that turn a text's invisible characters into something readable. */
export interface ZeroWidthRanking {
  /** Readings tried. */
  readonly tried: number
  /** Readings in printable ASCII first, then the rest, each in the order of `zeroWidthSchemes`. */
  readonly candidates: readonly ZeroWidthCandidate[]
}

/** Largest number of each unit. */
const UNIT_LIMITS: Readonly<Record<ZeroWidthUnit, number>> = {
  byte: 0xff,
  'code-unit': 0xffff,
  'code-point': 0x10ffff,
}

/** The hidden characters do not add up to a message under the scheme. */
export class ZeroWidthError extends CipherError {
  constructor(message: string) {
    super(message)
    this.name = 'ZeroWidthError'
  }
}

/**
 * Whether a value is a string of exactly one code point.
 *
 * @param value - Anything.
 * @returns {boolean} True for one character, an astral one included.
 */
function isCharacter(value: unknown): value is string {
  return typeof value === 'string' && Array.from(value).length === 1
}

/**
 * Symbols for an error line, as code points: most of them show nothing.
 *
 * @param value - Symbols or a separator as given.
 * @returns {unknown} `U+200B U+200C` for strings, anything else as it came.
 */
function shown(value: unknown): unknown {
  const parts: readonly unknown[] = Array.isArray(value) ? value : [value]
  if (!parts.every((part) => typeof part === 'string')) return value
  return Array.from(parts.join(''), (character) => {
    return `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`
  }).join(' ')
}

/**
 * Refuse symbols that cannot be told apart, or a separator that is one of them.
 *
 * @param symbols - The scheme's symbols.
 * @param separator - Its separator, when it has one.
 * @throws {InvalidOptionError} For fewer than two symbols, a repeated one or a bad separator.
 */
function assertSymbols(symbols: unknown, separator: unknown): asserts symbols is string[] {
  if (!Array.isArray(symbols) || symbols.length < 2 || !symbols.every(isCharacter)) {
    throw new InvalidOptionError('symbols', shown(symbols), 'must be two or more single characters')
  }
  if (new Set(symbols).size !== symbols.length) {
    throw new InvalidOptionError('symbols', shown(symbols), 'must not repeat a character')
  }
  if (separator !== undefined && (!isCharacter(separator) || symbols.includes(separator))) {
    throw new InvalidOptionError(
      'separator',
      shown(separator),
      'must be one character that is no symbol',
    )
  }
}

/**
 * Refuse a scheme that cannot be read back: symbols that cannot be told apart, an unknown unit, a
 * width out of range or missing where nothing parts the numbers.
 *
 * @param scheme - The scheme to check.
 * @throws {InvalidOptionError} For a bad field.
 * @throws {MissingOptionError} When it has neither `digits` nor `separator`.
 */
function assertScheme(scheme: Readonly<ZeroWidthScheme>): void {
  const { digits, separator, unit } = scheme
  assertSymbols(scheme.symbols, separator)
  if (!zeroWidthUnits.includes(unit)) {
    throw new InvalidOptionError('unit', unit, `must be ${zeroWidthUnits.join(', ')}`)
  }
  if (digits === undefined) {
    if (separator === undefined) throw new MissingOptionError('digits')
    return
  }
  if (!Number.isInteger(digits) || digits < 1 || digits > MAX_ZERO_WIDTH_DIGITS) {
    throw new InvalidOptionError(
      'digits',
      digits,
      `must be an integer from 1 to ${MAX_ZERO_WIDTH_DIGITS}`,
    )
  }
}

/**
 * The scheme an option names.
 *
 * @param options - Options with a `scheme`.
 * @returns {ZeroWidthScheme} The scheme, checked.
 * @throws {MissingOptionError} Without a scheme.
 * @throws {InvalidOptionError} For an unknown name or a scheme that cannot be read back.
 */
function resolveScheme(options: Readonly<ZeroWidthOptions> | undefined): ZeroWidthScheme {
  const scheme: unknown = options?.scheme
  if (scheme === undefined) throw new MissingOptionError('scheme')
  if (typeof scheme === 'string') {
    if (!Object.hasOwn(zeroWidthSchemes, scheme)) {
      throw new InvalidOptionError(
        'scheme',
        scheme,
        `must be ${Object.keys(zeroWidthSchemes).join(', ')} or a scheme of your own`,
      )
    }
    return zeroWidthSchemes[scheme as ZeroWidthSchemeName]
  }
  if (typeof scheme !== 'object' || scheme === null) {
    throw new InvalidOptionError('scheme', scheme, 'must be a scheme name or a scheme')
  }
  assertScheme(scheme as ZeroWidthScheme)
  return scheme as ZeroWidthScheme
}

/**
 * Refuse anything but a string.
 *
 * @param name - What the value is, for the error.
 * @param value - The value.
 * @throws {InvalidOptionError} When it is not a string.
 */
function assertString(name: string, value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new InvalidOptionError(name, value, 'must be a string')
}

/**
 * The numbers the symbols of a text spell, everything that is no symbol skipped.
 *
 * @param text - Text with hidden characters.
 * @param scheme - A checked scheme.
 * @returns {number[]} One number per group of digits.
 * @throws {ZeroWidthError} When digits are left over or a number is too large for its unit.
 */
function hiddenNumbers(text: string, scheme: Readonly<ZeroWidthScheme>): number[] {
  const { symbols, digits, separator } = scheme
  const limit = UNIT_LIMITS[scheme.unit]
  const digitOf = new Map(symbols.map((symbol, digit) => [symbol, digit]))
  const numbers: number[] = []
  let value = 0
  let count = 0
  const close = (): void => {
    if (count > 0) numbers.push(value)
    value = 0
    count = 0
  }
  for (const character of text) {
    if (character === separator) {
      close()
      continue
    }
    const digit = digitOf.get(character)
    if (digit === undefined) continue
    value = value * symbols.length + digit
    count += 1
    if (value > limit) {
      throw new ZeroWidthError(
        `Hidden number ${numbers.length + 1} is too large for one ${scheme.unit}; another scheme wrote this`,
      )
    }
    if (separator === undefined && count === digits) close()
  }
  if (separator === undefined && count > 0) {
    throw new ZeroWidthError(
      `${count} hidden characters are left over after ${numbers.length} groups of ${String(digits)}; another scheme wrote this, or part of the text is missing`,
    )
  }
  close()
  return numbers
}

/**
 * Turn numbers back into text.
 *
 * @param numbers - Bytes, code units or code points.
 * @param unit - Which of the three.
 * @returns {string} The text.
 * @throws {ZeroWidthError} When bytes are not UTF-8.
 */
function textOf(numbers: readonly number[], unit: ZeroWidthUnit): string {
  if (unit !== 'byte') {
    return numbers.map((number) => String.fromCodePoint(number)).join('')
  }
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      Uint8Array.from(numbers),
    )
  } catch {
    throw new ZeroWidthError('The hidden bytes are not UTF-8; another scheme wrote this')
  }
}

/**
 * Turn a message into the numbers a scheme hides.
 *
 * @param message - The text to hide.
 * @param unit - What one number stands for.
 * @returns {number[]} Bytes, code units or code points.
 * @throws {InvalidOptionError} When bytes are asked of a message with a lone surrogate.
 */
function numbersOf(message: string, unit: ZeroWidthUnit): number[] {
  if (unit === 'code-unit') {
    return message.split('').map((codeUnit) => codeUnit.codePointAt(0) ?? 0)
  }
  if (unit === 'code-point') {
    return Array.from(message, (character) => character.codePointAt(0) ?? 0)
  }
  if (!message.isWellFormed()) {
    throw new InvalidOptionError(
      'message',
      'a lone surrogate',
      'has no UTF-8 bytes; hide it with a code-unit scheme',
    )
  }
  return [...new TextEncoder().encode(message)]
}

/**
 * A number in a base of any size; `Number.prototype.toString` stops at 36.
 *
 * @param number - A whole number, zero or more.
 * @param base - Two or more.
 * @returns {number[]} Its digits, the most significant first, one `0` for zero.
 */
function digitsOf(number: number, base: number): number[] {
  const digits: number[] = []
  let rest = number
  do {
    digits.unshift(rest % base)
    rest = Math.floor(rest / base)
  } while (rest > 0)
  return digits
}

/**
 * Read the message a text hides in invisible characters. Only the scheme's symbols and separator
 * count; the visible text around them is skipped.
 *
 * @param text - Text that carries hidden characters.
 * @param options - The scheme they were written in.
 * @returns {string} The message, empty when the text has none of the symbols.
 * @throws {MissingOptionError} Without a scheme.
 * @throws {InvalidOptionError} For an unknown scheme name or a scheme that cannot be read back.
 * @throws {ZeroWidthError} When the hidden characters do not fit the scheme.
 */
export function readZeroWidth(text: string, options: Readonly<ZeroWidthOptions>): string {
  assertString('text', text)
  const scheme = resolveScheme(options)
  return textOf(hiddenNumbers(text, scheme), scheme.unit)
}

/**
 * Hide a message in invisible characters, on their own or inside a cover text.
 *
 * @param message - The text to hide.
 * @param options - The scheme, and the cover text when there is one.
 * @returns {string} The cover with the message after its first character, or the bare characters.
 * @throws {MissingOptionError} Without a scheme.
 * @throws {InvalidOptionError} For a bad scheme, a character the scheme's digits cannot hold or a
 * cover that already carries the scheme's symbols.
 */
export function hideZeroWidth(message: string, options: Readonly<HideZeroWidthOptions>): string {
  assertString('message', message)
  const scheme = resolveScheme(options)
  const { symbols, separator } = scheme
  const cover: unknown = options.cover ?? ''
  assertString('cover', cover)
  if ([...symbols, separator].some((symbol) => symbol !== undefined && cover.includes(symbol))) {
    throw new InvalidOptionError(
      'cover',
      'the cover text',
      'already carries characters of the scheme, which would read as part of the message',
    )
  }
  const width = scheme.digits ?? 1
  const hidden = numbersOf(message, scheme.unit)
    .map((number) => {
      const digits = digitsOf(number, symbols.length)
      if (separator === undefined && digits.length > width) {
        throw new InvalidOptionError(
          'message',
          `U+${number.toString(16).toUpperCase().padStart(4, '0')}`,
          `does not fit ${width} digits of base ${symbols.length}`,
        )
      }
      const padding = (symbols[0] ?? '').repeat(Math.max(0, width - digits.length))
      return padding + digits.map((digit) => symbols[digit]).join('')
    })
    .join(separator ?? '')
  const [first] = new Intl.Segmenter().segment(cover)
  const head = first?.segment ?? ''
  return head + hidden + cover.slice(head.length)
}

/**
 * Whether a reading is text someone would hide: letters, digits, punctuation and spaces.
 *
 * @param text - A reading.
 * @returns {boolean} False for an empty one and for one with controls or unassigned code points.
 */
function readsAsText(text: string): boolean {
  return /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}\t\n\r]+$/u.test(text)
}

/**
 * Try every scheme of `zeroWidthSchemes`, and `binary` with 0 and 1 swapped, and keep the readings
 * that come out as text. Printable ASCII goes first.
 *
 * @param text - Text that may carry hidden characters.
 * @returns {ZeroWidthRanking} The readings that fit, likeliest first.
 * @throws {InvalidOptionError} When `text` is not a string.
 */
export function rankZeroWidth(text: string): ZeroWidthRanking {
  assertString('text', text)
  const { binary } = zeroWidthSchemes
  const swapped: ZeroWidthScheme = { ...binary, symbols: binary.symbols.toReversed() }
  const attempts: ReadonlyArray<Omit<ZeroWidthCandidate, 'text'>> = [
    ...Object.entries(zeroWidthSchemes).map(([name, scheme]) => ({
      name: name as ZeroWidthSchemeName,
      scheme,
    })),
    { scheme: swapped },
  ]
  const candidates: ZeroWidthCandidate[] = []
  for (const attempt of attempts) {
    try {
      const reading = textOf(hiddenNumbers(text, attempt.scheme), attempt.scheme.unit)
      if (readsAsText(reading)) candidates.push({ ...attempt, text: reading })
    } catch (error) {
      if (!(error instanceof ZeroWidthError)) throw error
    }
  }
  const plain = (candidate: Readonly<ZeroWidthCandidate>): number =>
    /^[\t\n\r\x20-\x7E]+$/.test(candidate.text) ? 0 : 1
  candidates.sort((left, right) => plain(left) - plain(right))
  return { tried: attempts.length, candidates }
}
