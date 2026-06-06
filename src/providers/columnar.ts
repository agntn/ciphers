import type { CipherProvider, CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { getOpt, LruCache, RateLimiter, RateLimitError, cipherCacheKey } from '../core/utils'
import { MissingOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

// ── Columnar transposition internals ────────────────────────────────────

function buildColumnOrder(key: string): number[] {
  const upper = key.toUpperCase()
  const indexed = Array.from(upper, (c, i) => ({ char: c, idx: i }))
  const sorted = [...indexed].sort((a, b) => a.char.localeCompare(b.char) || a.idx - b.idx)
  const order = new Array(sorted.length)
  for (let i = 0; i < sorted.length; i++) order[sorted[i]!.idx] = i
  return order
}

function encodeColumnar(text: string, key: string): string {
  const order = buildColumnOrder(key)
  const cols = order.length
  const rows = Math.ceil(text.length / cols)
  const padded = text.padEnd(rows * cols, ' ')
  const grid: string[][] = []
  for (let r = 0; r < rows; r++) {
    grid[r] = Array.from(padded.slice(r * cols, (r + 1) * cols))
  }
  const colOrder = order.map((_, i) => order.indexOf(i))
  let result = ''
  for (const col of colOrder) {
    for (let r = 0; r < rows; r++) {
      result += grid[r]![col]
    }
  }
  return result.trimEnd()
}

function decodeColumnar(text: string, key: string): string {
  const order = buildColumnOrder(key)
  const cols = order.length
  const rows = Math.ceil(text.length / cols)
  const fullLen = rows * cols
  const padCount = fullLen - text.length
  const colOrder = order.map((_, i) => order.indexOf(i))
  const colLens = new Array(cols).fill(rows)
  for (let i = cols - padCount; i < cols; i++) {
    colLens[colOrder[i]!]!--
  }
  const columns: string[][] = Array.from({ length: cols }, () => [])
  let idx = 0
  for (const col of colOrder) {
    const len = colLens[col]!
    for (let i = 0; i < len; i++) {
      columns[col]!.push(text[idx++]!)
    }
  }
  let result = ''
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (columns[c]![r] !== undefined) result += columns[c]![r]
    }
  }
  return result.trimEnd()
}

function validate(opts: CipherBaseOptions): { key: string } {
  const key = getOpt<string | undefined>(opts, "key", undefined)
  if (!key) throw new MissingOptionError('key')
  return { key }
}

// ── Cache + rate limiter (per-instance) ─────────────────────────────────

const DEFAULT_CACHE_SIZE = 128
const DEFAULT_RATE_LIMIT = 100 // calls per second

class ColumnarProvider implements CipherProvider {
  private cache: LruCache<string, string>
  private limiter: RateLimiter

  constructor() {
    this.cache = new LruCache(DEFAULT_CACHE_SIZE)
    this.limiter = new RateLimiter(DEFAULT_RATE_LIMIT)
  }

  name(): string { return 'columnar' }

  info(): CipherInfo {
    return {
      name: 'columnar',
      label: 'Columnar Transposition',
      description: 'Plaintext written in rows, columns read in keyword order',
      family: 'transposition',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true, description: 'Keyword determining column order' },
      ],
      keyspace: 'n! (column permutations)',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { key } = validate(options ?? {})
      const ck = cipherCacheKey('encode', text, { key })
      const cached = this.cache.get(ck)
      if (cached !== undefined) {
        return { text: cached, cipher: 'columnar', operation: 'encode', options: { key } }
      }
      if (!this.limiter.allow()) throw new RateLimitError('columnar')
      const result = encodeColumnar(text, key)
      this.cache.set(ck, result)
      return { text: result, cipher: 'columnar', operation: 'encode', options: { key } }
    } catch (e) { throw normalizeError(e, 'columnar') }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const { key } = validate(options ?? {})
      const ck = cipherCacheKey('decode', text, { key })
      const cached = this.cache.get(ck)
      if (cached !== undefined) {
        return { text: cached, cipher: 'columnar', operation: 'decode', options: { key } }
      }
      if (!this.limiter.allow()) throw new RateLimitError('columnar')
      const result = decodeColumnar(text, key)
      this.cache.set(ck, result)
      return { text: result, cipher: 'columnar', operation: 'decode', options: { key } }
    } catch (e) { throw normalizeError(e, 'columnar') }
  }

  /** Reset cache and rate limiter. Useful for testing. */
  reset(): void {
    this.cache.clear()
    this.limiter = new RateLimiter(DEFAULT_RATE_LIMIT)
  }
}

register('columnar', () => new ColumnarProvider())
