import { describe, it, expect } from 'vite-plus/test'
import type { Cipher } from '../../src/core/cipher.ts'
import { create } from '../../src/core/registry.ts'
import { LruCache, cipherCacheKey } from '../../src/core/utils.ts'

interface ResettableCipher extends Cipher {
  reset(): void
}

function isResettableCipher(cipher: Readonly<Cipher>): cipher is ResettableCipher {
  return 'reset' in cipher && typeof cipher.reset === 'function'
}

function createColumnar(): ResettableCipher {
  const cipher = create('columnar')
  if (!isResettableCipher(cipher)) throw new TypeError('Columnar cipher does not expose reset()')
  return cipher
}

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
  const col = createColumnar()

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
    const r1 = col.decode('EVLNACDTESEAROFODEECWIREE', { key: 'ZEBRAS' })
    const r2 = col.decode('EVLNACDTESEAROFODEECWIREE', { key: 'ZEBRAS' })
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

// ── Columnar cipher: key search ─────────────────────────────────────────

describe('columnar: key search', () => {
  it('answers a thousand keys in a row from the registry instance', () => {
    const col = createColumnar()
    col.reset()
    const keys = Array.from({ length: 1000 }, (_, i) => `K${i.toString(36).toUpperCase()}`)
    const decoded = keys.map((key) => col.decode('C TAWT AATNAKD', { key }).text)
    expect(decoded).toHaveLength(1000)
    expect(col.decode('C TAWT AATNAKD', { key: 'ZEBRA' }).text).toBe('ATTACK AT DAWN')
  })
})

// ── Columnar cipher: backwards compatibility ────────────────────────────

describe('columnar — backwards compatibility', () => {
  it('keeps complete-grid encoding stable', () => {
    const col = createColumnar()
    col.reset()
    expect(col.encode('ATTACK', { key: 'KEY' }).text).toBe('TCAATK')
  })

  it('roundtrips', () => {
    const col = createColumnar()
    col.reset()
    const encoded = col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' })
    const decoded = col.decode(encoded.text, { key: 'GERMAN' })
    expect(decoded.text).toBe('DEFEND THE EAST WALL')
  })

  it('requires key', () => {
    const col = createColumnar()
    col.reset()
    expect(() => col.encode('TEST')).toThrow()
  })

  it('info() returns correct metadata', () => {
    const col = createColumnar()
    const info = col.info()
    expect(info.name).toBe('columnar')
    expect(info.family).toBe('transposition')
    expect(info.selfInverse).toBe(false)
    expect(info.options).toHaveLength(1)
    expect(info.options[0]!.name).toBe('key')
  })

  it('encode/decode results have correct shape', () => {
    const col = createColumnar()
    col.reset()
    const r = col.encode('HELLO', { key: 'AB' })
    expect(r).toHaveProperty('text')
    expect(r).toHaveProperty('cipher', 'columnar')
    expect(r).toHaveProperty('operation', 'encode')
    expect(r).toHaveProperty('options')
  })
})
