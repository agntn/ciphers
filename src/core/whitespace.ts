import { CipherError, InvalidOptionError, MissingOptionError } from './errors.ts'
import {
  DEFAULT_BITS_PER_LINE,
  MAX_BITS_PER_LINE,
  MAX_SENTENCE_BOUNDARIES,
  SENTENCE_BOUNDARIES,
  whitespaceChannels,
  whitespaceOrders,
  whitespaceSymbols,
  whitespaceUnmapped,
  type WhitespaceChannel,
  type WhitespaceOrder,
  type WhitespaceSymbol,
  type WhitespaceUnmapped,
} from './whitespace-options.ts'
import {
  MAX_ZERO_WIDTH_DIGITS,
  ZeroWidthError,
  hideZeroWidth,
  readZeroWidth,
  zeroWidthUnits,
  type ZeroWidthUnit,
} from './zero-width.ts'

export {
  DEFAULT_BITS_PER_LINE,
  MAX_BITS_PER_LINE,
  MAX_SENTENCE_BOUNDARIES,
  SENTENCE_BOUNDARIES,
  whitespaceChannels,
  whitespaceOrders,
  whitespaceSymbols,
  whitespaceUnmapped,
  type WhitespaceChannel,
  type WhitespaceOrder,
  type WhitespaceSymbol,
  type WhitespaceUnmapped,
}

/** One line ending, one trailing run or one gap, with where it sits. */
export interface WhitespaceOccurrence {
  readonly channel: WhitespaceChannel
  /** A name from `whitespaceSymbols`; a trailing run of spaces and tabs together is `mixed`. */
  readonly class: WhitespaceSymbol
  /** UTF-16 offset of its first character, so `text.slice(start, end)` is `raw`. */
  readonly start: number
  /** UTF-16 offset past its last character. */
  readonly end: number
  /** Line it sits on, 1 the first. Only LF, CRLF and a lone CR end a line. */
  readonly line: number
  /** Place in that line counted in UTF-16 code units, 1 the first. */
  readonly column: number
  /** The characters themselves. */
  readonly raw: string
  /** How many characters `raw` has. */
  readonly count: number
}

/** What one channel holds. */
export interface WhitespaceChannelReport {
  readonly channel: WhitespaceChannel
  /** Occurrences per class, classes that never show up left out. */
  readonly counts: Readonly<Partial<Record<WhitespaceSymbol, number>>>
  /** Every occurrence, in text order. */
  readonly occurrences: readonly WhitespaceOccurrence[]
}

/** What `inspectWhitespace` found in one text. */
export interface WhitespaceReport {
  /** Lines of the text; nothing after the last line ending is no line. */
  readonly lines: number
  /** One report per channel asked for, in the order of `whitespaceChannels`. */
  readonly channels: readonly WhitespaceChannelReport[]
}

/** Which channels `inspectWhitespace` lists. */
export interface InspectWhitespaceOptions {
  /** Default: all of `whitespaceChannels`. */
  readonly channels?: readonly WhitespaceChannel[]
  /** Characters a gap follows to count as a sentence gap. Default: `.!?`. */
  readonly boundaries?: string
}

/** Which class stands for which bit. Every class named must belong to the channel. */
export interface WhitespaceMapping {
  /** Classes read as 0. */
  readonly zero: readonly WhitespaceSymbol[]
  /** Classes read as 1. */
  readonly one: readonly WhitespaceSymbol[]
}

/** How bits become numbers, the same on the way in and out. */
export interface WhitespaceFraming {
  /** Bits per number. Default: 8. */
  readonly digits?: number
  /** Which bit of a number comes first in the text. Default: `msb`. */
  readonly order?: WhitespaceOrder
  /** What one number is. Default: `byte`, for UTF-8. */
  readonly unit?: ZeroWidthUnit
}

/** What `readWhitespace` takes. */
export interface ReadWhitespaceOptions extends WhitespaceMapping, WhitespaceFraming {
  readonly channel: WhitespaceChannel
  /** What to do with a place the mapping gives no bit. Default: `refuse`. */
  readonly unmapped?: WhitespaceUnmapped
  /** Bits to pass over before the first number. Default: 0. */
  readonly offset?: number
  /** For the `sentence` channel: characters a gap follows. Default: `.!?`. */
  readonly boundaries?: string
}

/** The bits one channel spells under a mapping, and what they decode to. */
export interface WhitespaceReading {
  readonly channel: WhitespaceChannel
  /** One bit per mapped place, in text order, before `offset` applies. */
  readonly bits: string
  /** Places the mapping gave no bit, left out under `unmapped: 'skip'`. */
  readonly skipped: readonly WhitespaceOccurrence[]
  /** Whole numbers the bits past `offset` make. */
  readonly groups: number
  /** Bits left after the last whole number, empty when it comes out even. */
  readonly partial: string
  /** The whole numbers as text. Absent when they are no text in the unit. */
  readonly text?: string
  /** Why there is no `text`. */
  readonly problem?: string
}

/** What `hideWhitespace` takes. */
export interface HideWhitespaceOptions extends WhitespaceMapping, WhitespaceFraming {
  /** Text whose line ends carry the message. No line of it may end in a space or a tab. */
  readonly cover: string
  /** The channel written to. Only `trailing` so far, which is also the default. */
  readonly channel?: 'trailing'
  /** Bits put on one line. Default: 8. */
  readonly perLine?: number
}

/** The places of a channel do not fit the mapping. */
export class WhitespaceError extends CipherError {
  constructor(message: string) {
    super(message)
    this.name = 'WhitespaceError'
  }
}

type Bit = '0' | '1'

type BitMapping = Readonly<Partial<Record<WhitespaceSymbol, Bit>>>

/** One line of a text, cut where only CR and LF cut. */
interface Line {
  readonly number: number
  /** UTF-16 offset of its first character. */
  readonly start: number
  readonly content: string
  /** `\n`, `\r\n` or `\r`, empty on a last line nothing ends. */
  readonly ending: string
}

/** Where a run sits, everything of an occurrence but its channel and class. */
type Place = Omit<WhitespaceOccurrence, 'channel' | 'class'>

const ENDING_CLASSES: Readonly<Record<string, WhitespaceSymbol>> = {
  '\n': 'lf',
  '\r\n': 'crlf',
  '\r': 'cr',
}

const SPACE_GAPS = ['single', 'double', 'wide'] as const

const TRAILING_SYMBOLS: Readonly<Record<string, WhitespaceSymbol>> = { ' ': 'space', '\t': 'tab' }

/**
 * Refuse anything but a string, which a typed caller never passes and a JavaScript one can.
 *
 * @param name - What the value is, for the error.
 * @param value - The value.
 * @throws {InvalidOptionError} When it is not a string.
 */
function assertString(name: string, value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new InvalidOptionError(name, value, 'must be a string')
}

/**
 * The lines of a text with their endings kept.
 *
 * @param text - Any text.
 * @returns {Line[]} Every line in order; an empty tail after the last ending is no line.
 */
function linesOf(text: string): Line[] {
  const lines: Line[] = []
  let start = 0
  for (const match of text.matchAll(/\r\n|\r|\n/g)) {
    const content = text.slice(start, match.index)
    lines.push({ number: lines.length + 1, start, content, ending: match[0] })
    start = match.index + match[0].length
  }
  if (start < text.length) {
    lines.push({ number: lines.length + 1, start, content: text.slice(start), ending: '' })
  }
  return lines
}

/**
 * What a run at the end of a line holds.
 *
 * @param raw - Spaces and tabs.
 * @returns {WhitespaceSymbol} `space`, `tab` or `mixed`.
 */
function trailingClass(raw: string): WhitespaceSymbol {
  if (!raw.includes('\t')) return 'space'
  return raw.includes(' ') ? 'mixed' : 'tab'
}

/**
 * What a gap between two visible characters is.
 *
 * @param raw - Spaces and tabs.
 * @returns {WhitespaceSymbol} `single`, `double` or `wide` for spaces, `tab` or `mixed` otherwise.
 */
function gapClass(raw: string): WhitespaceSymbol {
  if (raw.includes('\t')) return raw.includes(' ') ? 'mixed' : 'tab'
  return SPACE_GAPS[Math.min(raw.length, SPACE_GAPS.length) - 1] ?? 'wide'
}

/**
 * The character right before a place in a line, a whole one even past the BMP.
 *
 * @param content - The line.
 * @param index - UTF-16 offset in it, above 0.
 * @returns {string} One code point.
 */
function characterBefore(content: string, index: number): string {
  return Array.from(content.slice(Math.max(0, index - 2), index)).at(-1) ?? ''
}

/**
 * What one run of spaces and tabs is: trailing, a gap, a sentence gap too, or indentation.
 *
 * @param line - The line it is on.
 * @param index - UTF-16 offset of the run in the line.
 * @param boundaries - Characters a sentence gap follows.
 * @param place - Where the run sits in the text.
 * @returns {WhitespaceOccurrence[]} None, one or two occurrences.
 */
function runOccurrences(
  line: Readonly<Line>,
  index: number,
  boundaries: readonly string[],
  place: Readonly<Place>,
): WhitespaceOccurrence[] {
  if (index + place.count === line.content.length) {
    return [{ channel: 'trailing', class: trailingClass(place.raw), ...place }]
  }
  if (index === 0) return []
  const gap = { class: gapClass(place.raw), ...place }
  const interior: WhitespaceOccurrence = { channel: 'interior', ...gap }
  if (!boundaries.includes(characterBefore(line.content, index))) return [interior]
  return [interior, { channel: 'sentence', ...gap }]
}

/**
 * Everything one line holds, in the order it sits there.
 *
 * @param line - The line.
 * @param boundaries - Characters a sentence gap follows.
 * @returns {WhitespaceOccurrence[]} Its runs, then its ending.
 */
function lineOccurrences(
  line: Readonly<Line>,
  boundaries: readonly string[],
): WhitespaceOccurrence[] {
  const found = Array.from(line.content.matchAll(/[ \t]+/g)).flatMap((match) => {
    const [raw] = match
    const start = line.start + match.index
    return runOccurrences(line, match.index, boundaries, {
      start,
      end: start + raw.length,
      line: line.number,
      column: match.index + 1,
      raw,
      count: raw.length,
    })
  })
  const ending = ENDING_CLASSES[line.ending]
  if (ending === undefined) return found
  const start = line.start + line.content.length
  found.push({
    channel: 'line-ending',
    class: ending,
    start,
    end: start + line.ending.length,
    line: line.number,
    column: line.content.length + 1,
    raw: line.ending,
    count: line.ending.length,
  })
  return found
}

/**
 * The characters a sentence gap follows.
 *
 * @param boundaries - The option as given.
 * @returns {string[]} One entry per code point, `.!?` without the option.
 * @throws {InvalidOptionError} When it is empty, too long or no string.
 */
function boundaryList(boundaries: unknown): string[] {
  if (boundaries === undefined) return Array.from(SENTENCE_BOUNDARIES)
  assertString('boundaries', boundaries)
  const characters = new Set(boundaries)
  if (characters.size === 0 || characters.size > MAX_SENTENCE_BOUNDARIES) {
    throw new InvalidOptionError(
      'boundaries',
      boundaries,
      `must be 1 to ${MAX_SENTENCE_BOUNDARIES} characters, such as ${SENTENCE_BOUNDARIES}`,
    )
  }
  return Array.from(characters)
}

/**
 * Refuse a channel name the library does not have.
 *
 * @param name - The option it came in, for the error.
 * @param channel - The value given.
 * @throws {InvalidOptionError} When it is none of `whitespaceChannels`.
 */
function assertChannel(name: string, channel: unknown): asserts channel is WhitespaceChannel {
  if (!whitespaceChannels.includes(channel as WhitespaceChannel)) {
    throw new InvalidOptionError(name, channel, `must be ${whitespaceChannels.join(', ')}`)
  }
}

/**
 * The channels to list.
 *
 * @param channels - The option as given.
 * @returns {WhitespaceChannel[]} The ones asked for, in the order of `whitespaceChannels`.
 * @throws {InvalidOptionError} When it is no list of channel names.
 */
function selectedChannels(channels: unknown): WhitespaceChannel[] {
  if (channels === undefined) return [...whitespaceChannels]
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new InvalidOptionError(
      'channels',
      channels,
      `must list one or more of ${whitespaceChannels.join(', ')}`,
    )
  }
  for (const channel of channels) assertChannel('channels', channel)
  return whitespaceChannels.filter((channel) => channels.includes(channel))
}

/**
 * One channel's share of what a text holds.
 *
 * @param channel - The channel.
 * @param found - Occurrences of every channel, in text order.
 * @returns {WhitespaceChannelReport} Its occurrences and how many there are of each class.
 */
function channelReport(
  channel: WhitespaceChannel,
  found: readonly WhitespaceOccurrence[],
): WhitespaceChannelReport {
  const occurrences = found.filter((occurrence) => occurrence.channel === channel)
  const counts: Partial<Record<WhitespaceSymbol, number>> = {}
  for (const occurrence of occurrences) {
    counts[occurrence.class] = (counts[occurrence.class] ?? 0) + 1
  }
  return { channel, counts, occurrences }
}

/**
 * List the line endings, trailing runs and gaps of a text. It observes, nothing more.
 *
 * @param text - Text to look at, exactly as it came.
 * @param options - Which channels to list, and what ends a sentence.
 * @returns {WhitespaceReport} One report per channel.
 * @throws {InvalidOptionError} When `text` is no string or an option is malformed.
 */
export function inspectWhitespace(
  text: string,
  options: Readonly<InspectWhitespaceOptions> = {},
): WhitespaceReport {
  assertString('text', text)
  const channels = selectedChannels(options.channels)
  const boundaries = boundaryList(options.boundaries)
  const lines = linesOf(text)
  const found = lines.flatMap((line) => lineOccurrences(line, boundaries))
  return { lines: lines.length, channels: channels.map((channel) => channelReport(channel, found)) }
}

/**
 * Put the classes of one side of a mapping under their bit.
 *
 * @param name - `zero` or `one`.
 * @param listed - The classes as given.
 * @param channel - The channel they must belong to.
 * @param taken - Classes mapped so far.
 * @returns {BitMapping} `taken` with these classes added.
 * @throws {MissingOptionError} Without the list.
 * @throws {InvalidOptionError} For an empty list, a class of another channel or one mapped twice.
 */
function withSide(
  name: 'zero' | 'one',
  listed: unknown,
  channel: WhitespaceChannel,
  taken: BitMapping,
): BitMapping {
  const known: readonly string[] = whitespaceSymbols[channel]
  const choices = known.join(', ')
  if (listed === undefined) {
    throw new MissingOptionError(name, `The ${channel} channel has ${choices}`)
  }
  if (!Array.isArray(listed) || listed.length === 0) {
    throw new InvalidOptionError(name, listed, `must list one or more of ${choices}`)
  }
  const mapping: Partial<Record<WhitespaceSymbol, Bit>> = { ...taken }
  for (const symbol of listed as readonly unknown[]) {
    if (typeof symbol !== 'string' || !known.includes(symbol)) {
      throw new InvalidOptionError(name, symbol, `is no class of ${channel}, which has ${choices}`)
    }
    if (Object.hasOwn(mapping, symbol)) {
      throw new InvalidOptionError(name, symbol, 'is mapped already; one class stands for one bit')
    }
    mapping[symbol as WhitespaceSymbol] = name === 'zero' ? '0' : '1'
  }
  return mapping
}

/**
 * The bit of each class, checked against the channel.
 *
 * @param channel - A checked channel.
 * @param mapping - `zero` and `one` as given.
 * @returns {BitMapping} Each mapped class with its bit.
 * @throws {MissingOptionError} Without `zero` or `one`.
 * @throws {InvalidOptionError} For a mapping that cannot be read back.
 */
function bitMapping(
  channel: WhitespaceChannel,
  mapping: Readonly<Partial<WhitespaceMapping>>,
): BitMapping {
  return withSide('one', mapping.one, channel, withSide('zero', mapping.zero, channel, {}))
}

/** Checked `digits`, `order` and `unit`. */
type Framing = Required<WhitespaceFraming>

/**
 * Refuse a count outside its range.
 *
 * @param name - The option, for the error.
 * @param value - The value given.
 * @param range - Smallest and largest whole number allowed.
 * @throws {InvalidOptionError} When it is no whole number in the range.
 */
function assertCount(
  name: string,
  value: unknown,
  range: readonly [min: number, max: number],
): asserts value is number {
  const [min, max] = range
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new InvalidOptionError(name, value, `must be an integer from ${min} to ${max}`)
  }
}

/**
 * Fill in and check how bits group into numbers.
 *
 * @param options - `digits`, `order` and `unit` as given.
 * @returns {Framing} All three, defaults filled in.
 * @throws {InvalidOptionError} For a width out of range, an unknown order or an unknown unit.
 */
function framingOf(options: Readonly<WhitespaceFraming>): Framing {
  const { digits = 8, order = 'msb', unit = 'byte' } = options
  assertCount('digits', digits, [1, MAX_ZERO_WIDTH_DIGITS])
  if (!whitespaceOrders.includes(order)) {
    throw new InvalidOptionError('order', order, `must be ${whitespaceOrders.join(', ')}`)
  }
  if (!zeroWidthUnits.includes(unit)) {
    throw new InvalidOptionError('unit', unit, `must be ${zeroWidthUnits.join(', ')}`)
  }
  return { digits, order, unit }
}

/**
 * Turn every group of bits around, for numbers written least significant bit first.
 *
 * @param bits - Whole groups.
 * @param framing - The width, and the order the bits are in.
 * @returns {string} The same groups, most significant bit first.
 */
function mostSignificantFirst(bits: string, framing: Readonly<Framing>): string {
  if (framing.order === 'msb') return bits
  const groups = bits.match(new RegExp(`.{${framing.digits}}`, 'g')) ?? []
  return groups.map((group) => Array.from(group).toReversed().join('')).join('')
}

/** The numeric reading of zero-width, fed `0` and `1` in place of invisible characters. */
const BIT_SYMBOLS = ['0', '1'] as const

/**
 * What a bit stream decodes to.
 *
 * @param stream - Bits past the offset.
 * @param framing - How they group.
 * @returns {Pick<WhitespaceReading, 'groups' | 'partial' | 'text' | 'problem'>} The whole numbers
 * as text or the reason they are none, and the bits left over.
 */
function decoded(
  stream: string,
  framing: Readonly<Framing>,
): Pick<WhitespaceReading, 'groups' | 'partial' | 'text' | 'problem'> {
  const { digits, unit } = framing
  const groups = Math.floor(stream.length / digits)
  const whole = stream.slice(0, groups * digits)
  const partial = stream.slice(groups * digits)
  try {
    const scheme = { symbols: BIT_SYMBOLS, digits, unit }
    const text = readZeroWidth(mostSignificantFirst(whole, framing), { scheme })
    return { groups, partial, text }
  } catch (error) {
    if (!(error instanceof ZeroWidthError)) throw error
    const [problem = error.message] = error.message.split(';')
    return { groups, partial, problem }
  }
}

/**
 * The classes one occurrence is read as: each character of a trailing run, the class otherwise.
 *
 * @param occurrence - An occurrence.
 * @returns {WhitespaceSymbol[]} One class per place it holds.
 */
function symbolsOf(occurrence: Readonly<WhitespaceOccurrence>): WhitespaceSymbol[] {
  if (occurrence.channel !== 'trailing') return [occurrence.class]
  return Array.from(occurrence.raw, (character) => TRAILING_SYMBOLS[character] ?? 'space')
}

/**
 * Why a reading stops at places the mapping gives no bit.
 *
 * @param channel - The channel read.
 * @param skipped - Those places, one or more.
 * @returns {WhitespaceError} The error, naming the classes and the first place.
 */
function unmappedError(
  channel: WhitespaceChannel,
  skipped: readonly WhitespaceOccurrence[],
): WhitespaceError {
  const classes = Array.from(new Set(skipped.map((occurrence) => occurrence.class))).join(', ')
  const [first] = skipped
  const where =
    first === undefined ? '' : ` The first is at line ${first.line}, column ${first.column}.`
  return new WhitespaceError(
    `${skipped.length} ${channel} ${skipped.length === 1 ? 'place has' : 'places have'} no bit in the mapping: ${classes}.${where} Map every class in zero or one, or set unmapped to skip to leave them out`,
  )
}

/** Everything `readWhitespace` needs settled before it looks at the text. */
interface ReadingPlan {
  readonly channel: WhitespaceChannel
  readonly mapping: BitMapping
  readonly framing: Framing
  readonly refuse: boolean
  readonly offset: number
}

/**
 * Check the options of a reading and fill in the defaults.
 *
 * @param options - The options as given.
 * @returns {ReadingPlan} The channel, the mapping and how bits group.
 * @throws {MissingOptionError} Without `channel`, `zero` or `one`.
 * @throws {InvalidOptionError} For a malformed option or a mapping that cannot be read back.
 */
function readingPlan(options: Readonly<Partial<ReadWhitespaceOptions>>): ReadingPlan {
  const { channel, unmapped = 'refuse', offset = 0 } = options
  if (channel === undefined) throw new MissingOptionError('channel')
  assertChannel('channel', channel)
  const mapping = bitMapping(channel, options)
  const framing = framingOf(options)
  if (!whitespaceUnmapped.includes(unmapped)) {
    throw new InvalidOptionError('unmapped', unmapped, `must be ${whitespaceUnmapped.join(', ')}`)
  }
  assertCount('offset', offset, [0, Number.MAX_SAFE_INTEGER])
  return { channel, mapping, framing, refuse: unmapped === 'refuse', offset }
}

/**
 * The bits a channel's occurrences spell, and the occurrences that spell none.
 *
 * @param occurrences - One channel, in text order.
 * @param mapping - The bit of each mapped class.
 * @returns {Pick<WhitespaceReading, 'bits' | 'skipped'>} Bits of the mapped places, and the
 * occurrences with a class the mapping leaves out.
 */
function bitsAndSkipped(
  occurrences: readonly WhitespaceOccurrence[],
  mapping: BitMapping,
): Pick<WhitespaceReading, 'bits' | 'skipped'> {
  const bits: string[] = []
  const skipped: WhitespaceOccurrence[] = []
  for (const occurrence of occurrences) {
    const read = symbolsOf(occurrence).map((symbol) => mapping[symbol])
    if (read.includes(undefined)) skipped.push(occurrence)
    else bits.push(read.join(''))
  }
  return { bits: bits.join(''), skipped }
}

/**
 * Read one whitespace channel as bits under the caller's mapping, leftover bits included.
 *
 * @param text - Text to read, exactly as it came.
 * @param options - The channel, the mapping and how bits group.
 * @returns {WhitespaceReading} The bits, what they decode to and what was left over.
 * @throws {MissingOptionError} Without `channel`, `zero` or `one`.
 * @throws {InvalidOptionError} For a malformed option or a mapping that cannot be read back.
 * @throws {WhitespaceError} When a place has no bit and `unmapped` is not `skip`.
 */
export function readWhitespace(
  text: string,
  options: Readonly<ReadWhitespaceOptions>,
): WhitespaceReading {
  assertString('text', text)
  const given: Readonly<Partial<ReadWhitespaceOptions>> = (options as unknown) ?? {}
  const { channel, mapping, framing, refuse, offset } = readingPlan(given)
  const { boundaries } = given
  const [report] = inspectWhitespace(text, {
    channels: [channel],
    ...(boundaries === undefined ? {} : { boundaries }),
  }).channels
  const { bits, skipped } = bitsAndSkipped(report?.occurrences ?? [], mapping)
  if (skipped.length > 0 && refuse) throw unmappedError(channel, skipped)
  return { channel, bits, skipped, ...decoded(bits.slice(offset), framing) }
}

/**
 * The bits of a message, grouped the way `readWhitespace` reads them back.
 *
 * @param message - The text to hide.
 * @param framing - How its numbers become bits.
 * @returns {string} `0` and `1`, whole groups only.
 * @throws {InvalidOptionError} When a character does not fit the width.
 */
function bitsOf(message: string, framing: Readonly<Framing>): string {
  const scheme = { symbols: BIT_SYMBOLS, digits: framing.digits, unit: framing.unit }
  return mostSignificantFirst(hideZeroWidth(message, { scheme }), framing)
}

/**
 * Refuse a cover that cannot carry the bits, or that would add bits of its own.
 *
 * @param lines - The cover's lines.
 * @param needed - Bits to place.
 * @param perLine - Bits one line takes.
 * @throws {InvalidOptionError} When a line ends in a space or tab, or the lines run out.
 */
function assertCover(lines: readonly Line[], needed: number, perLine: number): void {
  const taken = lines.find((line) => /[ \t]$/.test(line.content))
  if (taken !== undefined) {
    throw new InvalidOptionError(
      'cover',
      'the cover text',
      `ends line ${taken.number} in a space or a tab, which would read as part of the message`,
    )
  }
  const capacity = lines.length * perLine
  if (needed > capacity) {
    throw new InvalidOptionError(
      'cover',
      'the cover text',
      `has room for ${capacity} bits, ${perLine} on each of ${lines.length} lines, and the message takes ${needed}; pass more lines or put more bits on a line`,
    )
  }
}

/**
 * Hide a message at the line ends of a cover text, one space or tab per bit.
 *
 * @param message - The text to hide.
 * @param options - The cover, the mapping and how bits group.
 * @returns {string} The cover with the message after its lines, the first ones first.
 * @throws {MissingOptionError} Without `cover`, `zero` or `one`.
 * @throws {InvalidOptionError} For a malformed option, a channel that cannot be written, a
 * character that does not fit the width or a cover that is too short or carries trailing runs.
 */
export function hideWhitespace(message: string, options: Readonly<HideWhitespaceOptions>): string {
  assertString('message', message)
  const given: Readonly<Partial<HideWhitespaceOptions>> = (options as unknown) ?? {}
  const {
    cover,
    channel = 'trailing',
    perLine = DEFAULT_BITS_PER_LINE,
  }: Partial<HideWhitespaceOptions> = given
  if (cover === undefined) throw new MissingOptionError('cover')
  assertString('cover', cover)
  if (channel !== 'trailing') {
    throw new InvalidOptionError('channel', channel, 'cannot be written; only trailing can')
  }
  const mapping = bitMapping(channel, given)
  const framing = framingOf(given)
  assertCount('perLine', perLine, [1, MAX_BITS_PER_LINE])
  const characters = mapping.space === '0' ? ' \t' : '\t '
  const bits = Array.from(bitsOf(message, framing), (bit) => characters[Number(bit)] ?? '')
  const lines = linesOf(cover)
  assertCover(lines, bits.length, perLine)
  return lines
    .map((line, index) => {
      const run = bits.slice(index * perLine, (index + 1) * perLine).join('')
      return line.content + run + line.ending
    })
    .join('')
}
