import { describe, it, expect } from 'vite-plus/test'
import '../../src/index'
import { create, ciphers, has } from '../../src/core/registry'
import { resolveCipher } from '../../src/core/resolve'
import { Cipher } from '../../src/core/cipher'
import { CipherError } from '../../src/core/errors'

describe('registry', () => {
  it('registers all 18 ciphers', () => {
    expect(ciphers()).toHaveLength(18)
    for (const name of [
      'caesar',
      'rot13',
      'rot47',
      'atbash',
      'vigenere',
      'trithemius',
      'alberti',
      'rail-fence',
      'affine',
      'playfair',
      'polybius',
      'enigma',
    ]) {
      expect(has(name)).toBe(true)
    }
  })

  it('create returns cached singleton', () => {
    const a = create('caesar')
    const b = create('caesar')
    expect(a).toBe(b)
  })

  it('creates instances of the abstract cipher base', () => {
    for (const name of ciphers()) {
      expect(create(name)).toBeInstanceOf(Cipher)
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

  it('preserveCase=false normalizes to uppercase', () => {
    const result = caesar.encode('Hello World', { preserveCase: false, shift: 3 })
    expect(result.text).toBe('KHOOR ZRUOG')
    expect(result.text).toBe(result.text.toUpperCase())
  })

  it('stripNonAlpha=true removes non-alpha', () => {
    const result = caesar.encode('ATTACK AT DAWN!', { shift: 3, stripNonAlpha: true })
    expect(result.text).toBe('DWWDFNDWGDZQ')
  })

  it('empty string returns empty', () => {
    expect(caesar.encode('').text).toBe('')
    expect(caesar.decode('').text).toBe('')
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

  it('empty string returns empty', () => {
    expect(rot13.encode('').text).toBe('')
  })

  it('non-alpha preserved', () => {
    expect(rot13.encode('Hello, World! 123').text).toBe('Uryyb, Jbeyq! 123')
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

  it('preserves whitespace and control chars', () => {
    expect(rot47.encode('A\tB\nC').text).toBe('p\tq\nr')
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

  it('reports resolved base options', () => {
    const encoded = vigenere.encode('Attack at dawn!', {
      key: 'LEMON',
      preserveCase: false,
      stripNonAlpha: true,
    })
    expect(encoded.text).toBe('LXFOPVEFRNHR')
    expect(encoded.options).toEqual({ key: 'LEMON', preserveCase: false, stripNonAlpha: true })
    expect(vigenere.decode(encoded.text, { key: 'LEMON' }).options).toEqual({
      key: 'LEMON',
      preserveCase: true,
      stripNonAlpha: false,
    })
  })

  it('requires key', () => {
    expect(() => vigenere.encode('HELLO')).toThrow()
  })

  it('rejects key without letters', () => {
    expect(() => vigenere.encode('HELLO', { key: '123' })).toThrow()
  })
})

describe('trithemius', () => {
  const trithemius = create('trithemius')

  it('matches the progressive-shift vector', () => {
    expect(trithemius.encode('HELLO WORLD').text).toBe('HFNOS BUYTM')
    expect(trithemius.decode('HFNOS BUYTM').text).toBe('HELLO WORLD')
  })

  it('advances only for Latin letters', () => {
    expect(trithemius.encode('A 🎉 A!A').text).toBe('A 🎉 B!C')
  })

  it('honors base options and roundtrips', () => {
    const encoded = trithemius.encode('Attack at dawn!', {
      preserveCase: false,
      stripNonAlpha: true,
    })
    expect(encoded.text).toBe('AUVDGPGALJGY')
    expect(encoded.options).toEqual({ preserveCase: false, stripNonAlpha: true })
    expect(trithemius.decode(encoded.text, { preserveCase: false }).text).toBe('ATTACKATDAWN')
    expect(trithemius.decode(encoded.text).options).toEqual({
      preserveCase: true,
      stripNonAlpha: false,
    })
  })
})

describe('alberti', () => {
  const alberti = create('alberti')

  it('matches a keyed fixed-period disk vector', () => {
    expect(alberti.encode('ATTACK AT DAWN', { key: 'ALBERTI', period: 4 }).text).toBe(
      'ASSAEH LU TBYN',
    )
    expect(alberti.decode('ASSAEH LU TBYN', { key: 'ALBERTI', period: 4 }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('advances the disk only after the configured number of ASCII letters', () => {
    expect(alberti.encode('AAAA 🎉 A', { key: 'KEY', period: 4 }).text).toBe('KKKK 🎉 E')
  })

  it('preserves non-ASCII letters without advancing the disk', () => {
    const encoded = alberti.encode('Aı🎉A', { key: 'KEY', period: 4 })
    expect(encoded.text).toBe('Kı🎉K')
    expect(alberti.decode(encoded.text, { key: 'KEY', period: 4 }).text).toBe('Aı🎉A')
  })

  it('normalizes duplicate key letters and honors base options', () => {
    const encoded = alberti.encode('Attack at dawn!', {
      key: 'Letter',
      period: 3,
      preserveCase: false,
      stripNonAlpha: true,
    })
    expect(encoded.options).toEqual({
      key: 'LETR',
      period: 3,
      preserveCase: false,
      stripNonAlpha: true,
    })
    expect(
      alberti.decode(encoded.text, { key: 'Letter', period: 3, preserveCase: false }).text,
    ).toBe('ATTACKATDAWN')
  })

  it('requires an ASCII-letter key and positive integer period', () => {
    expect(() => alberti.encode('HELLO', { period: 4 })).toThrow()
    expect(() => alberti.encode('HELLO', { key: 'KEY' })).toThrow()
    expect(() => alberti.encode('HELLO', { key: 'ſ', period: 4 })).toThrow()
    expect(() => alberti.encode('HELLO', { key: 'KEY', period: 0 })).toThrow()
    expect(() => alberti.encode('HELLO', { key: 'KEY', period: 1.5 })).toThrow()
  })
})

describe('rail-fence', () => {
  const railFence = create('rail-fence')

  it('encodes with 3 rails', () => {
    expect(railFence.encode('WEAREDISCOVEREDRUNATONCE', { rails: 3 }).text).toBe(
      'WECRUOERDSOEERNTNEAIVDAC',
    )
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

  it('roundtrips non-BMP characters', () => {
    const encoded = railFence.encode('A🎉B', { rails: 2 })
    expect(railFence.decode(encoded.text, { rails: 2 }).text).toBe('A🎉B')
  })

  it('rejects rails < 2', () => {
    expect(() => railFence.encode('HELLO', { rails: 1 })).toThrow(/must be integer >= 2/)
    expect(() => railFence.encode('HELLO', { rails: 0 })).toThrow()
  })

  it('avoids allocating unused rails beyond the text length', () => {
    const rails = Number.MAX_SAFE_INTEGER
    expect(railFence.encode('A', { rails }).text).toBe('A')
    expect(railFence.decode('A', { rails }).text).toBe('A')
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
    expect(decoded.text).toBe('SECRETMESXSAGE')
  })

  it('does not insert filler into repeated ciphertext letters', () => {
    const encoded = playfair.encode('AABX', { key: 'MONARCHY' })
    expect(encoded.text).toBe('XSXAZZ')
    expect(playfair.decode(encoded.text, { key: 'MONARCHY' }).text).toBe('AXABXX')
  })

  it('requires key', () => {
    expect(() => playfair.encode('HELLO')).toThrow()
  })

  it('empty string returns empty', () => {
    expect(playfair.encode('', { key: 'MONARCHY' }).text).toBe('')
  })
})

describe('polybius', () => {
  const polybius = create('polybius')

  it('encodes to space-separated digit pairs', () => {
    expect(polybius.encode('HELLO').text).toBe('23 15 31 31 34')
  })

  it('decodes from space-separated pairs', () => {
    expect(polybius.decode('23 15 31 31 34').text).toBe('HELLO')
  })

  it('converts J to I', () => {
    expect(polybius.encode('JULIUS').text).toBe('24 45 31 24 45 43')
  })

  it('roundtrips', () => {
    const encoded = polybius.encode('ATTACK AT DAWN')
    const decoded = polybius.decode(encoded.text)
    expect(decoded.text).toBe('ATTACKATDAWN')
  })

  it('handles non-alpha gracefully in encode', () => {
    const result = polybius.encode('HI 123')
    // non-alpha dropped, space between encoded letters
    expect(result.text).toBe('23 24')
  })

  it('decodes non-digit pairs as-is', () => {
    expect(polybius.decode('23 ab 24').text).toBe('HabI')
  })

  it('empty string returns empty', () => {
    expect(polybius.encode('').text).toBe('')
    expect(polybius.decode('').text).toBe('')
  })
})

describe('morse', () => {
  const morse = create('morse')

  it('encodes SOS', () => {
    expect(morse.encode('SOS').text).toBe('... --- ...')
  })

  it('decodes SOS', () => {
    expect(morse.decode('... --- ...').text).toBe('SOS')
  })

  it('roundtrips', () => {
    const encoded = morse.encode('HELLO WORLD')
    const decoded = morse.decode(encoded.text)
    expect(decoded.text).toBe('HELLO WORLD')
  })

  it('empty string returns empty', () => {
    expect(morse.encode('').text).toBe('')
  })
})

describe('bacon', () => {
  const bacon = create('bacon')

  it('encodes A to AAAAA', () => {
    expect(bacon.encode('A').text).toBe('AAAAA')
  })

  it('encodes HI', () => {
    expect(bacon.encode('HI').text).toBe('AABBBABAAA')
  })

  it('roundtrips', () => {
    const encoded = bacon.encode('HELLO')
    const decoded = bacon.decode(encoded.text)
    expect(decoded.text).toBe('HELLO')
  })

  it('is 5-char per letter', () => {
    const encoded = bacon.encode('ABC')
    expect(encoded.text.length).toBe(15)
  })
})

describe('tap-code', () => {
  const tap = create('tap-code')

  it('encodes HELP', () => {
    expect(tap.encode('HELP').text).toBe('2 3 1 5 3 1 3 5')
  })

  it('roundtrips', () => {
    const encoded = tap.encode('HELLO')
    const decoded = tap.decode(encoded.text)
    expect(decoded.text).toBe('HELLO')
  })

  it('K maps to C', () => {
    const kResult = tap.encode('K')
    const cResult = tap.encode('C')
    expect(kResult.text).toBe(cResult.text)
  })

  it.each([
    ['2 3 0 1 5', 3],
    ['6 3 1 5', 1],
    ['2 3 X 1', 3],
    ['2 3 1 1.5', 4],
  ])('rejects malformed stream %s before pairing', (input, position) => {
    expect(() => tap.decode(input)).toThrow(CipherError)
    expect(() => tap.decode(input)).toThrow(`Invalid tap code coordinate at position ${position}`)
  })

  it('rejects an odd coordinate count', () => {
    expect(() => tap.decode('2 3 1')).toThrow(CipherError)
    expect(() => tap.decode('2 3 1')).toThrow('Invalid tap code: coordinate count must be even')
  })

  it('keeps whitespace-only input empty', () => {
    expect(tap.decode('   ').text).toBe('')
  })
})

describe('columnar', () => {
  const col = create('columnar')

  it('encodes with key', () => {
    expect(col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' }).text).toBe(
      'N W ETSLD ALEE  DEA FHT',
    )
  })

  it('roundtrips', () => {
    const encoded = col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' })
    const decoded = col.decode(encoded.text, { key: 'GERMAN' })
    expect(decoded.text).toBe('DEFEND THE EAST WALL')
  })

  it('roundtrips non-BMP characters', () => {
    const encoded = col.encode('A🎉B', { key: 'ZAB' })
    expect(encoded.text).toBe('🎉BA')
    expect(col.decode(encoded.text, { key: 'ZAB' }).text).toBe('A🎉B')
  })

  it('requires key', () => {
    expect(() => col.encode('TEST')).toThrow()
  })
})

describe('adfgvx', () => {
  const adf = create('adfgvx')

  it('encodes ATTACK', () => {
    expect(adf.encode('ATTACK').text).toBe('AAGDGDAAAFDV')
  })

  it('roundtrips with letters and digits', () => {
    const encoded = adf.encode('HELLO123')
    const decoded = adf.decode(encoded.text)
    expect(decoded.text).toBe('HELLO123')
  })

  it('output only contains ADFGVX', () => {
    const encoded = adf.encode('TESTING 123')
    expect(encoded.text).toMatch(/^[ADFGVX]+$/)
  })
})

describe('bifid', () => {
  const bifid = create('bifid')

  it('encodes FLEE AT ONCE', () => {
    expect(bifid.encode('FLEE AT ONCE', { key: 'BICONDITIONAL', period: 5 }).text).toBe(
      'GTDUXDBTUM',
    )
  })

  it('roundtrips', () => {
    const encoded = bifid.encode('HELLO', { key: 'BICONDITIONAL' })
    const decoded = bifid.decode(encoded.text, { key: 'BICONDITIONAL' })
    expect(decoded.text).toBe('HELLO')
  })

  it('roundtrips with period', () => {
    const encoded = bifid.encode('CRYPTOGRAPHY', { key: 'EXAMPLE', period: 3 })
    const decoded = bifid.decode(encoded.text, { key: 'EXAMPLE', period: 3 })
    expect(decoded.text).toBe('CRYPTOGRAPHY')
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid period %s',
    (period) => {
      expect(() => bifid.encode('HELLO', { period })).toThrow(/must be a positive integer/)
      expect(() => bifid.decode('HELLO', { period })).toThrow(/must be a positive integer/)
    },
  )
})

describe('enigma', () => {
  const enigma = create('enigma')

  it('matches the standard M3 I-II-III/B known vector', () => {
    expect(enigma.encode('AAAAA').text).toBe('BDZGO')
  })

  it('matches an independent py-enigma double-step vector', () => {
    expect(enigma.encode('AAA', { positions: 'ADU' }).text).toBe('EQI')
  })

  it('is reciprocal with positions, rings, and plugboard', () => {
    const options = { positions: 'MCK', rings: 'BDF', plugboard: 'AV BS CG DL FU HZ IN KM OW RX' }
    const encoded = enigma.encode('SECRETMESSAGE', options)
    expect(encoded.text).toBe('KILYLYNVKOEPS')
    expect(enigma.decode(encoded.text, options).text).toBe('SECRETMESSAGE')
  })

  it('steps only for letters and preserves non-letters', () => {
    expect(enigma.encode('AA AA').text).toBe('BD ZG')
  })

  it('preserves non-ASCII letters without feeding them through the A-Z machine', () => {
    const encoded = enigma.encode('Aı🎉')
    expect(encoded.text).toBe('Bı🎉')
    expect(enigma.decode(encoded.text).text).toBe('Aı🎉')
  })

  it('honors preserveCase and stripNonAlpha options', () => {
    expect(enigma.encode('a a', { preserveCase: false, stripNonAlpha: true }).text).toBe('BD')
  })

  it('rejects invalid settings', () => {
    expect(() => enigma.encode('A', { positions: 'AA' })).toThrow(/three letters/)
    expect(() => enigma.encode('A', { rings: '123' })).toThrow(/three letters/)
    expect(() => enigma.encode('A', { plugboard: 'AB AC' })).toThrow(/at most one pair/)
    expect(() => enigma.encode('A', { positions: 'ſſſ' })).toThrow(/three letters/)
    expect(() => enigma.encode('A', { plugboard: 'Aſ' })).toThrow(/distinct letter pairs/)
    expect(() => enigma.encode('A', { positions: 123 })).toThrow(/must be a string/)
  })
})

describe('resolveCipher', () => {
  it('resolves by name', () => {
    expect(resolveCipher('caesar').name()).toBe('caesar')
  })

  it('normalizes spaces to hyphens', () => {
    expect(resolveCipher('rail fence').name()).toBe('rail-fence')
  })

  it('throws for unknown cipher', () => {
    expect(() => resolveCipher('unknown')).toThrow(/Unknown cipher/)
  })

  it('throws UnknownCipherError when no name given', () => {
    expect(() => resolveCipher()).toThrow(/Unknown cipher/)
  })

  it('exact match required (no fuzzy prefix)', () => {
    expect(() => resolveCipher('cae')).toThrow()
  })
})

describe('edge cases', () => {
  const keyOpts: Record<string, Record<string, unknown>> = {
    vigenere: { key: 'TEST' },
    alberti: { key: 'TEST', period: 4 },
    playfair: { key: 'TEST' },
    columnar: { key: 'TEST' },
    bifid: { key: 'TEST' },
  }

  it('all ciphers handle empty string', () => {
    for (const name of ciphers()) {
      const cipher = create(name)
      const opts = keyOpts[name] ?? {}
      const result = cipher.encode('', opts)
      expect(typeof result.text).toBe('string')
    }
  })

  it('all ciphers handle non-alpha only input', () => {
    for (const name of ciphers()) {
      const cipher = create(name)
      const opts = keyOpts[name] ?? {}
      const result = cipher.encode('123 !@#', opts)
      expect(typeof result.text).toBe('string')
    }
  })

  it('caesar handles unicode input (non-BMP chars preserved)', () => {
    const caesar = create('caesar')
    const result = caesar.encode('HELLO café 🎉')
    // café: é preserved (not in A-Z/a-z), 🎉 preserved
    expect(result.text).toContain('🎉')
    expect(result.text).toContain('é')
  })
})
