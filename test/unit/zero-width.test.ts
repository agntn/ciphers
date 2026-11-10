import { describe, expect, it } from 'vite-plus/test'
import { InvalidOptionError, MissingOptionError } from '../../src/core/errors.ts'
import {
  ZeroWidthError,
  hideZeroWidth,
  rankZeroWidth,
  readZeroWidth,
  zeroWidthSchemes,
  type ZeroWidthScheme,
  type ZeroWidthSchemeName,
} from '../../src/core/zero-width.ts'

/**
 * Text from code points, so no invisible character sits in this file.
 *
 * @param codes - Hex code points parted by spaces.
 * @returns {string} The characters.
 */
function characters(codes: string): string {
  return String.fromCodePoint(...codes.split(' ').map((code) => Number.parseInt(code, 16)))
}

const MESSAGE = 'Hi \u00E9\u4E16'

/* unicodeSteganographer.encodeText('', 'Hi é世') of 330k.github.io/misc_tools/unicode_steganography.js (Kei Misawa, 2016). */
const KEI_MISAWA = characters(
  '200C 200C 200C 200C 200D 200C 202C 200C 200C 200C 200C 200C 200D 202C 202C 200D 200C 200C 200C 200C 200C 202C 200C 200C 200C 200C 200C 200C FEFF 202C 202C 200D 200D 200C FEFF 202C 200C 200D 200D 202C',
)

/* zwsp_steg.encode('Hi é世') of zwsp-steg-py 0.2.0, its default MODE_FULL. */
const ZWSP_STEG = characters(
  '200B 200B 200B 200B 200D 200F 200D 200B 200B 200B 200B 200F 200C 200B 200B 200B 200B 200B 200C 200C 200D 200B 200B 200B 200C 200F 200C 200E 200C 200C 200C 200F 200F 200E 200B',
)

/* zwsp_steg.encode('Hi', MODE_ZWSP) of the same package: three symbols, eleven digits. */
const ZWSP_STEG_THREE = characters(
  '200B 200B 200B 200B 200B 200B 200B 200D 200D 200B 200B 200B 200B 200B 200B 200B 200B 200C 200B 200D 200D 200B',
)

/* encode('ab', 'Hi é😀') of zero-width-lib 1.1.0: the message goes in after the first visible character. */
const ZERO_WIDTH_LIB = characters(
  '61 200C FEFF 200C 200B FEFF 200F 200E 200B 200F 200F 200C 200B 200F FEFF 200F 200D 200B 200F 200D 200F 200E 200D 200E 200C 200C 62',
)

/* usernameToZeroWidth('Hi') of umpox/zero-width-detection (47cdad8): 1 is U+200B, 0 is U+200C, U+200D parts the letters and U+FEFF sits between all of them. */
const ZERO_WIDTH_DETECTION = characters(
  '200C FEFF 200B FEFF 200C FEFF 200C FEFF 200B FEFF 200C FEFF 200C FEFF 200C FEFF 200D FEFF 200C FEFF 200B FEFF 200B FEFF 200C FEFF 200B FEFF 200C FEFF 200C FEFF 200B',
)

const THREE_SYMBOLS: ZeroWidthScheme = {
  symbols: ['\u200B', '\u200C', '\u200D'],
  digits: 11,
  unit: 'code-point',
}

const DETECTION: ZeroWidthScheme = {
  symbols: ['\u200C', '\u200B'],
  separator: '\u200D',
  unit: 'code-unit',
}

const names = Object.keys(zeroWidthSchemes) as ZeroWidthSchemeName[]

describe('readZeroWidth', () => {
  it('reads what the original tools wrote', () => {
    expect(readZeroWidth(KEI_MISAWA, { scheme: '330k' })).toBe(MESSAGE)
    expect(readZeroWidth(ZWSP_STEG, { scheme: 'zwsp-steg' })).toBe(MESSAGE)
    expect(readZeroWidth(ZERO_WIDTH_LIB, { scheme: 'zero-width-lib' })).toBe('Hi \u00E9\u{1F600}')
  })

  it('reads a scheme of your own', () => {
    expect(readZeroWidth(ZWSP_STEG_THREE, { scheme: THREE_SYMBOLS })).toBe('Hi')
    expect(readZeroWidth(ZERO_WIDTH_DETECTION, { scheme: DETECTION })).toBe('Hi')
    const whitespace: ZeroWidthScheme = { symbols: [' ', '\t'], digits: 8, unit: 'byte' }
    expect(readZeroWidth(' \t \t\t\t\t\t', { scheme: whitespace })).toBe('_')
  })

  it('reads binary as U+200B for 0 and U+200C for 1, eight to a byte', () => {
    const letterA = characters('200B 200C 200B 200B 200B 200B 200B 200C')
    expect(readZeroWidth(`be${letterA}fore`, { scheme: 'binary' })).toBe('A')
    expect(
      readZeroWidth(
        characters(
          '200C 200C 200B 200B 200B 200B 200C 200C 200C 200B 200C 200B 200C 200B 200B 200C',
        ),
        { scheme: 'binary' },
      ),
    ).toBe('\u00E9')
  })

  it('skips the visible text and returns nothing without symbols', () => {
    expect(readZeroWidth('nothing here', { scheme: 'binary' })).toBe('')
    expect(readZeroWidth('', { scheme: 'zero-width-lib' })).toBe('')
  })

  it('says when the hidden characters do not fit the scheme', () => {
    expect(() => readZeroWidth(characters('200B 200C 200B'), { scheme: 'binary' })).toThrow(
      new ZeroWidthError(
        '3 hidden characters are left over after 0 groups of 8; another scheme wrote this, or part of the text is missing',
      ),
    )
    expect(() => readZeroWidth('\u200C'.repeat(8), { scheme: 'binary' })).toThrow(
      new ZeroWidthError('The hidden bytes are not UTF-8; another scheme wrote this'),
    )
    const wide: ZeroWidthScheme = { symbols: ['a', 'b'], separator: ' ', unit: 'byte' }
    expect(() => readZeroWidth('b bbbbbbbbb', { scheme: wide })).toThrow(
      new ZeroWidthError('Hidden number 2 is too large for one byte; another scheme wrote this'),
    )
  })

  it('refuses a scheme that cannot be read back', () => {
    const scheme = (fields: object) => () =>
      readZeroWidth('abab', { scheme: fields as ZeroWidthScheme })
    expect(scheme({})).toThrow(InvalidOptionError)
    expect(scheme({ symbols: 'ab', digits: 8, unit: 'byte' })).toThrow(
      'Invalid option symbols=U+0061 U+0062: must be two or more single characters',
    )
    expect(scheme({ symbols: ['a'], digits: 8, unit: 'byte' })).toThrow('two or more')
    expect(scheme({ symbols: ['a', 'bc'], digits: 8, unit: 'byte' })).toThrow('two or more')
    expect(scheme({ symbols: ['a', 'a'], digits: 8, unit: 'byte' })).toThrow(
      'Invalid option symbols=U+0061 U+0061: must not repeat a character',
    )
    expect(scheme({ symbols: ['a', 'b'], digits: 8, separator: 'a', unit: 'byte' })).toThrow(
      'Invalid option separator=U+0061: must be one character that is no symbol',
    )
    expect(scheme({ symbols: ['a', 'b'], digits: 8, unit: 'word' })).toThrow(
      'Invalid option unit=word: must be byte, code-unit, code-point',
    )
    expect(scheme({ symbols: ['a', 'b'], unit: 'byte' })).toThrow(new MissingOptionError('digits'))
    for (const digits of [0, 1.5, 33, Number.NaN]) {
      expect(scheme({ symbols: ['a', 'b'], digits, unit: 'byte' })).toThrow(
        `Invalid option digits=${digits}: must be an integer from 1 to 32`,
      )
    }
  })

  it('refuses a missing or unknown scheme and anything but a string', () => {
    expect(() => {
      Reflect.apply(readZeroWidth, undefined, ['abc'])
    }).toThrow(new MissingOptionError('scheme'))
    for (const scheme of ['toString', 'nope']) {
      expect(() => readZeroWidth('abc', { scheme: scheme as ZeroWidthSchemeName })).toThrow(
        `Invalid option scheme=${scheme}: must be binary, 330k, zwsp-steg, zero-width-lib or a scheme of your own`,
      )
    }
    for (const text of [null, 5, ['a']]) {
      expect(() => {
        Reflect.apply(readZeroWidth, undefined, [text, { scheme: 'binary' }])
      }).toThrow('must be a string')
      expect(() => {
        Reflect.apply(hideZeroWidth, undefined, [text, { scheme: 'binary' }])
      }).toThrow('must be a string')
      expect(() => {
        Reflect.apply(rankZeroWidth, undefined, [text])
      }).toThrow('must be a string')
    }
    expect(() => {
      Reflect.apply(hideZeroWidth, undefined, ['a', { scheme: 'binary', cover: 5 }])
    }).toThrow('Invalid option cover=5: must be a string')
  })
})

describe('hideZeroWidth', () => {
  it('writes what the original tools write', () => {
    expect(hideZeroWidth(MESSAGE, { scheme: '330k' })).toBe(KEI_MISAWA)
    expect(hideZeroWidth(MESSAGE, { scheme: 'zwsp-steg' })).toBe(ZWSP_STEG)
    expect(hideZeroWidth('Hi \u00E9\u{1F600}', { scheme: 'zero-width-lib', cover: 'ab' })).toBe(
      ZERO_WIDTH_LIB,
    )
    expect(hideZeroWidth('Hi', { scheme: THREE_SYMBOLS })).toBe(ZWSP_STEG_THREE)
  })

  it('puts the message after the first character of the cover, marks included', () => {
    expect(hideZeroWidth('A', { scheme: 'binary', cover: 'e\u0301t\u00E9' })).toBe(
      `e\u0301${characters('200B 200C 200B 200B 200B 200B 200B 200C')}t\u00E9`,
    )
    expect(hideZeroWidth('', { scheme: 'binary', cover: 'cover' })).toBe('cover')
  })

  it.each(names)('reads back what it hid with %s', (scheme) => {
    for (const message of [
      'a',
      'Hi \u00E9\u4E16',
      '\u2028\u2029\u00A0 end\u00A0',
      '\0\u007F',
      '\uFFFF',
      'line\nbreak\ttab',
    ]) {
      const hidden = hideZeroWidth(message, { scheme, cover: 'A cover, with words.' })
      expect(readZeroWidth(hidden, { scheme })).toBe(message)
      expect(hidden.replaceAll(/[\u200B-\u200F\u202C\uFEFF]/g, '')).toBe('A cover, with words.')
    }
  })

  it('keeps astral characters and lone surrogates where the unit can hold them', () => {
    for (const scheme of ['330k', 'zero-width-lib'] as const) {
      for (const message of ['\u{1F600}', '\uD83D', '\uDC00x', '\u{10FFFF}']) {
        expect(readZeroWidth(hideZeroWidth(message, { scheme }), { scheme })).toBe(message)
      }
    }
    expect(
      readZeroWidth(hideZeroWidth('\u{1F600}', { scheme: 'binary' }), { scheme: 'binary' }),
    ).toBe('\u{1F600}')
  })

  it('hides in an alphabet of more than 36 symbols', () => {
    const symbols = Array.from({ length: 37 }, (_, index) => String.fromCodePoint(0xfe00 + index))
    const scheme: ZeroWidthScheme = { symbols, digits: 2, unit: 'byte' }
    const hidden = hideZeroWidth('A', { scheme })

    expect(Array.from(hidden, (symbol) => symbols.indexOf(symbol))).toEqual([1, 28])
    expect(readZeroWidth(hideZeroWidth(MESSAGE, { scheme }), { scheme })).toBe(MESSAGE)
  })

  it('refuses a character the scheme cannot hold', () => {
    expect(() => hideZeroWidth('\u{1F600}', { scheme: 'zwsp-steg' })).toThrow(
      'Invalid option message=U+1F600: does not fit 7 digits of base 5',
    )
    expect(() => hideZeroWidth('\uD83D', { scheme: 'binary' })).toThrow(
      'Invalid option message=a lone surrogate: has no UTF-8 bytes; hide it with a code-unit scheme',
    )
  })

  it('refuses a cover that already carries the scheme', () => {
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'
    expect(() => hideZeroWidth('x', { scheme: '330k', cover: family })).toThrow(
      'Invalid option cover=the cover text: already carries characters of the scheme, which would read as part of the message',
    )
    expect(() => hideZeroWidth('x', { scheme: 'zero-width-lib', cover: 'a\u200Bb' })).toThrow(
      'already carries',
    )
    expect(
      readZeroWidth(hideZeroWidth('x', { scheme: 'binary', cover: family }), { scheme: 'binary' }),
    ).toBe('x')
  })
})

describe('rankZeroWidth', () => {
  it('names the scheme each tool wrote', () => {
    const readings = (text: string) =>
      rankZeroWidth(text).candidates.map(({ name, text: reading }) => [name, reading])
    expect(readings(`co${KEI_MISAWA}ver`)).toEqual([['330k', MESSAGE]])
    expect(readings(ZWSP_STEG)).toEqual([['zwsp-steg', MESSAGE]])
    expect(readings(ZERO_WIDTH_LIB)).toEqual([['zero-width-lib', 'Hi \u00E9\u{1F600}']])
    expect(readings(hideZeroWidth('secret', { scheme: 'binary', cover: 'hello' }))).toEqual([
      ['binary', 'secret'],
    ])
  })

  it('tries binary with 0 and 1 swapped and hands back the scheme', () => {
    const swapped: ZeroWidthScheme = { symbols: ['\u200C', '\u200B'], digits: 8, unit: 'byte' }
    const ranking = rankZeroWidth(hideZeroWidth('Hi', { scheme: swapped }))
    expect(ranking.tried).toBe(5)
    expect(ranking.candidates).toEqual([{ scheme: swapped, text: 'Hi' }])
  })

  it('puts a reading in printable ASCII before one in rarer characters', () => {
    const swapped: ZeroWidthScheme = { symbols: ['\u200C', '\u200B'], digits: 8, unit: 'byte' }
    const { candidates } = rankZeroWidth(hideZeroWidth('between', { scheme: swapped }))
    expect(candidates.map(({ name, text }) => [name, text])).toEqual([
      [undefined, 'between'],
      ['zwsp-steg', '\u3DA4\u495C\u3F7B\u0F23\u3D22\u49C0\u0EC0\u0272'],
    ])
  })

  it('finds nothing in plain text', () => {
    expect(rankZeroWidth('plain text')).toEqual({ tried: 5, candidates: [] })
    expect(rankZeroWidth(characters('200B 200C 200B'))).toEqual({ tried: 5, candidates: [] })
  })
})
