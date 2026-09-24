import { createHash } from 'node:crypto'
import { describe, it, expect } from 'vite-plus/test'
import { create, ciphers, has } from '../../src/core/registry'
import { resolveCipher } from '../../src/core/resolve'
import { Cipher } from '../../src/core/cipher'
import { CipherError, MissingOptionError, InvalidOptionError } from '../../src/core/errors'
import { aesEcb } from '../../src/ciphers/block/aes/ecb'
import { aesLrw } from '../../src/ciphers/block/aes/lrw'
import { aesXts } from '../../src/ciphers/block/aes/xts'
import { aesCbc } from '../../src/ciphers/block/aes/cbc'
import { aesCfb } from '../../src/ciphers/block/aes/cfb'
import { aesOfb } from '../../src/ciphers/block/aes/ofb'
import { aesCtr } from '../../src/ciphers/block/aes/ctr'
import { aesCcm } from '../../src/ciphers/block/aes/ccm'
import { aesOcb } from '../../src/ciphers/block/aes/ocb'
import { rijndaelEcb } from '../../src/ciphers/block/rijndael'
import { tripleDesEcb } from '../../src/ciphers/block/triple-des/ecb'
import { tripleDesCbc } from '../../src/ciphers/block/triple-des/cbc'

describe('registry', () => {
  it('registers all 32 ciphers', () => {
    expect(ciphers()).toHaveLength(32)
    for (const name of [
      'caesar',
      'rot13',
      'rot47',
      'atbash',
      'vigenere',
      'beaufort',
      'autokey',
      'trithemius',
      'alberti',
      'rail-fence',
      'affine',
      'playfair',
      'polybius',
      'enigma',
      'aes',
      'aes-cbc',
      'aes-cfb',
      'aes-ofb',
      'aes-ctr',
      'aes-ccm',
      'aes-ocb',
      'aes-lrw',
      'aes-xts',
      'rijndael',
      'triple-des',
      'triple-des-cbc',
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

  it('strips the punctuation of the Wikipedia message before transposing', () => {
    const options = { rails: 3, stripNonAlpha: true }
    const encoded = railFence.encode('WE ARE DISCOVERED. RUN AT ONCE.', options)
    expect(encoded.text).toBe('WECRUOERDSOEERNTNEAIVDAC')
    expect(encoded.options).toEqual({ rails: 3, preserveCase: true, stripNonAlpha: true })
    expect(railFence.decode('WECRUO ERDSOEERNTNE AIVDAC', options).text).toBe(
      'WEAREDISCOVEREDRUNATONCE',
    )
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

  it('encodes the Wikipedia vector', () => {
    const result = playfair.encode('HIDE THE GOLD IN THE TREE STUMP', { key: 'PLAYFAIR EXAMPLE' })
    expect(result.text).toBe('BMODZBXDNABEKUDMUIXMMOUVIF')
  })

  it('decodes the Wikipedia vector', () => {
    const result = playfair.decode('BMODZBXDNABEKUDMUIXMMOUVIF', { key: 'PLAYFAIR EXAMPLE' })
    expect(result.text).toBe('HIDETHEGOLDINTHETREXESTUMP')
  })

  it('moves same-column pairs down on encode and up on decode', () => {
    expect(playfair.encode('INSTRUMENTS', { key: 'MONARCHY' }).text).toBe('GATLMZCLRQXA')
    expect(playfair.decode('GATLMZCLRQXA', { key: 'MONARCHY' }).text).toBe('INSTRUMENTSX')
  })

  it('roundtrips (modulo padding)', () => {
    const encoded = playfair.encode('SECRETMESSAGE', { key: 'MONARCHY' })
    const decoded = playfair.decode(encoded.text, { key: 'MONARCHY' })
    expect(decoded.text).toBe('SECRETMESXSAGE')
  })

  it('does not insert filler into repeated ciphertext letters', () => {
    const encoded = playfair.encode('AABX', { key: 'MONARCHY' })
    expect(encoded.text).toBe('BABIZZ')
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

  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'unknown', '🧩'])(
    'preserves the unknown token %s while decoding surrounding Morse',
    (token) => {
      expect(morse.decode(`... ${token} / --- ...`).text).toBe(`S${token} OS`)
    },
  )

  it('decodes digits and punctuation with word separators', () => {
    expect(morse.decode('.---- ..--- ...-- / -..-. ..--..').text).toBe('123 /?')
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

  it('reports the 26-letter table as the default', () => {
    expect(bacon.encode('A').options).toEqual({ letters: 26 })
    expect(bacon.decode('AAAAA').options).toEqual({ letters: 26 })
    expect(bacon.encode('A', { letters: 26 }).options).toEqual({ letters: 26 })
  })

  /** Published vector: https://en.wikipedia.org/wiki/Bacon%27s_cipher#Baconian_cipher_example */
  it('matches the Wikipedia 24-letter STEGANOGRAPHY example', () => {
    const groups = 'baaab baaba aabaa aabba aaaaa abbaa abbab aabba baaaa aaaaa abbba aabbb babba'
    expect(bacon.encode('STEGANOGRAPHY', { letters: 24 }).text).toBe(
      groups.replaceAll(' ', '').toUpperCase(),
    )
    expect(bacon.decode(groups, { letters: 24 }).text).toBe('STEGANOGRAPHY')
    expect(bacon.decode(`${groups} bbaaa bbaab bbbbb`, { letters: 24 }).text).toBe(
      'STEGANOGRAPHY???',
    )
    expect(bacon.decode(groups, { letters: 24 }).options).toEqual({ letters: 24 })
  })

  it('shares I with J and U with V in the 24-letter table', () => {
    expect(bacon.encode('JV', { letters: 24 }).text).toBe('ABAAABAABB')
    expect(bacon.encode('IU', { letters: 24 }).text).toBe('ABAAABAABB')
    expect(bacon.decode('ABAAABAABB', { letters: 24 }).text).toBe('IU')
    expect(bacon.encode('JV').text).toBe('ABAABBABAB')
  })

  it('codes every letter from K on differently in the two tables', () => {
    expect(bacon.encode('K', { letters: 24 }).text).toBe('ABAAB')
    expect(bacon.encode('K', { letters: 26 }).text).toBe('ABABA')
    expect(bacon.decode('ABAAB', { letters: 24 }).text).toBe('K')
    expect(bacon.decode('ABAAB', { letters: 26 }).text).toBe('J')
  })

  it.each([25, 0, '24', 24.5])('rejects letters=%s', (letters) => {
    expect(() => bacon.encode('A', { letters })).toThrow(CipherError)
    expect(() => bacon.encode('A', { letters })).toThrow('must be 24 or 26')
    expect(() => bacon.decode('AAAAA', { letters })).toThrow('must be 24 or 26')
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

  it('matches the irregular ZEBRAS vector', () => {
    expect(col.encode('WEAREDISCOVEREDFLEEATONCE', { key: 'ZEBRAS' }).text).toBe(
      'EVLNACDTESEAROFODEECWIREE',
    )
    expect(col.decode('EVLNACDTESEAROFODEECWIREE', { key: 'ZEBRAS' }).text).toBe(
      'WEAREDISCOVEREDFLEEATONCE',
    )
  })

  it('strips the punctuation of the Wikipedia message before transposing', () => {
    const options = { key: 'ZEBRAS', stripNonAlpha: true }
    const encoded = col.encode('WE ARE DISCOVERED. FLEE AT ONCE', options)
    expect(encoded.text).toBe('EVLNACDTESEAROFODEECWIREE')
    expect(encoded.options).toEqual({ key: 'ZEBRAS', preserveCase: true, stripNonAlpha: true })
    expect(col.decode('EVLNA CDTES EAROF ODEEC WIREE', options).text).toBe(
      'WEAREDISCOVEREDFLEEATONCE',
    )
  })

  it('keeps cached answers apart across the shared flags', () => {
    expect(col.encode('a b', { key: 'AB' }).text).toBe('ab ')
    expect(col.encode('a b', { key: 'AB', preserveCase: false, stripNonAlpha: true }).text).toBe(
      'AB',
    )
  })

  it('orders duplicate key letters left to right', () => {
    expect(col.encode('ABCDEFGHIJK', { key: 'LETTER' }).text).toBe('BHEKAGFCIDJ')
    expect(col.decode('BHEKAGFCIDJ', { key: 'LETTER' }).text).toBe('ABCDEFGHIJK')
  })

  it('roundtrips', () => {
    const encoded = col.encode('DEFEND THE EAST WALL', { key: 'GERMAN' })
    const decoded = col.decode(encoded.text, { key: 'GERMAN' })
    expect(decoded.text).toBe('DEFEND THE EAST WALL')
  })

  it.each([
    ['space', 'A '],
    ['two spaces', 'A  '],
    ['newline', 'A\n'],
  ])('roundtrips a trailing %s', (_label, plaintext) => {
    const encoded = col.encode(plaintext, { key: 'KEY' })
    expect(Array.from(encoded.text).sort()).toEqual(Array.from(plaintext).sort())
    expect(col.decode(encoded.text, { key: 'KEY' }).text).toBe(plaintext)
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

  it('matches the Wikipedia PRIVACY vector with its printed grid', () => {
    const options = { key: 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ', transposition: 'PRIVACY' }
    const encoded = adf.encode('attack at 1200am', options)
    expect(encoded.text).toBe('DGDDDAGDDGAFADDFDADVDVFAADVX')
    expect(encoded.options).toEqual(options)
    expect(adf.decode('DGDD DAGD DGAF ADDF DADV DVFA ADVX', options).text).toBe('ATTACKAT1200AM')
  })

  it('matches the Crypto Corner vector with a keyword grid', () => {
    const options = { key: '147 regiment', transposition: 'privacy' }
    expect(adf.encode('attack at 1200am', options).text).toBe('DXXVGDADDAAXDVDXVFGVGFADDVVD')
    expect(adf.decode('DXXV GDAD DAAX DVDX VFGV GFAD DVVD', options).text).toBe('ATTACKAT1200AM')
  })

  it('roundtrips when the last row of the transposition is short', () => {
    for (const transposition of ['GERMAN', 'AAB', 'X', 'LONGERTHANTHEPAIRS']) {
      const options = { key: 'K3Y', transposition }
      const encoded = adf.encode('THE QUICK BROWN FOX 42', options)
      expect(adf.decode(encoded.text, options).text).toBe('THEQUICKBROWNFOX42')
    }
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

  it('names the registered ciphers when the name is unknown', () => {
    expect(() => resolveCipher('rot-13')).toThrow(
      'Unknown cipher: "rot-13". Registered ciphers: caesar, rot13, rot47, atbash,',
    )
    expect(() => create('vigenère')).toThrow('Registered ciphers: caesar,')
  })

  it('quotes an unknown name so a newline stays inside the message', () => {
    expect(() => resolveCipher('x\nFAKE: ok')).toThrow('Unknown cipher: "x\\nFAKE: ok".')
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
    beaufort: { key: 'TEST' },
    autokey: { key: 'TEST' },
    alberti: { key: 'TEST', period: 4 },
    playfair: { key: 'TEST' },
    columnar: { key: 'TEST' },
    bifid: { key: 'TEST' },
    aes: { key: '000102030405060708090a0b0c0d0e0f' },
    'aes-cbc': { key: '000102030405060708090a0b0c0d0e0f', iv: '00'.repeat(16) },
    'aes-cfb': { key: '000102030405060708090a0b0c0d0e0f', iv: '00'.repeat(16) },
    'aes-ofb': { key: '000102030405060708090a0b0c0d0e0f', iv: '00'.repeat(16) },
    'aes-ctr': { key: '000102030405060708090a0b0c0d0e0f', iv: '00'.repeat(16) },
    'aes-ccm': { key: '000102030405060708090a0b0c0d0e0f', nonce: '00'.repeat(12) },
    'aes-ocb': { key: '000102030405060708090a0b0c0d0e0f', nonce: '00'.repeat(12) },
    'aes-lrw': { key: '000102030405060708090a0b0c0d0e0f'.repeat(2) },
    'aes-xts': { key: '000102030405060708090a0b0c0d0e0f'.repeat(2) },
    rijndael: { key: '000102030405060708090a0b0c0d0e0f', blockSize: 256 },
    'triple-des': { key: '0123456789abcdef23456789abcdef01' },
    'triple-des-cbc': { key: '0123456789abcdef23456789abcdef01', iv: '00'.repeat(8) },
  }

  it('all ciphers handle empty string', () => {
    for (const name of ciphers()) {
      const cipher = create(name)
      const opts = keyOpts[name] ?? {}
      if (name === 'aes-xts') {
        // XTS has no padding, so it needs a whole block of text.
        expect(() => cipher.encode('', opts)).toThrow(/at least one whole block/)
        continue
      }
      const result = cipher.encode('', opts)
      expect(typeof result.text).toBe('string')
    }
  })

  it('all ciphers handle non-alpha only input', () => {
    for (const name of ciphers()) {
      const cipher = create(name)
      const opts = keyOpts[name] ?? {}
      if (name === 'aes-xts') {
        // XTS has no padding, so it needs a whole block of text.
        expect(() => cipher.encode('123 !@#', opts)).toThrow(/at least one whole block/)
        continue
      }
      const result = cipher.encode('123 !@#', opts)
      expect(typeof result.text).toBe('string')
    }
  })

  it('every A-Z cipher applies and echoes the shared flags', () => {
    const latin = [
      'caesar',
      'rot13',
      'atbash',
      'vigenere',
      'beaufort',
      'autokey',
      'trithemius',
      'alberti',
      'rail-fence',
      'affine',
      'columnar',
      'enigma',
    ]
    for (const name of latin) {
      const options = { ...keyOpts[name], preserveCase: false, stripNonAlpha: true }
      const result = create(name).encode('Ab, c!', options)
      expect(result.text, name).toMatch(/^[A-Z]+$/)
      expect(result.options, name).toMatchObject({ preserveCase: false, stripNonAlpha: true })
    }
  })

  it('preserveCase=false leaves letters outside a-z alone', () => {
    expect(create('rail-fence').encode('straße', { rails: 2, preserveCase: false }).text).toBe(
      'SRßTAE',
    )
    expect(create('rot13').encode('café', { preserveCase: false }).text).toBe('PNSé')
  })

  it('caesar handles unicode input (non-BMP chars preserved)', () => {
    const caesar = create('caesar')
    const result = caesar.encode('HELLO café 🎉')
    // café: é preserved (not in A-Z/a-z), 🎉 preserved
    expect(result.text).toContain('🎉')
    expect(result.text).toContain('é')
  })
})

describe('beaufort', () => {
  const beaufort = create('beaufort')

  it('uses standard Beaufort rather than the variant or Vigenere', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(beaufort[operation]('A', { key: 'B' }).text).toBe('B')
      expect(beaufort[operation]('B', { key: 'B' }).text).toBe('A')
      expect(beaufort[operation]('Z', { key: 'A' }).text).toBe('B')
    }
  })

  /** Published vector: https://www.dcode.fr/beaufort-cipher */
  it('matches the published DCODE / KEY vector in both directions', () => {
    expect(beaufort.encode('DCODE', { key: 'KEY' }).text).toBe('HCKHA')
    expect(beaufort.decode('HCKHA', { key: 'KEY' }).text).toBe('DCODE')
    expect(beaufort.encode('HCKHA', { key: 'KEY' }).text).toBe('DCODE')
  })

  it('advances the key only for ASCII letters and preserves case', () => {
    const options = { key: 'k-e y!' }
    const encoded = beaufort.encode('Dc, o🙂de! éſı', options)
    expect(encoded.text).toBe('Hc, k🙂ha! éſı')
    expect(encoded.options).toEqual({ ...options, preserveCase: true, stripNonAlpha: false })
    const decoded = beaufort.decode(encoded.text, options)
    expect(decoded.text).toBe('Dc, o🙂de! éſı')
    expect(decoded.operation).toBe('decode')
    expect(decoded.cipher).toBe('beaufort')
  })

  it('applies and reports base options in both directions', () => {
    expect(beaufort.encode('Dc, ode!', { key: 'KEY', preserveCase: false }).text).toBe('HC, KHA!')
    expect(beaufort.encode('Dc, ode!', { key: 'KEY', stripNonAlpha: true }).text).toBe('Hckha')
    const options = { key: 'KEY', preserveCase: false, stripNonAlpha: true }
    const encoded = beaufort.encode('Dc, o🙂de! éſı', options)
    expect(encoded.text).toBe('HCKHA')
    expect(encoded.options).toEqual(options)
    const decoded = beaufort.decode('Hc, k🙂ha! éſı', options)
    expect(decoded.text).toBe('DCODE')
    expect(decoded.options).toEqual(options)
  })

  it('roundtrips the alphabet with a repeating key', () => {
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz'
    const options = { key: 'ORANGE' }
    expect(beaufort.decode(beaufort.encode(text, options).text, options).text).toBe(text)
  })

  it('rejects missing keys, non-string values and keys without ASCII letters', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => beaufort[operation]('A')).toThrow(MissingOptionError)
      expect(() => beaufort[operation]('A', { key: '' })).toThrow(MissingOptionError)
      for (const key of [123, null, {}, '123 !', 'éſıK']) {
        expect(() => beaufort[operation]('A', { key })).toThrow(InvalidOptionError)
      }
    }
  })

  it('advertises the required key and reciprocal transformation', () => {
    expect(beaufort.info()).toMatchObject({
      name: 'beaufort',
      selfInverse: true,
      family: 'polyalphabetic',
      options: [{ name: 'key', type: 'string', required: true }],
    })
  })
})

describe('autokey', () => {
  const autokey = create('autokey')

  /** Published vector: https://en.wikipedia.org/wiki/Autokey_cipher#Method */
  it('extends the primer with plaintext in both directions', () => {
    expect(autokey.encode('ATTACKATDAWN', { key: 'QUEENLY' }).text).toBe('QNXEPVYTWTWP')
    expect(autokey.decode('QNXEPVYTWTWP', { key: 'QUEENLY' }).text).toBe('ATTACKATDAWN')
  })

  it('feeds recovered plaintext back after a single-letter primer', () => {
    expect(autokey.encode('BCDE', { key: 'A' }).text).toBe('BDFH')
    expect(autokey.decode('BDFH', { key: 'A' }).text).toBe('BCDE')
    expect(autokey.encode('ZZZZ', { key: 'Z' }).text).toBe('YYYY')
    expect(autokey.decode('YYYY', { key: 'Z' }).text).toBe('ZZZZ')
  })

  it('does not consume key positions for punctuation or non-ASCII letters', () => {
    const options = { key: 'q-U e!eNLY éſı🙂' }
    const encoded = autokey.encode('Attack at 🙂dawn! éſı', options)
    expect(encoded.text).toBe('Qnxepv yt 🙂wtwp! éſı')
    expect(encoded.options).toEqual({ ...options, preserveCase: true, stripNonAlpha: false })
    const decoded = autokey.decode(encoded.text, options)
    expect(decoded).toMatchObject({
      text: 'Attack at 🙂dawn! éſı',
      cipher: 'autokey',
      operation: 'decode',
      options: encoded.options,
    })
  })

  it('applies common options without changing the feedback stream', () => {
    const options = { key: 'QUEENLY', preserveCase: false, stripNonAlpha: true }
    const encoded = autokey.encode('Attack at 🙂dawn! éſı', options)
    expect(encoded.text).toBe('QNXEPVYTWTWP')
    expect(encoded.options).toEqual(options)
    const decoded = autokey.decode('Qnxepv yt 🙂wtwp! éſı', options)
    expect(decoded.text).toBe('ATTACKATDAWN')
    expect(decoded.options).toEqual(options)
    expect(autokey.encode('Attack at dawn', { key: 'QUEENLY', stripNonAlpha: true }).text).toBe(
      'Qnxepvytwtwp',
    )
    expect(autokey.encode('Attack at dawn', { key: 'QUEENLY', preserveCase: false }).text).toBe(
      'QNXEPV YT WTWP',
    )
  })

  it('keeps feedback local to each call on the cached cipher', () => {
    for (const key of ['A', 'KEY', 'LONGERTHANTEXT']) {
      for (const text of ['', '🙂 ! éſı', 'AB', 'MiXeD text '.repeat(40)]) {
        const options = { key }
        const encoded = autokey.encode(text, options)
        expect(autokey.decode(encoded.text, options).text).toBe(text)
        expect(autokey.encode(text, options)).toEqual(encoded)
      }
    }
  })

  it('rejects missing and unusable primers even for empty input', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => autokey[operation]('')).toThrow(MissingOptionError)
      expect(() => autokey[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const key of ['123', 'éſı🙂', null, 12, false, {}, []]) {
        expect(() => autokey[operation]('', { key })).toThrow(InvalidOptionError)
      }
    }
  })

  it('exposes the primer requirement through exact-name resolution', () => {
    expect(resolveCipher('AUTOKEY')).toBe(autokey)
    expect(() => resolveCipher('auto')).toThrow()
    expect(autokey.info()).toMatchObject({
      name: 'autokey',
      family: 'polyalphabetic',
      selfInverse: false,
      options: [{ name: 'key', type: 'string', required: true }],
    })
  })
})

describe('aes', () => {
  const aes = create('aes')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key128 = '2b7e151628aed2a6abf7158809cf4f3c'

  /** FIPS-197 Appendix C: one block under a 128, 192 and 256-bit key. */
  it('encrypts and decrypts the FIPS-197 example blocks', () => {
    const plaintext = hex('00112233445566778899aabbccddeeff')
    for (const [key, ciphertext] of [
      ['000102030405060708090a0b0c0d0e0f', '69c4e0d86a7b0430d8cdb78070b4c55a'],
      ['000102030405060708090a0b0c0d0e0f1011121314151617', 'dda97ca4864cdfe06eaf70a0ec0d7191'],
      [
        '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
        '8ea2b7ca516745bfeafc49904b496089',
      ],
    ]) {
      expect(aesEcb(plaintext, hex(key!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(aesEcb(hex(ciphertext!), hex(key!), 'decrypt')).toEqual(plaintext)
    }
  })

  /** NIST SP 800-38A, F.1.1 and F.1.5: ECB-AES128 and ECB-AES256 over four blocks. */
  it('matches the SP 800-38A ECB vectors', () => {
    const plaintext = hex(
      '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710',
    )
    for (const [key, ciphertext] of [
      [
        key128,
        '3ad77bb40d7a3660a89ecaf32466ef97f5d3d58503b9699de785895a96fdbaaf43b1cd7f598ece23881b00e3ed0306887b0c785e27e8ad3f8223207104725dd4',
      ],
      [
        '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4',
        'f3eed1bdb5d2a03c064b5a7e3db181f8591ccb10d410ed26dc5ba74a31362870b6ed21b99ca6f4f9f153e7b1beafed1d23304b7a39f9f3ff067d8d8f9e24ecc7',
      ],
    ]) {
      expect(aesEcb(plaintext, hex(key!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(aesEcb(hex(ciphertext!), hex(key!), 'decrypt')).toEqual(plaintext)
    }
  })

  /** Expected values from `openssl enc -aes-128-ecb`, which pads with PKCS#7 by default. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as OpenSSL does', () => {
    for (const [text, ciphertext] of [
      ['', 'a254be88e037ddd9d79fb6411c3f9df8'],
      ['ATTACK AT DAWN', 'bef12e48d0f1739d732326cbecbef389'],
      ['zażółć gęślą jaźń 🙂', 'fbe4d3e5fc47b5ea0b7d5d2fc4c6d90799eb267882774042e4f7345acb563729'],
      ['A'.repeat(16), '6c2a3fd93aa7b417c5438d26a4619519a254be88e037ddd9d79fb6411c3f9df8'],
    ]) {
      expect(aes.encode(text!, { key: key128 })).toEqual({
        text: ciphertext,
        cipher: 'aes',
        operation: 'encode',
        options: { key: key128, mode: 'ecb' },
      })
      expect(aes.decode(ciphertext!, { key: key128 }).text).toBe(text)
    }
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    const { text } = aes.encode('A'.repeat(32), { key: '000102030405060708090a0b0c0d0e0f' })
    expect(text).toBe(
      'dd4b1a0b47daa7067d0b59d95d58a6aedd4b1a0b47daa7067d0b59d95d58a6ae954f64f2e4e86e9eee82d20216684899',
    )
    expect(text.slice(0, 32)).toBe(text.slice(32, 64))
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const key = '2B7E 1516 28AE D2A6 ABF7 1588 09CF 4F3C'
    expect(aes.encode('ATTACK AT DAWN', { key }).options).toEqual({ key: key128, mode: 'ecb' })
    expect(aes.decode('BEF12E48 D0F1739D\n732326CB ECBEF389', { key }).text).toBe('ATTACK AT DAWN')
  })

  it('rejects keys that are not an AES key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => aes[operation]('')).toThrow(MissingOptionError)
      expect(() => aes[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const key of [
        'YELLOW SUBMARINE',
        '00'.repeat(15),
        '00'.repeat(20),
        'g'.repeat(32),
        12,
      ]) {
        expect(() => aes[operation]('', { key })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    const key = '000102030405060708090a0b0c0d0e0f'
    expect(() => aes.decode('', { key })).toThrow(/whole 16-byte blocks/)
    expect(() => aes.decode('bef12e48', { key })).toThrow(/got 8 hex digits/)
    expect(() => aes.decode('zz'.repeat(16), { key })).toThrow(/must be hex digits/)
    // OpenSSL: "bad decrypt" for this ciphertext under this key.
    expect(() => aes.decode('bef12e48d0f1739d732326cbecbef389', { key })).toThrow(/PKCS#7/)
    // ff then fifteen bytes of 0f: valid padding, invalid UTF-8.
    expect(() => aes.decode('03781889b339a511f58a94480f84a3fa', { key })).toThrow(/not UTF-8/)
    expect(() => aes.decode('03781889b339a511f58a94480f84a3fa', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('AES')).toBe(aes)
    expect(aes.info()).toMatchObject({
      name: 'aes',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [{ name: 'key', type: 'string', required: true }],
    })
  })
})

describe('aes-cbc', () => {
  const cbc = create('aes-cbc')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '2b7e151628aed2a6abf7158809cf4f3c'
  const iv = '000102030405060708090a0b0c0d0e0f'

  /** NIST SP 800-38A F.2.1, F.2.3 and F.2.5: CBC-AES128, 192 and 256 over the same four blocks. */
  it('matches the NIST SP 800-38A CBC-AES vectors', () => {
    const plaintext = hex(
      '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710',
    )
    for (const [vectorKey, ciphertext] of [
      [
        key,
        '7649abac8119b246cee98e9b12e9197d5086cb9b507219ee95db113a917678b273bed6b8e3c1743b7116e69e222295163ff1caa1681fac09120eca307586e1a7',
      ],
      [
        '8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b',
        '4f021db243bc633d7178183a9fa071e8b4d9ada9ad7dedf4e5e738763f69145a571b242012fb7ae07fa9baac3df102e008b0e27988598881d920a9e64f5615cd',
      ],
      [
        '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4',
        'f58c4c04d6e5f1ba779eabfb5f7bfbd69cfc4e967edb808d679f777bc6702c7d39f23369a9d9bacfa530e26304231461b2eb05e2c39be9fcda6c19078c6a9d1b',
      ],
    ] as const) {
      expect(aesCbc(plaintext, hex(vectorKey), 'encrypt', hex(iv))).toEqual(hex(ciphertext))
      expect(aesCbc(hex(ciphertext), hex(vectorKey), 'decrypt', hex(iv))).toEqual(plaintext)
    }
  })

  /** Expected values from `openssl enc -aes-*-cbc`, which pads with PKCS#7 by default. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as openssl enc does', () => {
    for (const [text, ciphertext] of [
      ['', 'c84af0b613435d5d9182801a9bd9320b'],
      ['ATTACK AT DAWN', '9bae05a967f1cf1d7d3601f7ef8b4d79'],
      ['zażółć gęślą jaźń 🙂', 'a341af5c630a9defb56812ea8f241d5a2768aefa9fbcd1dc22bc73d4016076e3'],
      ['0123456789ABCDEF', '159e1dbe75bfe5c45c3cd075e4cc7831ba3a3a660ec37e5832ed3b1bcfc7572a'],
    ]) {
      expect(cbc.encode(text!, { key, iv })).toEqual({
        text: ciphertext,
        cipher: 'aes-cbc',
        operation: 'encode',
        options: { key, mode: 'cbc', iv },
      })
      expect(cbc.decode(ciphertext!, { key, iv }).text).toBe(text)
    }
    for (const [aesKey, ciphertext] of [
      ['8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b', '134d088ca5f4c48fe0bd76fb1ea7da9e'],
      [
        '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4',
        'ef9af9c6f9719a139bd32fb27b3b86e4',
      ],
    ]) {
      expect(cbc.encode('ATTACK AT DAWN', { key: aesKey, iv }).text).toBe(ciphertext)
      expect(cbc.decode(ciphertext!, { key: aesKey, iv }).text).toBe('ATTACK AT DAWN')
    }
  })

  it('reads the IV in any case and spacing, and a different IV gives different ciphertext', () => {
    const result = cbc.encode('ATTACK AT DAWN', { key, iv: '00010203 04050607 08090A0B 0C0D0E0F' })
    expect(result.options).toEqual({ key, mode: 'cbc', iv })
    const other = cbc.encode('ATTACK AT DAWN', { key, iv: 'f'.repeat(32) })
    expect(other.text).toBe('8d2fe768b5665d720cb9cc35f5095ee9')
    expect(cbc.decode(other.text, { key, iv: 'f'.repeat(32) }).text).toBe('ATTACK AT DAWN')
  })

  it('gives different ciphertext blocks for equal plaintext blocks', () => {
    const { text } = cbc.encode('A'.repeat(32), { key, iv })
    expect(text).toBe(
      'ab74350f2f19b4ea4de050762e12dbc18d2f731d5ae2fa0858814a0e6df219ca25292ca5cf9e35a0afb9452d5c640c6e',
    )
    expect(text.slice(0, 32)).not.toBe(text.slice(32, 64))
  })

  it('rejects keys and IVs it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => cbc[operation]('', { iv })).toThrow(MissingOptionError)
      expect(() => cbc[operation]('', { key })).toThrow(MissingOptionError)
      expect(() => cbc[operation]('', { key, iv: '' })).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(15), '00'.repeat(20), 'g'.repeat(32), 12]) {
        expect(() => cbc[operation]('', { key: bad, iv })).toThrow(InvalidOptionError)
      }
      for (const bad of [
        '00'.repeat(15),
        '00'.repeat(17),
        'g'.repeat(32),
        '0x' + '0'.repeat(30),
        1,
      ]) {
        expect(() => cbc[operation]('', { key, iv: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => cbc.decode('9bae05a9', { key, iv })).toThrow(/whole 16-byte blocks/)
    expect(() =>
      cbc.decode('9bae05a967f1cf1d7d3601f7ef8b4d79', { key: '00'.repeat(16), iv }),
    ).toThrow(/not AES-CBC ciphertext/)
  })

  it('reports the block category and the IV option', () => {
    expect(resolveCipher('AES CBC')).toBe(cbc)
    expect(cbc.info()).toMatchObject({
      name: 'aes-cbc',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'iv', type: 'string', required: true },
      ],
    })
  })
})

describe('aes-cfb', () => {
  const cfb = create('aes-cfb')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '2b7e151628aed2a6abf7158809cf4f3c'
  const iv = '000102030405060708090a0b0c0d0e0f'

  /** NIST SP 800-38A F.3.1, F.3.7, F.3.13, F.3.15 and F.3.17: CFB1, CFB8 and CFB128 encryption. */
  it('matches the NIST SP 800-38A CFB-AES vectors', () => {
    const plaintext =
      '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710'
    for (const [vectorKey, segment, input, ciphertext] of [
      [key, 1, '6bc1', '68b3'],
      [key, 8, '6bc1bee22e409f96e93d7e117393172aae2d', '3b79424c9c0dd436bace9e0ed4586a4f32b9'],
      [
        key,
        128,
        plaintext,
        '3b3fd92eb72dad20333449f8e83cfb4ac8a64537a0b3a93fcde3cdad9f1ce58b26751f67a3cbb140b1808cf187a4f4dfc04b05357c5d1c0eeac4c66f9ff7f2e6',
      ],
      [
        '8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b',
        128,
        plaintext,
        'cdc80d6fddf18cab34c25909c99a417467ce7f7f81173621961a2b70171d3d7a2e1e8a1dd59b88b1c8e60fed1efac4c9c05f9f9ca9834fa042ae8fba584b09ff',
      ],
      [
        '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4',
        128,
        plaintext,
        'dc7e84bfda79164b7ecd8486985d386039ffed143b28b1c832113c6331e5407bdf10132415e54b92a13ed0a8267ae2f975a385741ab9cef82031623d55b1e471',
      ],
    ] as const) {
      expect(aesCfb(hex(input), hex(vectorKey), 'encrypt', hex(iv), segment)).toEqual(
        hex(ciphertext),
      )
      expect(aesCfb(hex(ciphertext), hex(vectorKey), 'decrypt', hex(iv), segment)).toEqual(
        hex(input),
      )
    }
  })

  /** Expected values from `openssl enc -aes-128-cfb1`, `-cfb8` and `-cfb`, which do not pad. */
  it('encodes UTF-8 text to hex of the same length, as openssl enc does', () => {
    for (const [segment, text, ciphertext] of [
      [128, '', ''],
      [128, 'ATTACK AT DAWN', '11aa338dda2612f78e2973a8cce1'],
      [
        128,
        'zażółć gęślą jaźń 🙂',
        '2a9fa2705adef7341e8e178e5f3629fbdcf2a5b859f12c11375678084ccfd2',
      ],
      [8, 'ATTACK AT DAWN', '11585d087981d10c0863f5b2c8dd'],
      [8, 'zażółć gęślą jaźń 🙂', '2aeca1a792b564b82cd605e3f57bf1da15980aabcdd850b53c1579584bb519'],
      [1, 'ATTACK AT DAWN', '5c3f38e582911f3b59ed8c3e4a11'],
      [1, 'zażółć gęślą jaźń 🙂', '7a8a2ff41b1e8108e2637be4ac1749c065115b970de5bd908df7a510938f4a'],
    ] as const) {
      expect(cfb.encode(text, { key, iv, segment })).toEqual({
        text: ciphertext,
        cipher: 'aes-cfb',
        operation: 'encode',
        options: { key, mode: 'cfb', iv, segment },
      })
      expect(cfb.decode(ciphertext, { key, iv, segment }).text).toBe(text)
    }
    expect(cfb.encode('ATTACK AT DAWN', { key, iv }).options).toEqual({
      key,
      mode: 'cfb',
      iv,
      segment: 128,
    })
    for (const [aesKey, ciphertext] of [
      ['8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b', 'e75de7ccb0fa337c89df6359ed47'],
      [
        '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4',
        'f6eb6e1cb772a99cc3d0bed6bc80',
      ],
    ]) {
      expect(cfb.encode('ATTACK AT DAWN', { key: aesKey, iv }).text).toBe(ciphertext)
      expect(cfb.decode(ciphertext!, { key: aesKey, iv }).text).toBe('ATTACK AT DAWN')
    }
  })

  /** Expected value from `openssl enc -aes-128-cfb` over thirty-two `A`s. */
  it('gives different ciphertext blocks for equal plaintext blocks', () => {
    const { text } = cfb.encode('A'.repeat(32), { key, iv })
    expect(text).toBe('11bf268dd82c73f79b4876a8daeead21975761a0d16d3f5fe3fcc49d988f750a')
    expect(text.slice(0, 32)).not.toBe(text.slice(32, 64))
  })

  /** The key was searched with `openssl enc -aes-128-cfb8`: AES of the zero block starts with 0x00. */
  it('keeps an all-zero message all zero under a zero IV when the first keystream byte is 0', () => {
    const zeroKey = '0'.repeat(30) + '5f'
    const zeroIv = '0'.repeat(32)
    expect(cfb.encode('\0'.repeat(8), { key: zeroKey, iv: zeroIv, segment: 8 }).text).toBe(
      '00'.repeat(8),
    )
    expect(cfb.encode('\0'.repeat(8), { key: zeroKey, iv: zeroIv }).text).not.toBe('00'.repeat(8))
  })

  it('reads the IV in any case and spacing, and a different IV gives different ciphertext', () => {
    const result = cfb.encode('ATTACK AT DAWN', { key, iv: '00010203 04050607 08090A0B 0C0D0E0F' })
    expect(result.options).toEqual({ key, mode: 'cfb', iv, segment: 128 })
    const other = cfb.encode('ATTACK AT DAWN', { key, iv: 'f'.repeat(32) })
    expect(other.text).toBe('cba6d24001bca6b55d10385b6830')
    expect(cfb.decode(other.text, { key, iv: 'f'.repeat(32) }).text).toBe('ATTACK AT DAWN')
  })

  it('rejects keys, IVs and segments it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => cfb[operation]('', { iv })).toThrow(MissingOptionError)
      expect(() => cfb[operation]('', { key })).toThrow(MissingOptionError)
      expect(() => cfb[operation]('', { key, iv: '' })).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(15), '00'.repeat(20), 'g'.repeat(32), 12]) {
        expect(() => cfb[operation]('', { key: bad, iv })).toThrow(InvalidOptionError)
      }
      for (const bad of ['00'.repeat(15), '00'.repeat(17), 'g'.repeat(32), 1]) {
        expect(() => cfb[operation]('', { key, iv: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of [0, 2, 16, 64, 129, '8', 8.5]) {
        expect(() => cfb[operation]('', { key, iv, segment: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => cfb.decode('11aa3', { key, iv })).toThrow(/whole bytes/)
    expect(() => cfb.decode('11zz', { key, iv })).toThrow(/hex digits/)
    expect(() => cfb.decode('11aa338dda2612f78e2973a8cce1', { key: '00'.repeat(16), iv })).toThrow(
      /not UTF-8/,
    )
  })

  it('reports the block category and the IV and segment options', () => {
    expect(resolveCipher('AES CFB')).toBe(cfb)
    expect(cfb.info()).toMatchObject({
      name: 'aes-cfb',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'iv', type: 'string', required: true },
        { name: 'segment', type: 'number', required: false, default: 128 },
      ],
    })
  })
})

describe('aes-ofb', () => {
  const ofb = create('aes-ofb')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '2b7e151628aed2a6abf7158809cf4f3c'
  const iv = '000102030405060708090a0b0c0d0e0f'

  /** NIST SP 800-38A F.4.1, F.4.3 and F.4.5: OFB-AES128, OFB-AES192 and OFB-AES256 encryption. */
  it('matches the NIST SP 800-38A OFB-AES vectors', () => {
    const plaintext = hex(
      '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710',
    )
    for (const [vectorKey, ciphertext] of [
      [
        key,
        '3b3fd92eb72dad20333449f8e83cfb4a7789508d16918f03f53c52dac54ed8259740051e9c5fecf64344f7a82260edcc304c6528f659c77866a510d9c1d6ae5e',
      ],
      [
        '8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b',
        'cdc80d6fddf18cab34c25909c99a4174fcc28b8d4c63837c09e81700c11004018d9a9aeac0f6596f559c6d4daf59a5f26d9f200857ca6c3e9cac524bd9acc92a',
      ],
      [
        '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4',
        'dc7e84bfda79164b7ecd8486985d38604febdc6740d20b3ac88f6ad82a4fb08d71ab47a086e86eedf39d1c5bba97c4080126141d67f37be8538f5a8be740e484',
      ],
    ] as const) {
      expect(aesOfb(plaintext, hex(vectorKey), hex(iv))).toEqual(hex(ciphertext))
      expect(aesOfb(hex(ciphertext), hex(vectorKey), hex(iv))).toEqual(plaintext)
    }
  })

  /** Expected values from `openssl enc -aes-128-ofb`, which does not pad. */
  it('encodes UTF-8 text to hex of the same length, as openssl enc does', () => {
    for (const [text, ciphertext] of [
      ['', ''],
      ['ATTACK AT DAWN', '11aa338dda2612f78e2973a8cce1'],
      ['zażółć gęślą jaźń 🙂', '2a9fa2705adef7341e8e178e5f3629fbb5605ffa62f3e625ae0f1d861f78d4'],
    ] as const) {
      expect(ofb.encode(text, { key, iv })).toEqual({
        text: ciphertext,
        cipher: 'aes-ofb',
        operation: 'encode',
        options: { key, mode: 'ofb', iv },
      })
      expect(ofb.decode(ciphertext, { key, iv }).text).toBe(text)
    }
  })

  /**
   * Expected value from `openssl enc -aes-128-ofb` over thirty-two `A`s. The second keystream
   * block is AES over the first, the output block NIST SP 800-38A F.4.1 lists for block 1.
   */
  it('feeds each keystream block back as the next input', () => {
    const { text } = ofb.encode('A'.repeat(32), { key, iv })
    expect(text).toBe('11bf268dd82c73f79b4876a8daeead2198e59b9b49d362de2aca7c37c1a01735')
    expect(text.slice(0, 32)).not.toBe(text.slice(32, 64))
    const next = ofb.encode('A'.repeat(16), { key, iv: '50fe67cc996d32b6da0937e99bafec60' })
    expect(next.text).toBe(text.slice(32))
  })

  /** Expected values from `openssl enc -aes-128-ofb`. */
  it('flips the same plaintext bit a ciphertext bit flips, in any block', () => {
    const text = 'ATTACK AT DAWN, RETREAT AT DUSK.'
    const ciphertext = '11aa338dda2612f78e2973a8cce1c0408be18e884dd377bf2adf1d32d5b21d5a'
    expect(ofb.encode(text, { key, iv }).text).toBe(ciphertext)
    const flipped = hex(ciphertext)
      .map((byte, i) => byte ^ ([0x14, 0x04, 0x05][i - 11] ?? 0))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
    expect(ofb.decode(flipped, { key, iv }).text).toBe('ATTACK AT DUSK, RETREAT AT DUSK.')
  })

  it('leaks the XOR of two texts sent under the same key and IV', () => {
    const xor = (a: string, b: string) =>
      hex(a)
        .map((byte, i) => (byte ^ hex(b)[i]!).toString(16).padStart(2, '0'))
        .join('')
    const dawn = ofb.encode('ATTACK AT DAWN', { key, iv }).text
    const dusk = ofb.encode('ATTACK AT DUSK', { key, iv }).text
    expect(dusk).toBe('11aa338dda2612f78e2973bcc8e4')
    expect(xor(dawn, dusk)).toBe('0000000000000000000000140405')
  })

  /** Expected value from `openssl enc -aes-128-ofb` with the other IV. */
  it('reads the IV in any case and spacing, and a different IV gives different ciphertext', () => {
    const result = ofb.encode('ATTACK AT DAWN', { key, iv: '00010203 04050607 08090A0B 0C0D0E0F' })
    expect(result.options).toEqual({ key, mode: 'ofb', iv })
    const other = 'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff'
    expect(ofb.encode('ATTACK AT DAWN', { key, iv: other }).text).toBe(
      'add88b32db2b5cf1a6f25234bdd0',
    )
    expect(ofb.decode('add88b32db2b5cf1a6f25234bdd0', { key, iv: other }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys and IVs it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => ofb[operation]('', { iv })).toThrow(MissingOptionError)
      expect(() => ofb[operation]('', { key })).toThrow(MissingOptionError)
      expect(() => ofb[operation]('', { key, iv: '' })).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(15), '00'.repeat(20), 'g'.repeat(32), 12]) {
        expect(() => ofb[operation]('', { key: bad, iv })).toThrow(InvalidOptionError)
      }
      for (const bad of ['00'.repeat(15), '00'.repeat(17), 'g'.repeat(32), 1]) {
        expect(() => ofb[operation]('', { key, iv: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => ofb.decode('11aa3', { key, iv })).toThrow(/whole bytes/)
    expect(() => ofb.decode('11zz', { key, iv })).toThrow(/hex digits/)
    expect(() => ofb.decode('11aa338dda2612f78e2973a8cce1', { key: '00'.repeat(16), iv })).toThrow(
      /not UTF-8/,
    )
  })

  it('reports the block category and the IV option', () => {
    expect(resolveCipher('AES OFB')).toBe(ofb)
    expect(ofb.info()).toMatchObject({
      name: 'aes-ofb',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'iv', type: 'string', required: true },
      ],
    })
  })
})

describe('aes-ctr', () => {
  const ctr = create('aes-ctr')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '2b7e151628aed2a6abf7158809cf4f3c'
  const iv = '000102030405060708090a0b0c0d0e0f'

  /** NIST SP 800-38A F.5.1, F.5.3 and F.5.5: CTR-AES128, CTR-AES192 and CTR-AES256 encryption. */
  it('matches the NIST SP 800-38A CTR-AES vectors', () => {
    const counter = hex('f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff')
    const plaintext = hex(
      '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710',
    )
    for (const [vectorKey, ciphertext] of [
      [
        key,
        '874d6191b620e3261bef6864990db6ce9806f66b7970fdff8617187bb9fffdff5ae4df3edbd5d35e5b4f09020db03eab1e031dda2fbe03d1792170a0f3009cee',
      ],
      [
        '8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b',
        '1abc932417521ca24f2b0459fe7e6e0b090339ec0aa6faefd5ccc2c6f4ce8e941e36b26bd1ebc670d1bd1d665620abf74f78a7f6d29809585a97daec58c6b050',
      ],
      [
        '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4',
        '601ec313775789a5b7a7f504bbf3d228f443e3ca4d62b59aca84e990cacaf5c52b0930daa23de94ce87017ba2d84988ddfc9c58db67aada613c2dd08457941a6',
      ],
    ] as const) {
      expect(aesCtr(plaintext, hex(vectorKey), counter)).toEqual(hex(ciphertext))
      expect(aesCtr(hex(ciphertext), hex(vectorKey), counter)).toEqual(plaintext)
    }
  })

  /** Expected values from `openssl enc -aes-128-ctr`, which does not pad. */
  it('encodes UTF-8 text to hex of the same length, as openssl enc does', () => {
    for (const [text, ciphertext] of [
      ['', ''],
      ['ATTACK AT DAWN', '11aa338dda2612f78e2973a8cce1'],
      ['zażółć gęślą jaźń 🙂', '2a9fa2705adef7341e8e178e5f3629fbc3e50b6eed8256101fb56b14e46e21'],
    ] as const) {
      expect(ctr.encode(text, { key, iv })).toEqual({
        text: ciphertext,
        cipher: 'aes-ctr',
        operation: 'encode',
        options: { key, mode: 'ctr', iv },
      })
      expect(ctr.decode(ciphertext, { key, iv }).text).toBe(text)
    }
  })

  /** Expected value from `openssl enc -aes-128-ctr` over thirty-two `A`s. */
  it('gives different ciphertext blocks for equal plaintext blocks', () => {
    const { text } = ctr.encode('A'.repeat(32), { key, iv })
    expect(text).toBe('11bf268dd82c73f79b4876a8daeead21ee60cf0fc6a2d2eb9b700aa53ab6e21e')
    expect(text.slice(0, 32)).not.toBe(text.slice(32, 64))
  })

  /** Expected value from `openssl enc -aes-128-ctr`, which carries across all 128 bits. */
  it('wraps the counter from all ones to all zeros', () => {
    const { text } = ctr.encode('A'.repeat(32), { key, iv: 'f'.repeat(32) })
    expect(text).toBe('cbb3c74003b6c7b548713d5b7e3febed3cb62a4d5bf9d8f27f03b106f85a152e')
    expect(text.slice(32)).toBe(ctr.encode('A'.repeat(16), { key, iv: '0'.repeat(32) }).text)
  })

  it('leaks the XOR of two texts sent under the same key and IV', () => {
    const xor = (a: string, b: string) =>
      hex(a)
        .map((byte, i) => (byte ^ hex(b)[i]!).toString(16).padStart(2, '0'))
        .join('')
    const dawn = ctr.encode('ATTACK AT DAWN', { key, iv }).text
    const dusk = ctr.encode('ATTACK AT DUSK', { key, iv }).text
    expect(xor(dawn, dusk)).toBe('0000000000000000000000140405')
  })

  it('reads the IV in any case and spacing, and a different IV gives different ciphertext', () => {
    const result = ctr.encode('ATTACK AT DAWN', { key, iv: '00010203 04050607 08090A0B 0C0D0E0F' })
    expect(result.options).toEqual({ key, mode: 'ctr', iv })
    const other = ctr.encode('ATTACK AT DAWN', { key, iv: 'f'.repeat(32) })
    expect(other.text).not.toBe(result.text)
    expect(ctr.decode(other.text, { key, iv: 'f'.repeat(32) }).text).toBe('ATTACK AT DAWN')
  })

  it('rejects keys and IVs it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => ctr[operation]('', { iv })).toThrow(MissingOptionError)
      expect(() => ctr[operation]('', { key })).toThrow(MissingOptionError)
      expect(() => ctr[operation]('', { key, iv: '' })).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(15), '00'.repeat(20), 'g'.repeat(32), 12]) {
        expect(() => ctr[operation]('', { key: bad, iv })).toThrow(InvalidOptionError)
      }
      for (const bad of ['00'.repeat(15), '00'.repeat(17), 'g'.repeat(32), 1]) {
        expect(() => ctr[operation]('', { key, iv: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => ctr.decode('11aa3', { key, iv })).toThrow(/whole bytes/)
    expect(() => ctr.decode('11zz', { key, iv })).toThrow(/hex digits/)
    expect(() => ctr.decode('11aa338dda2612f78e2973a8cce1', { key: '00'.repeat(16), iv })).toThrow(
      /not UTF-8/,
    )
  })

  it('reports the block category and the IV option', () => {
    expect(resolveCipher('AES CTR')).toBe(ctr)
    expect(ctr.info()).toMatchObject({
      name: 'aes-ctr',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'iv', type: 'string', required: true },
      ],
    })
  })
})

describe('aes-ccm', () => {
  const ccm = create('aes-ccm')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '2b7e151628aed2a6abf7158809cf4f3c'
  const nonce = '000102030405060708090a0b'
  const dawn = '9038dc3aa03594330d2d4dca3cb9f3d0bc51521e4e075cf5099b1b92fa10'

  /** NIST SP 800-38C Appendix C, Examples 1 to 3. */
  it('matches the NIST SP 800-38C examples', () => {
    const vectorKey = hex('404142434445464748494a4b4c4d4e4f')
    for (const [vectorNonce, aad, plaintext, tagLength, ciphertext] of [
      ['10111213141516', '0001020304050607', '20212223', 32, '7162015b4dac255d'],
      [
        '1011121314151617',
        '000102030405060708090a0b0c0d0e0f',
        '202122232425262728292a2b2c2d2e2f',
        48,
        'd2a1f0e051ea5f62081a7792073d593d1fc64fbfaccd',
      ],
      [
        '101112131415161718191a1b',
        '000102030405060708090a0b0c0d0e0f10111213',
        '202122232425262728292a2b2c2d2e2f3031323334353637',
        64,
        'e3b201a9f5b71a7a9b1ceaeccd97e70b6176aad9a4428aa5484392fbc1b09951',
      ],
    ] as const) {
      const n = hex(vectorNonce)
      expect(aesCcm(hex(plaintext), vectorKey, 'encrypt', n, hex(aad), tagLength)).toEqual(
        hex(ciphertext),
      )
      expect(aesCcm(hex(ciphertext), vectorKey, 'decrypt', n, hex(aad), tagLength)).toEqual(
        hex(plaintext),
      )
    }
  })

  /** RFC 3610 §8, Packet Vector #1: 13-byte nonce, 8-byte header, 8-byte tag. */
  it('matches RFC 3610 packet vector 1 through the text API', () => {
    const options = {
      key: 'c0c1c2c3c4c5c6c7c8c9cacbcccdcecf',
      nonce: '00000003020100a0a1a2a3a4a5',
      aad: '0001020304050607',
      tagLength: 64,
    }
    const plaintext = String.fromCodePoint(...hex('08090a0b0c0d0e0f101112131415161718191a1b1c1d1e'))
    const ciphertext = '588c979a61c663d2f066d0c2c0f989806d5f6b61dac38417e8d12cfdf926e0'
    expect(ccm.encode(plaintext, options)).toEqual({
      text: ciphertext,
      cipher: 'aes-ccm',
      operation: 'encode',
      options: { ...options, mode: 'ccm' },
    })
    expect(ccm.decode(ciphertext, options).text).toBe(plaintext)
  })

  /** Expected values from Node's `createCipheriv('aes-128-ccm')`, OpenSSL underneath. */
  it('encodes UTF-8 text to hex with the tag at the end, as OpenSSL does', () => {
    for (const [text, options, ciphertext] of [
      ['', {}, 'd9422430b6276d5de19e38239777fc30'],
      ['ATTACK AT DAWN', {}, dawn],
      [
        'zażółć gęślą jaźń 🙂',
        {},
        'ab0d4dc720cd71f09d8a29ecaf6e25fb2a41b9259a36d5651beac84b46f81c9fac8aa2be38c188f47bbcc978c1aae9',
      ],
      [
        'ATTACK AT DAWN',
        { aad: '46524f4d3a2048512e' },
        '9038dc3aa03594330d2d4dca3cb9a5038633d04da4a01f58149f30e75d5b',
      ],
      ['ATTACK AT DAWN', { tagLength: 64 }, '9038dc3aa03594330d2d4dca3cb98449c5e413b366ac'],
      [
        'ATTACK AT DAWN',
        { nonce: '10111213141516' },
        '7d7146055a86c0d1f5b38fd296d46f2b2060a1c8345eec713cb0f0d8c9e3',
      ],
    ] as const) {
      const all = { key, nonce, ...options }
      expect(ccm.encode(text, all).text).toBe(ciphertext)
      expect(ccm.decode(ciphertext, all).text).toBe(text)
    }
    expect(ccm.encode('ATTACK AT DAWN', { key, nonce }).options).toEqual({
      key,
      mode: 'ccm',
      nonce,
      tagLength: 128,
      aad: '',
    })
  })

  it('refuses a ciphertext whose tag does not match', () => {
    // DAWN to DUSK: the same XOR that goes through unnoticed in CTR.
    const flipped = hex(dawn)
      .map((byte, i) => byte ^ ([0x14, 0x04, 0x05][i - 11] ?? 0))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
    expect(flipped.slice(0, 28)).toBe('9038dc3aa03594330d2d4dde38bc')
    for (const [text, options] of [
      [flipped, { key, nonce }],
      [dawn.slice(0, -2) + '11', { key, nonce }],
      [dawn, { key: '00'.repeat(16), nonce }],
      [dawn, { key, nonce: '00'.repeat(12) }],
      [dawn, { key, nonce, aad: '00' }],
      [dawn, { key, nonce, tagLength: 64 }],
    ] as const) {
      expect(() => ccm.decode(text, options)).toThrow(CipherError)
      expect(() => ccm.decode(text, options)).toThrow(/Tag does not match/)
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => ccm.decode('9038d', { key, nonce })).toThrow(/whole bytes/)
    expect(() => ccm.decode('90zz', { key, nonce })).toThrow(/hex digits/)
    expect(() => ccm.decode('9038dc3a', { key, nonce })).toThrow(/16-byte tag, got 4 bytes/)
  })

  it('refuses text too long for the length field a 13-byte nonce leaves', () => {
    const long = { key, nonce: '00'.repeat(13), tagLength: 32 as const }
    expect(() => ccm.encode('A'.repeat(65_536), long)).toThrow(/at most 65535 bytes/)
    expect(ccm.encode('A'.repeat(65_535), long).text).toHaveLength(2 * (65_535 + 4))
  })

  it('reads key, nonce and aad in any case and spacing', () => {
    const result = ccm.encode('ATTACK AT DAWN', {
      key: '2B7E1516 28AED2A6 ABF71588 09CF4F3C',
      nonce: '00010203 04050607 08090A0B',
      aad: '46 52 4F 4D',
    })
    expect(result.options).toEqual({ key, mode: 'ccm', nonce, tagLength: 128, aad: '46524f4d' })
  })

  it('rejects keys, nonces, aad and tag lengths it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => ccm[operation]('', { nonce })).toThrow(MissingOptionError)
      expect(() => ccm[operation]('', { key })).toThrow(MissingOptionError)
      expect(() => ccm[operation]('', { key, nonce: '' })).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(15), '00'.repeat(20), 'g'.repeat(32), 12]) {
        expect(() => ccm[operation]('', { key: bad, nonce })).toThrow(InvalidOptionError)
      }
      for (const bad of ['00'.repeat(6), '00'.repeat(14), '0'.repeat(15), 'g'.repeat(14), 1]) {
        expect(() => ccm[operation]('', { key, nonce: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of ['0', 'zz', 7]) {
        expect(() => ccm[operation]('', { key, nonce, aad: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of [0, 16, 40, 136, '128']) {
        expect(() => ccm[operation]('', { key, nonce, tagLength: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('reports the block category and its options', () => {
    expect(resolveCipher('AES CCM')).toBe(ccm)
    expect(ccm.info()).toMatchObject({
      name: 'aes-ccm',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'nonce', type: 'string', required: true },
        { name: 'aad', type: 'string', required: false, default: '' },
        { name: 'tagLength', type: 'number', required: false, default: 128 },
      ],
    })
  })
})

describe('aes-ocb', () => {
  const ocb = create('aes-ocb')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const bytes = (length: number) => Array.from({ length }, (_, i) => i)
  const key = '2b7e151628aed2a6abf7158809cf4f3c'
  const nonce = '000102030405060708090a0b'
  const dawn = 'd5ae8f2ca0693c898f8e7466703ca89edcaab00caca2cf36bfcac3794412'

  /** RFC 7253 Appendix A: the 128-bit tag examples, P and A as 0x00, 0x01, ... bytes. */
  it('matches the RFC 7253 sample results', () => {
    const vectorKey = bytes(16)
    for (const [vectorNonce, aad, plaintext, ciphertext] of [
      ['bbaa99887766554433221100', 0, 0, '785407bfffc8ad9edcc5520ac9111ee6'],
      ['bbaa99887766554433221101', 8, 8, '6820b3657b6f615a5725bda0d3b4eb3a257c9af1f8f03009'],
      ['bbaa99887766554433221102', 8, 0, '81017f8203f081277152fade694a0a00'],
      ['bbaa99887766554433221103', 0, 8, '45dd69f8f5aae72414054cd1f35d82760b2cd00d2f99bfa9'],
      [
        'bbaa99887766554433221104',
        16,
        16,
        '571d535b60b277188be5147170a9a22c3ad7a4ff3835b8c5701c1ccec8fc3358',
      ],
      [
        'bbaa9988776655443322110a',
        32,
        32,
        'bd6f6c496201c69296c11efd138a467abd3c707924b964deaffc40319af5a48540fbba186c5553c68ad9f592a79a4240',
      ],
      [
        'bbaa9988776655443322110f',
        0,
        40,
        '4412923493c57d5de0d700f753cce0d1d2d95060122e9f15a5ddbfc5787e50b5cc55ee507bcb084e479ad363ac366b95a98ca5f3000b1479',
      ],
    ] as const) {
      const n = hex(vectorNonce)
      expect(aesOcb(bytes(plaintext), vectorKey, 'encrypt', n, bytes(aad), 128)).toEqual(
        hex(ciphertext),
      )
      expect(aesOcb(hex(ciphertext), vectorKey, 'decrypt', n, bytes(aad), 128)).toEqual(
        bytes(plaintext),
      )
    }
  })

  /** RFC 7253 Appendix A: the 96-bit tag example under the reversed key. */
  it('matches the RFC 7253 sample with a 96-bit tag', () => {
    const vectorKey = hex('0f0e0d0c0b0a09080706050403020100')
    const n = hex('bbaa9988776655443322110d')
    const ciphertext = hex(
      '1792a4e31e0755fb03e31b22116e6c2ddf9efd6e33d536f1a0124b0a55bae884ed93481529c76b6ad0c515f4d1cdd4fdac4f02aa',
    )
    expect(aesOcb(bytes(40), vectorKey, 'encrypt', n, bytes(40), 96)).toEqual(ciphertext)
    expect(aesOcb(ciphertext, vectorKey, 'decrypt', n, bytes(40), 96)).toEqual(bytes(40))
  })

  /** RFC 7253 Appendix A: 384 encryptions per parameter set, authenticated by one last call. */
  it('matches the RFC 7253 iterated results for every named parameter set', () => {
    const counter = (i: number) => [...Array.from({ length: 10 }, () => 0), i >> 8, i & 0xff]
    for (const [keyBytes, tagLength, output] of [
      [16, 128, '67e944d23256c5e0b6c61fa22fdf1ea2'],
      [24, 128, 'f673f2c3e7174aae7bae986ca9f29e17'],
      [32, 128, 'd90eb8e9c977c88b79dd793d7ffa161c'],
      [16, 96, '77a3d8e73589158d25d01209'],
      [24, 96, '05d56ead2752c86be6932c5e'],
      [32, 96, '5458359ac23b0cba9e6330dd'],
      [16, 64, '192c9b7bd90ba06a'],
      [24, 64, '0066bc6e0ef34e24'],
      [32, 64, '7d4ea5d445501cbe'],
    ] as const) {
      const vectorKey = [...Array.from({ length: keyBytes - 1 }, () => 0), tagLength]
      const run = (data: readonly number[], i: number, aad: readonly number[]) =>
        aesOcb(data, vectorKey, 'encrypt', counter(i), aad, tagLength)
      const c: number[] = []
      for (let i = 0; i < 128; i++) {
        const s = Array.from({ length: i }, () => 0)
        c.push(...run(s, 3 * i + 1, s), ...run(s, 3 * i + 2, []), ...run([], 3 * i + 3, s))
      }
      expect(run([], 385, c)).toEqual(hex(output))
    }
  })

  /** Expected values from Node's `createCipheriv('aes-128-ocb')`, OpenSSL underneath. */
  it('encodes UTF-8 text to hex with the tag at the end, as OpenSSL does', () => {
    for (const [text, options, ciphertext] of [
      ['', {}, 'efa17098beab7f49f020ef13d2b74c2c'],
      ['ATTACK AT DAWN', {}, dawn],
      [
        'zażółć gęślą jaźń 🙂',
        {},
        '013f9e0c494417d92dae71db1d971cdd5fe71675faa770fbfa8f6d0a29be1b1c8d54e85c8ff3d7f15479eb46b472c8',
      ],
      [
        'ATTACK AT DAWN',
        { aad: '46524f4d3a2048512e' },
        'd5ae8f2ca0693c898f8e7466703c3540bc18319e6bafb89838f7fa34b4d6',
      ],
      // The tag length goes into the nonce block, so the text bytes change with it too.
      ['ATTACK AT DAWN', { tagLength: 64 }, '006442d918150ca6a4daf6903e6b6141a3b9b9a68fe8'],
      ['ATTACK AT DAWN', { tagLength: 96 }, 'bfa036a60110fb4529e581189fc64de75b0e0d6e4b46ebe50fbf'],
      [
        'ATTACK AT DAWN',
        { nonce: '42' },
        '5262cf33605a458d6bed7f2954a15148a0e4259f947959140a64648d45d5',
      ],
      [
        'ATTACK AT DAWN',
        { nonce: '000102030405060708090a0b0c0d0e' },
        '8bfb1e5a72b4667d79086c9c98ab214f6ee3a5a466677e86473793f2031d',
      ],
    ] as const) {
      const all = { key, nonce, ...options }
      expect(ocb.encode(text, all).text).toBe(ciphertext)
      expect(ocb.decode(ciphertext, all).text).toBe(text)
    }
    expect(ocb.encode('ATTACK AT DAWN', { key, nonce }).options).toEqual({
      key,
      mode: 'ocb',
      nonce,
      tagLength: 128,
      aad: '',
    })
  })

  it('refuses a ciphertext whose tag does not match', () => {
    // DAWN to DUSK, the XOR that CTR lets through.
    const flipped = hex(dawn)
      .map((byte, i) => byte ^ ([0x14, 0x04, 0x05][i - 11] ?? 0))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
    for (const [text, options] of [
      [flipped, { key, nonce }],
      [dawn.slice(0, -2) + '13', { key, nonce }],
      [dawn, { key: '00'.repeat(16), nonce }],
      [dawn, { key, nonce: '00'.repeat(12) }],
      [dawn, { key, nonce, aad: '00' }],
      [dawn, { key, nonce, tagLength: 64 }],
    ] as const) {
      expect(() => ocb.decode(text, options)).toThrow(CipherError)
      expect(() => ocb.decode(text, options)).toThrow(/Tag does not match/)
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => ocb.decode('d5ae8', { key, nonce })).toThrow(/whole bytes/)
    expect(() => ocb.decode('d5zz', { key, nonce })).toThrow(/hex digits/)
    expect(() => ocb.decode('d5ae8f2c', { key, nonce })).toThrow(/16-byte tag, got 4 bytes/)
  })

  it('reads key, nonce and aad in any case and spacing', () => {
    const result = ocb.encode('ATTACK AT DAWN', {
      key: '2B7E1516 28AED2A6 ABF71588 09CF4F3C',
      nonce: '00010203 04050607 08090A0B',
      aad: '46 52 4F 4D',
    })
    expect(result.options).toEqual({ key, mode: 'ocb', nonce, tagLength: 128, aad: '46524f4d' })
  })

  it('rejects keys, nonces, aad and tag lengths it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => ocb[operation]('', { nonce })).toThrow(MissingOptionError)
      expect(() => ocb[operation]('', { key })).toThrow(MissingOptionError)
      expect(() => ocb[operation]('', { key, nonce: '' })).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(15), '00'.repeat(20), 'g'.repeat(32), 12]) {
        expect(() => ocb[operation]('', { key: bad, nonce })).toThrow(InvalidOptionError)
      }
      for (const bad of ['00'.repeat(16), '0', '0'.repeat(15), 'g'.repeat(14), 1]) {
        expect(() => ocb[operation]('', { key, nonce: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of ['0', 'zz', 7]) {
        expect(() => ocb[operation]('', { key, nonce, aad: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of [0, 32, 48, 80, 112, 136, '128']) {
        expect(() => ocb[operation]('', { key, nonce, tagLength: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('reports the block category and its options', () => {
    expect(resolveCipher('AES OCB')).toBe(ocb)
    expect(ocb.info()).toMatchObject({
      name: 'aes-ocb',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'nonce', type: 'string', required: true },
        { name: 'aad', type: 'string', required: false, default: '' },
        { name: 'tagLength', type: 'number', required: false, default: 128 },
      ],
    })
  })
})

describe('aes-lrw', () => {
  const lrw = create('aes-lrw')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '4562ac25f828176d4c268414b5680185258e2a05e73e9d03ee5a830ccc094c87'
  const first = '00000000000000000000000000000001'

  /**
   * IEEE P1619 LRW-32-AES vectors 1 to 7 (pdf00017), as the Linux kernel's testmgr.h carries
   * them: the AES key, then the 16-byte tweak key, over "0123456789ABCDEF" at one block index.
   */
  it('matches the IEEE P1619 LRW-AES vectors', () => {
    const plaintext = hex('30313233343536373839414243444546')
    for (const [vectorKey, index, ciphertext] of [
      [key, 1n, 'f1b273cd65a3df5fe95d489254634eb8'],
      [
        '59704714f557478cd779e80f548879440d48f0b7b15a53ea1caa6b29c2cafbaf',
        2n,
        '00c82bae95bbcde5274f0769b260e136',
      ],
      [
        'd82a9134b26a565030fe69e2377f9847cdf90b160c648fb6b00d0d1bae85871f',
        2n << 32n,
        '76322183ed8ff182f9596203690e5e01',
      ],
      [
        '0f6aeff8d3d2bb152583f73c1f012874cac6bc354d4a655490ae61cf7baebdccade494c54a29ae70',
        1n,
        '9c0f152f55a2d8f0d67b8f9e2822bc41',
      ],
      [
        '8ad4ee102fbd81fff886ceac93c5adc6a01907c09df7bbdd5213b2b7f0ff11d8d608d0cd2eb1176f',
        2n << 32n,
        'd4276a7f14913d65c860480287e33406',
      ],
      [
        'f8d476ffd646ee6c2384cb1c77d6195dfef1a9f37bbc8d21a79c21f8cb900289a845348ec8c5b5f126f50e76fefd1b1e',
        1n,
        'bd06b8e1db98899ec498e491cf1c702b',
      ],
      [
        'fb7615b23d80891dd470980bc79584c8b2fb64ce6097878d17fce45a49e830b76e7817e72d5e12d46064047af12f9e0c',
        2n << 32n,
        '5b908ec1abdd675f3d698a9553c89ce5',
      ],
    ] as const) {
      expect(aesLrw(plaintext, hex(vectorKey), 'encrypt', index)).toEqual(hex(ciphertext))
      expect(aesLrw(hex(ciphertext), hex(vectorKey), 'decrypt', index)).toEqual(plaintext)
    }
  })

  /** testmgr.h again: vector 1 over three blocks from index 2^128 - 1, so the count wraps to 0. */
  it('wraps the block index at 2^128', () => {
    const plaintext = hex('30313233343536373839414243444546'.repeat(3))
    const ciphertext = hex(
      '479050f6f48d5c7f84c783952da202c0da7fa3c0882a0a50fbc1780339fe1de5f1b273cd65a3df5fe95d489254634eb8',
    )
    expect(aesLrw(plaintext, hex(key), 'encrypt', (1n << 128n) - 1n)).toEqual(ciphertext)
    expect(aesLrw(ciphertext, hex(key), 'decrypt', (1n << 128n) - 1n)).toEqual(plaintext)
  })

  /** Expected values from Linux `lrw(aes)` through AF_ALG, with PKCS#7 applied before it. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as the Linux lrw(aes) does', () => {
    for (const [text, ciphertext] of [
      ['', 'f383e8ba9d88d4028a79e0b3dd85e012'],
      ['ATTACK AT DAWN', '1b3e1004e52c450fda5b2bca03bca338'],
      ['zażółć gęślą jaźń 🙂', 'e672b68b27d1a953907b1a938261953041f911664783aab43a2635354476b638'],
      ['0123456789ABCDEF', 'f1b273cd65a3df5fe95d489254634eb84571f1e1ed7d253c04eb85699cc5fd50'],
    ]) {
      expect(lrw.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'aes-lrw',
        operation: 'encode',
        options: { key, mode: 'lrw', tweak: first },
      })
      expect(lrw.decode(ciphertext!, { key }).text).toBe(text)
    }
    for (const [aesKey, ciphertext] of [
      [
        '0f6aeff8d3d2bb152583f73c1f012874cac6bc354d4a655490ae61cf7baebdccade494c54a29ae70',
        'afdcf442f1ff5ec189ebc98ea133fd67',
      ],
      [
        'f8d476ffd646ee6c2384cb1c77d6195dfef1a9f37bbc8d21a79c21f8cb900289a845348ec8c5b5f126f50e76fefd1b1e',
        'ebacaae6e1017a046b50747c2d527c5c',
      ],
    ]) {
      expect(lrw.encode('ATTACK AT DAWN', { key: aesKey }).text).toBe(ciphertext)
      expect(lrw.decode(ciphertext!, { key: aesKey }).text).toBe('ATTACK AT DAWN')
    }
  })

  it('starts counting from the tweak', () => {
    const tweak = '2 0000 0000'
    const result = lrw.encode('ATTACK AT DAWN', { key, tweak })
    expect(result.text).toBe('f319a072c39498a1e0c6c8213de2facc')
    expect(result.options).toEqual({ key, mode: 'lrw', tweak: '00000000000000000000000200000000' })
    expect(lrw.decode('f319a072c39498a1e0c6c8213de2facc', { key, tweak }).text).toBe(
      'ATTACK AT DAWN',
    )
    expect(lrw.encode('', { key, tweak: '1' }).text).toBe(lrw.encode('', { key }).text)
  })

  it('gives different ciphertext blocks for equal plaintext blocks', () => {
    const { text } = lrw.encode('A'.repeat(32), { key })
    expect(text).toBe(
      '709a0bafa03db466980baedc25c44ea7c622af990436ec152db2ae69dc4d779d52b4776b71f7dd0556849ba9297439ac',
    )
    expect(text.slice(0, 32)).not.toBe(text.slice(32, 64))
    const wrapped = lrw.encode('A'.repeat(32), { key, tweak: 'f'.repeat(32) })
    expect(wrapped.text).toBe(
      'ef5723a829c6cfb1f87e78859fce222017e6b62907b5e98337c96c14a8e1eb79f383e8ba9d88d4028a79e0b3dd85e012',
    )
  })

  it('rejects keys and tweaks it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => lrw[operation]('')).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(16), '00'.repeat(24), '00'.repeat(33), 'g'.repeat(64), 12]) {
        expect(() => lrw[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of ['', '0x1', 'g', '1'.repeat(33), 1]) {
        expect(() => lrw[operation]('', { key, tweak: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => lrw.decode('1b3e1004', { key })).toThrow(/whole 16-byte blocks/)
    expect(() => lrw.decode('1b3e1004e52c450fda5b2bca03bca338', { key, tweak: '2' })).toThrow(
      /not AES-LRW ciphertext/,
    )
  })

  it('reports the block category and the tweak option', () => {
    expect(resolveCipher('AES LRW')).toBe(lrw)
    expect(lrw.info()).toMatchObject({
      name: 'aes-lrw',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'tweak', type: 'string', required: false, default: '1' },
      ],
    })
  })
})

describe('aes-xts', () => {
  const xts = create('aes-xts')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '2718281828459045235360287471352631415926535897932384626433832795'
  const unit = '00000000000000000000000000000000'

  /**
   * IEEE 1619-2007 Annex B, vectors 1 to 3 and 15 to 18, as OpenSSL's
   * `evpciph_aes_common.txt` carries them. 15 to 18 end in a partial block of 1 to 4 bytes.
   */
  it('matches the IEEE 1619 XTS-AES vectors', () => {
    const stealing = 'fffefdfcfbfaf9f8f7f6f5f4f3f2f1f0bfbebdbcbbbab9b8b7b6b5b4b3b2b1b0'
    for (const [vectorKey, index, plaintext, ciphertext] of [
      [
        '00'.repeat(32),
        0n,
        '00'.repeat(32),
        '917cf69ebd68b2ec9b9fe9a3eadda692cd43d2f59598ed858c02c2652fbf922e',
      ],
      [
        '11'.repeat(16) + '22'.repeat(16),
        0x3333333333n,
        '44'.repeat(32),
        'c454185e6a16936e39334038acef838bfb186fff7480adc4289382ecd6d394f0',
      ],
      [
        'fffefdfcfbfaf9f8f7f6f5f4f3f2f1f0' + '22'.repeat(16),
        0x3333333333n,
        '44'.repeat(32),
        'af85336b597afc1a900b2eb21ec949d292df4c047e0b21532186a5971a227a89',
      ],
      [
        stealing,
        0x123456789an,
        '000102030405060708090a0b0c0d0e0f10',
        '6c1625db4671522d3d7599601de7ca09ed',
      ],
      [
        stealing,
        0x123456789an,
        '000102030405060708090a0b0c0d0e0f1011',
        'd069444b7a7e0cab09e24447d24deb1fedbf',
      ],
      [
        stealing,
        0x123456789an,
        '000102030405060708090a0b0c0d0e0f101112',
        'e5df1351c0544ba1350b3363cd8ef4beedbf9d',
      ],
      [
        stealing,
        0x123456789an,
        '000102030405060708090a0b0c0d0e0f10111213',
        '9d84c813f719aa2c7be3f66171c7c5c2edbf9dac',
      ],
    ] as const) {
      expect(aesXts(hex(plaintext), hex(vectorKey), 'encrypt', index)).toEqual(hex(ciphertext))
      expect(aesXts(hex(ciphertext), hex(vectorKey), 'decrypt', index)).toEqual(hex(plaintext))
    }
  })

  /**
   * IEEE 1619-2007 vectors 4 to 6 and 10 to 14: 512-byte data units, 4 to 6 each encrypting the
   * one before. Digests are SHA-256 of the published ciphertexts in `evpciph_aes_common.txt`.
   */
  it('matches the 512-byte IEEE 1619 vectors, up to data unit 2^40 - 1', () => {
    const counting = Array.from({ length: 512 }, (_, i) => i % 256)
    let plaintext = counting
    for (const [index, digest] of [
      [0n, 'ebee4d64dd2395bb2d6a2d37a0a48ecb2bf4913cfc99d27c2214f2f4144715ea'],
      [1n, 'bed1b9d9bf8ce83a2ae1981fbd5f2b0c40e21bba5d57df2ea16ecd0975f25215'],
      [2n, '68f1e84faa401c9914a7fd6fc565eaa7b531cedbc22bd28269aa58b15ceec03f'],
    ] as const) {
      const ciphertext = aesXts(plaintext, hex(key), 'encrypt', index)
      expect(createHash('sha256').update(Uint8Array.from(ciphertext)).digest('hex')).toBe(digest)
      expect(aesXts(ciphertext, hex(key), 'decrypt', index)).toEqual(plaintext)
      plaintext = ciphertext
    }
    const key256 =
      '27182818284590452353602874713526624977572470936999595749669676273141592653589793238462643383279502884197169399375105820974944592'
    for (const [index, digest] of [
      [0xffn, 'e97e974fa393af794f7a4684395814cf820de60a01eaec677d87b452e316b364'],
      [0xffffn, 'def4fad29e95dfe1a24b1ad4620f86d7be094cced5b19e0b121aa82d9e6baf98'],
      [0xffffffn, '8bf44861a081dd660d91ce615b5cdfb4d5df9d72c3025c12e67cc0ae097fa5d5'],
      [0xffffffffn, 'c706140a11affda7402234f5e6331eacbfeb687d8e80d83962691823bb3636f0'],
      [0xffffffffffn, 'afba71abc4e95b186d89a63a5437c1bafcfd1a18ca273970c534aba4f8d05282'],
    ] as const) {
      const ciphertext = aesXts(counting, hex(key256), 'encrypt', index)
      expect(createHash('sha256').update(Uint8Array.from(ciphertext)).digest('hex')).toBe(digest)
      expect(aesXts(ciphertext, hex(key256), 'decrypt', index)).toEqual(counting)
    }
  })

  /** Expected values from Node's `createCipheriv('aes-128-xts')`, OpenSSL underneath. */
  it('encodes UTF-8 text to hex of the same length, as OpenSSL aes-128-xts does', () => {
    for (const [text, ciphertext] of [
      [
        'ATTACK AT DAWN FROM THE NORTH',
        '22c74dbe484d5edba8907fa4eefece6d92beab33360246d4558612bf56',
      ],
      ['0123456789ABCDEF', '3e99a63ea7adcd621d2d9c41d6b40491'],
      ['zażółć gęślą jaźń 🙂', 'a0185411439f7c720df20c5a01f5f0b80dd8fad5b461aaae0e88299f6f24a5'],
    ]) {
      expect(xts.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'aes-xts',
        operation: 'encode',
        options: { key, mode: 'xts', tweak: unit },
      })
      expect(xts.decode(ciphertext!, { key }).text).toBe(text)
    }
    const key256 =
      '27182818284590452353602874713526624977572470936999595749669676273141592653589793238462643383279502884197169399375105820974944592'
    expect(xts.encode('ATTACK AT DAWN FROM THE NORTH', { key: key256 }).text).toBe(
      'dfd89948b1d8484f02a0b23379d0db92423b4da99bec0bb93ffc3b195e',
    )
  })

  /** OpenSSL again, with the IV holding the data unit number in little-endian order. */
  it('takes the data unit number from the tweak', () => {
    const text = 'ATTACK AT DAWN FROM THE NORTH'
    for (const [tweak, normalized, ciphertext] of [
      [
        '5',
        '00000000000000000000000000000005',
        '1595ed5d615365828e75081606ce0e5c05844b6b4656b7594ebd1f24e6',
      ],
      [
        '12 3456 789A',
        '0000000000000000000000123456789a',
        'f8601196923a1c1fc7ff96bea0ae5894e3d3a722cd5b05e90e443e16a9',
      ],
      [
        'f'.repeat(32),
        'f'.repeat(32),
        'db9b5aa63dd08409806b2e998b7c013f92a080b1ea86332986b663bebe',
      ],
    ]) {
      const result = xts.encode(text, { key, tweak })
      expect(result.text).toBe(ciphertext)
      expect(result.options).toEqual({ key, mode: 'xts', tweak: normalized })
      expect(xts.decode(ciphertext!, { key, tweak }).text).toBe(text)
    }
    expect(xts.encode(text, { key, tweak: '0' }).text).toBe(xts.encode(text, { key }).text)
  })

  it('gives different ciphertext blocks for equal plaintext blocks', () => {
    const { text } = xts.encode('A'.repeat(32), { key })
    expect(text).toBe('553b7ea31ee5c66988f4c64b648b916ab6e36231df232d2904af9a73289419fb')
    expect(text.slice(0, 32)).not.toBe(text.slice(32, 64))
  })

  it('refuses text and ciphertext shorter than one block', () => {
    for (const text of ['', 'ATTACK AT DAWN']) {
      expect(() => xts.encode(text, { key })).toThrow(
        new CipherError(
          `[aes-xts] XTS needs at least one whole block, 16 bytes of UTF-8 text, got ${text.length} bytes`,
        ),
      )
    }
    expect(() => xts.decode('22c74dbe484d5edba8907fa4eefece', { key })).toThrow(
      /at least 16 bytes \(32 hex digits\), got 15 bytes/,
    )
    expect(() => xts.decode('22c74dbe484d5edba8907fa4eefece6', { key })).toThrow(/whole bytes/)
  })

  it('refuses a data unit over the 2^20 blocks NIST SP 800-38E allows', () => {
    // A sparse array has the length without the memory; the check runs before any byte is read.
    const oversized: number[] = Object.assign([], { length: 16 * 2 ** 20 + 1 })
    expect(() => aesXts(oversized, hex(key), 'encrypt', 0n)).toThrow(
      /at most 2\^20 blocks \(16 MiB\).*got 16777217 bytes/,
    )
  })

  it('rejects keys and tweaks it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => xts[operation]('')).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(16), '00'.repeat(24), '00'.repeat(48), 'g'.repeat(64), 12]) {
        expect(() => xts[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of ['', '0x1', 'g', '1'.repeat(33), 1]) {
        expect(() => xts[operation]('', { key, tweak: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('reports a wrong key or data unit as text that is not UTF-8', () => {
    const ciphertext = '22c74dbe484d5edba8907fa4eefece6d92beab33360246d4558612bf56'
    expect(() => xts.decode(ciphertext, { key, tweak: '1' })).toThrow(/not UTF-8 text/)
  })

  it('reports the block category and the tweak option', () => {
    expect(resolveCipher('AES XTS')).toBe(xts)
    expect(xts.info()).toMatchObject({
      name: 'aes-xts',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'tweak', type: 'string', required: false, default: '0' },
      ],
    })
  })
})

describe('rijndael', () => {
  const rijndael = create('rijndael')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key256 = '2b7e151628aed2a6abf7158809cf4f3c762e7160f38b4da56a784d9045190cfe'

  /**
   * Brian Gladman's Extended Rijndael known answer tests, ecbnt<Nb><Nk>.txt, TEST 1: an all-zero
   * key and a block ending in 01, for every block and key length the proposal allows.
   */
  it('matches the Gladman known answer tests for all 25 block and key lengths', () => {
    const vectors: Record<string, string> = {
      '128/128': '58e2fccefa7e3061367f1d57a4e7455a',
      '128/160': '7e70ea4218b4a01f942bd4ef8526963c',
      '128/192': 'cd33b28ac773f74ba00ed1f312572435',
      '128/224': 'f2af1071e081b9b0223635ee414dae96',
      '128/256': '530f8afbc74536b9a963b4f1c4cb738b',
      '160/128': '3f18561d87c58889e433b767ad8005e918a4c29e',
      '160/160': 'a439be7e482523b0d4845d9d12f8a2fafff5d2e7',
      '160/192': '0fee554de142cf4f78ca110ba9bf13ca1712df09',
      '160/224': '55fccb6fcf409bfde5220a9161eba715ef199616',
      '160/256': '6d53742b457d6b302f540e471573bd7c5d102b91',
      '192/128': '697383c2e7b9854c70ce4744aedbbb0f92ba054533b3bd48',
      '192/160': 'aa9f723116f3f07f7b197ef573f877a8fc75bfd341cbc2a6',
      '192/192': 'cdaee1ce3361ed5b6ed38043105868613ad03eccde1c44a2',
      '192/224': 'f92a72a779e116910b00be8fa305e1736748c4f10c172ebe',
      '192/256': 'ebef350a100c2652694e7bdc4e39d27c4ac7774363f855af',
      '224/128': '30dd6cf97a55ada69b8c8c3e4cac0573b5a6f7d103c132e6e81be5a9',
      '224/160': 'a5827d81acfb5944f8d87b4439511f663ad3fc17fa9636b0e86d3326',
      '224/192': '32f511f2b4fc86d94d807984dca7448d657336d7ffc4b5aee1b30df1',
      '224/224': '29cedc5011e7ae1facfd046ff645b35e885023a6e23eea0674af5b68',
      '224/256': '0365ee70f0e93e81e77fd067b2eb988d7190b642ae7c2e40538b226d',
      '256/128': '937667c4fb56ed574479ed1b27010930bd9651146223019bb827c74e28a024d6',
      '256/160': 'c0485f2ba0930e0d90e53bd1be636f035d817ae29349114964834ce7bcf2bff4',
      '256/192': '084f30731a376a3a75478dc30e080862e353dc29dc381326706e59dc1e03512a',
      '256/224': '6b364e9c76068337e61114f65673b2f8db61d3f102c3d54d4f7fa5f03d82c9dc',
      '256/256': '4e76ca69967125a9636f3554229556f6e2b2351cb4fd10b4e052afd85bebdfa8',
    }
    for (const [sizes, ciphertext] of Object.entries(vectors)) {
      const [block, key] = sizes.split('/').map(Number) as [number, number]
      const plaintext = hex(`${'00'.repeat(block / 8 - 1)}01`)
      const zeroKey = hex('00'.repeat(key / 8))
      expect(rijndaelEcb(plaintext, zeroKey, 'encrypt', block / 8)).toEqual(hex(ciphertext))
      expect(rijndaelEcb(hex(ciphertext), zeroKey, 'decrypt', block / 8)).toEqual(plaintext)
    }
  })

  /**
   * The same files in full, 2 × Nb × 32 plaintexts each, 9,600 in all. Every file keeps the key
   * at zero and walks the plaintext from 0 through 1, 3, 7 to all ones, then shifts the ones left
   * until only the top bit is set. The digests cover each file's ciphertexts, one per line:
   * `tr -d '\r' < ecbnt44.txt | awk '/^CT=/ { print $2 }' | sha256sum`.
   */
  it('runs every Gladman known answer test', () => {
    const digests: Record<string, string> = {
      '128/128': '899ae63083ba781443709bb54dd2f67f71812a4d9bc3c1eda18454f3e921183e',
      '128/160': '4b5257df759e1fd35641e01ee36cae8d7891d59bf1b7630b9ca14c8a11125c5a',
      '128/192': 'aa11a2856b9a13e489aba45ee814d70563fadd2000d3582d1217e2e2bf263c63',
      '128/224': 'bb29c49412213e3cc3fb8b6022b7820a1916d36e72634ccf48757cc649937de0',
      '128/256': 'abb4e3a62a1625736544a4e9fbe92d013271b0ff72513dbc17c5f1e9dd3f9ca6',
      '160/128': '2ecd2690fb3b10e074404a679dea17e34cdd0b3aa7dd35040f24d7ce0d2bc7e6',
      '160/160': 'e775f60a96848bfabc39d2ef34aaafc9d5132bbc0a6287cc9e71466db2e9184a',
      '160/192': '079670777b3e2a490d8f5d3dd61044e1a6da0b9f4cfe66603e67059f7a0b536b',
      '160/224': 'fe145b727ceabfb725fc056592fc95dcab0c82d45f774adc700280404df19673',
      '160/256': '2bea79c09053f42c702c47c90e01f2d60700bb83d4f3d408f8d0d1af36e62c4e',
      '192/128': '1dd8765c4cc175526d902d7c6902d1f84e54898e1133696f2e98c5f1d450985d',
      '192/160': 'c725c7cc23db464b1675c062ee931cd106b3f48f6c93d6bc12d014440350573e',
      '192/192': '8f3d90857a16e26e60d9a0faf6697df798f7ca9a7ef65c680fb48cca9152fa89',
      '192/224': '74b7d3165999e79fa6457cd474c92f2182d9797c82bd0995f39d8fc575199e71',
      '192/256': '794a57400184a60a39b5031c1da6d7cf32498c08d0bdadb1bd41826f6c5648ac',
      '224/128': '10be258ca3e4b387888744137435ba18bec927763f722348fefeb40a8344c33f',
      '224/160': 'f4cf13aea8274e294d732356b16875468d0cde5fd350c1cc681c778aea8f541d',
      '224/192': '034d32cca52e0d6cccc754f67f323696bed6b9867bad306c688379bf4ee4fbbf',
      '224/224': 'bf8861ed3f6d78d00ff8e70496bbf9518827c0d525afb83e8571e8a2ba6c18bf',
      '224/256': 'fecd94619a8d958ed6e2206f8e24388859d65d8f923c7571b90b958f55089d22',
      '256/128': '735d322583b352f1ded9a47da1ccfb8e4e2e4cf55e9edf01823f0e8203b40323',
      '256/160': '0d550cc24a2e971dbdf2f254c16eca867341232f0f57cd0a1d23f09f80c4cd93',
      '256/192': '6460da1f9455e8ea525e64c858fb8629a915525a4ccd54f076fe9e6b2726aef8',
      '256/224': '6aa5f34d6fded63dcab2d3b428c652366c09c52866def001c79694e565d688fd',
      '256/256': '6fa162f7605b8d0392fcc5f9176f6509a4672cdf50e62e9416bc905bb339030f',
    }
    const toHex = (bytes: readonly number[]) =>
      bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
    for (const [sizes, digest] of Object.entries(digests)) {
      const [block, key] = sizes.split('/').map(Number) as [number, number]
      const bits = BigInt(block)
      const ones = (1n << bits) - 1n
      const plaintexts: bigint[] = []
      for (let i = 0n; i <= bits; i++) plaintexts.push((1n << i) - 1n)
      for (let i = 1n; i < bits; i++) plaintexts.push((ones << i) & ones)
      const zeroKey = hex('00'.repeat(key / 8))
      let lines = ''
      for (const value of plaintexts) {
        const plaintext = hex(value.toString(16).padStart(block / 4, '0'))
        const ciphertext = rijndaelEcb(plaintext, zeroKey, 'encrypt', block / 8)
        expect(rijndaelEcb(ciphertext, zeroKey, 'decrypt', block / 8)).toEqual(plaintext)
        lines += `${toHex(ciphertext)}\n`
      }
      expect(plaintexts).toHaveLength(2 * block)
      expect(createHash('sha256').update(lines).digest('hex'), sizes).toBe(digest)
    }
  })

  /** Expected values from py3rijndael 0.3.3, a separate implementation, with PKCS#7 padding. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, one block length at a time', () => {
    for (const [blockSize, ciphertext] of [
      [192, 'ca38790223e9fd5114dd228094ec81d090ef4fd0ede137b1'],
      [256, '4e0085db1697ce5f34911401d53bc05637a158856ca148bb212050ebfd20d208'],
    ] as const) {
      expect(rijndael.encode('ATTACK AT DAWN', { key: key256, blockSize })).toEqual({
        text: ciphertext,
        cipher: 'rijndael',
        operation: 'encode',
        options: { key: key256, mode: 'ecb', blockSize },
      })
      expect(rijndael.decode(ciphertext, { key: key256, blockSize }).text).toBe('ATTACK AT DAWN')
    }
    const long =
      'b1fe271d7ba91e7b6979af8fee0e68a5a6998c3f3c272fdf858e6a89055cfdbd0fd042e7caa48ec3f94772fa51b884bc6949239dc99d56bf4be6b0b000c1e8b0'
    const text = 'Rijndael had wider blocks than AES'
    expect(rijndael.encode(text, { key: key256, blockSize: 256 }).text).toBe(long)
    expect(rijndael.decode(long, { key: key256, blockSize: 256 }).text).toBe(text)
  })

  it('is AES when the block is 128 bits, which is the default', () => {
    for (const key of [key256.slice(0, 32), key256.slice(0, 48), key256]) {
      const { text } = create('aes').encode('ATTACK AT DAWN', { key })
      expect(rijndael.encode('ATTACK AT DAWN', { key }).text).toBe(text)
      expect(rijndael.encode('ATTACK AT DAWN', { key }).options).toEqual({
        key,
        mode: 'ecb',
        blockSize: 128,
      })
    }
  })

  it('takes the 160 and 224-bit keys AES left out', () => {
    for (const key of ['00'.repeat(20), '00'.repeat(28)]) {
      const { text } = rijndael.encode('ATTACK AT DAWN', { key, blockSize: 160 })
      expect(text).toHaveLength(40)
      expect(rijndael.decode(text, { key, blockSize: 160 }).text).toBe('ATTACK AT DAWN')
    }
    expect(() => create('aes').encode('', { key: '00'.repeat(20) })).toThrow(InvalidOptionError)
  })

  it('rejects keys and block lengths Rijndael does not have', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => rijndael[operation]('')).toThrow(MissingOptionError)
      for (const key of ['00'.repeat(15), '00'.repeat(18), '00'.repeat(36), 'g'.repeat(32), 12]) {
        expect(() => rijndael[operation]('', { key })).toThrow(InvalidOptionError)
      }
      for (const blockSize of [64, 129, 512, '256', 32]) {
        expect(() => rijndael[operation]('', { key: key256, blockSize })).toThrow(
          /blockSize.*128, 160, 192, 224 or 256/,
        )
      }
    }
  })

  it('wants ciphertext in whole blocks of the length it was asked for', () => {
    const aesBlock = create('aes').encode('ATTACK AT DAWN', { key: key256 }).text
    expect(() => rijndael.decode(aesBlock, { key: key256, blockSize: 256 })).toThrow(
      /whole 32-byte blocks .* got 32 hex digits/,
    )
    expect(() =>
      rijndael.decode('ca38790223e9fd5114dd228094ec81d090ef4fd0ede137b1', {
        key: key256,
        blockSize: 256,
      }),
    ).toThrow(/whole 32-byte blocks/)
  })

  it('reports the block category', () => {
    expect(resolveCipher('Rijndael')).toBe(rijndael)
    expect(rijndael.info()).toMatchObject({
      name: 'rijndael',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'blockSize', type: 'number', required: false, default: 128 },
      ],
    })
  })
})

describe('triple-des', () => {
  const tripleDes = create('triple-des')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456789abcdef23456789abcdef01456789abcdef0123'

  /** NIST SP 800-67 example: three keys over three blocks of "The qufck brown fox jump". */
  it('matches the SP 800-67 example', () => {
    const plaintext = [...new TextEncoder().encode('The qufck brown fox jump')]
    const ciphertext = hex('a826fd8ce53b855fcce21c8112256fe668d5c05dd9b6b900')
    expect(tripleDesEcb(plaintext, hex(key), 'encrypt')).toEqual(ciphertext)
    expect(tripleDesEcb(ciphertext, hex(key), 'decrypt')).toEqual(plaintext)
  })

  /**
   * With K1 = K2 = K3 the middle decryption undoes the first encryption, leaving single DES: the
   * worked example from Grabbe's "The DES Algorithm Illustrated" and NIST SP 800-17 Table B.1.
   */
  it('reduces to single DES when all three keys are equal', () => {
    for (const [des, plaintext, ciphertext] of [
      ['133457799bbcdff1', '0123456789abcdef', '85e813540f0ab405'],
      ['0101010101010101', '8000000000000000', '95f8a5e5dd31d900'],
      ['0101010101010101', '4000000000000000', 'dd7f121ca5015619'],
      ['0101010101010101', '0000000000000001', '166b40b44aba4bd6'],
    ]) {
      const tripled = hex(des!.repeat(3))
      expect(tripleDesEcb(hex(plaintext!), tripled, 'encrypt')).toEqual(hex(ciphertext!))
      expect(tripleDesEcb(hex(ciphertext!), tripled, 'decrypt')).toEqual(hex(plaintext!))
    }
  })

  /** Expected values from `openssl enc -des-ede3-ecb` and `-des-ede-ecb`, PKCS#7 by default. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as OpenSSL does', () => {
    for (const [text, ciphertext] of [
      ['', '832846b52f9e213d'],
      ['ATTACK AT DAWN', 'a1a3679052607883b30ef4b95156ff29'],
      ['zażółć gęślą jaźń 🙂', 'bb7a90330462f93ef8a6538af365aaf19bd43cee549495068b36bef890430c00'],
      ['A'.repeat(8), '9f6ca443ceebf424832846b52f9e213d'],
    ]) {
      expect(tripleDes.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'triple-des',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(tripleDes.decode(ciphertext!, { key }).text).toBe(text)
    }
    const twoKey = '0123456789abcdef23456789abcdef01'
    expect(tripleDes.encode('ATTACK AT DAWN', { key: twoKey }).text).toBe(
      '45f012b58fb81e02784b7f2a776275b6',
    )
    expect(tripleDes.decode('45f012b58fb81e02784b7f2a776275b6', { key: twoKey }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('ignores the parity bit of every key byte', () => {
    const flipped = '0022446688aaccee22446688aaccee00446688aaccee0022'
    expect(tripleDes.encode('ATTACK AT DAWN', { key: flipped }).text).toBe(
      'a1a3679052607883b30ef4b95156ff29',
    )
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    const { text } = tripleDes.encode('A'.repeat(16), { key })
    expect(text).toBe('9f6ca443ceebf4249f6ca443ceebf424832846b52f9e213d')
    expect(text.slice(0, 16)).toBe(text.slice(16, 32))
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const spaced = '0123 4567 89AB CDEF 2345 6789 ABCD EF01 4567 89AB CDEF 0123'
    expect(tripleDes.encode('ATTACK AT DAWN', { key: spaced }).options).toEqual({
      key,
      mode: 'ecb',
    })
    expect(tripleDes.decode('A1A36790 52607883\nB30EF4B9 5156FF29', { key: spaced }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys that are not a Triple DES key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => tripleDes[operation]('')).toThrow(MissingOptionError)
      expect(() => tripleDes[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        'YELLOW SUBMARINE',
        '00'.repeat(8),
        '00'.repeat(20),
        '00'.repeat(32),
        'g'.repeat(48),
        12,
      ]) {
        expect(() => tripleDes[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => tripleDes.decode('', { key })).toThrow(/whole 8-byte blocks/)
    expect(() => tripleDes.decode('a1a36790', { key })).toThrow(/got 8 hex digits/)
    expect(() => tripleDes.decode('zz'.repeat(8), { key })).toThrow(/must be hex digits/)
    // OpenSSL: "bad decrypt" for this ciphertext under this key.
    expect(() =>
      tripleDes.decode('a1a3679052607883b30ef4b95156ff29', { key: '0123456789abcdef'.repeat(3) }),
    ).toThrow(/PKCS#7/)
    // ff then seven bytes of 07: valid padding, invalid UTF-8.
    expect(() => tripleDes.decode('4e5e53c58c101be5', { key })).toThrow(/not UTF-8/)
    expect(() => tripleDes.decode('4e5e53c58c101be5', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('Triple DES')).toBe(tripleDes)
    expect(tripleDes.info()).toMatchObject({
      name: 'triple-des',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [{ name: 'key', type: 'string', required: true }],
    })
  })
})

describe('triple-des-cbc', () => {
  const cbc = create('triple-des-cbc')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456789abcdef23456789abcdef01456789abcdef0123'
  const iv = '0001020304050607'

  /** NIST CAVP TDES Multi-block Message Test, TCBCMMT3.rsp and TCBCMMT2.rsp, COUNT = 3. */
  it('matches the CAVP multi-block CBC vectors', () => {
    for (const [keys, vector, plaintext, ciphertext] of [
      [
        '202398b6154968c168201329910e612f296189d320670120',
        '514273c93806fde6',
        '9a5ec913876299492dda3998f88e1c31a75493b3ade14e9ed7de1f0a303f0299',
        '9bc02247ff5cefde9a0307f948f9437ef2a298cdd69542236cba47e8c954e819',
      ],
      [
        '160b70ad26e60e8a1adadcc240619ec2160b70ad26e60e8a',
        '200e89b4097ef967',
        '5ac6533b1de8edd31224a91f7361dc2b4ab33a5db7acee1cc8bfdf82bb1777c6',
        '50e5c5bcc3d84c47fed29ce4caccd5fc7724f56615f8ade5e7d26df2148bc2bc',
      ],
    ]) {
      expect(tripleDesCbc(hex(plaintext!), hex(keys!), 'encrypt', hex(vector!))).toEqual(
        hex(ciphertext!),
      )
      expect(tripleDesCbc(hex(ciphertext!), hex(keys!), 'decrypt', hex(vector!))).toEqual(
        hex(plaintext!),
      )
    }
  })

  /** Expected values from `openssl enc -des-ede3-cbc` and `-des-ede-cbc`, PKCS#7 by default. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as OpenSSL does', () => {
    for (const [text, ciphertext] of [
      ['', '2ea437be9266178c'],
      ['ATTACK AT DAWN', '00b5ad5bd633b1c564e7e3a858c7d8fb'],
      ['zażółć gęślą jaźń 🙂', '17c8877a05f7c3e6cf13648a45dd0776ec9c8b03fc9d67dac6f140aaf6350d89'],
    ]) {
      expect(cbc.encode(text!, { key, iv })).toEqual({
        text: ciphertext,
        cipher: 'triple-des-cbc',
        operation: 'encode',
        options: { key, mode: 'cbc', iv },
      })
      expect(cbc.decode(ciphertext!, { key, iv }).text).toBe(text)
    }
    const twoKey = '0123456789abcdef23456789abcdef01'
    expect(cbc.encode('ATTACK AT DAWN', { key: twoKey, iv }).text).toBe(
      'a068567d9209ea48049e0ece569729fe',
    )
    expect(cbc.decode('a068567d9209ea48049e0ece569729fe', { key: twoKey, iv }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  /** A zero IV leaves the first block as ECB gives it; the chain changes every block after. */
  it('chains equal plaintext blocks into different ciphertext blocks', () => {
    const zero = '00'.repeat(8)
    const { text } = cbc.encode('A'.repeat(16), { key, iv: zero })
    expect(text).toBe('9f6ca443ceebf4243f5259d4c574950c18c59ca4e5d5c97b')
    expect(text.slice(0, 16)).toBe(
      create('triple-des').encode('A'.repeat(16), { key }).text.slice(0, 16),
    )
    expect(text.slice(0, 16)).not.toBe(text.slice(16, 32))
  })

  it('reads hex keys, IVs and ciphertext in any case and with spaces', () => {
    const spaced = '0123 4567 89AB CDEF 2345 6789 ABCD EF01 4567 89AB CDEF 0123'
    expect(
      cbc.encode('ATTACK AT DAWN', { key: spaced, iv: '0001 0203 0405 0607' }).options,
    ).toEqual({ key, mode: 'cbc', iv })
    expect(
      cbc.decode('00B5AD5B D633B1C5\n64E7E3A8 58C7D8FB', { key: spaced, iv: '00010203 04050607' })
        .text,
    ).toBe('ATTACK AT DAWN')
  })

  it('rejects keys and IVs of the wrong shape', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => cbc[operation]('', { iv })).toThrow(MissingOptionError)
      expect(() => cbc[operation]('', { key })).toThrow(MissingOptionError)
      expect(() => cbc[operation]('', { key, iv: '' })).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(8), '00'.repeat(32), 'g'.repeat(48)]) {
        expect(() => cbc[operation]('', { key: bad, iv })).toThrow(InvalidOptionError)
      }
      // An AES-sized IV is the mistake this catches: Triple DES blocks are 8 bytes.
      for (const bad of ['00'.repeat(16), '00'.repeat(7), 'zz'.repeat(8), 8]) {
        expect(() => cbc[operation]('', { key, iv: bad })).toThrow(InvalidOptionError)
      }
    }
    expect(() => cbc.encode('', { key, iv: '00'.repeat(16) })).toThrow(/16 hex digits/)
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => cbc.decode('', { key, iv })).toThrow(/whole 8-byte blocks/)
    expect(() => cbc.decode('00b5ad5b', { key, iv })).toThrow(/got 8 hex digits/)
    // The right key under the wrong IV only garbles the first block, so the padding still holds.
    expect(() =>
      cbc.decode('00b5ad5bd633b1c564e7e3a858c7d8fb', { key: '0123456789abcdef'.repeat(3), iv }),
    ).toThrow(/PKCS#7/)
    // ff then seven bytes of 07, from `openssl enc -des-ede3-cbc -nopad`: valid padding, invalid UTF-8.
    expect(() => cbc.decode('ea0d24ea03dead2e', { key, iv })).toThrow(/not UTF-8/)
    expect(() => cbc.decode('ea0d24ea03dead2e', { key, iv })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('Triple DES CBC')).toBe(cbc)
    expect(cbc.info()).toMatchObject({
      name: 'triple-des-cbc',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'iv', type: 'string', required: true },
      ],
    })
  })
})
