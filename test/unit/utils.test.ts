/**
 * ciphers pure utility tests.
 */
import { describe, it, expect } from 'vite-plus/test'
import {
  LruCache,
  cipherCacheKey,
  buildPolybiusSquare,
  processBaseOptions,
} from '../../src/core/utils.ts'
import {
  CipherError,
  UnknownCipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from '../../src/core/errors.ts'

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
    c.set('c', 3) // evicts 'a'
    expect(c.get('a')).toBeUndefined()
    expect(c.get('b')).toBe(2)
    expect(c.get('c')).toBe(3)
  })

  it('refreshes LRU order on get', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.get('a') // 'a' is now most recent
    c.set('c', 3) // evicts 'b'
    expect(c.get('a')).toBe(1)
    expect(c.get('b')).toBeUndefined()
    expect(c.get('c')).toBe(3)
  })

  it('has() reports presence', () => {
    const c = new LruCache<string, number>(2)
    c.set('x', 10)
    expect(c.has('x')).toBe(true)
    expect(c.has('y')).toBe(false)
  })

  it('clear() empties the cache', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.clear()
    expect(c.size).toBe(0)
    expect(c.get('a')).toBeUndefined()
  })

  it('size tracks entries', () => {
    const c = new LruCache<string, number>(3)
    expect(c.size).toBe(0)
    c.set('a', 1)
    expect(c.size).toBe(1)
    c.set('b', 2)
    expect(c.size).toBe(2)
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

  it('distinguishes different texts', () => {
    expect(cipherCacheKey('encode', 'HELLO')).not.toBe(cipherCacheKey('encode', 'WORLD'))
  })

  it('distinguishes different keys', () => {
    expect(cipherCacheKey('encode', 'x', { key: 'AAA' })).not.toBe(
      cipherCacheKey('encode', 'x', { key: 'BBB' }),
    )
  })
})

describe('buildPolybiusSquare', () => {
  it('returns a 5x5 grid for empty key', () => {
    const { square, pos } = buildPolybiusSquare()
    expect(square.length).toBe(5)
    expect(square[0]).toHaveLength(5)
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
  it('leaves the text alone by default', () => {
    expect(processBaseOptions({})).toEqual({ preserveCase: true, stripNonAlpha: false })
  })

  it('respects explicit options', () => {
    expect(processBaseOptions({ preserveCase: false, stripNonAlpha: true })).toEqual({
      preserveCase: false,
      stripNonAlpha: true,
    })
  })
})

describe('normalizeError', () => {
  it('wraps a foreign error in a CipherError tagged with the cipher', () => {
    const e = normalizeError(new TypeError('boom'), 'x')
    expect(e).toBeInstanceOf(CipherError)
    expect(e.name).toBe('CipherError')
    expect(e.message).toBe('[x] boom')
  })

  it('wraps a thrown non-Error value without a cipher tag', () => {
    const e = normalizeError('boom')
    expect(e).toBeInstanceOf(CipherError)
    expect(e.message).toBe('boom')
  })

  it.each([
    new UnknownCipherError('foo'),
    new InvalidOptionError('shift', 99, 'out of range'),
    new MissingOptionError('key'),
  ])('passes $name through unchanged', (original) => {
    expect(normalizeError(original, 'x')).toBe(original)
  })
})
