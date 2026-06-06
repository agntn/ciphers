import type { CipherBaseOptions } from './types'

/** Shared cipher utilities — extracted from provider implementations. */

/**
 * Build a 5×5 Polybius square from an optional keyword.
 * I/J share a cell. Used by Polybius, Bifid, Playfair.
 * Returns 1-indexed positions for compatibility with all consumers.
 */
export function buildPolybiusSquare(key?: string): {
  square: string[][]
  pos: Map<string, [number, number]>
} {
  const seen = new Set<string>()
  const letters: string[] = []
  const src = (key ?? '').toUpperCase()
  for (const c of src) {
    if (c < 'A' || c > 'Z') continue
    const ch = c === 'J' ? 'I' : c
    if (!seen.has(ch)) { seen.add(ch); letters.push(ch) }
  }
  for (let i = 65; i <= 90; i++) {
    const ch = String.fromCharCode(i) === 'J' ? 'I' : String.fromCharCode(i)
    if (!seen.has(ch)) { seen.add(ch); letters.push(ch) }
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

/** Extract common base options (preserveCase, stripNonAlpha) with defaults. */
export function processBaseOptions(opts: CipherBaseOptions): {
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
  has(key: K): boolean { return this.map.has(key) }
  clear(): void { this.map.clear() }
  get size(): number { return this.map.size }
}

/** Build a stable cache key from encode/decode arguments. */
export function cipherCacheKey(operation: string, text: string, options?: Record<string, unknown>): string {
  return `${operation}|${text}|${JSON.stringify(options ?? {})}`
}

// ── Rate Limiter ───────────────────────────────────────────────────────

/** Token-bucket rate limiter. Allows `maxPerSec` calls per second. */
export class RateLimiter {
  private tokens: number
  private lastRefill: number
  constructor(
    private readonly maxPerSec: number,
  ) {
    this.tokens = maxPerSec
    this.lastRefill = Date.now()
  }
  /** Returns true if call is allowed; false if throttled. */
  allow(): boolean {
    this.refill()
    if (this.tokens >= 1) { this.tokens--; return true }
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
 */
export function withCipherError<T>(name: string, fn: () => T): T {
  try {
    return fn()
  } catch (e) {
    if (e instanceof Error && e.name === 'CipherError') throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw new (class extends Error {
      name = 'CipherError'
      constructor() { super(`[${name}] ${msg}`) }
    })()
  }
}
