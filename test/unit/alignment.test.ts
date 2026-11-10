import { describe, expect, it } from 'vite-plus/test'
import { MAX_ALIGNMENT_PROBLEMS } from '../../src/core/alignment-options.ts'
import {
  alignTexts,
  checkAlignment,
  type AlignmentRow,
  type AlignmentSources,
  type TextAlignment,
} from '../../src/core/alignment.ts'
import { CipherError, InvalidOptionError } from '../../src/core/errors.ts'

type Brief = readonly [string, number, number, number, number, ...string[]]

/* A row as operation, left range, right range and its flags, short enough to read in a table. */
function brief(row: AlignmentRow): Brief {
  const flags = [row.exact === false ? 'compared' : '', row.ambiguous === true ? 'ambiguous' : '']
  return [
    row.operation,
    row.left.from,
    row.left.to,
    row.right.from,
    row.right.to,
    ...flags.filter((flag) => flag !== ''),
  ]
}

/* The rows of two texts under the default policy, in short form. */
function rows(left: string, right: string): Brief[] {
  return alignTexts({ left, right }).rows.map((row) => brief(row))
}

/* Every way to pair equal tokens in order, found by trying them all: the oracle for the table. */
function matchings(left: readonly string[], right: readonly string[]): number[][][] {
  const found: number[][][] = [[]]
  for (const [i, ours] of left.entries()) {
    for (const [j, theirs] of right.entries()) {
      if (ours === theirs) {
        for (const rest of matchings(left.slice(i + 1), right.slice(j + 1))) {
          found.push([[i, j], ...rest.map(([a = 0, b = 0]) => [a + i + 1, b + j + 1])])
        }
      }
    }
  }
  return found
}

/* A deterministic stream of small numbers, so a failing case can be run again. */
function numbers(seed: number): () => number {
  let state = seed
  return () => {
    state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0
    return state >>> 16
  }
}

/* The pairs an alignment made, one per equal token, each with its ambiguous flag. */
function pairsOf(alignment: TextAlignment): Array<[number, number, boolean]> {
  return alignment.rows
    .filter((row) => row.operation === 'equal')
    .flatMap((row) =>
      Array.from(
        { length: row.left.to - row.left.from },
        (_, offset): [number, number, boolean] => [
          row.left.from + offset,
          row.right.from + offset,
          row.ambiguous === true,
        ],
      ),
    )
}

/* A copy of a map with one part swapped, the way someone editing it by hand would leave it. */
function edited(alignment: TextAlignment, change: Readonly<Record<string, unknown>>): unknown {
  return { ...structuredClone(alignment), ...change }
}

/* The problems of a map as `code at`, in the order they were found. */
function problems(texts: AlignmentSources, alignment: unknown): string[] {
  return checkAlignment(texts, alignment).problems.map(({ code, at }) => `${code} ${at}`)
}

const fox: AlignmentSources = { left: 'red fox sleeps', right: 'red fox runs' }

describe('alignTexts', () => {
  it('keeps every token and its span on both sides', () => {
    expect(alignTexts(fox)).toEqual({
      tokens: 'words',
      compare: 'exact',
      left: {
        tokens: [
          { raw: 'red', normalized: 'red', start: 0, end: 3 },
          { raw: 'fox', normalized: 'fox', start: 4, end: 7 },
          { raw: 'sleeps', normalized: 'sleeps', start: 8, end: 14 },
        ],
        separators: [
          { raw: ' ', start: 3, end: 4 },
          { raw: ' ', start: 7, end: 8 },
        ],
      },
      right: {
        tokens: [
          { raw: 'red', normalized: 'red', start: 0, end: 3 },
          { raw: 'fox', normalized: 'fox', start: 4, end: 7 },
          { raw: 'runs', normalized: 'runs', start: 8, end: 12 },
        ],
        separators: [
          { raw: ' ', start: 3, end: 4 },
          { raw: ' ', start: 7, end: 8 },
        ],
      },
      rows: [
        {
          operation: 'equal',
          left: { from: 0, to: 2, start: 0, end: 7 },
          right: { from: 0, to: 2, start: 0, end: 7 },
          exact: true,
          ambiguous: false,
        },
        {
          operation: 'replace',
          left: { from: 2, to: 3, start: 8, end: 14 },
          right: { from: 2, to: 3, start: 8, end: 12 },
        },
      ],
    })
  })

  it('tells an insertion, a deletion and a replacement apart', () => {
    expect(rows('one two three', 'one two and three')).toEqual([
      ['equal', 0, 2, 0, 2],
      ['insert', 2, 2, 2, 3],
      ['equal', 2, 3, 3, 4],
    ])
    expect(rows('one two and three', 'one three')).toEqual([
      ['equal', 0, 1, 0, 1],
      ['delete', 1, 3, 1, 1],
      ['equal', 3, 4, 1, 2],
    ])
    expect(rows('one two three four', 'one 2 3 or so four')).toEqual([
      ['equal', 0, 1, 0, 1],
      ['replace', 1, 3, 1, 5],
      ['equal', 3, 4, 5, 6],
    ])
  })

  it('puts an empty range where the gap is', () => {
    const [, inserted] = alignTexts({ left: 'one two', right: 'one and two' }).rows
    expect(inserted?.left).toEqual({ from: 1, to: 1, start: 3, end: 3 })
    expect(inserted?.right).toEqual({ from: 1, to: 2, start: 4, end: 7 })
  })

  it('takes an empty side, and two', () => {
    expect(rows('', '')).toEqual([])
    expect(rows('', 'x y')).toEqual([['insert', 0, 0, 0, 2]])
    expect(rows('x y', ' \n')).toEqual([['delete', 0, 2, 0, 0]])
    expect(alignTexts({ left: 'x', right: ' \n' }).right).toEqual({
      tokens: [],
      separators: [{ raw: ' \n', start: 0, end: 2 }],
    })
  })

  it('pairs a repeated word with its first match and says the choice was open', () => {
    expect(rows('a b a c a', 'a c a')).toEqual([
      ['equal', 0, 1, 0, 1, 'ambiguous'],
      ['delete', 1, 3, 1, 1],
      ['equal', 3, 5, 1, 3],
    ])
    expect(rows('b a', 'a b')).toEqual([
      ['delete', 0, 1, 0, 0],
      ['equal', 1, 2, 0, 1, 'ambiguous'],
      ['insert', 2, 2, 1, 2],
    ])
    expect(rows('a b a', 'a b a')).toEqual([['equal', 0, 3, 0, 3]])
  })

  it.each([
    [
      'exact',
      [
        ['replace', 0, 1, 0, 1],
        ['equal', 1, 3, 1, 3],
      ],
    ],
    [
      'canonical',
      [
        ['equal', 0, 1, 0, 1, 'compared'],
        ['equal', 1, 3, 1, 3],
      ],
    ],
  ] as const)('reads a combining mark as part of its word, compared %s', (compare, expected) => {
    const texts = { left: 'café au lait', right: 'café au lait' }
    const alignment = alignTexts(texts, { compare })
    expect(alignment.left.tokens[0]).toMatchObject({ raw: 'café', start: 0, end: 5 })
    expect(alignment.rows.map((row) => brief(row))).toEqual(expected)
  })

  it('loosens the comparison one step at a time', () => {
    const texts = { left: 'Zażółć GĘŚLĄ', right: 'zazołc gesla' }
    const equal = (compare: 'canonical' | 'caseless' | 'unaccented') =>
      alignTexts(texts, { compare }).rows.map((row) => brief(row))
    expect(equal('canonical')).toEqual([['replace', 0, 2, 0, 2]])
    expect(equal('caseless')).toEqual([['replace', 0, 2, 0, 2]])
    expect(equal('unaccented')).toEqual([['equal', 0, 2, 0, 2, 'compared']])
    expect(alignTexts({ left: 'FOX', right: 'fox' }, { compare: 'caseless' }).rows).toMatchObject([
      { operation: 'equal', exact: false },
    ])
  })

  it('counts offsets in UTF-16 units past an astral character', () => {
    const texts = { left: '\u{1F98A} red fox', right: 'red fox' }
    const words = alignTexts(texts)
    expect(words.rows.map((row) => brief(row))).toEqual([['equal', 0, 2, 0, 2]])
    expect(words.rows[0]?.left).toEqual({ from: 0, to: 2, start: 3, end: 10 })
    expect(words.left.separators[0]).toEqual({ raw: '\u{1F98A} ', start: 0, end: 3 })
    expect(alignTexts(texts, { tokens: 'whitespace' }).rows.map((row) => brief(row))).toEqual([
      ['delete', 0, 1, 0, 0],
      ['equal', 1, 3, 0, 2],
    ])
  })

  it('keeps punctuation out of words and inside whitespace tokens', () => {
    const texts = { left: 'Stop, thief!', right: 'Stop thief' }
    expect(rows(texts.left, texts.right)).toEqual([['equal', 0, 2, 0, 2]])
    expect(alignTexts(texts, { tokens: 'whitespace' }).rows.map((row) => brief(row))).toEqual([
      ['replace', 0, 2, 0, 2],
    ])
  })

  it.each(['', ' ', 'a', ' a  b,c ', '\uD83E lone \uDD8A', 'é́ ́x', '\u{1F98A}\u{1F98A}'])(
    'cuts %j into pieces that add up to it again',
    (text) => {
      for (const tokens of ['words', 'whitespace'] as const) {
        const { left } = alignTexts({ left: text, right: '' }, { tokens })
        const pieces = [...left.tokens, ...left.separators].sort((a, b) => a.start - b.start)
        expect(pieces.map(({ raw }) => raw).join('')).toBe(text)
        for (const { raw, start, end } of pieces) expect(text.slice(start, end)).toBe(raw)
      }
    },
  )

  it('agrees with every pairing tried by hand on 400 small texts', () => {
    const next = numbers(332)
    const words = (count: number) => Array.from({ length: count }, () => 'abc'[next() % 3] ?? 'a')
    for (let round = 0; round < 400; round += 1) {
      const left = words(next() % 7)
      const right = words(next() % 7)
      const all = matchings(left, right)
      const longest = Math.max(...all.map((pairs) => pairs.length))
      const best = all.filter((pairs) => pairs.length === longest)
      const pairs = pairsOf(alignTexts({ left: left.join(' '), right: right.join(' ') }))
      expect(pairs, `${left.join('')} ${right.join('')}`).toHaveLength(longest)
      for (const [i, j, ambiguous] of pairs) {
        const always = best.every((other) => other.some(([a, b]) => a === i && b === j))
        expect(ambiguous, `${left.join('')} ${right.join('')} ${i}:${j}`).toBe(!always)
      }
    }
  })

  it('refuses texts over the limit instead of aligning a part', () => {
    const long = Array.from({ length: 2_000 }, (_, index) => `w${index % 7}`).join(' ')
    expect(() => alignTexts({ left: long, right: long })).toThrow(
      new CipherError(
        'Too long to align: 2000 tokens against 2000 is 4004001 comparisons, over the 4000000 limit. Align one section at a time.',
      ),
    )
    const fits = alignTexts({ left: long.slice(6), right: long })
    expect(fits.rows.at(-1)?.left.to).toBe(1_998)
    expect(fits.rows.at(-1)?.right.to).toBe(2_000)
  })

  it.each([
    [[{ left: 'a' }], 'Invalid option right=undefined: must be a string'],
    [[{ left: 7, right: 'a' }], 'Invalid option left=7: must be a string'],
    [[undefined], 'Invalid option left=undefined: must be a string'],
    [[fox, { tokens: 'lines' }], 'Invalid option tokens=lines: must be one of words, whitespace'],
    [
      [fox, { compare: 'fuzzy' }],
      'Invalid option compare=fuzzy: must be one of exact, canonical, caseless, unaccented',
    ],
  ])('refuses %j from an untyped caller', (args, message) => {
    expect(() => {
      Reflect.apply(alignTexts, undefined, args)
    }).toThrow(InvalidOptionError)
    expect(() => {
      Reflect.apply(alignTexts, undefined, args)
    }).toThrow(message)
  })
})

describe('checkAlignment', () => {
  it.each([
    [fox, {}],
    [{ left: '', right: '' }, {}],
    [{ left: 'a b a c a', right: 'a c a' }, {}],
    [{ left: 'Café, au lait!', right: 'café au  lait' }, { compare: 'unaccented' }],
    [{ left: '\u{1F98A} red fox', right: 'red\tfox' }, { tokens: 'whitespace' }],
  ] as const)('passes what alignTexts made of %j', (texts, options) => {
    expect(checkAlignment(texts, alignTexts(texts, options))).toEqual({
      valid: true,
      problems: [],
      count: 0,
    })
  })

  it('passes rows written by hand, spans left out', () => {
    const split = [
      { operation: 'equal', left: { from: 0, to: 1 }, right: { from: 0, to: 1 }, exact: true },
      { operation: 'equal', left: { from: 1, to: 2 }, right: { from: 1, to: 2 } },
      { operation: 'delete', left: { from: 2, to: 3 }, right: { from: 2, to: 2 } },
      { operation: 'insert', left: { from: 3, to: 3 }, right: { from: 2, to: 3 } },
    ]
    expect(problems(fox, edited(alignTexts(fox), { rows: split }))).toEqual([])
  })

  it.each([
    [
      'a gap',
      [
        ['equal', 0, 1, 0, 1],
        ['replace', 2, 3, 2, 3],
      ],
      ['gap /rows/1/left', 'gap /rows/1/right'],
    ],
    ['a short end', [['equal', 0, 2, 0, 2]], ['gap /rows', 'gap /rows']],
    [
      'an overlap',
      [
        ['equal', 0, 2, 0, 2],
        ['replace', 1, 3, 2, 3],
      ],
      ['overlap /rows/1/left'],
    ],
    [
      'rows out of order',
      [
        ['replace', 2, 3, 2, 3],
        ['equal', 0, 2, 0, 2],
      ],
      ['gap /rows/0/left', 'gap /rows/0/right', 'overlap /rows/1/left', 'overlap /rows/1/right'],
    ],
    [
      'a range past the end',
      [
        ['equal', 0, 2, 0, 2],
        ['replace', 2, 4, 2, 3],
      ],
      ['range /rows/1/left', 'gap /rows', 'gap /rows'],
    ],
    [
      'a range backwards',
      [
        ['equal', 2, 0, 0, 2],
        ['replace', 2, 3, 2, 3],
      ],
      ['range /rows/0/left', 'gap /rows/1/left', 'gap /rows/1/right'],
    ],
    [
      'an insert with left tokens',
      [
        ['equal', 0, 2, 0, 2],
        ['insert', 2, 3, 2, 3],
      ],
      ['operation /rows/1'],
    ],
    [
      'a delete with right tokens',
      [
        ['equal', 0, 2, 0, 2],
        ['delete', 2, 3, 2, 3],
      ],
      ['operation /rows/1'],
    ],
    [
      'an equal with uneven sides',
      [
        ['equal', 0, 3, 0, 2],
        ['insert', 3, 3, 2, 3],
      ],
      ['operation /rows/0'],
    ],
    [
      'an empty row',
      [
        ['replace', 0, 0, 0, 0],
        ['equal', 0, 2, 0, 2],
        ['replace', 2, 3, 2, 3],
      ],
      ['operation /rows/0'],
    ],
    ['a false equality', [['equal', 0, 3, 0, 3]], ['equality /rows/0']],
    [
      'a replace over equal tokens',
      [
        ['replace', 0, 2, 0, 2],
        ['replace', 2, 3, 2, 3],
      ],
      ['equality /rows/0'],
    ],
  ] as const)('rejects %s', (_, short, expected) => {
    const claimed = short.map(([operation, from, to, rightFrom, rightTo]) => ({
      operation,
      left: { from, to },
      right: { from: rightFrom, to: rightTo },
    }))
    expect(problems(fox, edited(alignTexts(fox), { rows: claimed }))).toEqual(expected)
  })

  it('holds exact and the spans of a row against the tokens', () => {
    const texts = { left: 'Red fox', right: 'red fox' }
    const alignment = alignTexts(texts, { compare: 'caseless' })
    const [first, second] = alignment.rows
    expect(first).toMatchObject({ exact: false })
    expect(
      problems(texts, edited(alignment, { rows: [{ ...first, exact: true }, second] })),
    ).toEqual(['equality /rows/0'])
    expect(
      problems(
        texts,
        edited(alignment, { rows: [first, { ...second, right: { ...second?.right, end: 6 } }] }),
      ),
    ).toEqual(['span /rows/1/right'])
  })

  it('holds every token and separator against its source', () => {
    const alignment = alignTexts(fox)
    const { tokens, separators } = alignment.left
    const withLeft = (left: unknown) => problems(fox, edited(alignment, { left }))
    const token = (change: object) => ({
      tokens: [{ ...tokens[0], ...change }, ...tokens.slice(1)],
      separators,
    })

    expect(withLeft(token({ raw: 'rad' }))).toEqual([
      'raw /left/tokens/0',
      'normalized /left/tokens/0',
      'equality /rows/0',
    ])
    expect(withLeft(token({ normalized: 'RED' }))).toEqual(['normalized /left/tokens/0'])
    expect(withLeft(token({ end: 15 }))).toContain('range /left/tokens/0')
    expect(withLeft(token({ start: 3, end: 3 }))).toContain('range /left/tokens/0')
    expect(withLeft({ tokens, separators: separators.slice(1) })).toEqual(['gap /left'])
    expect(
      withLeft({ tokens, separators: [...separators, { raw: 'd ', start: 2, end: 4 }] }),
    ).toEqual(['overlap /left', 'overlap /left'])
    expect(withLeft({ tokens: [...tokens].reverse(), separators })).toContain(
      'order /left/tokens/1',
    )
    expect(problems(fox, edited(alignment, { left: alignment.right }))).toEqual([
      'raw /left/tokens/2',
      'gap /left',
      'span /rows/1/left',
      'equality /rows/1',
    ])
  })

  it.each([
    [undefined, 'shape '],
    [[], 'shape '],
    [{ compare: 'fuzzy' }, 'shape /compare'],
    [{ left: { tokens: 'none', separators: [] } }, 'shape /left/tokens'],
    [
      { left: { tokens: [{ raw: 'red', start: 0, end: 3 }], separators: [] } },
      'shape /left/tokens/0',
    ],
    [
      { left: { tokens: [], separators: [{ raw: ' ', start: 3.5, end: 4 }] } },
      'shape /left/separators/0',
    ],
    [{ rows: 'none' }, 'shape /rows'],
    [
      { rows: [{ operation: 'move', left: { from: 0, to: 1 }, right: { from: 0, to: 1 } }] },
      'shape /rows/0',
    ],
    [
      { rows: [{ operation: 'equal', left: { from: -1, to: 1 }, right: { from: 0, to: 1 } }] },
      'shape /rows/0',
    ],
    [{ rows: [{ operation: 'equal', left: [0, 1], right: [0, 1] }] }, 'shape /rows/0'],
    [
      {
        rows: [
          { operation: 'equal', left: { from: 0, to: 1 }, right: { from: 0, to: 1 }, exact: 'yes' },
        ],
      },
      'shape /rows/0',
    ],
  ])('rejects the malformed map %j', (change, expected) => {
    const whole = change === undefined || Array.isArray(change)
    const check = checkAlignment(fox, whole ? change : edited(alignTexts(fox), change))
    expect(check.valid).toBe(false)
    expect(check.problems.map(({ code, at }) => `${code} ${at}`)).toContain(expected)
  })

  it('counts every problem and spells out the first few', () => {
    const texts = { left: 'a '.repeat(80), right: 'b '.repeat(80) }
    const single = Array.from({ length: 80 }, (_, index) => ({
      operation: 'equal',
      left: { from: index, to: index + 1 },
      right: { from: index, to: index + 1 },
    }))
    const check = checkAlignment(texts, edited(alignTexts(texts), { rows: single }))
    expect(check.valid).toBe(false)
    expect(check.count).toBe(80)
    expect(check.problems).toHaveLength(MAX_ALIGNMENT_PROBLEMS)
    expect(check.problems[0]).toEqual({
      code: 'equality',
      at: '/rows/0',
      message: 'left token 0 does not equal its partner',
    })
  })

  it('refuses sources that are not strings', () => {
    expect(() => {
      Reflect.apply(checkAlignment, undefined, [{ left: 'a', right: 1 }, {}])
    }).toThrow('Invalid option right=1: must be a string')
  })
})
