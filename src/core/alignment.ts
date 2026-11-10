import {
  MAX_ALIGNMENT_CELLS,
  MAX_ALIGNMENT_PROBLEMS,
  alignmentCompares,
  alignmentOperations,
  alignmentTokens,
  type AlignmentCompare,
  type AlignmentOperation,
  type AlignmentTokens,
} from './alignment-options.ts'
import { CipherError, InvalidOptionError } from './errors.ts'

/** A piece of a source text: `source.slice(start, end)` is `raw`, offsets in UTF-16 units. */
export interface AlignmentSpan {
  readonly raw: string
  readonly start: number
  readonly end: number
}

/** One token, with the form it is compared in. */
export interface AlignmentToken extends AlignmentSpan {
  readonly normalized: string
}

/** One text cut up: tokens and separators together cover every character once. */
export interface AlignedText {
  readonly tokens: readonly AlignmentToken[]
  /** Whitespace and punctuation between tokens, never compared. */
  readonly separators: readonly AlignmentSpan[]
}

/** Tokens `from` up to `to`, and the span they take. An empty range sits where the gap is. */
export interface AlignmentRange {
  readonly from: number
  readonly to: number
  readonly start: number
  readonly end: number
}

/** One step of the walk through both texts. */
export interface AlignmentRow {
  readonly operation: AlignmentOperation
  readonly left: AlignmentRange
  readonly right: AlignmentRange
  /** On `equal` rows: true when the raw tokens match too, not just their compared form. */
  readonly exact?: boolean
  /** On `equal` rows: true when another alignment just as long pairs these tokens otherwise. */
  readonly ambiguous?: boolean
}

/** Two texts walked side by side. Rows cover every token of both, in order. */
export interface TextAlignment {
  readonly tokens: AlignmentTokens
  readonly compare: AlignmentCompare
  readonly left: AlignedText
  readonly right: AlignedText
  readonly rows: readonly AlignmentRow[]
}

/** The two texts, as they were written. */
export interface AlignmentSources {
  readonly left: string
  readonly right: string
}

/** How `alignTexts` cuts and compares. */
export interface AlignTextsOptions {
  /** Default `words`. */
  readonly tokens?: AlignmentTokens
  /** Default `exact`. */
  readonly compare?: AlignmentCompare
}

/** What kind of thing is wrong with a map. */
export type AlignmentProblemCode =
  | 'shape'
  | 'range'
  | 'order'
  | 'raw'
  | 'normalized'
  | 'gap'
  | 'overlap'
  | 'operation'
  | 'equality'
  | 'span'

/** One thing wrong with a map, and where: `at` is a JSON pointer into it. */
export interface AlignmentProblem {
  readonly code: AlignmentProblemCode
  readonly at: string
  readonly message: string
}

/** The verdict on a map. */
export interface AlignmentCheck {
  readonly valid: boolean
  /** The first `MAX_ALIGNMENT_PROBLEMS`, in the order they were found. */
  readonly problems: readonly AlignmentProblem[]
  /** All of them, counted. */
  readonly count: number
}

type Side = 'left' | 'right'

const SIDES: readonly Side[] = ['left', 'right']

/** One pattern per way of cutting. Read through `matchAll`, which copies it. */
const TOKEN_PATTERNS: Readonly<Record<AlignmentTokens, RegExp>> = {
  words: /[\p{L}\p{M}\p{N}]+/gu,
  whitespace: /\S+/gu,
}

/**
 * A token in the form it is compared in.
 *
 * @param raw - The token as written.
 * @param compare - How loosely to compare.
 * @returns {string} The compared form.
 */
function normalizedToken(raw: string, compare: AlignmentCompare): string {
  if (compare === 'exact') return raw
  const canonical = raw.normalize('NFC')
  if (compare === 'canonical') return canonical
  const lowered = canonical.toLowerCase().normalize('NFC')
  if (compare === 'caseless') return lowered
  return lowered.normalize('NFD').replaceAll(/\p{M}/gu, '').normalize('NFC')
}

/**
 * Cut one text into tokens and what lies between them.
 *
 * @param text - The source text.
 * @param policy - How to cut and compare.
 * @returns {AlignedText} Tokens and separators, in order.
 */
function readText(text: string, policy: Readonly<Required<AlignTextsOptions>>): AlignedText {
  const tokens: AlignmentToken[] = []
  const separators: AlignmentSpan[] = []
  let end = 0
  for (const match of text.matchAll(TOKEN_PATTERNS[policy.tokens])) {
    const [raw] = match
    const start = match.index
    if (start > end) separators.push({ raw: text.slice(end, start), start: end, end: start })
    end = start + raw.length
    tokens.push({ raw, normalized: normalizedToken(raw, policy.compare), start, end })
  }
  if (text.length > end) separators.push({ raw: text.slice(end), start: end, end: text.length })
  return { tokens, separators }
}

/**
 * Tokens as numbers, the same number for the same compared form on either side.
 *
 * @param sides - Both token lists.
 * @returns {Array<number[]>} One list of numbers per side.
 */
function tokenIds(sides: ReadonlyArray<readonly AlignmentToken[]>): number[][] {
  const known = new Map<string, number>()
  return sides.map((tokens) =>
    tokens.map(({ normalized }) => {
      const id = known.get(normalized) ?? known.size
      known.set(normalized, id)
      return id
    }),
  )
}

/**
 * The span a run of tokens takes. An empty run sits where the token before it ends.
 *
 * @param tokens - Every token of one side.
 * @param bounds - First token and the one past the last.
 * @returns {AlignmentRange} The range with its span.
 */
function rangeOf(
  tokens: readonly AlignmentToken[],
  bounds: readonly [from: number, to: number],
): AlignmentRange {
  const [from, to] = bounds
  const anchor = tokens[from - 1]?.end ?? 0
  if (from === to) return { from, to, start: anchor, end: anchor }
  return { from, to, start: tokens[from]?.start ?? anchor, end: tokens[to - 1]?.end ?? anchor }
}

/** The longest common run of tokens, counted from both ends so every pairing can be judged. */
class Pairing {
  readonly #left: readonly number[]
  readonly #right: readonly number[]
  readonly #width: number
  /** Common tokens before each cell. */
  readonly #before: Uint16Array
  /** Common tokens from each cell on. */
  readonly #after: Uint16Array

  constructor(left: readonly number[], right: readonly number[]) {
    this.#left = left
    this.#right = right
    this.#width = right.length + 1
    const cells = (left.length + 1) * this.#width
    this.#before = new Uint16Array(cells)
    this.#after = new Uint16Array(cells)
    this.#countBefore()
    this.#countAfter()
  }

  #countBefore(): void {
    const width = this.#width
    const table = this.#before
    for (let i = 1; i <= this.#left.length; i += 1) {
      for (let j = 1; j < width; j += 1) {
        const cell = i * width + j
        table[cell] =
          this.#left[i - 1] === this.#right[j - 1]
            ? table[cell - width - 1]! + 1
            : Math.max(table[cell - width]!, table[cell - 1]!)
      }
    }
  }

  #countAfter(): void {
    const width = this.#width
    const table = this.#after
    for (let i = this.#left.length - 1; i >= 0; i -= 1) {
      for (let j = width - 2; j >= 0; j -= 1) {
        const cell = i * width + j
        table[cell] =
          this.#left[i] === this.#right[j]
            ? table[cell + width + 1]! + 1
            : Math.max(table[cell + width]!, table[cell + 1]!)
      }
    }
  }

  /**
   * The right token each left token pairs with. On a tie the left token is dropped first.
   *
   * @returns {number[]} One right index per left token, -1 for none.
   */
  partners(): number[] {
    const partners = this.#left.map(() => -1)
    const width = this.#width
    let i = 0
    let j = 0
    while (i < this.#left.length && j < this.#right.length) {
      const cell = i * width + j
      if (this.#left[i] === this.#right[j]) {
        partners[i] = j
        i += 1
        j += 1
      } else if (this.#after[cell + width]! >= this.#after[cell + 1]!) i += 1
      else j += 1
    }
    return partners
  }

  /**
   * Whether every alignment as long as the best one pairs these two tokens.
   *
   * @param i - A left token.
   * @param j - Its partner.
   * @returns {boolean} False when the left token could pair elsewhere or go unpaired.
   */
  settled(i: number, j: number): boolean {
    const width = this.#width
    const best = this.#after[0]!
    const row = i * width
    for (let k = 0; k < width; k += 1) {
      if (this.#before[row + k]! + this.#after[row + width + k]! === best) return false
      if (k !== j && this.#pairs(i, k) === best) return false
    }
    return true
  }

  /**
   * The longest alignment that pairs two given tokens.
   *
   * @param i - A left token.
   * @param k - A right token, or one past the last.
   * @returns {number} Its length, -1 when the two differ.
   */
  #pairs(i: number, k: number): number {
    if (this.#left[i] !== this.#right[k]) return -1
    const cell = i * this.#width + k
    return this.#before[cell]! + 1 + this.#after[cell + this.#width + 1]!
  }
}

/** Collects rows, gluing equal pairs that share their flags into one. */
class Rows {
  readonly rows: AlignmentRow[] = []
  readonly #left: readonly AlignmentToken[]
  readonly #right: readonly AlignmentToken[]

  constructor(left: readonly AlignmentToken[], right: readonly AlignmentToken[]) {
    this.#left = left
    this.#right = right
  }

  /**
   * Add the tokens no pair claims: one row, however many tokens sit on each side.
   *
   * @param left - First unpaired left token and the one past the last.
   * @param right - The same on the right.
   */
  gap(left: readonly [number, number], right: readonly [number, number]): void {
    const removed = left[1] > left[0]
    const added = right[1] > right[0]
    if (!removed && !added) return
    let operation: AlignmentOperation = 'replace'
    if (!added) operation = 'delete'
    if (!removed) operation = 'insert'
    this.rows.push({
      operation,
      left: rangeOf(this.#left, left),
      right: rangeOf(this.#right, right),
    })
  }

  /**
   * Add one pair of tokens that compare equal.
   *
   * @param pair - Left and right token.
   * @param ambiguous - Whether another alignment pairs them otherwise.
   */
  equal(pair: readonly [number, number], ambiguous: boolean): void {
    const [i, j] = pair
    const exact = this.#left[i]?.raw === this.#right[j]?.raw
    const last = this.rows.at(-1)
    let from = pair
    if (last?.operation === 'equal' && last.exact === exact && last.ambiguous === ambiguous) {
      from = [last.left.from, last.right.from]
      this.rows.pop()
    }
    this.rows.push({
      operation: 'equal',
      left: rangeOf(this.#left, [from[0], i + 1]),
      right: rangeOf(this.#right, [from[1], j + 1]),
      exact,
      ambiguous,
    })
  }
}

/**
 * Refuse anything but two strings, which a typed caller never passes and a JavaScript one can.
 *
 * @param texts - The value given as the two texts.
 * @throws {InvalidOptionError} When either side is not a string.
 */
function assertSources(texts: unknown): asserts texts is AlignmentSources {
  const sources = isRecord(texts) ? texts : {}
  for (const side of SIDES) {
    if (typeof sources[side] !== 'string') {
      throw new InvalidOptionError(side, sources[side], 'must be a string')
    }
  }
}

/**
 * Resolve the options, refusing a value outside the lists.
 *
 * @param options - What the caller gave.
 * @returns {Required<AlignTextsOptions>} Both settings, defaults filled in.
 * @throws {InvalidOptionError} When `tokens` or `compare` is not one of the listed values.
 */
function alignmentPolicy(options: Readonly<AlignTextsOptions>): Required<AlignTextsOptions> {
  const { tokens = 'words', compare = 'exact' } = options
  if (!alignmentTokens.includes(tokens)) {
    throw new InvalidOptionError('tokens', tokens, `must be one of ${alignmentTokens.join(', ')}`)
  }
  if (!alignmentCompares.includes(compare)) {
    throw new InvalidOptionError(
      'compare',
      compare,
      `must be one of ${alignmentCompares.join(', ')}`,
    )
  }
  return { tokens, compare }
}

/**
 * Align two versions of a text token by token, keeping every span of both.
 *
 * @param texts - The two versions.
 * @param options - How to cut the texts and when two tokens count as equal.
 * @returns {TextAlignment} Tokens, separators and rows, with the settings they were made under.
 * @throws {InvalidOptionError} When a text is not a string or an option is not a listed value.
 * @throws {CipherError} When the texts hold too many tokens to compare. Nothing is cut short.
 */
export function alignTexts(
  texts: Readonly<AlignmentSources>,
  options: Readonly<AlignTextsOptions> = {},
): TextAlignment {
  assertSources(texts)
  const policy = alignmentPolicy(options)
  const left = readText(texts.left, policy)
  const right = readText(texts.right, policy)
  const cells = (left.tokens.length + 1) * (right.tokens.length + 1)
  if (cells > MAX_ALIGNMENT_CELLS) {
    throw new CipherError(
      `Too long to align: ${left.tokens.length} tokens against ${right.tokens.length} is ${cells} comparisons, over the ${MAX_ALIGNMENT_CELLS} limit. Align one section at a time.`,
    )
  }
  const [leftIds = [], rightIds = []] = tokenIds([left.tokens, right.tokens])
  const pairing = new Pairing(leftIds, rightIds)
  const rows = new Rows(left.tokens, right.tokens)
  let i = 0
  let j = 0
  for (const [index, partner] of pairing.partners().entries()) {
    if (partner >= 0) {
      rows.gap([i, index], [j, partner])
      rows.equal([index, partner], !pairing.settled(index, partner))
      i = index + 1
      j = partner + 1
    }
  }
  rows.gap([i, left.tokens.length], [j, right.tokens.length])
  return { ...policy, left, right, rows: rows.rows }
}

/**
 * Whether a value is an object with fields.
 *
 * @param value - Anything.
 * @returns {boolean} True for a plain object, false for arrays and null.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether a value can be an offset or a token number.
 *
 * @param value - Anything.
 * @returns {boolean} True for a whole number from zero up.
 */
function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * Read a span out of a map someone may have edited.
 *
 * @param value - What the map holds there.
 * @returns {AlignmentSpan | undefined} The span, undefined when a field is missing or mistyped.
 */
function spanClaim(value: unknown): AlignmentSpan | undefined {
  if (!isRecord(value)) return undefined
  const { raw, start, end } = value
  if (typeof raw !== 'string' || !isIndex(start) || !isIndex(end)) return undefined
  return { raw, start, end }
}

/**
 * Read a token out of a map someone may have edited.
 *
 * @param value - What the map holds there.
 * @returns {AlignmentToken | undefined} The token, undefined when a field is missing or mistyped.
 */
function tokenClaim(value: unknown): AlignmentToken | undefined {
  const span = spanClaim(value)
  if (span === undefined || !isRecord(value)) return undefined
  const { normalized } = value
  return typeof normalized === 'string' ? { ...span, normalized } : undefined
}

/** A token range as a map states it, the span optional. */
interface RangeClaim {
  readonly from: number
  readonly to: number
  readonly start?: unknown
  readonly end?: unknown
}

/** A row as a map states it. */
interface RowClaim {
  readonly operation: AlignmentOperation
  readonly left: RangeClaim
  readonly right: RangeClaim
  readonly exact?: boolean
}

/**
 * Read a token range out of a map someone may have edited.
 *
 * @param value - What the row holds on one side.
 * @returns {RangeClaim | undefined} The range, undefined when `from` or `to` is no token number.
 */
function rangeClaim(value: unknown): RangeClaim | undefined {
  if (!isRecord(value)) return undefined
  const { from, to, start, end } = value
  if (!isIndex(from) || !isIndex(to)) return undefined
  return { from, to, start, end }
}

/**
 * Read a row out of a map someone may have edited.
 *
 * @param value - What the map holds there.
 * @returns {RowClaim | undefined} The row, undefined when a field is missing or mistyped.
 */
function rowClaim(value: unknown): RowClaim | undefined {
  if (!isRecord(value)) return undefined
  const { operation, exact } = value
  const left = rangeClaim(value['left'])
  const right = rangeClaim(value['right'])
  const known = alignmentOperations.find((name) => name === operation)
  if (known === undefined || left === undefined || right === undefined) return undefined
  if (exact === undefined) return { operation: known, left, right }
  return typeof exact === 'boolean' ? { operation: known, left, right, exact } : undefined
}

/** Token counts a row must have on each side, by operation. */
const ROW_SHAPES: Readonly<Record<AlignmentOperation, string>> = {
  equal: 'as many tokens on the right as on the left, and at least one',
  replace: 'at least one token on each side',
  insert: 'no token on the left and at least one on the right',
  delete: 'at least one token on the left and none on the right',
}

/**
 * Whether a row has the token counts its operation needs.
 *
 * @param operation - What the row says happened.
 * @param counts - Tokens on the left and on the right.
 * @returns {boolean} True when they fit.
 */
function fitsOperation(
  operation: AlignmentOperation,
  counts: readonly [left: number, right: number],
): boolean {
  const [left, right] = counts
  if (operation === 'equal') return left === right && left > 0
  if (operation === 'replace') return left > 0 && right > 0
  return operation === 'insert' ? left === 0 && right > 0 : left > 0 && right === 0
}

/** Checks a map against its two sources, one claim at a time. Trusts nothing in the map. */
class Checker {
  readonly problems: AlignmentProblem[] = []
  count = 0
  readonly #sources: AlignmentSources
  #compare: AlignmentCompare = 'exact'
  #tokens: Readonly<Record<Side, readonly AlignmentToken[]>> = { left: [], right: [] }

  constructor(sources: Readonly<AlignmentSources>) {
    this.#sources = sources
  }

  #report(code: AlignmentProblemCode, at: string, message: string): void {
    this.count += 1
    if (this.problems.length < MAX_ALIGNMENT_PROBLEMS) this.problems.push({ code, at, message })
  }

  /**
   * Check a whole map. Rows are only read once both token lists have the right fields.
   *
   * @param alignment - The map, from `alignTexts` or edited since.
   */
  check(alignment: unknown): void {
    if (!isRecord(alignment)) {
      this.#report('shape', '', 'must be an object with compare, left, right and rows')
      return
    }
    const compare = alignmentCompares.find((name) => name === alignment['compare'])
    if (compare === undefined) {
      this.#report('shape', '/compare', `must be one of ${alignmentCompares.join(', ')}`)
      return
    }
    this.#compare = compare
    const left = this.#side('left', alignment['left'])
    const right = this.#side('right', alignment['right'])
    if (left === undefined || right === undefined) return
    this.#tokens = { left, right }
    this.#rows(alignment['rows'])
  }

  /**
   * Check one side: every token and separator against the source, then that they cover it.
   *
   * @param side - Which text.
   * @param value - What the map holds for it.
   * @returns {AlignmentToken[] | undefined} Its tokens, compared form worked out again from `raw`.
   */
  #side(side: Side, value: unknown): AlignmentToken[] | undefined {
    const text = isRecord(value) ? value : {}
    const tokens = this.#spans({ side, name: 'tokens', value: text['tokens'] }, tokenClaim)
    const separators = this.#spans(
      { side, name: 'separators', value: text['separators'] },
      spanClaim,
    )
    if (tokens === undefined || separators === undefined) return undefined
    for (const [index, token] of tokens.entries()) this.#token(`/${side}/tokens/${index}`, token)
    this.#order(side, tokens)
    this.#coverage(side, [...tokens, ...separators])
    return tokens.map((token) => ({
      ...token,
      normalized: normalizedToken(token.raw, this.#compare),
    }))
  }

  /**
   * Read a list of spans and hold each against the source.
   *
   * @param list - Which list of which side, and what the map holds there.
   * @param read - Reads one entry.
   * @returns {Span[] | undefined} The entries, undefined when the list or an entry is malformed.
   */
  #spans<Span extends AlignmentSpan>(
    list: Readonly<{ side: Side; name: 'tokens' | 'separators'; value: unknown }>,
    read: (entry: unknown) => Span | undefined,
  ): Span[] | undefined {
    const { side, value } = list
    const at = `/${side}/${list.name}`
    if (!Array.isArray(value)) {
      this.#report('shape', at, 'must be a list')
      return undefined
    }
    const spans = value.flatMap((entry: unknown) => read(entry) ?? [])
    if (spans.length < value.length) {
      const broken = value.findIndex((entry: unknown) => read(entry) === undefined)
      this.#report('shape', `${at}/${broken}`, 'needs raw, start and end, a token normalized too')
      return undefined
    }
    for (const [index, span] of spans.entries()) this.#span(`${at}/${index}`, span)
    return spans
  }

  #span(at: string, span: Readonly<AlignmentSpan>): void {
    const { raw, start, end } = span
    const source = this.#sources[at.startsWith('/left/') ? 'left' : 'right']
    if (start >= end || end > source.length) {
      this.#report('range', at, `[${start}, ${end}) is no span of a ${source.length} unit text`)
    } else if (source.slice(start, end) !== raw) {
      this.#report('raw', at, `raw is not what the source holds at [${start}, ${end})`)
    }
  }

  #token(at: string, token: Readonly<AlignmentToken>): void {
    if (normalizedToken(token.raw, this.#compare) !== token.normalized) {
      this.#report('normalized', at, `normalized is not raw compared as ${this.#compare}`)
    }
  }

  #order(side: Side, tokens: readonly AlignmentToken[]): void {
    for (const [index, token] of tokens.entries()) {
      const before = tokens[index - 1]
      if (before !== undefined && token.start < before.end) {
        this.#report(
          'order',
          `/${side}/tokens/${index}`,
          'starts before the token ahead of it ends',
        )
      }
    }
  }

  #coverage(side: Side, spans: readonly AlignmentSpan[]): void {
    const { length } = this.#sources[side]
    let covered = 0
    for (const { start, end } of spans.toSorted((a, b) => a.start - b.start)) {
      if (start > covered) this.#uncovered(side, [covered, start])
      if (start < covered) {
        this.#report('overlap', `/${side}`, `[${start}, ${Math.min(end, covered)}) is taken twice`)
      }
      covered = Math.max(covered, end)
    }
    if (covered < length) this.#uncovered(side, [covered, length])
  }

  #uncovered(side: Side, span: readonly [number, number]): void {
    this.#report('gap', `/${side}`, `[${span[0]}, ${span[1]}) is in no token and no separator`)
  }

  #rows(value: unknown): void {
    if (!Array.isArray(value)) {
      this.#report('shape', '/rows', 'must be a list')
      return
    }
    const reached = { left: 0, right: 0 }
    for (const [index, entry] of value.entries()) {
      const row = rowClaim(entry)
      if (row === undefined) {
        this.#report('shape', `/rows/${index}`, 'needs operation, left and right with from and to')
      } else if (this.#inRange(index, row)) {
        for (const side of SIDES) {
          reached[side] = this.#step(`/rows/${index}/${side}`, [reached[side], row[side]])
        }
        this.#row(`/rows/${index}`, row)
      }
    }
    for (const side of SIDES) {
      const total = this.#tokens[side].length
      if (reached[side] < total) {
        this.#report('gap', '/rows', `${side} tokens ${reached[side]} to ${total} are in no row`)
      }
    }
  }

  #inRange(index: number, row: Readonly<RowClaim>): boolean {
    let inside = true
    for (const side of SIDES) {
      const { from, to } = row[side]
      if (from > to || to > this.#tokens[side].length) {
        inside = false
        this.#report(
          'range',
          `/rows/${index}/${side}`,
          `${from} to ${to} is no range of ${this.#tokens[side].length} tokens`,
        )
      }
    }
    return inside
  }

  /**
   * Hold one side of a row against where the rows before it stopped.
   *
   * @param at - Where that side sits in the map.
   * @param step - Tokens reached so far, and the range.
   * @returns {number} Tokens reached after this row.
   */
  #step(at: string, step: readonly [reached: number, range: RangeClaim]): number {
    const [reached, { from, to }] = step
    if (from > reached) this.#report('gap', at, `tokens ${reached} to ${from} are in no row`)
    if (from < reached) {
      this.#report('overlap', at, `starts at token ${from}, the rows before it reach ${reached}`)
    }
    return Math.max(reached, to)
  }

  #row(at: string, row: Readonly<RowClaim>): void {
    const { operation, left, right } = row
    if (!fitsOperation(operation, [left.to - left.from, right.to - right.from])) {
      this.#report('operation', at, `${operation} takes ${ROW_SHAPES[operation]}`)
      return
    }
    this.#rowSpans(at, row)
    if (operation === 'equal') this.#equal(at, row)
    if (operation === 'replace' && this.#differs(row, 'normalized') === undefined) {
      this.#report('equality', at, 'says replace, but the tokens compare equal one for one')
    }
  }

  #rowSpans(at: string, row: Readonly<RowClaim>): void {
    for (const side of SIDES) {
      const range = row[side]
      const { start, end } = rangeOf(this.#tokens[side], [range.from, range.to])
      const stated = range.start !== undefined || range.end !== undefined
      if (stated && (range.start !== start || range.end !== end)) {
        const message = `tokens ${range.from} to ${range.to} take [${start}, ${end})`
        this.#report('span', `${at}/${side}`, message)
      }
    }
  }

  #equal(at: string, row: Readonly<RowClaim>): void {
    const differing = this.#differs(row, 'normalized')
    if (differing !== undefined) {
      this.#report('equality', at, `left token ${differing} does not equal its partner`)
      return
    }
    const exact = this.#differs(row, 'raw') === undefined
    if (row.exact !== undefined && row.exact !== exact) {
      this.#report('equality', at, `exact is ${String(exact)} for these tokens`)
    }
  }

  /**
   * The first left token of a row that differs from the right token across from it.
   *
   * @param row - A row with as many tokens as it likes on each side.
   * @param field - Compare the raw tokens or their compared form.
   * @returns {number | undefined} Its number, undefined when the two sides match one for one.
   */
  #differs(row: Readonly<RowClaim>, field: 'raw' | 'normalized'): number | undefined {
    const { left, right } = row
    if (left.to - left.from !== right.to - right.from) return left.from
    for (let offset = 0; left.from + offset < left.to; offset += 1) {
      const ours = this.#tokens.left[left.from + offset]
      const theirs = this.#tokens.right[right.from + offset]
      if (ours?.[field] !== theirs?.[field]) return left.from + offset
    }
    return undefined
  }
}

/**
 * Check a map against its two texts, without aligning them again. `ambiguous` goes unchecked.
 *
 * @param texts - The two versions.
 * @param alignment - The map, from `alignTexts` or edited since.
 * @returns {AlignmentCheck} Whether it holds, and what is wrong when it does not.
 * @throws {InvalidOptionError} When a text is not a string.
 */
export function checkAlignment(
  texts: Readonly<AlignmentSources>,
  alignment: unknown,
): AlignmentCheck {
  assertSources(texts)
  const checker = new Checker(texts)
  checker.check(alignment)
  return { valid: checker.count === 0, problems: checker.problems, count: checker.count }
}
