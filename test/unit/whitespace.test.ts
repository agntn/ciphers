import { describe, expect, it } from 'vite-plus/test'
import { inspectCharacters } from '../../src/core/characters.ts'
import { InvalidOptionError, MissingOptionError } from '../../src/core/errors.ts'
import {
  WhitespaceError,
  hideWhitespace,
  inspectWhitespace,
  readWhitespace,
  type WhitespaceChannel,
  type WhitespaceOccurrence,
} from '../../src/core/whitespace.ts'
import { readZeroWidth } from '../../src/core/zero-width.ts'

/* One channel of a text as [class, start, end, line, column] rows. */
function rows(text: string, channel: WhitespaceChannel): unknown[][] {
  const [report] = inspectWhitespace(text, { channels: [channel] }).channels
  return (report?.occurrences ?? []).map((found) => {
    return [found.class, found.start, found.end, found.line, found.column]
  })
}

/* Every occurrence of every channel. */
function everything(text: string): WhitespaceOccurrence[] {
  return inspectWhitespace(text).channels.flatMap((report) => report.occurrences)
}

const SPACE_ZERO = { zero: ['space'], one: ['tab'] } as const
const TAB_ZERO = { zero: ['tab'], one: ['space'] } as const

/* "Hi" is 0x48 0x69. */
const HI_BITS = '0100100001101001'
const COVER = 'one\r\ntwo\nthree\rfour\n'

describe('inspectWhitespace', () => {
  it('tells a double space after a sentence from a single one', () => {
    expect(rows('One.  Two.', 'interior')).toEqual([['double', 4, 6, 1, 5]])
    expect(rows('One.  Two.', 'sentence')).toEqual([['double', 4, 6, 1, 5]])
    expect(rows('One. Two', 'sentence')).toEqual([['single', 4, 5, 1, 5]])
    expect(rows('One two.', 'sentence')).toEqual([])
    expect(rows('One.  Two.', 'trailing')).toEqual([])
    expect(rows('One.  Two.', 'line-ending')).toEqual([])
  })

  it('finds trailing spaces and a trailing tab', () => {
    expect(rows('line   \nnext', 'trailing')).toEqual([['space', 4, 7, 1, 5]])
    expect(rows('line\t\nnext', 'trailing')).toEqual([['tab', 4, 5, 1, 5]])
    expect(rows('line \t\nnext', 'trailing')).toEqual([['mixed', 4, 6, 1, 5]])
    expect(rows('line   \nnext', 'line-ending')).toEqual([['lf', 7, 8, 1, 8]])
  })

  it('keeps a tab and each kind of gap inside a line apart', () => {
    expect(rows('a\tb', 'interior')).toEqual([['tab', 1, 2, 1, 2]])
    expect(rows('a b  c   d\t\te \tf', 'interior')).toEqual([
      ['single', 1, 2, 1, 2],
      ['double', 3, 5, 1, 4],
      ['wide', 6, 9, 1, 7],
      ['tab', 10, 12, 1, 11],
      ['mixed', 13, 15, 1, 14],
    ])
  })

  it('names LF, CRLF and a lone CR, and reads a last line nothing ends', () => {
    expect(rows('a\r\nb', 'line-ending')).toEqual([['crlf', 1, 3, 1, 2]])
    const mixed = 'one \r\ntwo\n\rfour\t'
    expect(rows(mixed, 'line-ending')).toEqual([
      ['crlf', 4, 6, 1, 5],
      ['lf', 9, 10, 2, 4],
      ['cr', 10, 11, 3, 1],
    ])
    expect(rows(mixed, 'trailing')).toEqual([
      ['space', 3, 4, 1, 4],
      ['tab', 15, 16, 4, 5],
    ])
    expect(inspectWhitespace(mixed).lines).toBe(4)
    expect(inspectWhitespace('a\n').lines).toBe(1)
    expect(inspectWhitespace('').lines).toBe(0)
  })

  it('gives offsets that slice the text, an emoji before them or not', () => {
    const text = '\u{1F600} a  b.  c \r\n\t x\u{1F600}\ty  \n   \nend\t'
    const found = everything(text)
    expect(found.length).toBeGreaterThan(8)
    for (const occurrence of found) {
      expect(text.slice(occurrence.start, occurrence.end)).toBe(occurrence.raw)
      expect(occurrence.count).toBe(occurrence.raw.length)
    }
    expect(rows('\u{1F600} a  b', 'interior')).toEqual([
      ['single', 2, 3, 1, 3],
      ['double', 4, 6, 1, 5],
    ])
  })

  it('leaves indentation alone and takes a blank line of spaces as trailing', () => {
    expect(everything('  a')).toEqual([])
    expect(rows('a\n   \nb', 'trailing')).toEqual([['space', 2, 5, 2, 1]])
    expect(rows('a\n   \nb', 'interior')).toEqual([])
  })

  it('counts each class and lists the channels asked for in a fixed order', () => {
    const report = inspectWhitespace('a b  c\r\nd e\nf', { channels: ['interior', 'line-ending'] })
    expect(report.channels.map(({ channel, counts }) => [channel, counts])).toEqual([
      ['line-ending', { crlf: 1, lf: 1 }],
      ['interior', { single: 2, double: 1 }],
    ])
  })

  it('takes the sentence ends it is told, astral ones too', () => {
    expect(rows('Wait;  what', 'sentence')).toEqual([])
    expect(inspectWhitespace('Wait;  what', { boundaries: ';' }).channels[3]?.counts).toEqual({
      double: 1,
    })
    const flag = '\u{1F6A9}'
    expect(
      inspectWhitespace(`a${flag}  b`, { boundaries: flag }).channels[3]?.occurrences,
    ).toHaveLength(1)
  })

  it('leaves other spaces to inspectCharacters, which leaves these alone', () => {
    for (const plain of ['One.  Two.', 'line   \nnext', 'line\t\nnext', 'a\tb', 'a\r\nb']) {
      expect(inspectCharacters(plain).characters).toEqual([])
    }
    expect(everything('a b​c d')).toEqual([])
    expect(inspectCharacters('a b​c').characters.map(({ codePoint }) => codePoint)).toEqual([
      0xa0, 0x200b,
    ])
  })

  it('refuses what is no text, no channel and no boundary', () => {
    expect(() => inspectWhitespace(7 as never)).toThrow(InvalidOptionError)
    expect(() => inspectWhitespace('a', { channels: ['margin'] as never })).toThrow(
      'Invalid option channels=margin: must be line-ending, trailing, interior, sentence',
    )
    expect(() => inspectWhitespace('a', { channels: [] })).toThrow(InvalidOptionError)
    expect(() => inspectWhitespace('a', { channels: 'trailing' as never })).toThrow(
      InvalidOptionError,
    )
    expect(() => inspectWhitespace('a', { boundaries: '' })).toThrow(InvalidOptionError)
    expect(() => inspectWhitespace('a', { boundaries: 'x'.repeat(33) })).not.toThrow()
    expect(() =>
      inspectWhitespace('a', {
        boundaries: Array.from({ length: 33 }, (_, index) => String.fromCodePoint(65 + index)).join(
          '',
        ),
      }),
    ).toThrow(InvalidOptionError)
  })
})

describe('readWhitespace', () => {
  it('reads trailing runs one character at a time, either way round', () => {
    const text = 'a \t  \nb\t   \nc \t\t \nd\t  \t'
    expect(readWhitespace(text, { channel: 'trailing', ...SPACE_ZERO })).toEqual({
      channel: 'trailing',
      bits: HI_BITS,
      skipped: [],
      groups: 2,
      partial: '',
      text: 'Hi',
    })
    const flipped = readWhitespace(text, { channel: 'trailing', ...TAB_ZERO })
    expect(flipped.bits).toBe('1011011110010110')
    expect(flipped.text).toBeUndefined()
    expect(flipped.problem).toBe('The hidden bytes are not UTF-8')
  })

  it('reads trailing runs without a single interior space', () => {
    const reading = readWhitespace('a b c \nd  e\t\n', { channel: 'trailing', ...SPACE_ZERO })
    expect(reading.bits).toBe('01')
  })

  it('reads gaps and line endings as one bit each', () => {
    const gaps = { channel: 'interior', zero: ['single'], one: ['double'] } as const
    expect(readWhitespace('a  b c  d e f  g h i', { ...gaps, digits: 4 })).toMatchObject({
      bits: '10100100',
      groups: 2,
      partial: '',
    })
    const endings = { channel: 'line-ending', zero: ['lf'], one: ['crlf', 'cr'] } as const
    expect(readWhitespace('a\nb\r\nc\rd\ne', { ...endings, digits: 4 }).bits).toBe('0110')
    expect(
      readWhitespace('A.  B. C?  D', { channel: 'sentence', zero: ['single'], one: ['double'] })
        .bits,
    ).toBe('101')
  })

  it('reports the bits that fill no group instead of dropping them', () => {
    const reading = readWhitespace('a \t  \nb\t   \nc \t\t', { channel: 'trailing', ...SPACE_ZERO })
    expect(reading).toMatchObject({ bits: '01001000011', groups: 1, partial: '011', text: 'H' })
  })

  it('groups by offset, width, bit order and unit', () => {
    const text = 'a\t \t  \nb\t   \nc \t\t \nd\t  \t'
    const options = { channel: 'trailing', ...SPACE_ZERO } as const
    expect(readWhitespace(text, { ...options, offset: 1 })).toMatchObject({
      bits: `1${HI_BITS}`,
      text: 'Hi',
      partial: '',
    })
    /* 0x48 with its bits turned round is 00010010, 0x69 is 10010110. */
    const lsb = 'a   \t  \t \nb\t  \t \t\t '
    expect(readWhitespace(lsb, { ...options, order: 'lsb' }).text).toBe('Hi')
    expect(readWhitespace(lsb, options).text).toBeUndefined()
    /* 1001000 1101001 is "Hi" in seven bits. */
    const seven = 'a\t  \t   \nb\t\t \t  \t'
    expect(readWhitespace(seven, { ...options, digits: 7 }).text).toBe('Hi')
    /* U+00E9 as one code point of 8 bits; as a byte it is no UTF-8. */
    const accent = 'a\t\t\t \t  \t'
    expect(readWhitespace(accent, { ...options, unit: 'code-point' }).text).toBe('é')
    expect(readWhitespace(accent, options).problem).toContain('not UTF-8')
  })

  it('stops at a place the mapping gives no bit, or lists it when told to skip', () => {
    const options = { channel: 'interior', zero: ['single'], one: ['double'] } as const
    const text = 'a  b c   d\te  f'
    expect(() => readWhitespace(text, options)).toThrow(WhitespaceError)
    expect(() => readWhitespace(text, options)).toThrow(
      '2 interior places have no bit in the mapping: wide, tab. The first is at line 1, column 7.',
    )
    expect(() => readWhitespace('a   b', options)).toThrow('1 interior place has no bit')
    const reading = readWhitespace(text, { ...options, unmapped: 'skip' })
    expect(reading.bits).toBe('101')
    expect(reading.skipped.map((found) => [found.class, found.start])).toEqual([
      ['wide', 6],
      ['tab', 10],
    ])
  })

  it('refuses a mapping that cannot be read back', () => {
    const read = (options: Readonly<Record<string, unknown>>) => () =>
      readWhitespace('a \nb', options as never)
    expect(read({ zero: ['space'], one: ['tab'] })).toThrow(new MissingOptionError('channel'))
    expect(read({ channel: 'trailing', one: ['tab'] })).toThrow(MissingOptionError)
    expect(read({ channel: 'trailing', zero: ['space'] })).toThrow(
      'Missing required option: one. The trailing channel has space, tab',
    )
    expect(read({ channel: 'trailing', zero: [], one: ['tab'] })).toThrow(InvalidOptionError)
    expect(read({ channel: 'trailing', zero: 'space', one: ['tab'] })).toThrow(InvalidOptionError)
    expect(read({ channel: 'trailing', zero: ['space'], one: ['space'] })).toThrow(
      'Invalid option one=space: is mapped already; one class stands for one bit',
    )
    expect(read({ channel: 'trailing', zero: ['space', 'space'], one: ['tab'] })).toThrow(
      'is mapped already',
    )
    expect(read({ channel: 'trailing', zero: ['single'], one: ['tab'] })).toThrow(
      'Invalid option zero=single: is no class of trailing, which has space, tab',
    )
    expect(read({ channel: 'trailing', zero: ['mixed'], one: ['tab'] })).toThrow(InvalidOptionError)
    expect(read({ channel: 'trailing', zero: ['constructor'], one: ['tab'] })).toThrow(
      InvalidOptionError,
    )
    expect(read({ channel: 'margin', ...SPACE_ZERO })).toThrow(InvalidOptionError)
    expect(() => readWhitespace('a', undefined as never)).toThrow(MissingOptionError)
    expect(() => readWhitespace(null as never, { channel: 'trailing', ...SPACE_ZERO })).toThrow(
      InvalidOptionError,
    )
  })

  it('refuses a grouping out of range', () => {
    const read = (options: Readonly<Record<string, unknown>>) => () =>
      readWhitespace('a \nb', { channel: 'trailing', ...SPACE_ZERO, ...options } as never)
    for (const options of [
      { digits: 0 },
      { digits: 33 },
      { digits: 2.5 },
      { digits: Number.NaN },
      { order: 'middle' },
      { unit: 'word' },
      { offset: -1 },
      { offset: 1.5 },
      { unmapped: 'drop' },
      { boundaries: 7 },
    ]) {
      expect(read(options)).toThrow(InvalidOptionError)
    }
  })

  it('answers with no bits for a text that has none of the channel', () => {
    expect(readWhitespace('abc', { channel: 'trailing', ...SPACE_ZERO })).toEqual({
      channel: 'trailing',
      bits: '',
      skipped: [],
      groups: 0,
      partial: '',
      text: '',
    })
  })
})

describe('hideWhitespace', () => {
  it('writes the bits after the lines and keeps every line ending', () => {
    const hidden = hideWhitespace('Hi', { cover: COVER, ...SPACE_ZERO, perLine: 4 })
    expect(hidden).toBe('one \t  \r\ntwo\t   \nthree \t\t \rfour\t  \t\n')
    const flipped = hideWhitespace('Hi', { cover: COVER, ...TAB_ZERO, perLine: 4 })
    expect(flipped).toBe('one\t \t\t\r\ntwo \t\t\t\nthree\t  \t\rfour \t\t \n')
  })

  it.each([
    ['space as 0', SPACE_ZERO],
    ['tab as 0', TAB_ZERO],
  ])('reads back what it wrote with %s, and only the line ends changed', (_, mapping) => {
    const cover = 'A  first line.\r\n\tindented\tsecond\n\nfourth  one\rlast'
    const hidden = hideWhitespace('Hi!', { cover, ...mapping, perLine: 5 })
    const reading = readWhitespace(hidden, { channel: 'trailing', ...mapping })
    expect(reading).toMatchObject({ text: 'Hi!', partial: '', groups: 3 })
    expect(hidden.replaceAll(/[ \t]+(?=\r|\n|$)/g, '')).toBe(cover)
    for (const channel of ['line-ending', 'interior', 'sentence'] as const) {
      expect(rows(hidden, channel).map(([name]) => name)).toEqual(
        rows(cover, channel).map(([name]) => name),
      )
    }
    const other = mapping === SPACE_ZERO ? TAB_ZERO : SPACE_ZERO
    expect(readWhitespace(hidden, { channel: 'trailing', ...other }).text).not.toBe('Hi!')
  })

  it('carries any text through every grouping', () => {
    const cover = Array.from({ length: 80 }, (_, index) => `line ${index}`).join('\n')
    const messages = ['', 'a', 'Hi é世 \u{1F600}', 'x y  ', '\u0000\t\n']
    const framings = [
      {},
      { order: 'lsb' },
      { unit: 'code-unit', digits: 16 },
      { unit: 'code-point', digits: 21, order: 'lsb' },
    ] as const
    for (const message of messages) {
      for (const framing of framings) {
        for (const perLine of [1, 8, 64]) {
          if (message.length * 21 > 80 * perLine) continue
          const options = { ...SPACE_ZERO, ...framing }
          const hidden = hideWhitespace(message, { cover, ...options, perLine })
          const reading = readWhitespace(hidden, { channel: 'trailing', ...options })
          expect(reading.text, JSON.stringify({ message, framing, perLine })).toBe(message)
          expect(reading.partial).toBe('')
        }
      }
    }
  })

  it('refuses a cover with too few lines, never a short message', () => {
    const hide = (cover: string, perLine?: number) => () =>
      hideWhitespace('Hi', { cover, ...SPACE_ZERO, ...(perLine === undefined ? {} : { perLine }) })
    expect(hide('one line')).toThrow(
      'Invalid option cover=the cover text: has room for 8 bits, 8 on each of 1 lines, and the message takes 16; pass more lines or put more bits on a line',
    )
    expect(hide('one line', 16)()).toBe('one line \t  \t    \t\t \t  \t')
    expect(hide('a\nb\n')()).toBe('a \t  \t   \nb \t\t \t  \t\n')
    expect(hide('a\n')).toThrow(InvalidOptionError)
    expect(hide('')).toThrow(InvalidOptionError)
  })

  it('refuses a cover that would add bits of its own', () => {
    for (const cover of ['a \nb', 'a\nb\t', 'a\n \nb']) {
      expect(() => hideWhitespace('', { cover, ...SPACE_ZERO })).toThrow(
        /ends line \d in a space or a tab/,
      )
    }
  })

  it('refuses what it cannot write', () => {
    const hide = (options: Readonly<Record<string, unknown>>) => () =>
      hideWhitespace('Hi', { cover: COVER, ...SPACE_ZERO, ...options } as never)
    expect(hide({ channel: 'interior' })).toThrow(
      'Invalid option channel=interior: cannot be written; only trailing can',
    )
    for (const options of [
      { perLine: 0 },
      { perLine: 65 },
      { perLine: 1.5 },
      { cover: 7 },
      { zero: ['lf'] },
      { one: ['space'] },
      { digits: 6 },
    ]) {
      expect(hide(options)).toThrow(InvalidOptionError)
    }
    expect(hide({ cover: undefined })).toThrow(MissingOptionError)
    expect(hide({ zero: undefined })).toThrow(MissingOptionError)
    expect(() => hideWhitespace('Hi', undefined as never)).toThrow(MissingOptionError)
    expect(() => hideWhitespace(7 as never, { cover: COVER, ...SPACE_ZERO })).toThrow(
      InvalidOptionError,
    )
    expect(() => hideWhitespace('\uD800', { cover: COVER, ...SPACE_ZERO })).toThrow(
      InvalidOptionError,
    )
  })
})

describe('spaces and tabs as a zero-width alphabet', () => {
  it('still reads them wherever they sit', () => {
    const scheme = { symbols: [' ', '\t'], digits: 8, unit: 'byte' } as const
    expect(readZeroWidth('x \t     \ty', { scheme })).toBe('A')
  })
})
