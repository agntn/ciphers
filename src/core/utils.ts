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

// ── Rate Limiter ───────────────────────────────────────────────────────

/** Token-bucket rate limiter. Allows `maxPerSec` calls per second. */
export class RateLimiter {
  private tokens: number
  private lastRefill: number
  constructor(private readonly maxPerSec: number) {
    this.tokens = maxPerSec
    this.lastRefill = Date.now()
  }
  /**
   * Consume one token when available.
   *
   * @returns {boolean} Whether the call is allowed.
   */
  allow(): boolean {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens--
      return true
    }
    return false
  }
  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    if (elapsed > 0) {
      this.tokens = Math.min(this.maxPerSec, this.tokens + elapsed * this.maxPerSec)
      this.lastRefill = now
    }
  }
}

/** Thrown when a rate-limited call is rejected. */
export class RateLimitError extends Error {
  constructor(cipher: string) {
    super(`[${cipher}] Rate limit exceeded — too many calls per second`)
    this.name = 'RateLimitError'
  }
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
