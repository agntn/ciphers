import { describe, it, expect } from 'vite-plus/test'
import { create, ciphers, has } from '../../src/core/registry'
import { resolveCipher } from '../../src/core/resolve'
import { Cipher } from '../../src/core/cipher'
import { CipherError, MissingOptionError, InvalidOptionError } from '../../src/core/errors'
import { aesEcb } from '../../src/ciphers/block/aes/ecb'
import { aesLrw } from '../../src/ciphers/block/aes/lrw'
import { aesCbc } from '../../src/ciphers/block/aes/cbc'
import { aesCfb } from '../../src/ciphers/block/aes/cfb'
import { aesCtr } from '../../src/ciphers/block/aes/ctr'
import { tripleDesEcb } from '../../src/ciphers/block/triple-des'

describe('registry', () => {
  it('registers all 26 ciphers', () => {
    expect(ciphers()).toHaveLength(26)
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
      'aes-ctr',
      'aes-lrw',
      'triple-des',
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
    'aes-ctr': { key: '000102030405060708090a0b0c0d0e0f', iv: '00'.repeat(16) },
    'aes-lrw': { key: '000102030405060708090a0b0c0d0e0f'.repeat(2) },
    'triple-des': { key: '0123456789abcdef23456789abcdef01' },
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
