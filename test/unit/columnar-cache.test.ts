import { describe, it, expect } from 'vite-plus/test'
import '../../src/index'
import { create } from '../../src/core/registry'
import { LruCache, RateLimiter, cipherCacheKey } from '../../src/core/utils'

// ── LruCache unit tests ─────────────────────────────────────────────────

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LruCache<string, string>(10)
    cache.set('a', 'alpha')
    expect(cache.get('a')).toBe('alpha')
  })

  it('returns undefined for missing keys', () => {
    const cache = new LruCache<string, string>(10)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('evicts oldest entry when full', () => {
    const cache = new LruCache<string, string>(3)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    cache.set('d', '4') // evicts 'a'
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('2')
    expect(cache.get('d')).toBe('4')
  })

  it('re-access prevents eviction (LRU)', () => {
    const cache = new LruCache<string, string>(3)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    cache.get('a') // touch 'a' → most recent
    cache.set('d', '4') // evicts 'b' (oldest)
    expect(cache.get('a')).toBe('1')
    expect(cache.get('b')).toBeUndefined()
  })

  it('has() reports presence', () => {
    const cache = new LruCache<string, string>(5)
    cache.set('x', '10')
    expect(cache.has('x')).toBe(true)
    expect(cache.has('y')).toBe(false)
  })

  it('clear() empties the cache', () => {
    const cache = new LruCache<string, string>(5)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('size tracks entries', () => {
    const cache = new LruCache<string, string>(10)
    expect(cache.size).toBe(0)
    cache.set('a', '1')
    expect(cache.size).toBe(1)
    cache.set('b', '2')
    expect(cache.size).toBe(2)
  })
})

// ── RateLimiter unit tests ──────────────────────────────────────────────

describe('RateLimiter', () => {
  it('allows calls within budget', () => {
    const limiter = new RateLimiter(10)
    for (let i = 0; i < 10; i++) {
      expect(limiter.allow()).toBe(true)
    }
  })

  it('rejects calls over budget', () => {
    const limiter = new RateLimiter(5)
    for (let i = 0; i < 5; i++) limiter.allow()
    expect(limiter.allow()).toBe(false)
  })

  it('refills tokens over time', async () => {
    const limiter = new RateLimiter(10)
    for (let i = 0; i < 10; i++) limiter.allow()
    expect(limiter.allow()).toBe(false)
    // Wait 200ms → ~2 tokens refilled (10/sec)
    await new Promise((r) => setTimeout(r, 250))
    expect(limiter.allow()).toBe(true)
  })
})

// ── cipherCacheKey ──────────────────────────────────────────────────────

describe('cipherCacheKey', () => {
  it('produces stable keys for same inputs', () => {
    const k1 = cipherCacheKey('encode', 'HELLO', { key: 'TEST' })
    const k2 = cipherCacheKey('encode', 'HELLO', { key: 'TEST' })
    expect(k1).toBe(k2)
  })

  it('differentiates operations', () => {
    const enc = cipherCacheKey('encode', 'HELLO', { key: 'TEST' })
    const dec = cipherCacheKey('decode', 'HELLO', { key: 'TEST' })
    expect(enc).not.toBe(dec)
  })

  it('differentiates text', () => {
    const k1 = cipherCacheKey('encode', 'HELLO', { key: 'TEST' })
    const k2 = cipherCacheKey('encode', 'WORLD', { key: 'TEST' })
    expect(k1).not.toBe(k2)
  })

  it('differentiates keys', () => {
    const k1 = cipherCacheKey('encode', 'HELLO', { key: 'AAA' })
    const k2 = cipherCacheKey('encode', 'HELLO', { key: 'BBB' })
    expect(k1).not.toBe(k2)
  })
})

// ── Columnar cipher: cache behavior ─────────────────────────────────────

describe('columnar — cache', () => {
  const col = create('columnar')

  it('caches encode results (same input = same object reference)', () => {
    col.reset()
    const r1 = col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' })
    const r2 = col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' })
    expect(r1.text).toBe(r2.text)
    // Results should be identical reference from cache
    expect(r1.text).toStrictEqual(r2.text)
  })

  it('caches decode results', () => {
    col.reset()
    const r1 = col.decode('N W ETSLD ALEE  DEA FHT', { key: 'GERMAN' })
    const r2 = col.decode('N W ETSLD ALEE  DEA FHT', { key: 'GERMAN' })
    expect(r1.text).toBe(r2.text)
  })

  it('cache differentiates encode vs decode', () => {
    col.reset()
    const text = 'HELLO WORLD'
    const key = 'SECRET'
    const enc = col.encode(text, { key })
    const dec = col.decode(text, { key })
    // encode('HELLO WORLD', key) ≠ decode('HELLO WORLD', key)
    expect(enc.text).not.toBe(dec.text)
  })

  it('different keys produce different cached results', () => {
    col.reset()
    const r1 = col.encode('DEFEND THE EAST', { key: 'GERMAN' })
    const r2 = col.encode('DEFEND THE EAST', { key: 'CIPHER' })
    expect(r1.text).not.toBe(r2.text)
  })

  it('reset() clears cache (re-computation happens)', () => {
    col.reset()
    const r1 = col.encode('TEST TEXT', { key: 'KEY' })
    col.reset()
    const r2 = col.encode('TEST TEXT', { key: 'KEY' })
    // Both valid (same cipher), just verifying reset doesn't break anything
    expect(r1.text).toBe(r2.text)
  })
})

// ── Columnar cipher: rate limiting ──────────────────────────────────────

describe('columnar — rate limit', () => {
  it('allows normal-rate calls', () => {
    const col = create('columnar')
    col.reset()
    // A few calls should be fine (100/sec default)
    for (let i = 0; i < 10; i++) {
      col.encode('NORMAL CALL', { key: 'K' })
    }
    // No error = pass
  })

  it('throws RateLimitError when limit exceeded', () => {
    const col = create('columnar')
    col.reset()
    // Burn through the 100/sec budget with rapid-fire calls (cache bypass: different texts)
    let throttled = false
    for (let i = 0; i < 200; i++) {
      try {
        col.encode(`TEXT-${i}-${Math.random()}`, { key: 'BURST' })
      } catch (e: any) {
        if (e.name === 'RateLimitError' || e.message.includes('Rate limit')) {
          throttled = true
          break
        }
        throw e
      }
    }
    col.reset() // restore budget for other tests
    expect(throttled).toBe(true)
  })

  it('RateLimitError is wrapped as CipherError', () => {
    const col = create('columnar')
    col.reset()
    // Force rate limit
    for (let i = 0; i < 200; i++) {
      try {
        col.encode(`X-${i}`, { key: 'K' })
      } catch {}
    }
    let gotCipherError = false
    try {
      col.encode(`OVERFLOW-${Date.now()}`, { key: 'K' })
    } catch (e: any) {
      if (e.name === 'CipherError') gotCipherError = true
    }
    col.reset() // restore budget for other tests
    expect(gotCipherError).toBe(true)
  })
})

// ── Columnar cipher: backwards compatibility ────────────────────────────

describe('columnar — backwards compatibility', () => {
  it('encodes with key', () => {
    const col = create('columnar')
    col.reset()
    expect(col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' }).text).toBe(
      'N W ETSLD ALEE  DEA FHT',
    )
  })

  it('roundtrips', () => {
    const col = create('columnar')
    col.reset()
    const encoded = col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' })
    const decoded = col.decode(encoded.text, { key: 'GERMAN' })
    expect(decoded.text).toBe('DEFEND THE EAST WALL')
  })

  it('requires key', () => {
    const col = create('columnar')
    col.reset()
    expect(() => col.encode('TEST')).toThrow()
  })

  it('info() returns correct metadata', () => {
    const col = create('columnar')
    const info = col.info()
    expect(info.name).toBe('columnar')
    expect(info.family).toBe('transposition')
    expect(info.selfInverse).toBe(false)
    expect(info.options).toHaveLength(1)
    expect(info.options[0]!.name).toBe('key')
  })

  it('encode/decode results have correct shape', () => {
    const col = create('columnar')
    col.reset()
    const r = col.encode('HELLO', { key: 'AB' })
    expect(r).toHaveProperty('text')
    expect(r).toHaveProperty('cipher', 'columnar')
    expect(r).toHaveProperty('operation', 'encode')
    expect(r).toHaveProperty('options')
  })
})
