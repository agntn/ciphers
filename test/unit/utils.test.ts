/**
 * cipherhouse pure utility tests.
 */
import { describe, it, expect } from 'vitest'
import {
  LruCache,
  RateLimiter,
  RateLimitError,
  cipherCacheKey,
  buildPolybiusSquare,
  processBaseOptions,
  withCipherError,
} from '../../src/core/utils'

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const c = new LruCache<string, number>(3)
    c.set('a', 1)
    c.set('b', 2)
    expect(c.get('a')).toBe(1)
    expect(c.get('b')).toBe(2)
  })

  it('returns undefined for missing keys', () => {
    const c = new LruCache<string, number>(3)
    expect(c.get('missing')).toBeUndefined()
  })

  it('evicts least-recently-used when capacity exceeded', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.set('c', 3)  // evicts 'a'
    expect(c.get('a')).toBeUndefined()
    expect(c.get('b')).toBe(2)
    expect(c.get('c')).toBe(3)
  })

  it('refreshes LRU order on get', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.get('a')  // 'a' is now most recent
    c.set('c', 3)  // evicts 'b'
    expect(c.get('a')).toBe(1)
    expect(c.get('b')).toBeUndefined()
    expect(c.get('c')).toBe(3)
  })
})

describe('cipherCacheKey', () => {
  it('combines operation, text, and JSON-stringified options', () => {
    const k = cipherCacheKey('encode', 'hello', { shift: 3 })
    expect(k).toContain('encode')
    expect(k).toContain('hello')
    expect(k).toContain('shift')
  })

  it('treats missing options as empty object', () => {
    const k = cipherCacheKey('decode', 'abc', undefined)
    expect(k).toContain('decode')
    expect(k).toContain('abc')
  })

  it('produces stable keys for the same inputs', () => {
    const a = cipherCacheKey('e', 'x', { y: 1 })
    const b = cipherCacheKey('e', 'x', { y: 1 })
    expect(a).toBe(b)
  })

  it('distinguishes different operations', () => {
    expect(cipherCacheKey('encode', 'x')).not.toBe(cipherCacheKey('decode', 'x'))
  })
})

describe('buildPolybiusSquare', () => {
  it('returns a 5x5 grid for empty key', () => {
    const { square, pos } = buildPolybiusSquare()
    expect(square.length).toBe(5)
    expect(square[0].length).toBe(5)
    expect(pos.size).toBeGreaterThan(0)
  })

  it('treats I and J as the same cell', () => {
    // Either both keys map to the same position, or J is merged into I
    // (only I is stored). Both are valid Polybius behaviors.
    const { pos } = buildPolybiusSquare()
    const iPos = pos.get('I')
    const jPos = pos.get('J')
    if (jPos) {
      expect(iPos).toEqual(jPos)
    } else {
      expect(iPos).toBeDefined()
    }
  })

  it('uses a keyword to reorder the grid', () => {
    const a = buildPolybiusSquare('KEYWORD')
    const b = buildPolybiusSquare()
    // Different keys produce different positions for at least some letters
    let differs = false
    for (const [letter, pos] of a.pos) {
      const bPos = b.pos.get(letter)
      if (bPos && (bPos[0] !== pos[0] || bPos[1] !== pos[1])) {
        differs = true
        break
      }
    }
    expect(differs).toBe(true)
  })
})

describe('processBaseOptions', () => {
  it('returns processBaseOptions result with both options', () => {
    const r = processBaseOptions({})
    expect(typeof r.preserveCase).toBe('boolean')
    expect(typeof r.stripNonAlpha).toBe('boolean')
  })

  it('respects explicit options', () => {
    const r = processBaseOptions({ preserveCase: true, stripNonAlpha: false })
    expect(r.preserveCase).toBe(true)
    expect(r.stripNonAlpha).toBe(false)
  })
})

describe('RateLimiter', () => {
  it('returns true for allow() when tokens are available', () => {
    const rl = new RateLimiter(10)
    expect(rl.allow()).toBe(true)
  })

  it('returns false for allow() when limit exceeded', () => {
    const rl = new RateLimiter(1)
    expect(rl.allow()).toBe(true)
    expect(rl.allow()).toBe(false)
  })

  it('refills tokens over time', async () => {
    const rl = new RateLimiter(10)
    // Drain
    for (let i = 0; i < 10; i++) rl.allow()
    // Wait briefly for refill
    await new Promise(r => setTimeout(r, 150))
    // Should have some tokens back
    expect(rl.allow()).toBe(true)
  })
})

describe('withCipherError', () => {
  it('returns the result of a successful operation', () => {
    const r = withCipherError('test', () => 42)
    expect(r).toBe(42)
  })

  it('normalizes errors thrown by the operation', () => {
    expect(() => withCipherError('test', () => { throw new Error('boom') })).toThrow()
  })
})
