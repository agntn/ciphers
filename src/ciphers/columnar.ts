import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { getOpt, LruCache, RateLimiter, RateLimitError, cipherCacheKey } from '../core/utils'
import { MissingOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

// ── Columnar transposition internals ────────────────────────────────────

function buildColumnOrder(key: string): number[] {
  const upper = key.toUpperCase()
  const indexed = Array.from(upper, (c, i) => ({ char: c, idx: i }))
  const sorted = [...indexed].sort((a, b) => a.char.localeCompare(b.char) || a.idx - b.idx)
  const order = Array.from({ length: sorted.length }, () => 0)
  for (let i = 0; i < sorted.length; i++) order[sorted[i]!.idx] = i
  return order
}

function encodeColumnar(text: string, key: string): string {
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

function decodeColumnar(text: string, key: string): string {
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

function validate(opts: Readonly<CipherBaseOptions>): { key: string } {
  const key = getOpt<string | undefined>(opts, 'key', undefined)
  if (!key) throw new MissingOptionError('key')
  return { key }
}

// ── Cache + rate limiter (per-instance) ─────────────────────────────────

const DEFAULT_CACHE_SIZE = 128
const DEFAULT_RATE_LIMIT = 100 // calls per second

class Columnar extends Cipher {
  private cache: LruCache<string, string>
  private limiter: RateLimiter

  constructor() {
    super()
    this.cache = new LruCache(DEFAULT_CACHE_SIZE)
    this.limiter = new RateLimiter(DEFAULT_RATE_LIMIT)
  }

  name(): string {
    return 'columnar'
  }

  info(): CipherInfo {
    return {
      name: 'columnar',
      label: 'Columnar Transposition',
      description: 'Plaintext written in rows, columns read in keyword order',
      family: 'transposition',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Keyword determining column order',
        },
      ],
      keyspace: 'n! (column permutations)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
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
    } catch (e) {
      throw normalizeError(e, 'columnar')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
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
    } catch (e) {
      throw normalizeError(e, 'columnar')
    }
  }

  /** Reset cache and rate limiter. Useful for testing. */
  reset(): void {
    this.cache.clear()
    this.limiter = new RateLimiter(DEFAULT_RATE_LIMIT)
  }
}

register('columnar', Columnar)
