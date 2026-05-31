import { describe, it, expect } from 'vitest'
import '../../src/index' // triggers registration
import { create, ciphers, has } from '../../src/core/registry'
import { resolveCipher } from '../../src/core/resolve'

describe('registry', () => {
  it('registers all 9 ciphers', () => {
    expect(ciphers()).toHaveLength(9)
    for (const name of ['caesar', 'rot13', 'rot47', 'atbash', 'vigenere', 'rail-fence', 'affine', 'playfair', 'polybius']) {
      expect(has(name)).toBe(true)
    }
  })
})

describe('caesar', () => {
  const caesar = create('caesar')

  it('encodes with default shift=3', () => {
    expect(caesar.encode('ATTACK AT DAWN').text).toBe('DWWDFN DW GDZQ')
  })

  it('decodes with shift=3', () => {
    expect(caesar.decode('DWWDFN DW GDZQ').text).toBe('ATTACK AT DAWN')
  })

  it('roundtrips for all shifts', () => {
    for (let s = 1; s <= 25; s++) {
      const encoded = caesar.encode('HELLO WORLD', { shift: s })
      const decoded = caesar.decode(encoded.text, { shift: s })
      expect(decoded.text).toBe('HELLO WORLD')
    }
  })

  it('rejects invalid shift', () => {
    expect(() => caesar.encode('X', { shift: 0 })).toThrow()
    expect(() => caesar.encode('X', { shift: 26 })).toThrow()
  })
})

describe('rot13', () => {
  const rot13 = create('rot13')

  it('encodes correctly', () => {
    expect(rot13.encode('HELLO').text).toBe('URYYB')
  })

  it('is self-inverse', () => {
    expect(rot13.decode('URYYB').text).toBe('HELLO')
  })
})

describe('rot47', () => {
  const rot47 = create('rot47')

  it('encodes printable ASCII', () => {
    const result = rot47.encode('Hello, World!')
    expect(result.text).toBe('w6==@[ (@C=5P')
  })

  it('is self-inverse', () => {
    const encoded = rot47.encode('Test 123!')
    expect(rot47.decode(encoded.text).text).toBe('Test 123!')
  })
})

describe('atbash', () => {
  const atbash = create('atbash')

  it('encodes correctly', () => {
    expect(atbash.encode('HELLO').text).toBe('SVOOL')
  })

  it('is self-inverse', () => {
    expect(atbash.decode('SVOOL').text).toBe('HELLO')
  })

  it('preserves non-alpha', () => {
    expect(atbash.encode('Hello, World!').text).toBe('Svool, Dliow!')
  })
})

describe('vigenere', () => {
  const vigenere = create('vigenere')

  it('encodes with key', () => {
    expect(vigenere.encode('ATTACK AT DAWN', { key: 'LEMON' }).text).toBe('LXFOPV EF RNHR')
  })

  it('decodes with key', () => {
    expect(vigenere.decode('LXFOPV EF RNHR', { key: 'LEMON' }).text).toBe('ATTACK AT DAWN')
  })

  it('roundtrips', () => {
    const encoded = vigenere.encode('CRYPTOGRAPHY', { key: 'SECRET' })
    const decoded = vigenere.decode(encoded.text, { key: 'SECRET' })
    expect(decoded.text).toBe('CRYPTOGRAPHY')
  })

  it('requires key', () => {
    expect(() => vigenere.encode('HELLO')).toThrow()
  })
})

describe('rail-fence', () => {
  const railFence = create('rail-fence')

  it('encodes with 3 rails', () => {
    expect(railFence.encode('WEAREDISCOVEREDRUNATONCE', { rails: 3 }).text).toBe('WECRUOERDSOEERNTNEAIVDAC')
  })

  it('decodes with 3 rails', () => {
    const encoded = railFence.encode('WEAREDISCOVEREDRUNATONCE', { rails: 3 })
    expect(railFence.decode(encoded.text, { rails: 3 }).text).toBe('WEAREDISCOVEREDRUNATONCE')
  })

  it('roundtrips', () => {
    const encoded = railFence.encode('HELLO WORLD', { rails: 4 })
    const decoded = railFence.decode(encoded.text, { rails: 4 })
    expect(decoded.text).toBe('HELLO WORLD')
  })
})

describe('affine', () => {
  const affine = create('affine')

  it('encodes with a=5, b=8', () => {
    const result = affine.encode('HELLO', { a: 5, b: 8 })
    expect(result.text).toBe('RCLLA')
  })

  it('decodes with a=5, b=8', () => {
    const result = affine.decode('RCLLA', { a: 5, b: 8 })
    expect(result.text).toBe('HELLO')
  })

  it('roundtrips for valid multipliers', () => {
    const validA = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]
    for (const a of validA) {
      const encoded = affine.encode('ATTACK', { a, b: 3 })
      const decoded = affine.decode(encoded.text, { a, b: 3 })
      expect(decoded.text).toBe('ATTACK')
    }
  })

  it('rejects non-coprime multiplier', () => {
    expect(() => affine.encode('X', { a: 2, b: 0 })).toThrow()
    expect(() => affine.encode('X', { a: 4, b: 0 })).toThrow()
    expect(() => affine.encode('X', { a: 13, b: 0 })).toThrow()
  })
})

describe('playfair', () => {
  const playfair = create('playfair')

  it('encodes with key', () => {
    const result = playfair.encode('HIDE THE GOLD IN THE TREE STUMP', { key: 'PLAYFAIR EXAMPLE' })
    expect(result.text).toBe('BMEAZBXDNABEKUDMUIXMMOUVIF')
  })

  it('decodes with key', () => {
    const encoded = playfair.encode('HIDE THE GOLD IN THE TREE STUMP', { key: 'PLAYFAIR EXAMPLE' })
    const result = playfair.decode(encoded.text, { key: 'PLAYFAIR EXAMPLE' })
    expect(result.text).toBe('HIDETHEGOLDINTHETREXESTUMP')
  })

  it('roundtrips (modulo padding)', () => {
    const encoded = playfair.encode('SECRETMESSAGE', { key: 'MONARCHY' })
    const decoded = playfair.decode(encoded.text, { key: 'MONARCHY' })
    // Playfair adds X padding for double letters — decoded text includes those
    expect(decoded.text).toBe('SECRETMESXSAGE')
  })
})

describe('polybius', () => {
  const polybius = create('polybius')

  it('encodes to digit pairs', () => {
    expect(polybius.encode('HELLO').text).toBe('2315313134')
  })

  it('decodes from digit pairs', () => {
    expect(polybius.decode('2315313134').text).toBe('HELLO')
  })

  it('converts J to I', () => {
    expect(polybius.encode('JULIUS').text).toBe('244531244543')
  })

  it('roundtrips', () => {
    const encoded = polybius.encode('ATTACK AT DAWN')
    const decoded = polybius.decode(encoded.text)
    // Spaces are lost in encoding (digit-only output), join without spaces
    expect(decoded.text.replace(/\s/g, '')).toBe('ATTACKATDAWN')
  })
})

describe('resolveCipher', () => {
  it('resolves by name', () => {
    expect(resolveCipher('caesar').name()).toBe('caesar')
  })

  it('resolves by prefix', () => {
    expect(resolveCipher('cae').name()).toBe('caesar')
  })

  it('normalizes spaces to hyphens', () => {
    expect(resolveCipher('rail fence').name()).toBe('rail-fence')
  })

  it('throws for unknown cipher', () => {
    expect(() => resolveCipher('enigma')).toThrow()
  })
})
