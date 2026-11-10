import type { CipherBaseOptions } from './types.ts'
import { alphabetSymbols, spellings } from './alphabet.ts'
import { InvalidOptionError } from './errors.ts'

/** Shared utilities extracted from cipher implementations. */

/** The default square: A to Z, J left to I. */
const SQUARE_LATIN = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'

/** A Polybius square with one-indexed positions. */
export interface PolybiusSquare {
  /** The cells, row by row. */
  square: string[][]
  /** Row and column of each cell. */
  pos: Map<string, [number, number]>
  /** Cells per row. */
  side: number
  /** Row and column of each character the square holds. */
  locate: (text: string) => [number, number][]
}

/** How a square reads its keyword and its text. */
interface SquareReader {
  readonly symbols: readonly string[]
  readonly ofKey: (key: string) => string[]
  readonly ofText: (text: string) => string[]
}

/**
 * The A-Z letters of uppercased text, J as I.
 *
 * @param upper - Uppercased text.
 * @returns {string[]} One cell per letter.
 */
function latinCells(upper: string): string[] {
  const cells: string[] = []
  for (const character of upper) {
    if (character < 'A' || character > 'Z') continue
    cells.push(character === 'J' ? 'I' : character)
  }
  return cells
}

/**
 * Reads text in a custom alphabet, either case.
 *
 * @param alphabet - The `alphabet` option.
 * @returns {SquareReader} The reader.
 * @throws {InvalidOptionError} On an alphabet that isn't a square of distinct symbols.
 */
function symbolReader(alphabet: unknown): SquareReader {
  const symbols = alphabetSymbols(alphabet, 4)
  if (!Number.isInteger(Math.sqrt(symbols.length))) {
    throw new InvalidOptionError(
      'alphabet',
      alphabet,
      `must hold a square number of symbols, like 9, 16, 25 or 36, and holds ${symbols.length}`,
    )
  }
  const known = new Set(symbols)
  const cells = (text: string) =>
    Array.from(text).flatMap((character) => {
      const cell = spellings(character).find((spelling) => known.has(spelling))
      return cell === undefined ? [] : [cell]
    })
  return { symbols, ofKey: cells, ofText: cells }
}

/**
 * Build a Polybius square, the keyword first.
 *
 * @param key - Optional keyword.
 * @param alphabet - Symbols of the square, A-Z with J as I by default.
 * @returns {PolybiusSquare} The square.
 * @throws {InvalidOptionError} On a bad alphabet.
 */
export function buildPolybiusSquare(key = '', alphabet?: unknown): PolybiusSquare {
  const reader: SquareReader =
    alphabet === undefined
      ? {
          symbols: Array.from(SQUARE_LATIN),
          ofKey: (word) => latinCells(word.toUpperCase()),
          ofText: (text) => latinCells(upperCase(text)),
        }
      : symbolReader(alphabet)
  const cells = [...new Set([...reader.ofKey(key), ...reader.symbols])]
  const side = Math.sqrt(cells.length)
  const square = Array.from({ length: side }, (_, row) => cells.slice(row * side, (row + 1) * side))
  const pos = new Map(
    cells.map((cell, index): [string, [number, number]] => [
      cell,
      [Math.floor(index / side) + 1, (index % side) + 1],
    ]),
  )
  const locate = (text: string): [number, number][] =>
    reader.ofText(text).flatMap((cell) => {
      const [row, column] = pos.get(cell) ?? []
      return row === undefined || column === undefined ? [] : [[row, column]]
    })
  return { square, pos, side, locate }
}

/**
 * Number the key's letters in English collation whatever the host locale, repeats left to right.
 *
 * @param key - Keyword that orders the columns.
 * @returns {number[]} The rank of each key position.
 */
export function buildColumnOrder(key: string): number[] {
  const upper = key.toUpperCase()
  const indexed = Array.from(upper, (c, i) => ({ char: c, idx: i }))
  const sorted = [...indexed].sort((a, b) => a.char.localeCompare(b.char, 'en') || a.idx - b.idx)
  const order = Array.from({ length: sorted.length }, () => 0)
  for (let i = 0; i < sorted.length; i++) order[sorted[i]!.idx] = i
  return order
}

/**
 * Columnar transposition: write the text in rows under the key, read the columns in the key's
 * alphabetical order, repeated letters left to right. Used by Columnar and ADFGVX.
 *
 * @param text - Text to transpose.
 * @param key - Keyword whose letters order the columns.
 * @returns {string} The columns read one after another.
 */
export function encodeColumnar(text: string, key: string): string {
  const order = buildColumnOrder(key)
  const cols = order.length
  const chars = Array.from(text)
  const colOrder = order.map((_, i) => order.indexOf(i))
  let result = ''
  for (const col of colOrder) {
    for (let i = col; i < chars.length; i += cols) {
      result += chars[i]
    }
  }
  return result
}

/**
 * Undo {@link encodeColumnar}. A short last row leaves the rightmost columns one letter shorter.
 *
 * @param text - Transposed text.
 * @param key - The keyword it was transposed with.
 * @returns {string} The text in its original order.
 */
export function decodeColumnar(text: string, key: string): string {
  const order = buildColumnOrder(key)
  const cols = order.length
  const chars = Array.from(text)
  const fullRows = Math.floor(chars.length / cols)
  const longColumns = chars.length % cols
  const colOrder = order.map((_, i) => order.indexOf(i))
  const columns: string[][] = Array.from({ length: cols }, () => [])
  let offset = 0
  for (const col of colOrder) {
    const length = fullRows + (col < longColumns ? 1 : 0)
    columns[col] = chars.slice(offset, offset + length)
    offset += length
  }
  let result = ''
  for (let row = 0; row < fullRows + (longColumns > 0 ? 1 : 0); row++) {
    for (let col = 0; col < cols; col++) {
      const char = columns[col]?.[row]
      if (char !== undefined) result += char
    }
  }
  return result
}

/**
 * Extract common base options with defaults.
 *
 * @param opts - Cipher options.
 * @returns {object} Resolved `preserveCase` and `stripNonAlpha` values.
 */
export function processBaseOptions(opts: Readonly<CipherBaseOptions>): {
  preserveCase: boolean
  stripNonAlpha: boolean
} {
  return {
    preserveCase: (opts.preserveCase as boolean | undefined) ?? true,
    stripNonAlpha: (opts.stripNonAlpha as boolean | undefined) ?? false,
  }
}

/**
 * Apply the shared flags to the input of a cipher that keeps every letter's case in place.
 *
 * @param text - Input text.
 * @param base - Resolved `preserveCase` and `stripNonAlpha` values.
 * @returns {string} The text without non-letters and with a-z uppercased, as the flags ask.
 */
export function applyBaseOptions(
  text: string,
  base: Readonly<{ preserveCase: boolean; stripNonAlpha: boolean }>,
): string {
  const input = base.stripNonAlpha ? text.replaceAll(/[^A-Za-z]/g, '') : text
  return base.preserveCase ? input : input.replaceAll(/[a-z]+/g, (run) => run.toUpperCase())
}

/**
 * Uppercase each character unless it would turn into A-Z without being in A-Z, like `ß`.
 *
 * @param text - Input text.
 * @returns {string} The uppercased text, with `ß`, `ı` and `ﬁ` left as they are.
 */
export function upperCase(text: string): string {
  return Array.from(text, (character) => {
    const upper = character.toUpperCase()
    return /[a-z]/.test(character) || !/[A-Z]/.test(upper) ? upper : character
  }).join('')
}

export { getOpt } from './types.ts'

/**
 * Mulberry32, a small seeded generator.
 *
 * @param seed - The seed.
 * @returns {() => number} A function giving the next number in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

// ── LRU Cache ──────────────────────────────────────────────────────────

/** Least-recently-used cache with max size eviction. */
export class LruCache<K, V> {
  private readonly max: number
  private map = new Map<K, { value: V; ts: number }>()
  constructor(max: number) {
    this.max = max
  }
  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    // Touch: move to end (most recent)
    this.map.delete(key)
    this.map.set(key, { value: entry.value, ts: performance.now() })
    return entry.value
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    if (this.map.size >= this.max) {
      // Evict oldest (first entry)
      const first = this.map.keys().next().value
      if (first !== undefined) this.map.delete(first)
    }
    this.map.set(key, { value, ts: performance.now() })
  }
  has(key: K): boolean {
    return this.map.has(key)
  }
  clear(): void {
    this.map.clear()
  }
  get size(): number {
    return this.map.size
  }
}

/**
 * Build a stable cache key from encode/decode arguments.
 *
 * @param operation - Cipher operation.
 * @param text - Input text.
 * @param options - Effective cipher options.
 * @returns {string} Serialized cache key.
 */
export function cipherCacheKey(
  operation: string,
  text: string,
  options?: Readonly<Record<string, unknown>>,
): string {
  return `${operation}|${text}|${JSON.stringify(options ?? {})}`
}
