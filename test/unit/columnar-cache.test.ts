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

// ── Columnar cipher: cache behavior ─────────────────────────────────────

describe('columnar — cache', () => {
  const col = createColumnar()

  it('caches encode results', () => {
    col.reset()
    const r1 = col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' })
    const r2 = col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' })
    expect(r1.text).toBe(r2.text)
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

  it('answers from the cache until reset() clears it', () => {
    col.reset()
    const cache: unknown = Reflect.get(col, 'cache')
    if (!(cache instanceof LruCache)) throw new TypeError('Columnar cipher has no LruCache')
    cache.set(cipherCacheKey('encode', 'ATTACK', { key: 'KEY' }), 'PLANTED')
    expect(col.encode('ATTACK', { key: 'KEY' }).text).toBe('PLANTED')
    col.reset()
    expect(col.encode('ATTACK', { key: 'KEY' }).text).toBe('TCAATK')
  })
})

// ── Columnar cipher: key search ─────────────────────────────────────────

describe('columnar: key search', () => {
  it('answers a thousand keys in a row from the registry instance', () => {
    const col = createColumnar()
    col.reset()
    const keys = Array.from({ length: 1000 }, (_, i) => `K${i.toString(36).toUpperCase()}`)
    for (const key of keys) col.decode('C TAWT AATNAKD', { key })
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
