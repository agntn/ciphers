import type { CipherBaseOptions } from './types'
import { CipherError } from './errors'

/** Shared utilities extracted from cipher implementations. */

/**
 * Build a 5×5 Polybius square from an optional keyword.
 * I/J share a cell. Used by Polybius, Bifid, Playfair.
 * Returns 1-indexed positions for compatibility with all consumers.
 *
 * @param key - Optional keyword placed before the remaining alphabet.
 * @returns {object} The square and its one-indexed letter positions.
 */
export function buildPolybiusSquare(key?: string): {
  square: string[][]
  pos: Map<string, [number, number]>
} {
  const seen = new Set<string>()
  const letters: string[] = []
  const candidates = `${(key ?? '').toUpperCase()}ABCDEFGHIJKLMNOPQRSTUVWXYZ`
  for (const candidate of candidates) {
    if (candidate < 'A' || candidate > 'Z') continue
    const letter = candidate === 'J' ? 'I' : candidate
    if (seen.has(letter)) continue
    seen.add(letter)
    letters.push(letter)
  }
  const square: string[][] = []
  const pos = new Map<string, [number, number]>()
  for (let r = 0; r < 5; r++) {
    square[r] = []
    for (let c = 0; c < 5; c++) {
      const ch = letters[r * 5 + c]!
      square[r]![c] = ch
      pos.set(ch, [r + 1, c + 1])
    }
  }
  return { square, pos }
}

function buildColumnOrder(key: string): number[] {
  const upper = key.toUpperCase()
  const indexed = Array.from(upper, (c, i) => ({ char: c, idx: i }))
  const sorted = [...indexed].sort((a, b) => a.char.localeCompare(b.char) || a.idx - b.idx)
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

export { getOpt } from './types'

// ── LRU Cache ──────────────────────────────────────────────────────────

/** Least-recently-used cache with max size eviction. */
export class LruCache<K, V> {
  private map = new Map<K, { value: V; ts: number }>()
  constructor(private readonly max: number) {}
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

// ── Error Handling ─────────────────────────────────────────────────────

/**
 * Wrap a cipher operation with standardized error handling.
 * Catches any error and normalizes it via normalizeError.
 *
 * @param name - Cipher name included in the fallback error.
 * @param fn - Cipher operation to execute.
 * @returns {T} The operation result.
 */
export function withCipherError<T>(name: string, fn: () => T): T {
  try {
    return fn()
  } catch (e) {
    if (e instanceof CipherError) throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw new (class extends Error {
      name = 'CipherError'
      constructor() {
        super(`[${name}] ${msg}`)
      }
    })()
  }
}
