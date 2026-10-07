import { createCipheriv, createHash } from 'node:crypto'
import { describe, it, expect } from 'vite-plus/test'
import { create, ciphers, has } from '../../src/core/registry.ts'
import { resolveCipher } from '../../src/core/resolve.ts'
import { builtinCiphers } from '../../src/core/ciphers.ts'
import { MAX_BOOK_LENGTH } from '../../src/tool-operations.ts'
import type { CipherBaseOptions } from '../../src/core/types.ts'
import { Cipher } from '../../src/core/cipher.ts'
import { CipherError, MissingOptionError, InvalidOptionError } from '../../src/core/errors.ts'
import {
  type BlockMode,
  decodeBlocks,
  encodeBlocks,
  fromHex,
  toHex,
} from '../../src/core/block-mode.ts'
import { aesEcb } from '../../src/ciphers/block/aes/ecb.ts'
import { ctr, ecb } from '../../src/aes.ts'
import { aesLrw } from '../../src/ciphers/block/aes/lrw.ts'
import { aesXts } from '../../src/ciphers/block/aes/xts.ts'
import { aesCbcMac } from '../../src/ciphers/block/aes/cbc-mac.ts'
import { aesCbc } from '../../src/ciphers/block/aes/cbc.ts'
import { aesCfb } from '../../src/ciphers/block/aes/cfb.ts'
import { aesOfb } from '../../src/ciphers/block/aes/ofb.ts'
import { aesCtr } from '../../src/ciphers/block/aes/ctr.ts'
import { aesCcm } from '../../src/ciphers/block/aes/ccm.ts'
import { aesOcb } from '../../src/ciphers/block/aes/ocb.ts'
import { rijndaelEcb } from '../../src/ciphers/block/rijndael.ts'
import { desEcb } from '../../src/ciphers/block/des.ts'
import { desxEcb } from '../../src/ciphers/block/desx.ts'
import { tripleDesEcb } from '../../src/ciphers/block/triple-des/ecb.ts'
import { tripleDesCbc } from '../../src/ciphers/block/triple-des/cbc.ts'
import { blowfishEcb } from '../../src/ciphers/block/blowfish.ts'
import { ideaEcb } from '../../src/ciphers/block/idea.ts'
import { luciferEcb } from '../../src/ciphers/block/lucifer.ts'
import { marsEcb } from '../../src/ciphers/block/mars.ts'
import { serpentEcb } from '../../src/ciphers/block/serpent.ts'
import { cast5Ecb } from '../../src/ciphers/block/cast5.ts'
import { rabbit } from '../../src/ciphers/stream/rabbit.ts'
import { rc4 } from '../../src/ciphers/stream/rc4.ts'
import { xor } from '../../src/ciphers/stream/xor.ts'
import { chachaBlock, hchacha20 } from '../../src/ciphers/stream/chacha/block.ts'
import { poly1305 } from '../../src/ciphers/stream/chacha/poly1305.ts'
import { chacha20, chacha20Poly1305, xchacha20 } from '../../src/chacha.ts'
import { salsa20, xsalsa20 } from '../../src/salsa.ts'

describe('registry', () => {
  it('registers all 56 ciphers', () => {
    expect(ciphers()).toHaveLength(56)
    for (const name of [
      'caesar',
      'rot13',
      'rot47',
      'atbash',
      'substitution',
      'vigenere',
      'beaufort',
      'autokey',
      'trithemius',
      'alberti',
      'rail-fence',
      'route',
      'affine',
      'playfair',
      'polybius',
      'a1z26',
      'book',
      'straddling-checkerboard',
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
      'aes-cbc-mac',
      'aes-passphrase',
      'rijndael',
      'des',
      'desx',
      'triple-des',
      'triple-des-cbc',
      'blowfish',
      'idea',
      'lucifer',
      'mars',
      'serpent',
      'cast5',
      'openpgp',
      'rabbit',
      'rc4',
      'xor',
      'salsa20',
      'xsalsa20',
      'chacha20',
      'xchacha20',
      'chacha20-poly1305',
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

describe('substitution', () => {
  const substitution = create('substitution')

  /** Published vector: https://en.wikipedia.org/wiki/Substitution_cipher#Simple_substitution */
  it('keys a mixed alphabet by ZEBRAS', () => {
    const options = { key: 'zebras', preserveCase: false }
    expect(substitution.encode('flee at once. we are discovered!', options).text).toBe(
      'SIAA ZQ LKBA. VA ZOA RFPBLUAOAR!',
    )
    expect(substitution.decode('SIAA ZQ LKBA. VA ZOA RFPBLUAOAR!', options).text).toBe(
      'FLEE AT ONCE. WE ARE DISCOVERED!',
    )
  })

  it('reads a whole alphabet and a keyword spelling it alike', () => {
    expect(substitution.encode('Flee at once', { key: 'ZEBRASCDFGHIJKLMNOPQTUVWXY' }).text).toBe(
      'Siaa zq lkba',
    )
    expect(substitution.encode('Flee at once', { key: 'Ze-bra, zebras!' }).text).toBe(
      'Siaa zq lkba',
    )
    expect(substitution.encode('abcxyz', { key: 'QWERTYUIOPASDFGHJKLMZXCVBN' }).text).toBe('qwevbn')
  })

  it('turns a cell left unknown into ? both ways', () => {
    const key = 'ZEB?ASCDFGHIJKLMNOPQTUVWXY'
    expect(substitution.encode('Bad', { key }).text).toBe('Ez?')
    expect(substitution.decode('Ez?R', { key }).text).toBe('Ba??')
  })

  it('passes the rest and applies the shared options', () => {
    const options = { key: 'ZEBRAS', stripNonAlpha: true }
    const encoded = substitution.encode('Wé ßee 1 🙂', options)
    expect(encoded.text).toBe('Vaa')
    expect(encoded.options).toEqual({ key: 'ZEBRAS', preserveCase: true, stripNonAlpha: true })
    expect(substitution.encode('Wé ßee 1 🙂', { key: 'ZEBRAS' }).text).toBe('Vé ßaa 1 🙂')
  })

  it('rejects a key it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => substitution[operation]('abc')).toThrow(MissingOptionError)
      expect(() => substitution[operation]('abc', { key: '' })).toThrow(MissingOptionError)
      for (const key of [
        '123',
        'ß',
        12,
        'ZEB?',
        'ZZB?ASCDFGHIJKLMNOPQTUVWXY',
        'ZEB?ASCDFGHIJKLMNOPQTUVWXY1',
      ]) {
        expect(() => substitution[operation]('abc', { key })).toThrow(InvalidOptionError)
      }
    }
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

  it('rejects a key that fills no cell of the table', () => {
    expect(() => playfair.encode('HELLO', { key: '123' })).toThrow(InvalidOptionError)
    expect(() => playfair.decode('HELLO', { key: '123' })).toThrow(/at least one ASCII letter/)
    expect(() => playfair.encode('HELLO', { key: 123 })).toThrow(/must be a string/)
    expect(playfair.encode('HELLO', { key: 'M0NARCHY' }).text).toBe(
      playfair.encode('HELLO', { key: 'MNARCHY' }).text,
    )
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

  it.each([
    ['AABBB ABAAA AB', '12 letters A and B'],
    ['attack at dawn', '4 letters A and B'],
    ['AAAA', '4 letters A and B'],
  ])('refuses %j, whose A and B do not split into groups of five', (text, count) => {
    expect(() => bacon.decode(text)).toThrow(CipherError)
    expect(() => bacon.decode(text)).toThrow(count)
  })

  it('refuses text without a single A or B', () => {
    expect(() => bacon.decode('hello world')).toThrow(CipherError)
    expect(() => bacon.decode('hello world')).toThrow('no A or B')
  })

  it('decodes empty or blank text to nothing', () => {
    expect(bacon.decode('').text).toBe('')
    expect(bacon.decode('  ').text).toBe('')
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

describe('a1z26', () => {
  const a1z26 = create('a1z26')

  it('numbers DCODE as dCode does', () => {
    expect(a1z26.encode('DCODE').text).toBe('4-3-15-4-5')
    expect(a1z26.decode('4-3-15-4-5').text).toBe('DCODE')
  })

  it('reads the dCode example split by dots', () => {
    expect(a1z26.decode('1.12.16.8.1.2.5.20', { separator: '.' }).text).toBe('ALPHABET')
  })

  it('keeps word gaps and punctuation and ignores case', () => {
    const encoded = a1z26.encode('Hello, world!')
    expect(encoded.text).toBe('8-5-12-12-15, 23-15-18-12-4!')
    expect(encoded.options).toEqual({ separator: '-' })
    expect(a1z26.decode(encoded.text).text).toBe('HELLO, WORLD!')
  })

  it('drops the separator only between two numbers', () => {
    expect(a1z26.decode('1 2 3  4 5', { separator: ' ' }).text).toBe('ABC  DE')
    expect(a1z26.decode('1--2').text).toBe('A--B')
    expect(a1z26.decode('-01-26-').text).toBe('-AZ-')
    expect(a1z26.encode('AB', { separator: '😀'.repeat(10) }).text).toBe(`1${'😀'.repeat(10)}2`)
  })

  it.each([
    ['8-27', 'Invalid A1Z26 number 27 at character 3'],
    ['HI 0', 'Invalid A1Z26 number 0 at character 4'],
    ['😀 27', 'Invalid A1Z26 number 27 at character 3'],
    ['9'.repeat(40), 'Invalid A1Z26 number of 40 digits at character 1'],
  ])('rejects a number outside 1 to 26 in %s', (input, message) => {
    expect(() => a1z26.decode(input)).toThrow(CipherError)
    expect(() => a1z26.decode(input)).toThrow(message)
  })

  it('reads the single digit form, BEF as 256', () => {
    expect(a1z26.decode('bef', { zero: 'o' }).text).toBe('256')
    const encoded = a1z26.encode('20 1990', { zero: 'o' })
    expect(encoded.text).toBe('BO AIIO')
    expect(encoded.options).toEqual({ zero: 'O' })
    expect(a1z26.decode('BOxz aiij', { zero: 'J' }).text).toBe('2Oxz 1990')
  })

  it.each([
    [{ zero: 'a' }, 'zero'],
    [{ zero: 'ox' }, 'zero'],
    [{ zero: 'o', separator: '-' }, 'separator'],
    [{ separator: '' }, 'separator'],
    [{ separator: '1' }, 'separator'],
    [{ separator: '-'.repeat(11) }, 'separator=11 characters'],
  ])('rejects %o', (options, option) => {
    expect(() => a1z26.encode('A', options)).toThrow(InvalidOptionError)
    expect(() => a1z26.encode('A', options)).toThrow(option)
  })
})

/** The Declaration of Independence to "a candid world", as the National Archives has it. */
const DECLARATION = `When in the Course of human events, it becomes necessary for one people to dissolve the political bands which have connected them with another, and to assume among the powers of the earth, the separate and equal station to which the Laws of Nature and of Nature's God entitle them, a decent respect to the opinions of mankind requires that they should declare the causes which impel them to the separation.

We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.--That to secure these rights, Governments are instituted among Men, deriving their just powers from the consent of the governed, --That whenever any Form of Government becomes destructive of these ends, it is the Right of the People to alter or to abolish it, and to institute new Government, laying its foundation on such principles and organizing its powers in such form, as to them shall seem most likely to effect their Safety and Happiness. Prudence, indeed, will dictate that Governments long established should not be changed for light and transient causes; and accordingly all experience hath shewn, that mankind are more disposed to suffer, while evils are sufferable, than to right themselves by abolishing the forms to which they are accustomed. But when a long train of abuses and usurpations, pursuing invariably the same Object evinces a design to reduce them under absolute Despotism, it is their right, it is their duty, to throw off such Government, and to provide new Guards for their future security.--Such has been the patient sufferance of these Colonies; and such is now the necessity which constrains them to alter their former Systems of Government. The history of the present King of Great Britain is a history of repeated injuries and usurpations, all having in direct object the establishment of an absolute Tyranny over these States. To prove this, let Facts be submitted to a candid world.`

describe('book', () => {
  const book = create('book')
  const pages = 'one two three\n\nfour five\fsix seven\neight nine ten'

  it('reads the dCode examples from the Declaration of Independence', () => {
    expect(book.decode('15,4,12,52,7', { book: DECLARATION, pick: 'letter' }).text).toBe('DCODE')
    expect(book.decode('221,132,136,305', { book: DECLARATION }).text).toBe('by of of King')
    expect(book.decode('221,132,136,305', { book: DECLARATION, pick: 'letter' }).text).toBe('BOOK')
  })

  it('counts self-evident as two words, so word 115 is instituted as for Beale cipher 2', () => {
    expect(book.decode('115', { book: DECLARATION }).text).toBe('instituted')
  })

  it('gives a repeated word or letter the next place each time', () => {
    const words = book.encode('of of of', { book: DECLARATION }).text
    expect(new Set(words.split(' ')).size).toBe(3)
    expect(book.decode(words, { book: DECLARATION }).text).toBe('of of of')
    const letters = book.encode('Attack at dawn!', { book: DECLARATION, pick: 'letter' }).text
    expect(letters.split(' ')).toHaveLength(12)
    expect(book.decode(letters, { book: DECLARATION, pick: 'letter' }).text).toBe('ATTACKATDAWN')
  })

  it('folds case beyond lowercase, so SS meets ß and both Turkish I meet i', () => {
    expect(
      book.encode('STRAẞE istanbul ﬁne ıssız', { book: 'straße İstanbul fine Issız' }).text,
    ).toBe('1 2 3 4')
  })

  it('keeps combining marks in a word and matches either normal form', () => {
    expect(book.encode('हिन्दी', { book: 'हिन्दी भाषा' }).text).toBe('1')
    expect(book.decode('1', { book: 'हिन्दी भाषा' }).text).toBe('हिन्दी')
    expect(book.encode('cafe\u0301', { book: 'un caf\u00E9' }).text).toBe('2')
  })

  it('matches a word whose capital decomposes, as Greek \u0390 does', () => {
    expect(book.encode('\u03AA\u0301', { book: '\u0390' }).text).toBe('1')
    expect(book.encode('\u0390', { book: '\u03AA\u0301' }).text).toBe('1')
  })

  it('takes the first letter in NFC, so a decomposed book picks the same letters', () => {
    const decomposed = { book: 'e\u0301clair e\u0301te\u0301', pick: 'letter' as const }
    expect(book.encode('\u00E9', decomposed).text).toBe('1')
    expect(book.encode('e\u0301e\u0301', decomposed).text).toBe('1 2')
    expect(book.decode('2', decomposed).text).toBe('\u00C9')
  })

  it('decodes one letter per address when its capital would be longer', () => {
    const letters = { book: '\u00DFeta \uFB03le', pick: 'letter' as const }
    expect(book.decode('1 2', letters).text).toBe('\u00DF\uFB03')
    expect(book.encode('\u00DF\uFB03', letters).text).toBe('1 2')
  })

  it('wraps round to the first word once every match is used', () => {
    expect(book.encode('one one', { book: 'one two' }).text).toBe('1 1')
  })

  it('reads a book on one line as long as the tool takes', () => {
    const line = { book: 'a '.repeat(MAX_BOOK_LENGTH / 2) }
    expect(book.decode('1 500000', line).text).toBe('a a')
    expect(book.encode('a a', line).text).toBe('1 2')
    expect(book.decode('1', line).options).toMatchObject({ words: 500_000, lines: 1 })
  })

  it('counts lines and pages, a form feed between pages and blank lines left out', () => {
    expect(book.decode('2-2-3 1-2-1', { book: pages, address: 'page-line-word' }).text).toBe(
      'ten four',
    )
    expect(book.decode('4-3 2-2', { book: pages, address: 'line-word' }).text).toBe('ten five')
    expect(book.encode('ten one', { book: pages, address: 'page-line-word', start: 0 }).text).toBe(
      '1-1-2 0-0-0',
    )
  })

  it('reports the settings and the split, and leaves the book out', () => {
    expect(book.decode('1', { book: pages }).options).toEqual({
      address: 'word',
      pick: 'word',
      start: 1,
      words: 10,
      lines: 4,
      pages: 2,
    })
  })

  it('drops what is not a letter or a digit', () => {
    expect(book.encode('A, €B!', { book: 'Alpha Bravo', pick: 'letter' }).text).toBe('1 2')
    expect(book.encode('by, of!', { book: DECLARATION }).text).toBe(
      book.encode('by of', { book: DECLARATION }).text,
    )
  })

  it('names the number that is out of range and how many there are', () => {
    expect(() => book.decode('400', { book: DECLARATION })).toThrow(
      'Word 400 is out of range: the book has 341 words, numbered from 1',
    )
    expect(() => book.decode('0', { book: DECLARATION })).toThrow('Word 0 is out of range')
    expect(() => book.decode('2-3-1', { book: pages, address: 'page-line-word' })).toThrow(
      'Line 3 is out of range: page 2 has 2 lines, numbered from 1',
    )
    expect(() => book.decode('1-1-4', { book: pages, address: 'page-line-word' })).toThrow(
      'Word 4 is out of range: line 1 of page 1 has 3 words, numbered from 1',
    )
  })

  it('throws CipherError on numbers that are not whole addresses, or none', () => {
    expect(() => book.decode('1-2', { book: pages, address: 'page-line-word' })).toThrow(
      'page-line-word addresses take 3 numbers each, and the text has 2',
    )
    expect(() => book.decode('no numbers', { book: pages })).toThrow(CipherError)
  })

  it('throws CipherError when the book has no word for the plaintext', () => {
    expect(() => book.encode('xylophone', { book: DECLARATION })).toThrow(
      'The book has no word "xylophone"',
    )
    expect(() => book.encode('z', { book: DECLARATION, pick: 'letter' })).toThrow(
      'The book has no word starting with "z"',
    )
    expect(() => book.encode('x'.repeat(5000), { book: DECLARATION })).toThrow(
      'The book has no word of 5000 characters',
    )
    expect(() => book.decode('1'.repeat(30), { book: DECLARATION })).toThrow(
      'Word of 30 digits is out of range',
    )
    expect(() =>
      book.decode('000000000002 1 4', { book: pages, address: 'page-line-word' }),
    ).toThrow('Word 4 is out of range: line 1 of page of 12 digits has 2 words')
  })

  it('needs a book with a word in it, and keeps a long one out of the error', () => {
    expect(() => book.decode('1')).toThrow(MissingOptionError)
    expect(() => book.decode('1', { book: '... --- ...' })).toThrow(
      'Invalid option book=11 characters: must have a word in it',
    )
  })

  it.each([
    [{ address: 'chapter-verse' }, 'address'],
    [{ pick: 'line' }, 'pick'],
    [{ start: 2 }, 'start'],
    [{ start: '1' }, 'start'],
  ])('rejects %o with InvalidOptionError', (options, option) => {
    expect(() => book.decode('1', { book: pages, ...options })).toThrow(InvalidOptionError)
    expect(() => book.decode('1', { book: pages, ...options })).toThrow(option)
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

  it.each([
    ['ADF', {}, '3 letters'],
    ['DGDD DAGD DGAF ADDF DADV DVFA ADV', { transposition: 'PRIVACY' }, '27 letters'],
  ])('refuses %j, whose letters do not split into pairs', (text, options, count) => {
    expect(() => adf.decode(text, options)).toThrow(CipherError)
    expect(() => adf.decode(text, options)).toThrow(count)
  })

  it('refuses text without a single A, D, F, G, V or X', () => {
    expect(() => adf.decode('hello')).toThrow(CipherError)
    expect(() => adf.decode('hello')).toThrow('no A, D, F, G, V or X')
  })

  it('decodes empty or blank text to nothing', () => {
    expect(adf.decode('').text).toBe('')
    expect(adf.decode('  ').text).toBe('')
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

describe('route', () => {
  const route = create('route')
  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
  const paths = [
    'spiral-clockwise',
    'spiral-counterclockwise',
    'snake-rows',
    'snake-columns',
    'columns',
  ] as const

  /** https://gsmg.io/puzzle, the 14x14 grid row by row with black and blue as 1. */
  it('reads the GSMG.IO opening grid counterclockwise from the top left', () => {
    const grid =
      '0011010010110011110011101011110111010010010110100001110101100011000110100110001000111001110001000011100000001000000111011111011111110011000111010000011011111100101011000101110100011001101101101011'
    const options = { width: 14, path: 'spiral-counterclockwise' }
    const bits = route.decode(grid, options).text
    const bytes = bits
      .slice(0, 192)
      .match(/[01]{8}/g)!
      .map((byte) => Number.parseInt(byte, 2))
    expect(String.fromCodePoint(...bytes)).toBe('gsmg.io/theseedisplanted')
    expect(route.encode(bits, options).text).toBe(grid)
  })

  /** https://en.wikipedia.org/wiki/Transposition_cipher#Route_cipher */
  it('reads the Wikipedia grid clockwise from the top right', () => {
    const options = { width: 9, corner: 'top-right' }
    expect(route.decode('WRIORFEOEEESVELANJADCEDETCX', options).text).toBe(
      'EJXCTEDECDAEWRIORFEONALEVSE',
    )
    expect(route.encode('EJXCTEDECDAEWRIORFEONALEVSE', options).text).toBe(
      'WRIORFEOEEESVELANJADCEDETCX',
    )
  })

  it('walks every path from every corner of a 3x4 grid', () => {
    const expected = {
      'top-left': ['ABCDHLKJIEFG', 'AEIJKLHDCBFG', 'ABCDHGFEIJKL', 'AEIJFBCGKLHD', 'AEIBFJCGKDHL'],
      'top-right': ['DHLKJIEABCGF', 'DCBAEIJKLHGF', 'DCBAEFGHLKJI', 'DHLKGCBFJIEA', 'DHLCGKBFJAEI'],
      'bottom-left': [
        'IEABCDHLKJFG',
        'IJKLHDCBAEFG',
        'IJKLHGFEABCD',
        'IEABFJKGCDHL',
        'IEAJFBKGCLHD',
      ],
      'bottom-right': [
        'LKJIEABCDHGF',
        'LHDCBAEIJKGF',
        'LKJIEFGHDCBA',
        'LHDCGKJFBAEI',
        'LHDKGCJFBIEA',
      ],
    }
    for (const corner of corners) {
      paths.forEach((path, i) => {
        const text = expected[corner][i]!
        expect(
          route.decode('ABCDEFGHIJKL', { width: 4, corner, path }).text,
          `${corner} ${path}`,
        ).toBe(text)
        expect(route.encode(text, { width: 4, corner, path }).text, `${corner} ${path}`).toBe(
          'ABCDEFGHIJKL',
        )
      })
    }
  })

  it('skips the empty cells of a short last row', () => {
    expect(route.decode('ABCDEFGHIJ', { width: 4 }).text).toBe('ABCDHJIEFG')
    expect(route.decode('ABCDEFGHIJ', { width: 4, corner: 'bottom-right' }).text).toBe('JIEABCDHGF')
    for (const corner of corners) {
      for (const path of paths) {
        for (let length = 0; length <= 30; length++) {
          const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123'.slice(0, length)
          const encoded = route.encode(text, { width: 7, corner, path }).text
          expect(route.decode(encoded, { width: 7, corner, path }).text).toBe(text)
        }
      }
    }
  })

  it('walks one row wider than the text as one exactly as wide', () => {
    for (const corner of corners) {
      for (const path of paths) {
        const wide = route.decode('ABCDE', { width: 1_000_000_000, corner, path }).text
        expect(wide, `${corner} ${path}`).toBe(
          route.decode('ABCDE', { width: 5, corner, path }).text,
        )
      }
    }
  })

  it('keeps spaces as cells and drops line breaks', () => {
    expect(route.decode('AB\nCD\r\nEF', { width: 2, path: 'columns' }).text).toBe('ACEBDF')
    expect(route.decode('A B', { width: 2, path: 'columns' }).text).toBe('AB ')
  })

  it('needs width and rejects an unknown corner or path', () => {
    expect(() => route.encode('ABC')).toThrow(MissingOptionError)
    expect(() => route.encode('ABC', { width: 1 })).toThrow(InvalidOptionError)
    expect(() => route.encode('ABC', { width: 2.5 })).toThrow(InvalidOptionError)
    expect(() => route.encode('ABC', { width: 2, corner: 'middle' })).toThrow(/corner/)
    expect(() => route.decode('ABC', { width: 2, path: 'diagonal' })).toThrow(/path/)
  })
})

describe('straddling-checkerboard', () => {
  const board = create('straddling-checkerboard')
  const gsmg = { key: 'FUBCDORA.LETHINGKYMVPS/JQZXW', blanks: '14' }
  const gsmgCode =
    '15165943121972409169171213758951813141543131412428154191312181219433121171617137149110916631213131281491109166131412199114371612126021664313711154112'
  const gsmgText =
    'INCASEYOUMANAGETOCRACKTHISTHEPRIVATEKEYSBELONGTOHALFANDBETTERHALFANDTHEYALSONEEDFUNDSTOLIVE'

  it('matches the Wikipedia ATTACK AT DAWN vector on its default board', () => {
    const encoded = board.encode('ATTACK AT DAWN')
    expect(encoded.text).toBe('3113212731223655')
    expect(encoded.options).toEqual({ key: 'ETAONRISBCDFGHJKLMPQ/UVWXYZ.', blanks: '26' })
    expect(board.decode('3113212731223655').text).toBe('ATTACKATDAWN')
  })

  it('reads the Wikipedia cipher digits back as letters', () => {
    expect(board.decode('3565257935743007').text).toBe('ANWHRSANROAEER')
  })

  it('decodes GSMG.IO phase 3.2.2 with the board from its writeup', () => {
    expect(board.decode(gsmgCode, gsmg).text).toBe(gsmgText)
    expect(board.encode(gsmgText, gsmg).text).toBe(gsmgCode)
  })

  it('takes a filler twice, as dcode does with the GSMG.IO board', () => {
    const dots = { key: 'FUBCDORA.LETHINGKYMVPS.JQZXW', blanks: '14' }
    expect(board.decode(gsmgCode, dots).text).toBe(gsmgText)
    expect(board.encode('.', dots).text).toBe('10')
  })

  it('ignores case, spaces and anything off the board', () => {
    expect(board.encode('attack, at dawn!').text).toBe('3113212731223655')
    expect(board.decode('31 13 21 27').text).toBe('ATTACK')
    expect(board.encode('A1', { key: 'etaonrisbcdfghjklmpq/uvwxyz.', blanks: '2 6' }).text).toBe(
      '3',
    )
  })

  it('roundtrips with the blanks anywhere on the top row', () => {
    for (const blanks of ['01', '09', '90', '58']) {
      const options = { key: 'ETAONRISBCDFGHJKLMPQ/UVWXYZ.', blanks }
      const encoded = board.encode('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG.', options)
      expect(board.decode(encoded.text, options).text).toBe('THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG.')
    }
  })

  it.each([
    ['ABC', '3 cells'],
    ['ETAONRISBCDFGHJKLMPQ/UVWXYE.', 'E appears 2 times'],
    ['ETAONRISBCDFGHJKLMPQ/UVWXYZ.E', '29 cells'],
  ])('refuses the board %j', (key, message) => {
    expect(() => board.encode('A', { key })).toThrow(InvalidOptionError)
    expect(() => board.decode('3', { key })).toThrow(message)
  })

  it.each(['22', '2', '2x', '123', ''])('refuses the blanks %j', (blanks) => {
    expect(() => board.encode('A', { blanks })).toThrow(InvalidOptionError)
    expect(() => board.decode('3', { blanks })).toThrow('must be two different digits')
  })

  it('refuses a code that ends on a blank digit', () => {
    expect(() => board.decode('3113212')).toThrow(CipherError)
    expect(() => board.decode('3113212')).toThrow('ends on 2')
  })

  it('refuses text without a single digit', () => {
    expect(() => board.decode('hello')).toThrow(CipherError)
    expect(() => board.decode('hello')).toThrow('no digits')
  })

  it('decodes empty or blank text to nothing', () => {
    expect(board.decode('').text).toBe('')
    expect(board.decode('  ').text).toBe('')
  })
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
    substitution: { key: 'ZEBRAS' },
    beaufort: { key: 'TEST' },
    autokey: { key: 'TEST' },
    alberti: { key: 'TEST', period: 4 },
    playfair: { key: 'TEST' },
    columnar: { key: 'TEST' },
    route: { width: 3 },
    book: { book: 'The 123 tests' },
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
    'aes-cbc-mac': { key: '000102030405060708090a0b0c0d0e0f' },
    'aes-passphrase': { key: 'secret' },
    rijndael: { key: '000102030405060708090a0b0c0d0e0f', blockSize: 256 },
    des: { key: '0123456789abcdef' },
    desx: { key: '0123456789abcdef'.repeat(3) },
    'triple-des': { key: '0123456789abcdef23456789abcdef01' },
    'triple-des-cbc': { key: '0123456789abcdef23456789abcdef01', iv: '00'.repeat(8) },
    blowfish: { key: '0123456789abcdef' },
    idea: { key: '00010002000300040005000600070008' },
    lucifer: { key: '0123456789abcdeffedcba9876543210' },
    mars: { key: '0123456789abcdeffedcba9876543210' },
    serpent: { key: '0123456789abcdeffedcba9876543210' },
    cast5: { key: '0123456712345678234567893456789a' },
    openpgp: { key: 'secret', count: 1024 },
    rabbit: { key: '0123456789abcdeffedcba9876543210' },
    rc4: { key: '0102030405' },
    xor: { key: '494345' },
    salsa20: { key: '00'.repeat(16), nonce: '00'.repeat(8) },
    xsalsa20: { key: '00'.repeat(32), nonce: '00'.repeat(24) },
    chacha20: { key: '00'.repeat(32), nonce: '00'.repeat(12) },
    xchacha20: { key: '00'.repeat(32), nonce: '00'.repeat(24) },
    'chacha20-poly1305': { key: '00'.repeat(32), nonce: '00'.repeat(12) },
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

  it('every byte cipher takes bytes that are not UTF-8 with bytes: hex', () => {
    const plain = '00ff80c0'.repeat(4)
    const byteCiphers = ciphers().filter((name) => create(name).info().category !== 'classical')
    for (const name of byteCiphers) {
      const cipher = create(name)
      const opts = { ...keyOpts[name], bytes: 'hex' }
      const encoded = cipher.encode(plain, opts)
      expect(encoded.options).toMatchObject({ bytes: 'hex' })
      expect(cipher.decode(encoded.text, opts).text).toBe(plain)
      expect(() => cipher.decode(encoded.text, keyOpts[name])).toThrow(
        new CipherError(
          `[${name}] Decrypted bytes are not UTF-8 text; pass bytes: hex to get them as hex`,
        ),
      )
    }
  }, 30_000)

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
      'route',
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

describe('block modes', () => {
  const broken: BlockMode = {
    name: 'broken',
    label: 'Broken ECB',
    mode: 'ecb',
    blockSize: 1,
    keyDigits: [2],
    keyError: 'must be 2 hex digits',
    run: () => {
      throw new TypeError('boom')
    },
  }

  it('turns whatever the block cipher throws into a CipherError named after the mode', () => {
    for (const run of [
      () => encodeBlocks(broken, 'a', { key: '00' }),
      () => decodeBlocks(broken, '00', { key: '00' }),
    ]) {
      expect(run).toThrow(CipherError)
      expect(run).toThrow('[broken] boom')
    }
  })

  it('reads missing options as none', () => {
    expect(() => encodeBlocks(broken, 'a')).toThrow(MissingOptionError)
    expect(() => decodeBlocks(broken, '00')).toThrow(MissingOptionError)
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

  /** NIST SP 800-38A, F.1.3 and F.1.4: ECB-AES192 over four blocks, as bytes. */
  it('runs ECB on raw bytes from the aes subpath', () => {
    const bytes = (value: string) => Uint8Array.from(hex(value))
    const key = bytes('8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b')
    const plaintext = bytes(
      '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710',
    )
    const ciphertext = bytes(
      'bd334f1d6e45f25ff712a214571fa5cc974104846d0ad3ad7734ecb3ecee4eefef7afd2270e2e60adce0ba2face6444e9a4b41ba738d6c72fb16691603c18e0e',
    )
    expect(ecb(plaintext, key, 'encrypt')).toEqual(ciphertext)
    expect(ecb(ciphertext, key, 'decrypt')).toEqual(plaintext)
    /* A view into a larger buffer reads only its own bytes, and the input stays as it was. */
    const framed = new Uint8Array(80)
    framed.set(plaintext, 8)
    expect(ecb(framed.subarray(8, 72), key, 'encrypt')).toEqual(ciphertext)
    expect(framed.subarray(8, 72)).toEqual(plaintext)
    expect(ecb(new Uint8Array(), key, 'encrypt')).toEqual(new Uint8Array())
  })

  it('refuses a byte key or data of the wrong shape without printing the key', () => {
    const block = new Uint8Array(16)
    const secret = Uint8Array.from({ length: 20 }, (_, i) => 0xa0 + i)
    expect(() => ecb(block, secret, 'encrypt')).toThrow(
      'Invalid option key=20 bytes: must be a Uint8Array of 16, 24 or 32 bytes',
    )
    expect(() => ecb(block, secret, 'encrypt')).toThrow(InvalidOptionError)
    expect(() => ecb(new Uint8Array(17), new Uint8Array(16), 'decrypt')).toThrow(
      '[aes] Data must be whole 16-byte blocks, got 17 bytes',
    )
    expect(() => ecb(block, block, 'sign' as 'encrypt')).toThrow(InvalidOptionError)
    expect(() => ecb('00' as unknown as Uint8Array, block, 'encrypt')).toThrow(CipherError)
    expect(() => ecb(block, [...block] as unknown as Uint8Array, 'encrypt')).toThrow(
      'Invalid option key=object',
    )
  })

  /** Geth's `wikipage_test_vector_pbkdf2` keystore, its PBKDF2 key half from `openssl kdf`. */
  it('runs CTR on raw bytes from the aes subpath', () => {
    const bytes = (value: string) => Uint8Array.from(hex(value))
    const key = bytes('f06d69cdc7da0faffb1008270bca38f5')
    const iv = bytes('6087dab2f9fdbbfaddc31a909735c1e6')
    const ciphertext = bytes('5318b4d5bcd28de64ee5559e671353e16f075ecae9f99c7a79a38af5f869aa46')
    const priv = bytes('7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d')
    expect(ctr(ciphertext, key, iv)).toEqual(priv)
    expect(ctr(priv, key, iv)).toEqual(ciphertext)
    expect(iv).toEqual(bytes('6087dab2f9fdbbfaddc31a909735c1e6'))
    expect(ctr(new Uint8Array(), key, iv)).toEqual(new Uint8Array())
  })

  /** `openssl enc -aes-128-ctr` over 40 `A`s from `ff..fe`, the third block on a zero counter. */
  it('wraps the CTR counter and cuts a short last block', () => {
    const bytes = (value: string) => Uint8Array.from(hex(value))
    const key = bytes('2b7e151628aed2a6abf7158809cf4f3c')
    const counter = bytes('ff'.repeat(15) + 'fe')
    const text = new TextEncoder().encode('A'.repeat(40))
    const ciphertext = bytes(
      '90f655f7bab4beb069dbaf6b0d0face2cbb3c74003b6c7b548713d5b7e3febed3cb62a4d5bf9d8f2',
    )
    expect(ctr(text, key, counter)).toEqual(ciphertext)
    expect(ctr(ciphertext, key, counter)).toEqual(text)
  })

  it('refuses a CTR key or counter of the wrong shape without printing the key', () => {
    const block = new Uint8Array(16)
    const secret = Uint8Array.from({ length: 20 }, (_, i) => 0xa0 + i)
    expect(() => ctr(block, secret, block)).toThrow(
      'Invalid option key=20 bytes: must be a Uint8Array of 16, 24 or 32 bytes',
    )
    expect(() => ctr(block, block, new Uint8Array(12))).toThrow(
      'Invalid option counter=12 bytes: must be a Uint8Array of 16 bytes',
    )
    expect(() => ctr(block, block, [...block] as unknown as Uint8Array)).toThrow(InvalidOptionError)
    expect(() => ctr('00' as unknown as Uint8Array, block, block)).toThrow(CipherError)
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
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('aes-cbc-mac', () => {
  const mac = create('aes-cbc-mac')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '2b7e151628aed2a6abf7158809cf4f3c'
  const dawn = '41545441434b204154204441574e' + '1efa905609cc69e415825c40f80501e8'

  /**
   * NIST SP 800-38A §F.2.1, CBC-AES128.Encrypt: with the IV XORed into the first plaintext block,
   * a zero IV chains to the same blocks, so the last ciphertext block is the CBC-MAC.
   */
  it('matches the last block of the NIST SP 800-38A CBC example', () => {
    const iv = hex('000102030405060708090a0b0c0d0e0f')
    const plaintext = hex(
      '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e51' +
        '30c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710',
    ).map((byte, i) => byte ^ (iv[i] ?? 0))
    expect(aesCbcMac(plaintext, hex(key))).toEqual(hex('3ff1caa1681fac09120eca307586e1a7'))
  })

  /** RFC 4493 §4: L = AES-128(K, 0^128), which is the tag of empty data padded to one zero block. */
  it('tags empty text with the key encrypting one zero block', () => {
    expect(aesCbcMac([], hex(key))).toEqual(hex('7df76b0c1ab899b33e42f047b91b546f'))
    expect(mac.encode('', { key }).text).toBe('7df76b0c1ab899b33e42f047b91b546f')
    expect(mac.decode('7df76b0c1ab899b33e42f047b91b546f', { key }).text).toBe('')
  })

  /**
   * Expected tags from Node's `createCipheriv('aes-*-cbc')` with a zero IV and padding off over
   * the zero-padded text, OpenSSL underneath.
   */
  it('puts the text bytes before the tag, with tags as OpenSSL computes them', () => {
    for (const [text, options, tag] of [
      ['ATTACK AT DAWN', { key }, '1efa905609cc69e415825c40f80501e8'],
      ['ATTACK AT DAWN!!', { key }, '541ff0c92b9251ae06c624c4a8ab2a85'],
      ['zażółć gęślą jaźń 🙂', { key }, '62182857e3c41e2bc1869ad47e0423f8'],
      [
        'ATTACK AT DAWN',
        { key: '8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b' },
        'e27f4fec7edfae6f638ce8f60f42538f',
      ],
      [
        'ATTACK AT DAWN',
        { key: '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4' },
        '9ee24c3b3f110bea064f65e21dab4523',
      ],
    ] as const) {
      const signed = Buffer.from(text).toString('hex') + tag
      expect(mac.encode(text, options).text).toBe(signed)
      expect(mac.decode(signed, options).text).toBe(text)
    }
    expect(mac.encode('ATTACK AT DAWN', { key })).toEqual({
      text: dawn,
      cipher: 'aes-cbc-mac',
      operation: 'encode',
      options: { key, mode: 'cbc-mac' },
    })
  })

  it('refuses text whose tag does not match', () => {
    const dusk = '41545441434b204154204455534b' + dawn.slice(28)
    for (const [text, options] of [
      [dusk, { key }],
      [dawn.slice(0, -2) + '00', { key }],
      [dawn, { key: '00'.repeat(16) }],
      [
        '41545441434b204154204455534b' + 'e6bcd2536e3c82a0cdc7cc57baa7e647',
        { key: '00'.repeat(16) },
      ],
    ] as const) {
      expect(() => mac.decode(text, options)).toThrow(CipherError)
      expect(() => mac.decode(text, options)).toThrow(/Tag does not match/)
    }
    expect(
      mac.decode('41545441434b204154204455534b' + 'e6bcd2536e3c82a0cdc7cc57baa7e647', { key }).text,
    ).toBe('ATTACK AT DUSK')
  })

  it('gives zero bytes at the end the same tag, as zero padding does', () => {
    const padded = '41545441434b204154204441574e0000' + dawn.slice(28)
    expect(mac.decode(padded, { key }).text).toBe('ATTACK AT DAWN\0\0')
  })

  it('names what is wrong with input it cannot check', () => {
    expect(() => mac.decode('4154a', { key })).toThrow(/whole bytes/)
    expect(() => mac.decode('41zz', { key })).toThrow(/hex digits/)
    expect(() => mac.decode('41545441', { key })).toThrow(/16-byte tag, got 4 bytes/)
  })

  it('reads the key in any case and spacing', () => {
    expect(
      mac.encode('ATTACK AT DAWN', { key: '2B7E1516 28AED2A6 ABF71588 09CF4F3C' }).options,
    ).toEqual({ key, mode: 'cbc-mac' })
  })

  it('rejects keys it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => mac[operation]('', {})).toThrow(MissingOptionError)
      expect(() => mac[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(15), '00'.repeat(20), 'g'.repeat(32), 12]) {
        expect(() => mac[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })
})

describe('aes-passphrase', () => {
  const aes = create('aes-passphrase')
  const salt = '0123456789abcdef'
  const dawn = 'U2FsdGVkX18BI0VniavN73vYVeKsrRmd74V3dwhYQ3E='
  const wide = 'U2FsdGVkX18BI0VniavN70YX2WYeKixus3JUmT8oEXqR/NZ3H+g78SrpV2crYs3H'

  /** Key and IV from `openssl enc -aes-256-cbc -md md5 -S 0123456789abcdef -pass pass:secret -P`. */
  it('derives key and IV as EVP_BytesToKey over MD5 does', () => {
    const body = Buffer.from(dawn, 'base64').subarray(16).toString('hex')
    expect(
      create('aes-cbc').decode(body, {
        key: '5f772a83139a8d48ba45597c721ab6f2d37975c93f36a944cef01de4be7eb5d4',
        iv: '0c72e5c512bf687b6331619b8545ea9d',
      }).text,
    ).toBe('ATTACK AT DAWN')
  })

  /** Base64 from crypto-js 4.2.0 with key and IV from its EvpKDF; `openssl enc -md md5` agrees at 128 and 256. */
  it('matches CryptoJS for every key length it is given', () => {
    for (const [text, options, expected] of [
      ['ATTACK AT DAWN', {}, dawn],
      ['ATTACK AT DAWN', { keyLength: 128 }, 'U2FsdGVkX18BI0VniavN7/r+y5SW2eJwFMs8YnF9PlY='],
      ['ATTACK AT DAWN', { keyLength: 192 }, 'U2FsdGVkX18BI0VniavN70PB4saQjhU/ierpWovK3Uk='],
      ['Zażółć gęślą jaźń', { keyLength: 1024, iterations: 10_000 }, wide],
    ] as const) {
      expect(aes.encode(text, { key: 'secret', salt, ...options }).text).toBe(expected)
      expect(aes.decode(expected, { key: 'secret', ...options }).text).toBe(text)
    }
  })

  /** Output of `openssl enc -a -pass pass:secret` 3.6.4 under `-md sha1` and `-md sha256`. */
  it('opens what openssl enc writes over SHA-1 and SHA-256', () => {
    for (const [digest, keyLength, blob] of [
      ['sha256', 256, 'U2FsdGVkX18HYWQDuJcJTh2NoqzqwZ9pWaEBkXGGu54='],
      ['sha256', 128, 'U2FsdGVkX1+na5gHUrEN4hG7LZRQ7qjUsIM1RiIjkv0='],
      ['sha1', 256, 'U2FsdGVkX182QesVZh2QtuA2EYOeDO1srzryiKb6MNk='],
      ['sha1', 128, 'U2FsdGVkX1+ksWSuMc0rUgJ7Iq06e+5j0O7VtXqcIr4='],
    ] as const) {
      const options = { key: 'secret', digest, keyLength }
      const decoded = aes.decode(blob, options)
      expect(decoded.text).toBe('ATTACK AT DAWN')
      expect(aes.encode('ATTACK AT DAWN', { ...options, salt: decoded.options.salt }).text).toBe(
        blob,
      )
      expect(() => aes.decode(blob, { key: 'secret', keyLength })).toThrow(
        /wrong passphrase, digest, keyLength or iterations/,
      )
    }
  })

  it('reads the salt from the ciphertext', () => {
    expect(aes.decode('U2FsdGVkX1/8SH4W60kQBi0VYxWiwrLhysleV0O88xw=', { key: 'secret' })).toEqual({
      text: 'ATTACK AT DAWN',
      cipher: 'aes-passphrase',
      operation: 'decode',
      options: {
        key: 'secret',
        mode: 'cbc',
        salt: 'fc487e16eb491006',
        digest: 'md5',
        keyLength: 256,
        iterations: 1,
      },
    })
  })

  it('draws a new salt for every encoding unless one is given', () => {
    const first = aes.encode('ATTACK AT DAWN', { key: 'secret' })
    const second = aes.encode('ATTACK AT DAWN', { key: 'secret' })
    expect(first.text).toMatch(/^U2FsdGVkX1/)
    expect(first.text).not.toBe(second.text)
    expect(first.options.salt).toMatch(/^[0-9a-f]{16}$/)
    expect(aes.decode(first.text, { key: 'secret' }).text).toBe('ATTACK AT DAWN')
  })

  /** `openssl enc -a` breaks lines at 64 characters, and a pasted ciphertext can lose its `=`. */
  it('reads base64 across line breaks and without padding', () => {
    expect(aes.decode(dawn.slice(0, -1), { key: 'secret' }).text).toBe('ATTACK AT DAWN')
    expect(
      aes.decode(`${wide.slice(0, 32)}\r\n${wide.slice(32)}\n`, {
        key: 'secret',
        keyLength: 1024,
        iterations: 10_000,
      }).text,
    ).toBe('Zażółć gęślą jaźń')
  })

  it('names what is wrong with a ciphertext it cannot open', () => {
    expect(() => aes.decode(dawn, { key: 'wrong' })).toThrow(
      /padding: wrong passphrase, digest, keyLength or iterations/,
    )
    expect(() => aes.decode(wide, { key: 'secret', keyLength: 1024 })).toThrow(CipherError)
    expect(() => aes.decode('U2FsdGVkX1-BI0Vn', { key: 'secret' })).toThrow(
      'Ciphertext must be base64: "-" (U+002D) at index 10 is not in the alphabet',
    )
    expect(() => aes.decode('AAAAAAAAAAAAAAAAAAAAAA==', { key: 'secret' })).toThrow(/Salted__/)
    expect(() => aes.decode('U2FsdGVkX18BI0VniavN7w==', { key: 'secret' })).toThrow(
      /whole 16-byte blocks, got 0 bytes/,
    )
    expect(() => aes.decode(dawn.slice(0, -4), { key: 'secret' })).toThrow(/got 14 bytes/)
  })

  it('refuses options outside what the format takes', () => {
    expect(() => aes.encode('x', {})).toThrow(MissingOptionError)
    for (const options of [
      { key: 'secret', keyLength: 96 },
      { key: 'secret', keyLength: 100 },
      { key: 'secret', keyLength: 1056 },
      { key: 'secret', iterations: 0 },
      { key: 'secret', iterations: 1.5 },
      { key: 'secret', iterations: 100_001 },
      { key: 'secret', salt: '0123' },
      { key: 'secret', digest: 'sha512' },
      { key: 'secret', digest: 'SHA256' },
      { key: 'secret', digest: 'toString' },
    ]) {
      expect(() => aes.encode('x', options)).toThrow(InvalidOptionError)
    }
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('des', () => {
  const des = create('des')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456789abcdef'

  /** FIPS 81 Appendix B, Table B1: ECB over "Now is the time for all " under 0123456789abcdef. */
  it('matches the FIPS 81 ECB example', () => {
    const plaintext = [...new TextEncoder().encode('Now is the time for all ')]
    const ciphertext = hex('3fa40e8a984d48156a271787ab8883f9893d51ec4b563b53')
    expect(desEcb(plaintext, hex(key), 'encrypt')).toEqual(ciphertext)
    expect(desEcb(ciphertext, hex(key), 'decrypt')).toEqual(plaintext)
  })

  /** Grabbe's "The DES Algorithm Illustrated" and NIST SP 800-17 Table B.1. */
  it('matches the known-answer blocks', () => {
    for (const [vectorKey, plaintext, ciphertext] of [
      ['133457799bbcdff1', '0123456789abcdef', '85e813540f0ab405'],
      ['0101010101010101', '8000000000000000', '95f8a5e5dd31d900'],
      ['0101010101010101', '4000000000000000', 'dd7f121ca5015619'],
      ['0101010101010101', '0000000000000001', '166b40b44aba4bd6'],
    ]) {
      expect(desEcb(hex(plaintext!), hex(vectorKey!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(desEcb(hex(ciphertext!), hex(vectorKey!), 'decrypt')).toEqual(hex(plaintext!))
    }
  })

  /** Expected values from `openssl enc -des-ecb -provider legacy`, PKCS#7 by default. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as OpenSSL does', () => {
    for (const [text, ciphertext] of [
      ['', '086f9a1d74c94d4e'],
      ['ATTACK AT DAWN', '66e43480bc9810be67812271f1ee04a0'],
      ['zażółć gęślą jaźń 🙂', 'e8a2cc1f743acd6d83ea97d27e78d67d385ad632de1514b427a02b270824202b'],
      ['A'.repeat(8), 'a827de10956a609d086f9a1d74c94d4e'],
    ]) {
      expect(des.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'des',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(des.decode(ciphertext!, { key }).text).toBe(text)
    }
  })

  it('is Triple DES with three equal keys', () => {
    expect(des.encode('ATTACK AT DAWN', { key: '133457799bbcdff1' }).text).toBe(
      create('triple-des').encode('ATTACK AT DAWN', { key: '133457799bbcdff1'.repeat(3) }).text,
    )
  })

  it('ignores the parity bit of every key byte', () => {
    expect(des.encode('ATTACK AT DAWN', { key: '0022446688aaccee' }).text).toBe(
      '66e43480bc9810be67812271f1ee04a0',
    )
  })

  /** A weak key gives 16 equal subkeys, so encrypting twice is the identity (FIPS 74). */
  it('undoes itself under a weak key', () => {
    const plaintext = [...new TextEncoder().encode('ATTACK AT DAWN\u0002\u0002')]
    const weak = hex('0101010101010101')
    expect(desEcb(desEcb(plaintext, weak, 'encrypt'), weak, 'encrypt')).toEqual(plaintext)
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    const { text } = des.encode('A'.repeat(16), { key })
    expect(text).toBe('a827de10956a609da827de10956a609d086f9a1d74c94d4e')
    expect(text.slice(0, 16)).toBe(text.slice(16, 32))
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const spaced = '0123 4567 89AB CDEF'
    expect(des.encode('ATTACK AT DAWN', { key: spaced }).options).toEqual({ key, mode: 'ecb' })
    expect(des.decode('66E43480 BC9810BE\n67812271 F1EE04A0', { key: spaced }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys that are not a DES key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => des[operation]('')).toThrow(MissingOptionError)
      expect(() => des[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        'YELLOW S',
        '00'.repeat(7),
        '00'.repeat(9),
        '00'.repeat(16),
        'g'.repeat(16),
        12,
      ]) {
        expect(() => des[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => des.decode('', { key })).toThrow(/whole 8-byte blocks/)
    expect(() => des.decode('66e43480', { key })).toThrow(/got 8 hex digits/)
    expect(() => des.decode('zz'.repeat(8), { key })).toThrow(/must be hex digits/)
    // OpenSSL: "bad decrypt" for this ciphertext under this key.
    expect(() =>
      des.decode('66e43480bc9810be67812271f1ee04a0', { key: 'fedcba9876543210' }),
    ).toThrow(/PKCS#7/)
    // ff then seven bytes of 07: valid padding, invalid UTF-8.
    expect(() => des.decode('472bb7d465c29474', { key })).toThrow(/not UTF-8/)
    expect(() => des.decode('472bb7d465c29474', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('DES')).toBe(des)
    expect(des.info()).toMatchObject({
      name: 'des',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('desx', () => {
  const desx = create('desx')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456789abcdeff0e1d2c3b4a596871122334455667788'

  /**
   * Botan 2.19.3 `src/tests/data/block/des.vec`, section [DESX]. Botan lays the key out as input
   * whitening, DES key, output whitening; OpenSSL, and so this cipher, puts the DES key first.
   */
  it('matches the Botan DESX vectors', () => {
    for (const [botanKey, plaintext, ciphertext] of [
      ['0123456789abcdef01010101010101011011121314151617', '94dbe082549a14ef', '9011121314151617'],
      ['e874076ef40eda62908d12adf2b7b9ecda474bf3fedcda11', 'b83df91f844ff695', 'fa942810ac8355c0'],
      ['2af5602da83f821a69c81b1b83efa70a3b4e3c1d546bf825', '4ef5d7337d420403', 'b2c3c73b303be0d7'],
      ['beb7df4a710facb364183eebca3ee934a5b470031ce64a03', '8d3c8f07a610fd51', '5712559676caba44'],
      ['46312600f8b5f05afaa080d26672b9c44af057d694702ab5', 'b39949a845ef61c1', '3769f87fb393d49f'],
      ['25a3eae6d9fb10e86e14032bb652262cd1d7ed74a2bfc75b', 'b00e6572a847d27a', '6b1c14571bc9ebce'],
      ['3d5bea2c2216e30ce961882a593608cb5ba96fc656af7487', '07608c7cb2b11972', 'cd627b22e13eccd4'],
      ['5ad28c1d67c65e4d5f4a9db38c32827bc6c4fe098996f017', 'c2b7bcc1ea18b54a', '66ef45bea20ddaaf'],
      ['8a94fcbf30415180ef79881d32c8c061e4527de53bf5915d', '59004793279bbefa', 'f0b6ac1318f01331'],
    ]) {
      const vectorKey = hex(botanKey!.slice(16, 32) + botanKey!.slice(0, 16) + botanKey!.slice(32))
      expect(desxEcb(hex(plaintext!), vectorKey, 'encrypt')).toEqual(hex(ciphertext!))
      expect(desxEcb(hex(ciphertext!), vectorKey, 'decrypt')).toEqual(hex(plaintext!))
    }
  })

  /**
   * Expected values from `openssl enc -desx-cbc -provider legacy` with a zero IV, one block at a
   * time, which is ECB. PKCS#7 padding added before, as `openssl enc` does by default.
   */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as OpenSSL does', () => {
    for (const [text, ciphertext] of [
      ['', 'f5cb6e9d23564414'],
      ['ATTACK AT DAWN', 'e66c99d05c13ecf7cb70b505d3d77a8e'],
      ['zażółć gęślą jaźń 🙂', '39977e8855a8445f7d2177aa43f5d7b4c8230d9d3632257be04783244f24d98c'],
    ]) {
      expect(desx.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'desx',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(desx.decode(ciphertext!, { key }).text).toBe(text)
    }
  })

  it('is DES when both whitening keys are zero', () => {
    expect(desx.encode('ATTACK AT DAWN', { key: '0123456789abcdef' + '00'.repeat(16) }).text).toBe(
      create('des').encode('ATTACK AT DAWN', { key: '0123456789abcdef' }).text,
    )
  })

  it('ignores the parity bit of every DES key byte, and only there', () => {
    expect(desx.encode('ATTACK AT DAWN', { key: '0022446688aaccee' + key.slice(16) }).text).toBe(
      'e66c99d05c13ecf7cb70b505d3d77a8e',
    )
    expect(
      desx.encode('ATTACK AT DAWN', { key: key.slice(0, 16) + 'f1' + key.slice(18) }).text,
    ).not.toBe('e66c99d05c13ecf7cb70b505d3d77a8e')
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    const { text } = desx.encode('A'.repeat(16), { key })
    expect(text).toBe('7df87a008ee599617df87a008ee59961f5cb6e9d23564414')
    expect(text.slice(0, 16)).toBe(text.slice(16, 32))
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const spaced = '0123 4567 89AB CDEF F0E1 D2C3 B4A5 9687 1122 3344 5566 7788'
    expect(desx.encode('ATTACK AT DAWN', { key: spaced }).options).toEqual({ key, mode: 'ecb' })
    expect(desx.decode('E66C99D0 5C13ECF7\nCB70B505 D3D77A8E', { key: spaced }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys that are not a DESX key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => desx[operation]('')).toThrow(MissingOptionError)
      expect(() => desx[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        '00'.repeat(8),
        '00'.repeat(16),
        '00'.repeat(23),
        '00'.repeat(25),
        'g'.repeat(48),
        12,
      ]) {
        expect(() => desx[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => desx.decode('', { key })).toThrow(/whole 8-byte blocks/)
    expect(() => desx.decode('e66c99d0', { key })).toThrow(/got 8 hex digits/)
    expect(() => desx.decode('zz'.repeat(8), { key })).toThrow(/must be hex digits/)
    // OpenSSL: "bad decrypt" for this ciphertext with the DES key reversed.
    expect(() =>
      desx.decode('e66c99d05c13ecf7cb70b505d3d77a8e', { key: 'fedcba9876543210' + key.slice(16) }),
    ).toThrow(/PKCS#7/)
    // ff then seven bytes of 07: valid padding, invalid UTF-8.
    expect(() => desx.decode('7d6c96795bb94c24', { key })).toThrow(/not UTF-8/)
    expect(() => desx.decode('7d6c96795bb94c24', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('DESX')).toBe(desx)
    expect(desx.info()).toMatchObject({
      name: 'desx',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
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
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
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
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('blowfish', () => {
  const blowfish = create('blowfish')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456789abcdeff0e1d2c3b4a59687'

  /** Eric Young's ECB vectors, published with Schneier's reference code (vectors.txt). */
  it('matches the ECB vectors of Eric Young', () => {
    for (const [vectorKey, plaintext, ciphertext] of [
      ['0000000000000000', '0000000000000000', '4ef997456198dd78'],
      ['ffffffffffffffff', 'ffffffffffffffff', '51866fd5b85ecb8a'],
      ['3000000000000000', '1000000000000001', '7d856f9a613063f2'],
      ['1111111111111111', '1111111111111111', '2466dd878b963c9d'],
      ['0123456789abcdef', '1111111111111111', '61f9c3802281b096'],
      ['1111111111111111', '0123456789abcdef', '7d0cc630afda1ec7'],
      ['0000000000000000', '0000000000000000', '4ef997456198dd78'],
      ['fedcba9876543210', '0123456789abcdef', '0aceab0fc6a0a28d'],
      ['7ca110454a1a6e57', '01a1d6d039776742', '59c68245eb05282b'],
      ['0131d9619dc1376e', '5cd54ca83def57da', 'b1b8cc0b250f09a0'],
      ['07a1133e4a0b2686', '0248d43806f67172', '1730e5778bea1da4'],
      ['3849674c2602319e', '51454b582ddf440a', 'a25e7856cf2651eb'],
      ['04b915ba43feb5b6', '42fd443059577fa2', '353882b109ce8f1a'],
      ['0113b970fd34f2ce', '059b5e0851cf143a', '48f4d0884c379918'],
      ['0170f175468fb5e6', '0756d8e0774761d2', '432193b78951fc98'],
      ['43297fad38e373fe', '762514b829bf486a', '13f04154d69d1ae5'],
      ['07a7137045da2a16', '3bdd119049372802', '2eedda93ffd39c79'],
      ['04689104c2fd3b2f', '26955f6835af609a', 'd887e0393c2da6e3'],
      ['37d06bb516cb7546', '164d5e404f275232', '5f99d04f5b163969'],
      ['1f08260d1ac2465e', '6b056e18759f5cca', '4a057a3b24d3977b'],
      ['584023641aba6176', '004bd6ef09176062', '452031c1e4fada8e'],
      ['025816164629b007', '480d39006ee762f2', '7555ae39f59b87bd'],
      ['49793ebc79b3258f', '437540c8698f3cfa', '53c55f9cb49fc019'],
      ['4fb05e1515ab73a7', '072d43a077075292', '7a8e7bfa937e89a3'],
      ['49e95d6d4ca229bf', '02fe55778117f12a', 'cf9c5d7a4986adb5'],
      ['018310dc409b26d6', '1d9d5c5018f728c2', 'd1abb290658bc778'],
      ['1c587f1c13924fef', '305532286d6f295a', '55cb3774d13ef201'],
      ['0101010101010101', '0123456789abcdef', 'fa34ec4847b268b2'],
      ['1f1f1f1f0e0e0e0e', '0123456789abcdef', 'a790795108ea3cae'],
      ['e0fee0fef1fef1fe', '0123456789abcdef', 'c39e072d9fac631d'],
      ['0000000000000000', 'ffffffffffffffff', '014933e0cdaff6e4'],
      ['ffffffffffffffff', '0000000000000000', 'f21e9a77b71c49bc'],
      ['0123456789abcdef', '0000000000000000', '245946885754369a'],
      ['fedcba9876543210', 'ffffffffffffffff', '6b5c5a9c5d9e0a5a'],
    ]) {
      expect(blowfishEcb(hex(plaintext!), hex(vectorKey!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(blowfishEcb(hex(ciphertext!), hex(vectorKey!), 'decrypt')).toEqual(hex(plaintext!))
    }
  })

  /**
   * The set_key vectors from the same file: FEDCBA9876543210 under longer and longer prefixes of
   * one key, from the 32-bit minimum up to 192 bits.
   */
  it('matches the set_key vectors for every key length they cover', () => {
    const plaintext = hex('fedcba9876543210')
    for (const [vectorKey, ciphertext] of [
      ['f0e1d2c3', 'be1e639408640f05'],
      ['f0e1d2c3b4', 'b39e44481bdb1e6e'],
      ['f0e1d2c3b4a5', '9457aa83b1928c0d'],
      ['f0e1d2c3b4a596', '8bb77032f960629d'],
      ['f0e1d2c3b4a59687', 'e87a244e2cc85e82'],
      ['f0e1d2c3b4a5968778', '15750e7a4f4ec577'],
      ['f0e1d2c3b4a596877869', '122ba70b3ab64ae0'],
      ['f0e1d2c3b4a5968778695a', '3a833c9affc537f6'],
      ['f0e1d2c3b4a5968778695a4b', '9409da87a90f6bf2'],
      ['f0e1d2c3b4a5968778695a4b3c', '884f80625060b8b4'],
      ['f0e1d2c3b4a5968778695a4b3c2d', '1f85031c19e11968'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e', '79d9373a714ca34f'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f', '93142887ee3be15c'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f00', '03429e838ce2d14b'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f0011', 'a4299e27469ff67b'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f001122', 'afd5aed1c1bc96a8'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f00112233', '10851c0e3858da9f'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f0011223344', 'e6f51ed79b9db21f'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f001122334455', '64a6e14afd36b46f'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f00112233445566', '80c7d7d45a5479ad'],
      ['f0e1d2c3b4a5968778695a4b3c2d1e0f0011223344556677', '05044b62fa52d080'],
    ]) {
      expect(blowfishEcb(plaintext, hex(vectorKey!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(blowfishEcb(hex(ciphertext!), hex(vectorKey!), 'decrypt')).toEqual(plaintext)
    }
  })

  /** Expected values from `openssl enc -bf-ecb` with the legacy provider, PKCS#7 by default. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as OpenSSL does', () => {
    for (const [text, ciphertext] of [
      ['', '10c9d9248e4c6405'],
      ['ATTACK AT DAWN', '9e16058420b1546315051882f350a136'],
      ['zażółć gęślą jaźń 🙂', '2279d640c2b13b4812b0749785ce0f45fee97739b9cf08c9a89240e9e5547403'],
      ['A'.repeat(8), '8e9fdf91ed9fbd7310c9d9248e4c6405'],
    ]) {
      expect(blowfish.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'blowfish',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(blowfish.decode(ciphertext!, { key }).text).toBe(text)
    }
  })

  /** OpenSSL's command line cuts `-K` to 16 bytes, so this one is from PyCryptodome. */
  it('takes the longest key, 448 bits', () => {
    const longest = Array.from({ length: 56 }, (_, i) => i.toString(16).padStart(2, '0')).join('')
    expect(blowfish.encode('ATTACK AT DAWN', { key: longest }).text).toBe(
      'b4728dee1f7262869356a119e626b7b4',
    )
    expect(blowfish.decode('b4728dee1f7262869356a119e626b7b4', { key: longest }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    const { text } = blowfish.encode('A'.repeat(16), { key })
    expect(text).toBe('8e9fdf91ed9fbd738e9fdf91ed9fbd7310c9d9248e4c6405')
    expect(text.slice(0, 16)).toBe(text.slice(16, 32))
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const spaced = '0123 4567 89AB CDEF F0E1 D2C3 B4A5 9687'
    expect(blowfish.encode('ATTACK AT DAWN', { key: spaced }).options).toEqual({
      key,
      mode: 'ecb',
    })
    expect(blowfish.decode('9E160584 20B15463\n15051882 F350A136', { key: spaced }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys that are not a Blowfish key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => blowfish[operation]('')).toThrow(MissingOptionError)
      expect(() => blowfish[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        'YELLOW SUBMARINE',
        '00'.repeat(3),
        '0'.repeat(9),
        '00'.repeat(57),
        'g'.repeat(8),
        12,
      ]) {
        expect(() => blowfish[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => blowfish.decode('', { key })).toThrow(/whole 8-byte blocks/)
    expect(() => blowfish.decode('9e160584', { key })).toThrow(/got 8 hex digits/)
    expect(() => blowfish.decode('zz'.repeat(8), { key })).toThrow(/must be hex digits/)
    // PyCryptodome: "Padding is incorrect" for this ciphertext under this key.
    expect(() =>
      blowfish.decode('9e16058420b1546315051882f350a136', { key: '0123456789abcdef' }),
    ).toThrow(/PKCS#7/)
    // ff then seven bytes of 07: valid padding, invalid UTF-8.
    expect(() => blowfish.decode('1329be77067160c3', { key })).toThrow(/not UTF-8/)
    expect(() => blowfish.decode('1329be77067160c3', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('Blowfish')).toBe(blowfish)
    expect(blowfish.info()).toMatchObject({
      name: 'blowfish',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('idea', () => {
  const idea = create('idea')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '00010002000300040005000600070008'

  /**
   * Botan 2.19.3 `src/tests/data/block/idea.vec`. The eighth is the example from Lai and Massey's
   * thesis, the all-zero key has every subkey 0, which IDEA reads as 2^16.
   */
  it('matches the Botan IDEA vectors', () => {
    for (const [vectorKey, plaintext, ciphertext] of [
      ['ed1bcc9e9267925f3132ba3a8cf9b764', '7409000000000000', 'e18315c171b83765'],
      ['729a27ed8f5c3e8baf16560d14c90b43', 'd53fabbf94ff8b5f', '1d0cb2af1654820a'],
      ['729a27ed8f5c3e8baf16560d14c90b43', '848f836780938169', 'd7e0468226d0fc56'],
      ['9d4075c103bc322afb03e7be6ab30006', '0808080808080808', 'f5db1ac45e5ef9f9'],
      ['3a984e2000195db32ee501c8c47cea60', '0102030405060708', '97bcd8200780da86'],
      ['006400c8012c019001f4025802bc0320', '05320a6414c819fa', '65be87e7a2538aed'],
      ['00010002000300040005000600070008', '0000000100020003', '11fbed2b01986de5'],
      ['00010002000300040005000600070008', '0102030405060708', '540e5fea18c2f8b1'],
      ['00010002000300040005000600070008', 'f5202d5b9c671b08', 'cf18fd7355e2c5c5'],
      ['00000000000000000000000000000000', '0000000000000000', '0001000100000000'],
      ['00000000000000000000000000000000', '0000000000000001', '0013fff500120009'],
    ]) {
      expect(ideaEcb(hex(plaintext!), hex(vectorKey!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(ideaEcb(hex(ciphertext!), hex(vectorKey!), 'decrypt')).toEqual(hex(plaintext!))
    }
  })

  /** Expected values from `openssl enc -idea-ecb -provider legacy`, PKCS#7 padding by default. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as OpenSSL does', () => {
    for (const [text, ciphertext] of [
      ['', '46e751f52a939266'],
      ['ATTACK AT DAWN', '1e79aa86c8a1f33bd0182e2668bd0bf6'],
      ['zażółć gęślą jaźń 🙂', '6751873e9d414b876e8e32cf659cf6fd15e1a010194d5945729b541ebcae11cc'],
    ]) {
      expect(idea.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'idea',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(idea.decode(ciphertext!, { key }).text).toBe(text)
    }
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    const { text } = idea.encode('A'.repeat(16), { key })
    expect(text).toBe('14e5708749b11c0914e5708749b11c0946e751f52a939266')
    expect(text.slice(0, 16)).toBe(text.slice(16, 32))
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const spaced = '0001 0002 0003 0004 0005 0006 0007 0008'
    expect(idea.encode('ATTACK AT DAWN', { key: spaced }).options).toEqual({ key, mode: 'ecb' })
    expect(idea.decode('1E79AA86 C8A1F33B\nD0182E26 68BD0BF6', { key: spaced }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys that are not an IDEA key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => idea[operation]('')).toThrow(MissingOptionError)
      expect(() => idea[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        'YELLOW SUBMARINE',
        '00'.repeat(8),
        '00'.repeat(15),
        '00'.repeat(17),
        '00'.repeat(24),
        'g'.repeat(32),
        12,
      ]) {
        expect(() => idea[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => idea.decode('', { key })).toThrow(/whole 8-byte blocks/)
    expect(() => idea.decode('1e79aa86', { key })).toThrow(/got 8 hex digits/)
    expect(() => idea.decode('zz'.repeat(8), { key })).toThrow(/must be hex digits/)
    // OpenSSL: "bad decrypt" for this ciphertext with the key words reversed.
    expect(() =>
      idea.decode('1e79aa86c8a1f33bd0182e2668bd0bf6', { key: '00080007000600050004000300020001' }),
    ).toThrow(/PKCS#7/)
    // ff then seven bytes of 07: valid padding, invalid UTF-8.
    expect(() => idea.decode('41b2916c2383df0c', { key })).toThrow(/not UTF-8/)
    expect(() => idea.decode('41b2916c2383df0c', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('IDEA')).toBe(idea)
    expect(idea.info()).toMatchObject({
      name: 'idea',
      category: 'block',
      family: 'lai-massey',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('lucifer', () => {
  const lucifer = create('lucifer')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456789abcdeffedcba9876543210'

  /**
   * The triples Richard Outerbridge sent to Cryptologia in 2015 for Sorkin's FORTRAN, checked
   * against it compiled. They hold for the FORTRAN with Sorkin's correction from July 1984; the
   * listing as printed in January, and the ports made from it, give other ciphertext.
   */
  it("matches Outerbridge's triples for Sorkin's FORTRAN", () => {
    for (const [vectorKey, plaintext, ciphertext] of [
      [key, '00'.repeat(16), 'a201fc18d62c85ef5965a58295bbf609'],
      ['00'.repeat(16), key, '9d14fe4377aa87dd07cc8a14522c21ed'],
      [key, 'ff'.repeat(16), '97f1c104b0f120d194c07024f14815ed'],
      ['ff'.repeat(16), key, 'd442a34dd70e2b4156eb0f2a8aded1a7'],
      [key, key, 'cf46622fa98546bb9a5bc00239eb0c92'],
      ['fedcba98765432100123456789abcdef', key, '7faf65bfc5458fd2dc9cc2266012ef44'],
    ]) {
      expect(luciferEcb(hex(plaintext!), hex(vectorKey!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(luciferEcb(hex(ciphertext!), hex(vectorKey!), 'decrypt')).toEqual(hex(plaintext!))
    }
  })

  /** Expected values from Outerbridge's `lucifer.c` over the PKCS#7-padded UTF-8 bytes. */
  it('encodes UTF-8 text with PKCS#7 padding to hex', () => {
    for (const [text, ciphertext] of [
      ['', 'c08ecb7db68c5dadbe4ccb075fe83d4c'],
      ['ATTACK AT DAWN', '3511c560cf11d61ec299417602e29bc5'],
      ['zażółć gęślą jaźń 🙂', 'ed0d229bdfa37897f0cdf3bfb303081b3235779b614a2ee38617404564f88b20'],
    ]) {
      expect(lucifer.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'lucifer',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(lucifer.decode(ciphertext!, { key }).text).toBe(text)
    }
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    const { text } = lucifer.encode('A'.repeat(32), { key })
    expect(text).toBe(
      '82b100ca638d465d5b4f3ab021dd3aa082b100ca638d465d5b4f3ab021dd3aa0c08ecb7db68c5dadbe4ccb075fe83d4c',
    )
    expect(text.slice(0, 32)).toBe(text.slice(32, 64))
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const spaced = '01234567 89ABCDEF FEDCBA98 76543210'
    expect(lucifer.encode('ATTACK AT DAWN', { key: spaced }).options).toEqual({ key, mode: 'ecb' })
    expect(lucifer.decode('3511C560 CF11D61E\nC2994176 02E29BC5', { key: spaced }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys that are not a Lucifer key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => lucifer[operation]('')).toThrow(MissingOptionError)
      expect(() => lucifer[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        'YELLOW SUBMARINE',
        '00'.repeat(8),
        '00'.repeat(15),
        '00'.repeat(17),
        '00'.repeat(24),
        'g'.repeat(32),
        12,
      ]) {
        expect(() => lucifer[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => lucifer.decode('', { key })).toThrow(/whole 16-byte blocks/)
    expect(() => lucifer.decode('3511c560', { key })).toThrow(/got 8 hex digits/)
    expect(() => lucifer.decode('zz'.repeat(16), { key })).toThrow(/must be hex digits/)
    // The key halves swapped: the last byte comes out as f4, which is no padding.
    expect(() =>
      lucifer.decode('3511c560cf11d61ec299417602e29bc5', {
        key: 'fedcba98765432100123456789abcdef',
      }),
    ).toThrow(/PKCS#7/)
    // ff then fifteen bytes of 0f: valid padding, invalid UTF-8.
    expect(() => lucifer.decode('562ab2d01b6cefddf5cfbc141cf01c43', { key })).toThrow(/not UTF-8/)
    expect(() => lucifer.decode('562ab2d01b6cefddf5cfbc141cf01c43', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('Lucifer')).toBe(lucifer)
    expect(lucifer.info()).toMatchObject({
      name: 'lucifer',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('mars', () => {
  const mars = create('mars')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456789abcdeffedcba9876543210'

  /** IBM's known answers for the tweaked key schedule, as Crypto++ ships them in `mars.txt`. */
  it("matches IBM's known answer tests", () => {
    for (const [vectorKey, plaintext, ciphertext] of [
      ['80000000000000000000000000000000', '00'.repeat(16), 'b3e2ad5608ac1b6733a7cb4fdf8f9952'],
      ['00'.repeat(16), '00'.repeat(16), 'dcc07b8dfb0738d6e30a22dfcf27e886'],
      [
        'cb14a1776abbc1cdafe7243def2cea02',
        'f94512a9b42d034ec4792204d708a69b',
        '225da2cb64b73f79069f21a5e3cb8522',
      ],
      [
        '86edf4da31824cabef6a4637c40b0bab',
        '4df955ad5b398d66408d620a2b27e1a9',
        'a4b737340ae6d2cafd930ba97d86129f',
      ],
      ['00'.repeat(24), 'aa'.repeat(16), '97778747d60e425c2b4202599db856fb'],
      [
        'd158860838874d9500000000000000000000000000000000',
        '93a953a82c10411dd158860838874d95',
        '4fa0e5f64893131712f01408d233e9f7',
      ],
      [
        '791739a58b04581a93a953a82c10411dd158860838874d95',
        '6761c42d3e6142d2a84fbfadb383158f',
        'f706bc0fd97e28b6f1af4e17d8755fff',
      ],
      ['00'.repeat(32), '62e45b4cf3477f1dd65063729d9aba8f', '0f4b897ea014d21fbc20f1054a42f719'],
      [
        'fba167983e7aef22317ce28c02aae1a3e8e5cc3cedbea82a99dbc39ad65e7227',
        '1344aba4d3c44708a8a72116d4f49384',
        '458335d95ea42a9f4dccd41aecc2390d',
      ],
    ]) {
      expect(marsEcb(hex(plaintext!), hex(vectorKey!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(marsEcb(hex(ciphertext!), hex(vectorKey!), 'decrypt')).toEqual(hex(plaintext!))
    }
  })

  /**
   * IBM's `ecb_tbl.txt` feeds each ciphertext back as the next plaintext, 40 times per key size,
   * so that between them the chains touch all 512 S-box entries. The start and the end of each.
   */
  it("runs IBM's S-box chains to the published end", () => {
    for (const [size, start, end] of [
      [16, '00'.repeat(16), '9213b43d06d0ab7eccc5ca751c5dbaa8'],
      [24, 'aa'.repeat(16), '6e76bef9304b115efc1c9002fbb848a0'],
      [32, '62e45b4cf3477f1dd65063729d9aba8f', '9a1c14309e4b246c9e7b485a7f41d046'],
    ] as const) {
      const zero = Array.from<number>({ length: size }).fill(0)
      let block = hex(start)
      for (let i = 0; i < 40; i++) block = marsEcb(block, zero, 'encrypt')
      expect(block).toEqual(hex(end))
      for (let i = 0; i < 40; i++) block = marsEcb(block, zero, 'decrypt')
      expect(block).toEqual(hex(start))
    }
  })

  /**
   * Keys of every length from 4 to 14 words. Crypto++ takes only whole 64-bit multiples, so the
   * 160 and 416-bit ones come from CycloneCRYPTO's `mars.c`; the two agree on the others.
   */
  it('takes keys of 4 to 14 words', () => {
    for (const [extra, ciphertext] of [
      ['', 'de839bee915b8cd4fc0243d93c4cae4b'],
      ['00112233', '2e7460527593fc98fac625310235c7a5'],
      ['0011223344556677', '3e6b7607147f196fa49355f6c63e6b1a'],
      [key + '0011223344556677', 'eadfe3f050b1d8bf8046a4fbf1fef3aa'],
      [key + key + '00112233', 'f284db8fdb1ac4998f9c4dde4cf8a285'],
      [key + key + '0011223344556677', '22130c00f71d4b36b7b286e3204a0686'],
    ]) {
      expect(mars.encode('ATTACK AT DAWN', { key: key + extra }).text).toBe(ciphertext)
      expect(mars.decode(ciphertext!, { key: key + extra }).text).toBe('ATTACK AT DAWN')
    }
  })

  /** Expected values from Crypto++'s `ECB_Mode<MARS>` with PKCS padding over the UTF-8 bytes. */
  it('encodes UTF-8 text with PKCS#7 padding to hex', () => {
    for (const [text, ciphertext] of [
      ['', '8d521a3c918480273dd03bf203d294d4'],
      ['ATTACK AT DAWN', 'de839bee915b8cd4fc0243d93c4cae4b'],
      ['zażółć gęślą jaźń 🙂', 'e527b2a46a38399a078e0140098780e5bc7346d198f6ba5b6fc2f5f5fa1f9e7f'],
    ]) {
      expect(mars.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'mars',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(mars.decode(ciphertext!, { key }).text).toBe(text)
    }
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    expect(mars.encode('A'.repeat(32), { key }).text).toBe(
      '5ad31428f5ee9d935898dfa24bc60047'.repeat(2) + '8d521a3c918480273dd03bf203d294d4',
    )
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const spaced = '01234567 89ABCDEF FEDCBA98 76543210'
    expect(mars.encode('ATTACK AT DAWN', { key: spaced }).options).toEqual({ key, mode: 'ecb' })
    expect(mars.decode('DE839BEE 915B8CD4\nFC0243D9 3C4CAE4B', { key: spaced }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys that are not a MARS key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => mars[operation]('')).toThrow(MissingOptionError)
      expect(() => mars[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        'YELLOW SUBMARINE',
        '00'.repeat(12),
        '00'.repeat(15),
        '00'.repeat(17),
        '00'.repeat(18),
        '00'.repeat(60),
        'g'.repeat(32),
        12,
      ]) {
        expect(() => mars[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => mars.decode('', { key })).toThrow(/whole 16-byte blocks/)
    expect(() => mars.decode('de839bee', { key })).toThrow(/got 8 hex digits/)
    expect(() => mars.decode('zz'.repeat(16), { key })).toThrow(/must be hex digits/)
    // The key halves swapped: the last byte comes out as 9d, which is no padding.
    expect(() =>
      mars.decode('de839bee915b8cd4fc0243d93c4cae4b', {
        key: 'fedcba98765432100123456789abcdef',
      }),
    ).toThrow(/PKCS#7/)
    // ff then fifteen bytes of 0f: valid padding, invalid UTF-8.
    expect(() => mars.decode('db70131499cdf5815ead0a98de1b7aa1', { key })).toThrow(/not UTF-8/)
    expect(() => mars.decode('db70131499cdf5815ead0a98de1b7aa1', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('MARS')).toBe(mars)
    expect(mars.info()).toMatchObject({
      name: 'mars',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('serpent', () => {
  const serpent = create('serpent')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456789abcdeffedcba9876543210'

  /** From Botan's `serpent.vec`, which libgcrypt's Serpent agrees with in the same byte order. */
  it("matches Botan's test vectors", () => {
    for (const [vectorKey, plaintext, ciphertext] of [
      ['80' + '00'.repeat(15), '00'.repeat(16), '264e5481eff42a4606abda06c0bfda3d'],
      ['00'.repeat(15) + '01', '00'.repeat(16), 'f668c7091f81b2827da77dd419b708e1'],
      ['00'.repeat(16), '00'.repeat(15) + '80', '4ae9a20b2b14a10290cbb820b7ffb510'],
      ['00'.repeat(16), '00'.repeat(15) + '40', '2c6ee9f8f64b5b1b5587cdf17e84a791'],
      ['80' + '00'.repeat(23), '00'.repeat(16), '9e274ead9b737bb21efcfca548602689'],
      [
        '00'.repeat(15) + '01' + '00'.repeat(8),
        '00'.repeat(16),
        'deab7388a6f1c61d41e25a0d88f062c4',
      ],
      ['00'.repeat(24), 'ac335553d40961a3387bd2d2bfa6edb3', '167d74c63ceb050b4f14b1ce23da39bd'],
      ['80' + '00'.repeat(31), '00'.repeat(16), 'a223aa1288463c0e2be38ebd825616c0'],
      ['00'.repeat(32), '2f6aa890cea3e3a7ed98d9f29073d78e', 'a3e17e2df4ea6f41b2017e37023f202a'],
    ]) {
      expect(serpentEcb(hex(plaintext!), hex(vectorKey!), 'encrypt')).toEqual(hex(ciphertext!))
      expect(serpentEcb(hex(ciphertext!), hex(vectorKey!), 'decrypt')).toEqual(hex(plaintext!))
    }
  })

  /**
   * The 960 single-bit vectors in the same file: a key with one bit set and a zero block, for
   * every bit of every key length, then a zero key and a block with one bit set. Bit 0 is the top
   * bit of the first byte. The digests cover the file's ciphertexts in that order, one per line.
   */
  it("runs every single-bit vector in Botan's file", () => {
    const toHex = (bytes: readonly number[]) =>
      bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
    const oneBit = (length: number, bit: number) => {
      const bytes = Array.from<number>({ length }).fill(0)
      bytes[bit >>> 3] = 0x80 >>> (bit & 7)
      return bytes
    }
    const zero = (length: number) => Array.from<number>({ length }).fill(0)
    for (const [size, keyDigest, textDigest] of [
      [
        16,
        '2aa48316525f1e3046a8c500752fe1111ea37b72dc66b2dda634a59914c38f18',
        '6e230fed8b499bfec64d3990fa6626d284494b28c0c4002013209678834dd00a',
      ],
      [
        24,
        '0efeb6567abadbacba6d2f203c000bb7134fbe3c6ca48ca7ace5bcdbbe714bf9',
        'ab6dbbe45aad02ec861c2a98ccb3d90df25047177770c9bdc0919dd16c02e093',
      ],
      [
        32,
        '5a1b9a1a401d80fafebdeec47bde39ad1fcacfa1efb714db88ec9249ba343797',
        '78db106f28041192382e38b84bd990f0e0044fe5b5f7c92714f7b37ae007c5b5',
      ],
    ] as const) {
      const keyBits = Array.from({ length: 8 * size }, (_, bit) =>
        toHex(serpentEcb(zero(16), oneBit(size, bit), 'encrypt')),
      )
      const textBits = Array.from({ length: 128 }, (_, bit) =>
        toHex(serpentEcb(oneBit(16, bit), zero(size), 'encrypt')),
      )
      expect(createHash('sha256').update(keyBits.join('\n')).digest('hex')).toBe(keyDigest)
      expect(createHash('sha256').update(textBits.join('\n')).digest('hex')).toBe(textDigest)
    }
  })

  /** Expected values from libgcrypt's `GCRY_CIPHER_SERPENT` in ECB, with the key lengths below. */
  it('takes 128, 192 and 256-bit keys', () => {
    for (const [extra, ciphertext] of [
      ['', '33bd9b4c6955d0e186249aeca8b19dbf'],
      ['0011223344556677', '561c27b6657166809536fd2231afc13c'],
      [key, '778838efe5e816b5ebb27e88af2a1c8c'],
    ]) {
      expect(serpent.encode('ATTACK AT DAWN', { key: key + extra }).text).toBe(ciphertext)
      expect(serpent.decode(ciphertext!, { key: key + extra }).text).toBe('ATTACK AT DAWN')
    }
  })

  /** Expected values from libgcrypt's Serpent in ECB over the UTF-8 bytes with PKCS#7 padding. */
  it('encodes UTF-8 text with PKCS#7 padding to hex', () => {
    for (const [text, ciphertext] of [
      ['', '70f039bebc4127e475704e5e8a1826a7'],
      ['ATTACK AT DAWN', '33bd9b4c6955d0e186249aeca8b19dbf'],
      ['zażółć gęślą jaźń 🙂', 'a1d440ca3cdf1f5fbaa146044ce4588c2f8f62ff12ce9b76d01708922ef9f713'],
    ]) {
      expect(serpent.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'serpent',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(serpent.decode(ciphertext!, { key }).text).toBe(text)
    }
  })

  it('gives equal ciphertext blocks for equal plaintext blocks', () => {
    expect(serpent.encode('A'.repeat(32), { key }).text).toBe(
      '9f4cec54f67f8b775b9dbf076814dd75'.repeat(2) + '70f039bebc4127e475704e5e8a1826a7',
    )
  })

  it('reads hex keys and ciphertext in any case and with spaces', () => {
    const spaced = '01234567 89ABCDEF FEDCBA98 76543210'
    expect(serpent.encode('ATTACK AT DAWN', { key: spaced }).options).toEqual({ key, mode: 'ecb' })
    expect(serpent.decode('33BD9B4C 6955D0E1\n86249AEC A8B19DBF', { key: spaced }).text).toBe(
      'ATTACK AT DAWN',
    )
  })

  it('rejects keys that are not a Serpent key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => serpent[operation]('')).toThrow(MissingOptionError)
      expect(() => serpent[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        'YELLOW SUBMARINE',
        '00'.repeat(8),
        '00'.repeat(15),
        '00'.repeat(17),
        '00'.repeat(20),
        '00'.repeat(33),
        'g'.repeat(32),
        12,
      ]) {
        expect(() => serpent[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => serpent.decode('', { key })).toThrow(/whole 16-byte blocks/)
    expect(() => serpent.decode('33bd9b4c', { key })).toThrow(/got 8 hex digits/)
    expect(() => serpent.decode('zz'.repeat(16), { key })).toThrow(/must be hex digits/)
    // The key halves swapped: the last byte comes out as 60, which is no padding.
    expect(() =>
      serpent.decode('33bd9b4c6955d0e186249aeca8b19dbf', {
        key: 'fedcba98765432100123456789abcdef',
      }),
    ).toThrow(/PKCS#7/)
    // ff then fifteen bytes of 0f: valid padding, invalid UTF-8.
    expect(() => serpent.decode('4a6373183bb8986d53e4e430ba69a157', { key })).toThrow(/not UTF-8/)
    expect(() => serpent.decode('4a6373183bb8986d53e4e430ba69a157', { key })).toThrow(CipherError)
  })

  it('reports the block category', () => {
    expect(resolveCipher('Serpent')).toBe(serpent)
    expect(serpent.info()).toMatchObject({
      name: 'serpent',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('cast5', () => {
  const cast5 = create('cast5')
  const hex = (value: string) =>
    Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0123456712345678234567893456789a'

  /** RFC 2144 B.1. A key of 80 bits or less runs 12 rounds, not 16. */
  it('matches the RFC 2144 vectors for 128, 80 and 40-bit keys', () => {
    for (const [vectorKey, ciphertext] of [
      [key, '238b4fe5847e44b2'],
      ['01234567123456782345', 'eb6a711a2c02271b'],
      ['0123456712', '7ac816d16e9b302e'],
    ]) {
      expect(cast5Ecb(hex('0123456789abcdef'), hex(vectorKey!), 'encrypt')).toEqual(
        hex(ciphertext!),
      )
      expect(cast5Ecb(hex(ciphertext!), hex(vectorKey!), 'decrypt')).toEqual(
        hex('0123456789abcdef'),
      )
    }
  })

  /** Expected values from `openssl enc -cast5-ecb -provider legacy`, PKCS#7 padding by default. */
  it('encodes UTF-8 text with PKCS#7 padding to hex, as OpenSSL does', () => {
    for (const [text, ciphertext] of [
      ['', 'c5556e216407fd3b'],
      ['ATTACK AT DAWN', '585e13962a59ed5274e0ab1bdcde47a3'],
      ['zażółć gęślą jaźń 🙂', 'f601eea6923ed22be927bec46ec6d42d8212113ae87ef89c003c8607d9961c83'],
    ]) {
      expect(cast5.encode(text!, { key })).toEqual({
        text: ciphertext,
        cipher: 'cast5',
        operation: 'encode',
        options: { key, mode: 'ecb' },
      })
      expect(cast5.decode(ciphertext!, { key }).text).toBe(text)
    }
  })

  it('rejects keys that are not a CAST5 key in hex', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => cast5[operation]('')).toThrow(MissingOptionError)
      for (const bad of ['00'.repeat(4), '00'.repeat(17), '0'.repeat(11), 'g'.repeat(32), 12]) {
        expect(() => cast5[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('reports the block category', () => {
    expect(resolveCipher('CAST5')).toBe(cast5)
    expect(cast5.info()).toMatchObject({
      name: 'cast5',
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('openpgp', () => {
  const pgp = create('openpgp')

  /**
   * Written by GnuPG 2.4.9 with the flags each name says, the issue vector from #165.
   */
  const gpg = {
    issue: `-----BEGIN PGP MESSAGE-----

jA0ECQMKHwVT8OzL5gn90lIBzGgrwInQTM+5oFODSD8QMJaarJsJ7kftcv4jWWpP
2I2U9qLHZ83SeQ1Ol/i2LutftOLxNYgigrj7idS03A5V1Psl+79RGbXLRDgSQKr7
Co2B
=XQvs
-----END PGP MESSAGE-----`,
    cast5Zlib: `-----BEGIN PGP MESSAGE-----

jA0EAwMC4qY1+40ldSxg0k8B6MsWcfpm/Rv4g8ddH1R1fxUWjLu+EbrSe0hiFCGm
u6Hnf/bnFlXmlo3u2rybkylTGXxhD53GCbLq5aTp52VHZZsCEzJ+rKROcdW046+P
=YQef
-----END PGP MESSAGE-----`,
    ideaSalted: `-----BEGIN PGP MESSAGE-----

jAwEAQEBxXCXebWeQh/STQFbcXYhzd08/AYhFS1w62bEcK+cik7ZgEHxdr28bHZm
+31rzpHnV2ajAMoAW+kwElCAeHsS2dzEQC5nSNJS2oO0DhB/Mi3FH0hZOsPp
=sw4o
-----END PGP MESSAGE-----`,
    tripleDesSimple: `-----BEGIN PGP MESSAGE-----

jAQEAgAC0kYBtqJdkfIfH9wdTBQnN4ATkDBssgyE9VjnVIaVTka4SVGCRvQfM1t8
UfP2XuWGaU5jjJOPgXMFeXssSAYuCBnMxOFT+qjq
=olVP
-----END PGP MESSAGE-----`,
    blowfishZip: `-----BEGIN PGP MESSAGE-----

jA0EBAMDXsaXBQCRMbZg0ksBy4mR5PFZg3wdfcWW7qQGTBaKHGnaDAx+026Vng7B
UOCVhg5KievnN0dr5BxT3G50Muk3czHYzCjepPs/FwXJdurULMmJzumGLLk=
=EoiY
-----END PGP MESSAGE-----`,
    aes128: `-----BEGIN PGP MESSAGE-----

jA0EBwMI7IUr7YkBXz5g0lABNvbQ5ONkbrhBbcpNsBSocgPRGZ2GT3vie07awLJ2
6Mg/F1ZV5MKiufYA32q9mCR+ZU4723SYXBwm1dlN9vsIB2Ct9umbCtOHm2KuG+xX
Ww==
=9Xii
-----END PGP MESSAGE-----`,
    aes192Zip: `-----BEGIN PGP MESSAGE-----

jA0ECAMJ0PWef/NdSMdg0lQBP58aJlXVF6zaD1x6KmyAAQiTO2qjwwEEfmaZbNsj
YSPxkVeA1qBRRBsaI5ELvHsOv3qm11idBMARmOHzAdRWlc+y/oj8rwPokcIOpphJ
w/Xk1Tk=
=Ubpv
-----END PGP MESSAGE-----`,
    textMode: `-----BEGIN PGP MESSAGE-----

jA0ECQMKgAVxurx260xg0k4Bx5jYinrsEPBUqvYAXSv5DXugGbAFMzdDtys5xiys
6MncWaXVKJQshKJxsyynwBoiy0yGXmjhCIKDDtIQTH60f1wuMGU/FBjUAMnNZv0=
=sPhU
-----END PGP MESSAGE-----`,
    utf8Zlib: `-----BEGIN PGP MESSAGE-----

jA0ECQMKrzP8PNNqDL5g0mABc1JJfoYOSGYdmqE49+X+oG+KcI/moQjKzR8+Kz+k
zNrpZ2ora6MLWf4YZQgDnHRg46AtzGnNUoDT/2ZK4EZfpX6IRYvbyMYKJBsfentR
OuLclj5b53PzOdn9+7rwdYw=
=z7s+
-----END PGP MESSAGE-----`,
    sessionKey: `-----BEGIN PGP MESSAGE-----

hQEMA8zgF6iEMmDJAQf/bl9MCfuc9F8eUl6raqTehzzjfNlVhiS7VAgIA6Pjvb1o
JCdPEA89MXui/X7jSoCrXf4j48qC8SSFUqw7TY9oEJIjXv+qAW/KhzORKrn6R85+
0OkWgwbyM8CirY5zxOQkABJM+rjyz6KsT+qpMyrd97jkFXT6JeqW1E19eADDP8Cs
537IN/OEitJk/JyrlKzQui58NhPCM+ZiUZm8bqz4EXB77AS9xsOVNqmLsA/zRea2
TOBAyNnNwNW912Lx5++CWSL9mm3RwSylhAIQuenlylzIftHSVruzQtgA8RgOhQiR
AIXhlFuRzm4ATg6vYTT+C6kMJAgmB5qTkZbg0RjqUIwuBAkDCr/E2pJD7OQ3YDXZ
aN8xaomc9C9sAeOPdvkvwLvjd2faxoov9qlFd1PKI9JGATeAUhKviAe+H9WNGkzg
5Gex0kWX0Z+0zuHGdpe4F26pglxdFsxleyoncgM9h7+vI8eM10P0xjr4u54jqMFx
SlStooxAdg==
=/RlP
-----END PGP MESSAGE-----`,
    partial: `-----BEGIN PGP MESSAGE-----

jA0EAwMKEsCo5aIZMg9g0sEvAahK9rUlOJWgv5Ev4S96nX4l749p9oL1bkoDLDSG
YkeBtJVg9rKX3ngup9XodFLlOMUoRCiVjObJHoXmdUbq9zWeRBG+F2Gdt56STcv6
SZrIp2g6RC7l4fWcZtcUu9Z+NlMDYvrk3v81KcxBBRrhmExKQBo4yaKMp75E2fY/
SxKBmKfkQvXJ2SB+Fx/NpIOj6oA3zpfp4xX6Vd7UmtKCcwtM4yo6UYJ1MluixNgv
jHzfuWLh7/OtFWucbsPG9XT0/aiYseJwa9ebxorNI8dIIKPriKw8/dfpYhYEf+ZG
bbS/4hYDPGYKckd7bwh0yiKkzVTjF7Us4DI/gF+EYvirVn+co5On/7VrYpwW4WEV
jOgFXTw4nuKVncYZmQmhhQityI+RPEzaWfBy3Uksj8QucAOj4E5/HfN3vOFugWqr
y2Ce8rGK2DHK4V3f2BqEXJxQpdV/+fqKEvrN4fsqGCt05kCBwIDwuso2uQIfTgu+
J6MnZYn1cfnKNam9pOCadUhparQhsRq4u4SRzFI0XtfYtlAxNAI5p7bo3Rq/k+El
RSfn541Lyod/yqQioC1E0mOOFbJVuTIJaIU8rtZ+axQCHdJ3T5ZTEu+M7cq7/D39
H8Iq5CX9AkU+LH5nwrVhJ4zk/rtgOKjAxBP7GS+VIv6V
=PQv+
-----END PGP MESSAGE-----`,
    partialData: `-----BEGIN PGP MESSAGE-----

jA0ECQMKbLm/KDTqtO1g0uoBV6+EobE9w5yH7sxQHpGO1nF0ISaWKFtI7muY+jCi
duo1TZesZuUbyVDzWLurOt6WWPbwJGvnBo2/caGu3/Jvq51ztPdCb1m9oE0ISzGr
p9KU5wWsntMfGcmSh8mLATdScXQDHNnMCsthJqO186yxj5Oi5cXBCkf4pCXGVfHN
/iwNuoNwzBlZY0/ISFC1GtbgQcqLUtkmH7KNg60i7+QUQwNILsYc8WaUu7xnPFQZ
QMgHqkc8B49jHq8mwimgOWImwJmvNYaCiJeMlW7PnkLLWUOzTTnFenHwXly74bjQ
nmt0gKE6IVna36oY7G2MdZczOqCTWEU9RDTuR52SA3LKlHnrZSjKyLVS65R6OT2l
+PhRGRvhNNg2iCoXPPokYz0+uEKMytgNF71nhiTw9/crQarWStZv7mwtlt5ga7cu
prUsnnxXNVQsykw8/20VsXZUAfz2QN7p0hacoAg4nuqjF0zTlvura/S1xuyIS8C1
ED8uEaTk2uRUX1ZZIznvPsJ1IsOWmoOVyWVuBS3CoG8OdrItv3LuDNKbAqat1aX3
lAABINmlACWYrEVJ/KXOia7zvxoSlcPyj2pgbjUo5P7ErVb9GdbQPHAYE/iXWlVJ
7VA5y1EFOrBulhH+pp+yCQ02iEF6xuYPqc53mb4/nn5LIscKR3fc/+apDECi/3sm
cTDKz49/8FXf3G9MfLQrUjcn00Pm7ICwjavljaoZNQkQ/zvglNolJMzmlqgEsGCm
KBuD95br+rIqH/PsfVblVea3qtipQmrFX1jCLUMqle4jzAtyb9k4Mxy+2JoFbZM1
Mj9sc3SrdCelrqC1TBMDhPsFoZRTCnwFoXEP6D2p5VOBbhk7VeVajpyWQRomwWKm
U0msaGVqHyPPullkl/SbudvfhyirNFDWuiQu6W3obiypd7la/OhytaVfmc75Up1R
GLbBnzIhgxoM4ohVY6G/tOxl6Tlf7QYWUtmZP6wCGSIIAaVtZ2CDzPw+E46fVvap
j2XkRzHmmRYKoleHXhu7X/c3vbxfS17UkY0BI3xsYzsgyGEB/rrFndNzbnD0vA6D
qRjWA46WABLNoHFHn3GEm25fCFiUMGLOUe8RMB+eo9fZRi7Wg+HKjdsN2G4sO8AK
Fuash0AxzZLg04m9GfPf2f6KVBaawdnsZ5k7qznnUGVoEPRrBJgGSiA56DLVoSeK
82Mxlh1YZYj0+io6igQh9LO/5Ce8Bs7wOpBUmr5cdLtfIbEiBe/gBJhpogCYYRx3
mTfdjMp/Pi717AWSC/KxXgMUXwi0uso5QLTgJe0xCNSfpZnQrtIjN20lQL9tTM+J
1/WU6xWKnkm5B8MuKukDY3da4l2dRdBrgFmtr5FExgJn6s8EvhLdNBa/Dbrw2LLc
jlklucJg+aR8LgNlEGssOOrZv5MD9lgpk9fZC+6F0VpGoPFT7spTpMy3IMk2kwp2
V3kVGEgWuPHMtOPHiIgmBSyx5mHnbx/p27tfs77mRGheMGZTXQ7MiNsMDZpB1DZc
8gZDka/NDfXwgj6NYaW3oAoCHDnVDBYhzas63xqLYuSg0u8/sgrDO0Tm/qIDAIIQ
PyqBSoK+ZVpjqR0K68NsKf4Ci4Kp9T57f6a0ofCMIriJmGy3Y8aQX8TOk6A5D3fn
F1wWCfCHwLeXLhzL2sJph8L6ot/IER6IL/1dHO6zY9XCj3SqThf++NSbQDLCbMKn
Qv/zVbIeHL0BvstSF7QfyT7HJlRZGb9RbYaNXhuS5IT44KwHmc1BKF30iaKqt3N2
UTkwLPvf0Q6ar+bbojWr3fWMOGBeTJ+huMrvpbaHECoOUMnDy+MbjVuRaz0EXqXY
1HP5s50LRAZq1q9XGu0Wws6IHkLAtmtPe1Zg4B6PBUgFlXyX/u3pe3GRz6wQlepg
gmntXkesF20coHzM1hW2YMk268aSGxpdLwaDbrluJbaZIq3ZLrZVB2s3DjcWGPhg
zF7oHxV2u1JWILY93v3+f5Cd2SdKlE/NvTEDPZiNIskAjLb789IsVYpEXtAAyc6U
f1wELnKjhAyP/qMYs0pZ8vPasprF3YRLJ4aQw0m5KLLhLrXAz3tNyMgmAGinj7rQ
XEdV8yBsAI2AaExgGchX6GvNwRjyLkCI3pnEtx/wrPeaac40LWl8+9kcafBspTd0
pfXHKEZnR5My6RMKPN6p85EuX5drxL+T1uzNRH8UHuSqS2B+Fyo3Wmgl/2kVwpBB
65XTulWEldl8uaFOzcfN/gvYnmpt/Dic/05VB4beGvq9qdf+lZcuOWk5KrfwkrTV
IPIRX9jECqMsD6+cer2v82VlZMPSyYBHfol+laWtcRSvJbGAPh+XcAQYhDx4WGhm
ZxaYTp2/JMH8Jq1qckbwPG0FiUmEZ0FrOIkrQxiGR8ZrOEUdzCCtRHF8H6WK67O6
3PXBsdpNcllpdyX+jVX4raVbk4B1cYFx7OplwcJvlWJHiIeCmN5z9Uin5wEwwlHw
CIesqS36qVYtls0JXOUtjWbDg9h6KVr711fKek5zMx4AJzn3f+4TPJ5zhxIoWjtn
uuo8CzzvELeRpraBF3IETTytwb70wA/5kLdvvcP9pxeRXMpelIcJ6DjqNQnP6MEu
W9oi8ZpS/vrvTwgAHCL6hTGlKQc98rMKfcboywOfRSOjuDoK5eMg0paRs2Ij6NOV
0Ug9P9cxcIYe8dXgYnI1tqjmditeqKN9pv4/Dnr8i6a0H30k4souBugpfi11sPrW
9J4fGr+CtmMLrpxQ2qH3LrQwGpD4z2oKS2vcwRImkI3mfg==
=QRMR
-----END PGP MESSAGE-----`,
    binary: `-----BEGIN PGP MESSAGE-----

jA0EBwMK9yI4OBtPZ/Bg0j0BE+JQr1aiwsmSIrex0tFWRGCstcJRM07oZSGKWg2m
0SQawn2b/Ye9WgRrapN4YIiNXfZx15EL841nz7sq
=c9RO
-----END PGP MESSAGE-----`,
    twofish: `-----BEGIN PGP MESSAGE-----

jA0ECgMK1Zx51qF8zxZg0koBv4wf0b2oTKJyV2T39OzUYL1QxDYva29FYTVcH6MK
5y6oQBFwk4xvGVMo1D8MPQvjG1uc70ApDqclLv2PXk0TVm8yerTLs9e4gw==
=B1wH
-----END PGP MESSAGE-----`,
    bzip2: `-----BEGIN PGP MESSAGE-----

jA0ECQMKBxI/90NiHt1g0oIB49nLLfFHQHOoS5jcfXvJC7RTR77N+binPznpIq1O
K5m/wRlQV4AnCHIRLXpGyNp4pfVfvohKLIrgXWnbG2q1R9RphObOJIoiUTpJFhf3
794vDJMGZvJ3ghUHt2gRoJvdwYF+fUXkcYCpB6eoP1Cuu9xyUU9JOmDLDJhCUZTp
+twz
=4l/p
-----END PGP MESSAGE-----`,
    sha224: `-----BEGIN PGP MESSAGE-----

jA0ECQMLhkHdltrzA1Jg0lABE5694CQqHC2HviNu1rmhc8Vz+akznMwhmOqR51XO
fps6M15aADZQZZpSUkrki4cYjI1Tidp722PI/RliYWBDW5+tfkE1pazWCmvjMM18
eQ==
=Dacz
-----END PGP MESSAGE-----`,
    ocb: `-----BEGIN PGP MESSAGE-----

jE0FCQIDCufe5nWHXjJqYN4FCzEw5mXQjqmslPI9dMJhDlQ0SUmj1ofcS1cs+yDg
aqBQcXu3hPABz8vADUVyqb4ZglAyhP/MzdUnv9Mc+dRQAQkCEDJiLoxGYflpSb8P
DpWGMQefmO8vj0bGWQoL7jRsrt3J7KA/rNvGBeW9tXjcY/0FzXXzjWSrJkpBnqd+
6VvdbUYmF1l4yF2Z+UjlL5k=
=cflf
-----END PGP MESSAGE-----`,
    /** `--force-ocb --chunk-size 6 --compress-algo none`: six fox lines in 64-byte chunks. */
    ocbChunks: `-----BEGIN PGP MESSAGE-----

jE0FCQIDCiQYQ4VZQU8Y/wNXr6L+7vpW3fqxiawCt26fDbOwW4BpKfeDX7J9Zcf6
RyeGjWuw0iPM60fnxy6lbz6KZbHmDdj8883p3y5HPdTBEQEJAgCmjTwlHWszWVtQ
k+SSpKJEwApREMg/xwVRCyLXc+Bn/uxYA4kAqR96VeMa+8W7ilPq6QREKdQjSbjR
Uj07/aV8262DZsycB9R/h6qtq+ed+rdHjx/dTW3YIYoD/2C3yZD/gTcHhAo0IlQ9
mK3yh6tjiAfJ3lQQY1qMfB1/PHf0C69/fj9CGtaHvSB2z4JBpLgdKkhCwOziMlmh
sY8qrNPGklWwpMqiM4yLUQjZnY1r3/8Od6k4nfpXMRHWnX1+x+EQqpc6mtzYOMNP
oOTJ2e7F0Y5m2UdonVu7CFsg2M3Fn9yN8IB+AoPiJmy3SWD/tUOTFqa5yJDRYjWC
gNTYiL3ZhBEo3BfeEvRhN0ud2z4x6GeiOlmqy1Xo8QknkGxRAgaxsdDrSZQWDhnz
qNou086QwP+7rWhNYEmIUiN9vBZc9Q1H3r/6itEZ9pRYiEBqQsUOfWx/dyNMdOoZ
1v11fmcCbM/yi3WpTulRFi/RaGj9HkG707PDE5CGIP3HTAzDyLhZhiULTY0EvF7C
kTTiqfHWpIwxIoOFa3qpi9Z8e6xkcLAgtBxXuZTQ2/p56sJ8fpdOj4gbAu3nXmRT
oye14Xcl75FJLhD76JLElJljbw==
=EZWQ
-----END PGP MESSAGE-----`,
    /** The same lines from stdin, AES-128 and ZIP, 64-byte chunks again. */
    ocbAes128Zip: `-----BEGIN PGP MESSAGE-----

jD0FBwIDCjZBbsuHpuhZ/y2cvPIdnlb4DuiiaO27NJMnanJ2gtoh+hD74rnMYAhJ
9gXfRoloCia5TguIg7fY1JUBBwIAPwTHtBeAgUGVV2IRBAu0Cbt95Zz3UN9xb3i/
fx8c/ek8kJafmvm49s9bgzQsSLTyHaDUC69jtUZz+z2MtZHu1FZ6hh3g0RcaS+85
2Buuy1/dugx0BJltnV86IN+abIcdbMwOSETtswgU0DXCNI6tl/zCoos0Te/hM8IU
VLqJvwKSuIcIRvVAEMS18eOmEKZhlA==
=QkkM
-----END PGP MESSAGE-----`,
    /** `--force-ocb -c -e` to a Curve25519 key: a public key packet, then the passphrase one. */
    ocbToKey: `-----BEGIN PGP MESSAGE-----

hF4DbeZ4SwRspV0SAQdAZob9vMOv7Q3xk7A8mhQq+wAPOd03vhAqdpnoo0RCATYw
m74AZ0KCq/II5tlKku4m+JhHg+ojXYbtKZhr5V+CjQDGKO+JTDcy+GwelqSFWKy+
jE0FCQIDCuFlX8yjE6wq/6DUVuFg1aWOnczWFVzSNUvzyatNwSee8UpZgOw1svFR
U8pGwhde8tSNRuoNVgwRTLMjs5wG+UkwX71GkANJn9RaAQkCENzypJdirBGc8Vy9
9BBOq1jI319g0cXSXXTQsQsRsvMX4m+pF/5mDHD7rqXDWxb5sV5UMjRLXyjkkgxi
j4nX7IyZKs4n2Uzc1l21kx4xzifMlNqhMRk0
=4qeb
-----END PGP MESSAGE-----`,
    /** 5 MiB of zero bytes, BZip2 inside a 137-byte encrypted packet. */
    bomb: `-----BEGIN PGP MESSAGE-----

jA0ECQMKqCm05/WpTxNg0okBD27EO2IbWIu+X6VcHvWD5yPrUdZRhoyHzg3L/n/4
QbQrrEvbv473QfGop99tCozNsgS7jeJvCf4BPB5VqERdW3RcUQFT/3/58rQKYD6t
u2iMpoKp3snzPvV2Iq7i3WM2Wwd+sXHhnu9Z87CU1J1F3vdCpdhM6+uX3X6m8prO
6CxR1pknBWeSNA==
=ajd5
-----END PGP MESSAGE-----`,
  }

  /** Written by OpenPGP.js 6.3.2 with its S2K hash forced to SHA-3, which GnuPG can't write. */
  const openpgpJs = {
    sha3_256: `-----BEGIN PGP MESSAGE-----

wy4ECQMMwmBZuYq4BfVgSzh4ODZtDiryHDYMY6w8YA5Gi1SgVoh7Nc+gu4Yd
Ln9D0j8B3mnUEdl2r/bMLxwNJlrYkG0LKsQqD1ZghZVj/FtE/KTZiiJn98Ko
Q05ZhhGm4vs0Oamqhizr1HyJ+iV9yPg=
=qFwG
-----END PGP MESSAGE-----`,
    sha3_512: `-----BEGIN PGP MESSAGE-----

wy4ECQMOhZX3NepkNg5gUf1aYUYMl8LyFXtcZH8gTSS7Cc0LJOawqmSqlyRF
n2JR0j8BydJYDlywmnKH2QVzyvTnwGM1KJgAhL4Re6FXGGebG+UwPZdDdP3p
DJv6R/VYo5IrSwj9yp/aTWzKte5AN3Y=
=RU5O
-----END PGP MESSAGE-----`,
  }

  /**
   * The published samples, all `Hello, world!` under `password`: SKESK v6 and SEIPD v2 from
   * RFC 9580 A.9 to A.11, and SKESK v5 with tag 20 from rfc4880bis-10 A.3 and LibrePGP A.3.
   */
  const samples = {
    eax: `-----BEGIN PGP MESSAGE-----

w0AGHgcBCwMIpa5XnR/F2Cv/aSJPkZmTs1Bvo7WaanPP+MXvxfQcV/tU4cImgV14
KPX5LEVOtl6+AKtZhsaObnxV0mkCBwEGn/kOOzIZZPOkKRPI3MZhkyUBUifvt+rq
pJ8EwuZ0F11KPSJu1q/LnKmsEiwUcOEcY9TAqyQcapOK1Iv5mlqZuQu6gyXeYQR1
QCWKt5Wala0FHdqW6xVDHf719eIlXKeCYVRuM5o=
-----END PGP MESSAGE-----`,
    ocb: `-----BEGIN PGP MESSAGE-----

wz8GHQcCCwMIVqKY0vXjZFP/z8xcEWZO2520JZDX3EawckG2EsOBLP/76gDyNHsl
ZBEj+IeuYNT9YU4IN9gZ02zSaQIHAgYgpmH3MfyaMDK1YjMmAn46XY21dI6+/wsM
WRDQns3WQf+f04VidYA1vEl1TOG/P/+n2tCjuBBPUTPPQqQQCoPu9MobSAGohGv0
K82nyM6dZeIS8wHLzZj9yt5pSod61CRzI/boVw==
-----END PGP MESSAGE-----`,
    gcm: `-----BEGIN PGP MESSAGE-----

wzwGGgcDCwMI6dOXhbIHAAj/tC58SD70iERXyzcmubPbn/d25fTZpAlS4kRymIUa
v/91Jt8t1VRBdXmneZ/SaQIHAwb8uUSQvLmLvcnRBsYJAmaUD3LontwhtVlrFXax
Ae0Pn/xvxtZbv9JNzQeQlm5tHoWjAFN4TLHYtqBpnvEhVaeyrWJYUxtXZR/Xd3kS
+pXjXZtAIW9ppMJI2yj/QzHxYykHOZ5v+Q==
-----END PGP MESSAGE-----`,
    eaxV5:
      'c33e05070103' +
      '08cd5a9f70fbe0bc6590bc669e34e500dcaedc5b32aa2dab02359dee19d07c3446c4312a34ae1967a2fb' +
      '7e928ea5b4fa8012bd456d1738c63c36d44a010701' +
      '0eb732379f73c4928de25facfe6517ec105dc11a81dc0cb8a2f6f3d90016384a56fc821ae11ae8dbcb4986' +
      '2655dea88d06a81486801b0ff387bd2eab013de1259586906eab2476',
    ocbV5:
      'c33d05070203089f0b7da3e5ea64779099e326e5400a90936cefb4e8eba08c6773716d1f2714540a38fcac' +
      '529949dac529d3de31e15b4aeb729e330033dbedd449010702' +
      '0e5ed2bc1e470abe8f1d644c7a6c8a567b0f7701196611a154ba9c2574cd056284a8ef68035c623d93cc70' +
      '8a43211bb6eaf2b27f7c18d571bcd83b20add3a08b73af15b9a098',
  }

  const body = (armor: string) =>
    armor
      .split('\n')
      .filter((line) => /^[A-Za-z0-9+/]+={0,2}$/.test(line))
      .join('')
  const bytesOf = (armor: string) => [...Buffer.from(body(armor), 'base64')]

  it('opens the GnuPG message from the issue', () => {
    expect(pgp.decode(gpg.issue, { key: 'causality' })).toEqual({
      text: 'follow the white rabbit\n',
      cipher: 'openpgp',
      operation: 'decode',
      options: {
        key: 'causality',
        algorithm: 'aes256',
        digest: 'sha512',
        count: 60_817_408,
        salt: '1f0553f0eccbe609',
        iv: '48c74c4430cdbe1ee97f78a7470dd098',
        compression: 'zip',
        filename: 'm.txt',
      },
    })
  })

  it('opens every algorithm, S2K and compression GnuPG writes that it runs', () => {
    for (const [armor, options] of [
      [gpg.cast5Zlib, { algorithm: 'cast5', digest: 'sha1', count: 65_536, compression: 'zlib' }],
      [gpg.ideaSalted, { algorithm: 'idea', digest: 'md5', salt: 'c5709779b59e421f' }],
      [gpg.tripleDesSimple, { algorithm: '3des', digest: 'sha1' }],
      [gpg.blowfishZip, { algorithm: 'blowfish', digest: 'ripemd160', compression: 'zip' }],
      [gpg.aes128, { algorithm: 'aes128', digest: 'sha256', count: 65_536 }],
      [gpg.aes192Zip, { algorithm: 'aes192', digest: 'sha384', compression: 'zip' }],
      [gpg.bzip2, { algorithm: 'aes256', digest: 'sha512', compression: 'bzip2' }],
      [gpg.sha224, { algorithm: 'aes256', digest: 'sha224', salt: '8641dd96daf30352' }],
    ] as const) {
      const decoded = pgp.decode(armor, { key: 'hunter2' })
      expect(decoded.text).toBe('Attack at dawn')
      expect(decoded.options).toMatchObject(options)
    }
    expect(pgp.decode(gpg.ideaSalted, { key: 'hunter2' }).options).not.toHaveProperty('count')
    expect(pgp.decode(gpg.tripleDesSimple, { key: 'hunter2' }).options).not.toHaveProperty('salt')
  })

  it('opens a SHA3-256 or SHA3-512 S2K from OpenPGP.js', () => {
    for (const [armor, options] of [
      [openpgpJs.sha3_256, { digest: 'sha3-256', salt: 'c26059b98ab805f5', count: 65_536 }],
      [openpgpJs.sha3_512, { digest: 'sha3-512', salt: '8595f735ea64360e', count: 65_536 }],
    ] as const) {
      expect(pgp.decode(armor, { key: 'hunter2' })).toMatchObject({
        text: 'Attack at dawn',
        options: { algorithm: 'aes256', ...options },
      })
      expect(() => pgp.decode(armor, { key: 'hunter3' })).toThrow(CipherError)
    }
  })

  it('turns the CRLF of text mode into LF, as gpg --decrypt does', () => {
    expect(pgp.decode(gpg.textMode, { key: 'hunter2' })).toMatchObject({
      text: 'line one\nline two\n',
      options: { filename: 'notes.txt' },
    })
  })

  it('reads the passphrase as UTF-8', () => {
    expect(pgp.decode(gpg.utf8Zlib, { key: 'zażółć' }).text).toBe('Zażółć gęślą jaźń')
  })

  /** `gpg -c -e` to an RSA key: the SKESK carries the session key under the S2K key. */
  it('opens a session key encrypted under the passphrase, past a public key packet', () => {
    expect(pgp.decode(gpg.sessionKey, { key: 'hunter2' })).toMatchObject({
      text: 'Attack at dawn',
      options: { algorithm: 'aes256', digest: 'sha512', filename: 'esk.txt' },
    })
  })

  /** Both came from stdin, so GnuPG wrote partial body lengths; the second one inside ZIP. */
  it('joins partial body chunks, in the encrypted data and inside compressed data', () => {
    const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
    expect(sha256(pgp.decode(gpg.partialData, { key: 'hunter2' }).text)).toBe(
      '9afbee2dc3df931c97dbe30587f5c2a33205cbceaf4d0d474ad45e671c67c1dc',
    )
    const partial = pgp.decode(gpg.partial, { key: 'hunter2' })
    expect(sha256(partial.text)).toBe(
      '2e81c1e5cef5f042f6feca69ac9167c0a99d249ca6ecaf2d5580ed84ccdb6089',
    )
    expect(partial.options).toMatchObject({ algorithm: 'cast5', compression: 'zip' })
  })

  it('returns bytes that are not text as hex', () => {
    expect(pgp.decode(gpg.binary, { key: 'hunter2', bytes: 'hex' }).text).toBe('00ff80c0')
    expect(() => pgp.decode(gpg.binary, { key: 'hunter2' })).toThrow(
      new CipherError(
        '[openpgp] Decrypted bytes are not UTF-8 text; pass bytes: hex to get them as hex',
      ),
    )
  })

  it('reads the packets bare, in base64 or hex, as well as armored', () => {
    const packets = Buffer.from(body(gpg.aes128), 'base64')
    for (const text of [packets.toString('base64'), packets.toString('hex').toUpperCase()]) {
      expect(pgp.decode(text, { key: 'hunter2' }).text).toBe('Attack at dawn')
    }
    expect(pgp.decode(`Some page text\n\n${gpg.aes128}\n`, { key: 'hunter2' }).text).toBe(
      'Attack at dawn',
    )
  })

  /**
   * GnuPG 2.4.9 opens this output; the SKESK bytes are RFC 4880 §5.3 worked by hand.
   */
  it('writes an armored message that it reads back with the same options', () => {
    const options = { key: 'secret', salt: '0011223344556677', iv: '00'.repeat(16), count: 1024 }
    const encoded = pgp.encode('Attack at dawn', options)
    expect(encoded.text).toMatch(
      /^-----BEGIN PGP MESSAGE-----\n\n[\s\S]+\n=.{4}\n-----END PGP MESSAGE-----$/,
    )
    expect(Buffer.from(bytesOf(encoded.text).slice(0, 15)).toString('hex')).toBe(
      'c30d0409030a001122334455667700',
    )
    expect(encoded.options).toEqual({
      key: 'secret',
      algorithm: 'aes256',
      digest: 'sha512',
      count: 1024,
      salt: '0011223344556677',
      iv: '00'.repeat(16),
    })
    const decoded = pgp.decode(encoded.text, { key: 'secret' })
    expect(decoded.text).toBe('Attack at dawn')
    expect(decoded.options).toEqual(encoded.options)
    expect(pgp.encode('Attack at dawn', decoded.options).text).toBe(encoded.text)
  })

  it('writes every algorithm and digest it can read', () => {
    for (const algorithm of ['idea', '3des', 'cast5', 'blowfish', 'aes128', 'aes192', 'aes256']) {
      for (const digest of [
        'md5',
        'sha1',
        'ripemd160',
        'sha224',
        'sha256',
        'sha384',
        'sha512',
        'sha3-256',
        'sha3-512',
      ]) {
        const encoded = pgp.encode('zażółć', { key: 'k', algorithm, digest, count: 1024 })
        expect(pgp.decode(encoded.text, { key: 'k' })).toMatchObject({
          text: 'zażółć',
          options: { algorithm, digest },
        })
      }
    }
  })

  /** A definite length past about 125 KB once overflowed the call stack when the packet was read. */
  it('reads back a message too long to spread into one call', () => {
    const text = 'x'.repeat(200_000)
    const encoded = pgp.encode(text, { key: 'k', count: 1024 })
    expect(pgp.decode(encoded.text, { key: 'k' }).text).toBe(text)
  })

  it('rounds count up to a value the count byte can hold', () => {
    const encoded = pgp.encode('x', { key: 'k', count: 65_537 })
    expect(encoded.options.count).toBe(69_632)
    expect(pgp.decode(encoded.text, { key: 'k' }).options.count).toBe(69_632)
  })

  it('draws a new salt and first block for every encoding unless they are given', () => {
    const first = pgp.encode('x', { key: 'k', count: 1024 })
    const second = pgp.encode('x', { key: 'k', count: 1024 })
    expect(first.text).not.toBe(second.text)
    expect(first.options.salt).toMatch(/^[0-9a-f]{16}$/)
    expect(first.options.iv).toMatch(/^[0-9a-f]{32}$/)
  })

  it('names what is wrong with a message it cannot open', () => {
    expect(() => pgp.decode(gpg.aes128, { key: 'wrong' })).toThrow(
      new CipherError(
        '[openpgp] Wrong passphrase: the check bytes after the random prefix do not match',
      ),
    )
    const changed = bytesOf(gpg.aes128)
    const flipped = changed.length - 30
    changed[flipped]! ^= 1
    expect(() => pgp.decode(Buffer.from(changed).toString('base64'), { key: 'hunter2' })).toThrow(
      new CipherError('[openpgp] The MDC does not match: the message was changed or cut'),
    )
    expect(() =>
      pgp.decode(
        gpg.aes128.replace(/\n=(.)/, (_, c: string) => `\n=${c === 'A' ? 'B' : 'A'}`),
        {
          key: 'hunter2',
        },
      ),
    ).toThrow(/Armor checksum does not match/)
    expect(() =>
      pgp.decode(Buffer.from(changed.slice(0, 40)).toString('hex'), { key: 'k' }),
    ).toThrow(/runs past the end of the message/)
    expect(() => pgp.decode('not base64!', { key: 'k' })).toThrow(
      /must be an armored OpenPGP message/,
    )
    expect(() => pgp.decode(gpg.aes128.replace('MESSAGE', 'SIGNATURE'), { key: 'k' })).toThrow(
      /not BEGIN PGP SIGNATURE/,
    )
    expect(() => pgp.decode(gpg.aes128.replace(/\n-----END[^\n]*$/, ''), { key: 'k' })).toThrow(
      /no -----END PGP MESSAGE----- line/,
    )
  })

  it('opens the OCB data GnuPG writes behind a SKESK v5', () => {
    const fox = 'fff8c7166de1f1cf26886d47704f0e53b00b053ec5cb08e8a1231ccef9471923'
    const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
    expect(pgp.decode(gpg.ocb, { key: 'hunter2' })).toEqual({
      text: 'Attack at dawn',
      cipher: 'openpgp',
      operation: 'decode',
      options: {
        key: 'hunter2',
        algorithm: 'aes256',
        digest: 'sha512',
        count: 65_536,
        salt: 'e7dee675875e326a',
        aead: 'ocb',
        filename: 'ocb.txt',
      },
    })
    const chunks = pgp.decode(gpg.ocbChunks, { key: 'hunter2' })
    expect(sha256(chunks.text)).toBe(fox)
    expect(chunks.options).toMatchObject({ algorithm: 'aes256', aead: 'ocb', filename: 'fox.txt' })
    const zip = pgp.decode(gpg.ocbAes128Zip, { key: 'hunter2' })
    expect(sha256(zip.text)).toBe(fox)
    expect(zip.options).toMatchObject({ algorithm: 'aes128', aead: 'ocb', compression: 'zip' })
    expect(pgp.decode(gpg.ocbToKey, { key: 'hunter2' })).toMatchObject({
      text: 'Attack at dawn',
      options: { algorithm: 'aes256', aead: 'ocb', compression: 'zlib', filename: 'esk.txt' },
    })
  })

  it('opens the EAX, OCB and GCM samples of RFC 9580 and the SKESK v5 ones', () => {
    for (const [message, text, options] of [
      [samples.eax, 'Hello, world!', { aead: 'eax', salt: 'a5ae579d1fc5d82b', count: 65_011_712 }],
      [samples.ocb, 'Hello, world!', { aead: 'ocb', salt: '56a298d2f5e36453', count: 65_011_712 }],
      [samples.gcm, 'Hello, world!', { aead: 'gcm', salt: 'e9d39785b2070008', count: 65_011_712 }],
      [samples.eaxV5, 'Hello, world!\n', { aead: 'eax', salt: 'cd5a9f70fbe0bc65', count: 524_288 }],
      [samples.ocbV5, 'Hello, world!\n', { aead: 'ocb', salt: '9f0b7da3e5ea6477', count: 524_288 }],
    ] as const) {
      const decoded = pgp.decode(message, { key: 'password' })
      expect(decoded.text).toBe(text)
      expect(decoded.options).toEqual({
        key: 'password',
        algorithm: 'aes128',
        digest: 'sha256',
        ...options,
      })
      expect(() => pgp.decode(message, { key: 'passw0rd' })).toThrow(
        new CipherError(
          '[openpgp] Wrong passphrase: the tag on the sealed session key does not match',
        ),
      )
    }
  })

  it('refuses AEAD data with a changed chunk or final tag', () => {
    const changed = new CipherError(
      '[openpgp] An AEAD tag does not match: the message was changed or cut',
    )
    const packets = bytesOf(gpg.ocbChunks)
    for (const at of [packets.length - 200, packets.length - 1]) {
      const flipped = [...packets]
      flipped[at]! ^= 1
      expect(() => pgp.decode(Buffer.from(flipped).toString('hex'), { key: 'hunter2' })).toThrow(
        changed,
      )
    }
    const sample = bytesOf(samples.gcm)
    const chunkTag = sample.length - 20
    sample[chunkTag]! ^= 0x80
    expect(() => pgp.decode(Buffer.from(sample).toString('hex'), { key: 'password' })).toThrow(
      changed,
    )
  })

  it('names what is wrong with an AEAD message it cannot open', () => {
    const fail = (hex: string, reason: string) =>
      expect(() => pgp.decode(hex, { key: 'password' })).toThrow(`[openpgp] ${reason}`)
    const v5 = samples.ocbV5
    const skeskV5 = v5.slice(0, 126)
    const v4 = Buffer.from(bytesOf(gpg.aes128)).toString('hex')
    fail(
      v4.slice(0, 30) + v5.slice(126),
      'The passphrase packets are SKESK v4, and this encrypted data needs v5',
    )
    fail(
      skeskV5 + v4.slice(30),
      'The passphrase packets are SKESK v5, and this encrypted data needs v4',
    )
    fail(`c33d0503${v5.slice(8)}`, 'AEAD runs on 16-byte blocks, and cast5 has 8')
    fail(`c33d050704${v5.slice(10)}`, 'AEAD mode 4 is not supported: only eax, ocb and gcm')
    fail(`c33d07${v5.slice(6)}`, 'SKESK version 7 is not supported: only 4, 5 and 6')
    fail(
      `${skeskV5}d44902${v5.slice(132)}`,
      'AEAD encrypted data version 2 is not supported: only 1',
    )
    fail(`${skeskV5}d4040107020e`, 'The AEAD encrypted data is too short to hold its final tag')
    fail(
      `c32d0507020308${'00'.repeat(40)}${v5.slice(126)}`,
      'The SKESK v5 packet ends before its sealed session key',
    )
    const v6 = Buffer.from(bytesOf(samples.ocb)).toString('hex')
    fail(`${v6.slice(0, 6)}1e${v6.slice(8)}`, 'The SKESK v6 lengths do not match its S2K and nonce')
    fail(
      `${v6.slice(0, 130)}d26903${v6.slice(136)}`,
      'SEIPD version 3 is not supported: only 1 and 2',
    )
    fail(
      v4.slice(0, 30) + skeskV5 + v4.slice(0, 30) + v6.slice(130),
      'The passphrase packets are SKESK v4 and v5, and this encrypted data needs v6',
    )
  })

  it('names what GnuPG can write that it does not run', () => {
    expect(() => pgp.decode(gpg.twofish, { key: 'hunter2' })).toThrow(
      '[openpgp] Cipher algorithm 10 (Twofish) is not supported',
    )
    /* The SHA-224 message with its S2K hash id turned to 13, which RFC 9580 reserves. */
    const reserved = bytesOf(gpg.sha224)
    reserved[5] = 13
    expect(() => pgp.decode(Buffer.from(reserved).toString('hex'), { key: 'hunter2' })).toThrow(
      '[openpgp] S2K hash 13 is not supported: md5, sha1, ripemd160, sha256, sha384, sha512, sha224, sha3-256 and sha3-512',
    )
    const packets = bytesOf(gpg.aes128)
    const data = Buffer.from(packets.slice(15)).toString('hex')
    expect(() => pgp.decode(data, { key: 'hunter2' })).toThrow(
      /no passphrase packet \(SKESK, tag 3\)/,
    )
    const skesk = Buffer.from(packets.slice(0, 15)).toString('hex')
    expect(() => pgp.decode(skesk.repeat(9) + data, { key: 'hunter2' })).toThrow(
      /9 passphrase packets; at most 8 are tried/,
    )
    expect(pgp.decode(skesk.repeat(2) + data, { key: 'hunter2' }).text).toBe('Attack at dawn')
    /* Salted MD5 S2K whose wrong key passes the 1 in 65536 prefix check; salt found by search. */
    const forged = 'c30c04070101000000000000119f'
    expect(pgp.decode(forged + skesk + data, { key: 'hunter2' }).text).toBe('Attack at dawn')
    expect(() => pgp.decode(forged + data, { key: 'hunter2' })).toThrow(/The MDC does not match/)
    const twofish = Buffer.from(bytesOf(gpg.twofish).slice(0, 15)).toString('hex')
    expect(pgp.decode(twofish + skesk + data, { key: 'hunter2' }).text).toBe('Attack at dawn')
    expect(() => pgp.decode(twofish + data, { key: 'hunter2' })).toThrow(/10 \(Twofish\)/)
    const cut = `c30c${skesk.slice(4, 28)}`
    expect(() => pgp.decode(cut + data, { key: 'hunter2' })).toThrow(/ends before the S2K count/)
    expect(() => pgp.decode(`c30b${skesk.slice(4, 26)}` + data, { key: 'k' })).toThrow(
      /inside the S2K salt/,
    )
  })

  it('refuses encoding options outside what it writes', () => {
    expect(() => pgp.encode('x', {})).toThrow(MissingOptionError)
    for (const options of [
      { algorithm: 'twofish' },
      { algorithm: 'AES256' },
      { digest: 'sha3-384' },
      { digest: 'toString' },
      { count: 1023 },
      { count: 65_011_713 },
      { count: 2048.5 },
      { salt: '0011' },
      { iv: '00'.repeat(8) },
      { algorithm: 'cast5', iv: '00'.repeat(16) },
    ]) {
      expect(() => pgp.encode('x', { key: 'k', ...options })).toThrow(InvalidOptionError)
    }
  })

  it('stops compressed data that grows past 4 MiB', () => {
    expect(() => pgp.decode(gpg.bomb, { key: 'hunter2', bytes: 'hex' })).toThrow(
      '[openpgp] Compressed data inflates past 4194304 bytes',
    )
  })

  const packet = (tag: number, body: readonly number[]) => [0xc0 | tag, body.length, ...body]
  /* Packets sealed under passphrase k: simple SHA-256 S2K, AES-256 CFB and a valid MDC. */
  const sealed = (inner: readonly number[]) => {
    const plain = [...Array.from({ length: 16 }, (_, i) => i), 14, 15, ...inner, 0xd3, 0x14]
    const mdc = createHash('sha1').update(Uint8Array.from(plain)).digest()
    const key = createHash('sha256').update('k').digest()
    const cfb = createCipheriv('aes-256-cfb', key, Buffer.alloc(16))
    const data = cfb.update(Uint8Array.from([...plain, ...mdc]))
    const bytes = [...packet(3, [4, 9, 0, 8]), ...packet(18, [1, ...data])]
    return Buffer.from(bytes).toString('hex')
  }

  it('names a broken compressed stream and an unknown compression', () => {
    expect(
      pgp.decode(sealed(packet(11, [0x62, 0, 0, 0, 0, 0, 0x68, 0x69])), { key: 'k' }).text,
    ).toBe('hi')
    expect(() => pgp.decode(sealed(packet(8, [2, 0x78, 0x9c, 0xff, 0xff])), { key: 'k' })).toThrow(
      /^\[openpgp\] Compressed data is broken: deflate: /,
    )
    expect(() => pgp.decode(sealed(packet(8, [110, 0])), { key: 'k' })).toThrow(
      '[openpgp] Compression 110 is not supported: only zip, zlib and bzip2',
    )
  })

  it('reports the block category', () => {
    expect(resolveCipher('OpenPGP')).toBe(pgp)
    expect(pgp.info()).toMatchObject({
      name: 'openpgp',
      category: 'block',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, armor out',
    })
    expect(pgp.info().options.map((option) => option.name)).toEqual([
      'key',
      'algorithm',
      'digest',
      'count',
      'salt',
      'iv',
      'bytes',
    ])
  })
})

describe('rabbit', () => {
  const rabbitCipher = create('rabbit')
  const hex = (value: string) =>
    Array.from(value.replaceAll(' ', '').match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const zeros = Array.from({ length: 48 }, () => 0)
  const key = '912813292e3d36fe3bfc62f1dc51c3ac'

  /**
   * RFC 4503 Appendix A: S[0], S[1] and S[2] for each key and IV. Its Appendix B prints the second
   * key with `2E ED` where A.1 and the state words it lists have `2E 3D`.
   */
  it('matches the RFC 4503 test vectors', () => {
    for (const [vectorKey, iv, keystream] of [
      [
        '00000000000000000000000000000000',
        undefined,
        'B1 57 54 F0 36 A5 D6 EC F5 6B 45 26 1C 4A F7 02 88 E8 D8 15 C5 9C 0C 39 7B 69 6C 47 89 C6 8A A7 F4 16 A1 C3 70 0C D4 51 DA 68 D1 88 16 73 D6 96',
      ],
      [
        key,
        undefined,
        '3D 2D F3 C8 3E F6 27 A1 E9 7F C3 84 87 E2 51 9C F5 76 CD 61 F4 40 5B 88 96 BF 53 AA 85 54 FC 19 E5 54 74 73 FB DB 43 50 8A E5 3B 20 20 4D 4C 5E',
      ],
      [
        '83957415 87E0C733 E9E9AB01 C09B0043',
        undefined,
        '0C B1 0D CD A0 41 CD AC 32 EB 5C FD 02 D0 60 9B 95 FC 9F CA 0F 17 01 5A 7B 70 92 11 4C FF 3E AD 96 49 E5 DE 8B FC 7F 3F 92 41 47 AD 3A 94 74 28',
      ],
      [
        '00000000000000000000000000000000',
        '0000000000000000',
        'C6 A7 27 5E F8 54 95 D8 7C CD 5D 37 67 05 B7 ED 5F 29 A6 AC 04 F5 EF D4 7B 8F 29 32 70 DC 4A 8D 2A DE 82 2B 29 DE 6C 1E E5 2B DB 8A 47 BF 8F 66',
      ],
      [
        '00000000000000000000000000000000',
        'C373F575C1267E59',
        '1F CD 4E B9 58 00 12 E2 E0 DC CC 92 22 01 7D 6D A7 5F 4E 10 D1 21 25 01 7B 24 99 FF ED 93 6F 2E EB C1 12 C3 93 E7 38 39 23 56 BD D0 12 02 9B A7',
      ],
      [
        '00000000000000000000000000000000',
        'A6EB561AD2F41727',
        '44 5A D8 C8 05 85 8D BF 70 B6 AF 23 A1 51 10 4D 96 C8 F2 79 47 F4 2C 5B AE AE 67 C6 AC C3 5B 03 9F CB FC 89 5F A7 1C 17 31 3D F0 34 F0 15 51 CB',
      ],
    ] as const) {
      const ivBytes = iv === undefined ? undefined : hex(iv)
      expect(rabbit(zeros, hex(vectorKey), ivBytes, 'big')).toEqual(hex(keystream))
      expect(rabbit(hex(keystream), hex(vectorKey), ivBytes, 'big')).toEqual(zeros)
    }
  })

  /** CyberChef's Rabbit tests, big-endian: data XORed with the stream, then a short last block. */
  it('takes the least significant keystream bytes for a short last block, as CyberChef does', () => {
    const zeroKey = hex('00'.repeat(16))
    expect(
      rabbit(
        hex(
          'cedda96c054e3ddd93da7ed05e2a4b7bdb0c00fe214f03502e2708b2c2bfc77aa2311b0b9af8aa78d119f92b26db0a6b',
        ),
        zeroKey,
        undefined,
        'big',
      ),
    ).toEqual(
      hex(
        '7f8afd9c33ebeb3166b13bf64260bc7953e4d8ebe4d30f69554e64f54b794ddd5627bac8eaf47e290b7128a330a8dcfd',
      ),
    )
    expect(rabbit(hex('00'.repeat(8)), zeroKey, undefined, 'big')).toEqual(hex('f56b45261c4af702'))
  })

  /** The first example on the Crypto++ wiki's Rabbit page, which CyberChef's tests take too. */
  it('matches Crypto++ in little-endian byte order', () => {
    expect(
      rabbitCipher.encode('Rabbit stream cipher test', {
        key: '23c2731e8b5469fd8dabb5bc592a0f3a',
        iv: '712906405ef03201',
        endian: 'little',
      }).text,
    ).toBe('1ae2d4edcf9b6063b00fd6fda0b223aded157e77031cf0440b')
  })

  /** Expected values from Crypto++ 8.9 `RabbitWithIV` and `Rabbit` over the UTF-8 bytes. */
  it('encodes UTF-8 text in little-endian order as Crypto++ does, with and without an IV', () => {
    const cryptoppKey = '23c2731e8b5469fd8dabb5bc592a0f3a'
    const text = 'zażółć gęślą jaźń 🙂'
    for (const [iv, ciphertext] of [
      ['712906405ef03201', '32e27333655c859200fa93fb090b855ff1b99e254909508dba473fb749878e'],
      [undefined, '4d8fb770cb0a818df8650d53932f18dcc7d05acfabd93d3799b069ca116e59'],
    ] as const) {
      const options = { key: cryptoppKey, endian: 'little', ...(iv && { iv }) }
      expect(rabbitCipher.encode(text, options)).toEqual({
        text: ciphertext,
        cipher: 'rabbit',
        operation: 'encode',
        options: { key: cryptoppKey, endian: 'little', ...(iv && { iv }) },
      })
      expect(rabbitCipher.decode(ciphertext, options).text).toBe(text)
    }
  })

  /** S[0] and S[1] of RFC 4503 A.1 for this key, XORed by hand into the UTF-8 bytes. */
  it('encodes text in RFC byte order by default, across a block boundary', () => {
    for (const [text, ciphertext] of [
      ['', ''],
      ['ATTACK AT DAWN', 'b29c6ab764eac93e97a4c3a306d2'],
      ['ATTACK AT DAWN, NOT DUSK', '7c79a7897dbd07e0bd5f87c5d0ac7dbcd8f0078ac101af52'],
    ] as const) {
      expect(rabbitCipher.encode(text, { key })).toEqual({
        text: ciphertext,
        cipher: 'rabbit',
        operation: 'encode',
        options: { key, endian: 'big' },
      })
      expect(rabbitCipher.decode(ciphertext, { key }).text).toBe(text)
    }
  })

  it('reads key, IV and ciphertext in any case and with spaces', () => {
    const iv = 'c373f575c1267e59'
    const result = rabbitCipher.encode('ATTACK AT DAWN', {
      key: '91281329 2E3D36FE 3BFC62F1 DC51C3AC',
      iv: 'C373 F575 C126 7E59',
    })
    expect(result.options).toEqual({ key, endian: 'big', iv })
    expect(
      rabbitCipher.decode(result.text.toUpperCase().replaceAll(/(.{8})/g, '$1 '), { key, iv }).text,
    ).toBe('ATTACK AT DAWN')
    expect(rabbitCipher.encode('ATTACK AT DAWN', { key, iv: '' }).text).toBe(
      'b29c6ab764eac93e97a4c3a306d2',
    )
  })

  it('rejects keys, IVs and byte orders it cannot read', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => rabbitCipher[operation]('')).toThrow(MissingOptionError)
      expect(() => rabbitCipher[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of [
        'YELLOW SUBMARINE',
        '00'.repeat(15),
        '00'.repeat(17),
        'g'.repeat(32),
        12,
      ]) {
        expect(() => rabbitCipher[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of ['00'.repeat(4), '00'.repeat(16), 'g'.repeat(16), 1]) {
        expect(() => rabbitCipher[operation]('', { key, iv: bad })).toThrow(
          /iv.*16 hex digits|iv.*string/,
        )
      }
      for (const bad of ['Big', 'le', 1]) {
        expect(() => rabbitCipher[operation]('', { key, endian: bad })).toThrow(/big or little/)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => rabbitCipher.decode('b29c6', { key })).toThrow(/whole bytes/)
    expect(() => rabbitCipher.decode('b2zz', { key })).toThrow(/must be hex digits/)
    expect(() =>
      rabbitCipher.decode('b29c6ab764eac93e97a4c3a306d2', { key, endian: 'little' }),
    ).toThrow(/not UTF-8/)
  })

  it('reports the stream category and its options', () => {
    expect(resolveCipher('Rabbit')).toBe(rabbitCipher)
    expect(rabbitCipher.info()).toMatchObject({
      name: 'rabbit',
      category: 'stream',
      family: 'arx',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'iv', type: 'string', required: false },
        { name: 'endian', type: 'string', required: false, default: 'big' },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('rc4', () => {
  const rc4Cipher = create('rc4')
  const hex = (value: string) =>
    Array.from(value.replaceAll(' ', '').match(/../g) ?? [], (pair) => Number.parseInt(pair, 16))
  const key = '0102030405060708090a0b0c0d0e0f10'

  /** RFC 6229 section 2: keystream at offsets 0, 1008 and 4096 for a 40, 128 and 256-bit key. */
  it('matches the RFC 6229 test vectors', () => {
    const zeros = Array.from({ length: 4112 }, () => 0)
    for (const [vectorKey, at0, at1008, at4096] of [
      [
        '0102030405',
        'b2 39 63 05 f0 3d c0 27 cc c3 52 4a 0a 11 18 a8',
        '45 12 90 48 e6 a0 ed 0b 56 b4 90 33 8f 07 8d a5',
        'ff 25 b5 89 95 99 67 07 e5 1f bd f0 8b 34 d8 75',
      ],
      [
        key,
        '9a c7 cc 9a 60 9d 1e f7 b2 93 28 99 cd e4 1b 97',
        'e7 a7 25 74 f8 78 2a e2 6a ab cf 9e bc d6 60 65',
        'a3 6a 4c 30 1a e8 ac 13 61 0c cb c1 22 56 ca cc',
      ],
      [
        '1ada31d5cf688221c109163908ebe51debb46227c6cc8b37641910833222772a',
        'dd 5b cb 00 18 e9 22 d4 94 75 9d 7c 39 5d 02 d3',
        '5f 40 d5 9e c1 b0 3b 33 73 8e fa 60 b2 25 5d 31',
        '37 0b 1c 1f e6 55 91 6d 97 fd 0d 47 ca 1d 72 b8',
      ],
    ] as const) {
      const keystream = rc4(zeros, hex(vectorKey))
      expect(keystream.slice(0, 16)).toEqual(hex(at0))
      expect(keystream.slice(1008, 1024)).toEqual(hex(at1008))
      expect(keystream.slice(4096, 4112)).toEqual(hex(at4096))
    }
  })

  /** The test vectors on the English Wikipedia's RC4 page, ASCII keys written as hex. */
  it('encodes the Wikipedia examples', () => {
    for (const [textKey, text, ciphertext] of [
      ['Key', 'Plaintext', 'bbf316e8d940af0ad3'],
      ['Wiki', 'pedia', '1021bf0420'],
      ['Secret', 'Attack at dawn', '45a01f645fc35b383552544b9bf5'],
    ] as const) {
      const hexKey = Buffer.from(textKey).toString('hex')
      expect(rc4Cipher.encode(text, { key: hexKey })).toEqual({
        text: ciphertext,
        cipher: 'rc4',
        operation: 'encode',
        options: { key: hexKey },
      })
      expect(rc4Cipher.decode(ciphertext, { key: hexKey }).text).toBe(text)
    }
  })

  /** Expected value from `openssl enc -rc4` (OpenSSL 3.6 legacy provider) over the UTF-8 bytes. */
  it('encodes UTF-8 text as OpenSSL does', () => {
    const text = 'zażółć gęślą jaźń 🙂'
    const ciphertext = 'e0a60926a32edb75761408fe097dde0c3e8c41b5fa75d7d0ab0ea40182831c'
    expect(rc4Cipher.encode(text, { key }).text).toBe(ciphertext)
    expect(rc4Cipher.decode(ciphertext, { key }).text).toBe(text)
    expect(rc4Cipher.encode('', { key }).text).toBe('')
  })

  it('reads key and ciphertext in any case and with spaces', () => {
    const result = rc4Cipher.encode('Plaintext', { key: '4B 65 79' })
    expect(result.options).toEqual({ key: '4b6579' })
    expect(rc4Cipher.decode('BBF3 16E8 D940 AF0A D3', { key: '4b6579' }).text).toBe('Plaintext')
  })

  it('takes keys from 1 to 256 bytes and nothing else', () => {
    expect(rc4Cipher.encode('a', { key: '00' }).text).toHaveLength(2)
    expect(rc4Cipher.encode('a', { key: 'ff'.repeat(256) }).text).toHaveLength(2)
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => rc4Cipher[operation]('')).toThrow(MissingOptionError)
      expect(() => rc4Cipher[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of ['Key', '0', '00'.repeat(257), 'g'.repeat(2), 12]) {
        expect(() => rc4Cipher[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with a ciphertext it cannot decode', () => {
    expect(() => rc4Cipher.decode('bbf31', { key: '4b6579' })).toThrow(/whole bytes/)
    expect(() => rc4Cipher.decode('bbzz', { key: '4b6579' })).toThrow(/must be hex digits/)
    expect(() => rc4Cipher.decode('bbf316e8d940af0ad3', { key: '4b6578' })).toThrow(/not UTF-8/)
  })

  it('reports the stream category and its options', () => {
    expect(resolveCipher('RC4')).toBe(rc4Cipher)
    expect(rc4Cipher.info()).toMatchObject({
      name: 'rc4',
      category: 'stream',
      family: 'permutation',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('xor', () => {
  const xorCipher = create('xor')
  const key = '494345'
  const text = "Burning 'em, if you ain't quick and nimble\nI go crazy when I hear a cymbal"
  /** Cryptopals set 1 challenge 5: the two lines under the key ICE. */
  const ciphertext =
    '0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272a282b2f20430a652e2c652a3124333a653e2b2027630c692b20283165286326302e27282f'

  it('matches the Cryptopals repeating-key XOR vector', () => {
    expect(xorCipher.encode(text, { key })).toEqual({
      text: ciphertext,
      cipher: 'xor',
      operation: 'encode',
      options: { key, bytes: 'text' },
    })
    expect(xorCipher.decode(ciphertext, { key }).text).toBe(text)
    expect(xorCipher.encode('', { key }).text).toBe('')
  })

  it('reads and writes hex on both sides with bytes: hex', () => {
    const plain = Buffer.from(text).toString('hex')
    for (const operation of ['encode', 'decode'] as const) {
      expect(xorCipher[operation](plain, { key, bytes: 'hex' })).toEqual({
        text: ciphertext,
        cipher: 'xor',
        operation,
        options: { key, bytes: 'hex' },
      })
      expect(xorCipher[operation](ciphertext.toUpperCase(), { key, bytes: 'hex' }).text).toBe(plain)
    }
    expect(xorCipher.decode('00 ff 80', { key: 'ff', bytes: 'hex' }).text).toBe('ff007f')
    expect(() => xorCipher.decode('00ff80', { key: 'ff' })).toThrow(/not UTF-8/)
  })

  it('points a decode that is not text at bytes: hex', () => {
    expect(() => xorCipher.decode('00ff80', { key: 'ff' })).toThrow(
      new CipherError(
        '[xor] Decrypted bytes are not UTF-8 text; pass bytes: hex to get them as hex',
      ),
    )
    expect(() => create('rc4').decode('bbf316e8d940af0ad3', { key: '4b6578' })).toThrow(
      new CipherError(
        '[rc4] Decrypted bytes are not UTF-8 text; pass bytes: hex to get them as hex',
      ),
    )
  })

  it('repeats the key from the first byte and ignores what runs past the text', () => {
    expect(xor([0x00, 0x00, 0x00, 0x00, 0x00], [0x01, 0x02])).toEqual([1, 2, 1, 2, 1])
    expect(xor([0x0f], [0xf0, 0xaa, 0xbb])).toEqual([0xff])
    expect(xorCipher.encode('A', { key: 'ff'.repeat(1000) }).text).toBe('be')
  })

  it('takes any key of whole bytes and nothing else', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => xorCipher[operation]('')).toThrow(MissingOptionError)
      expect(() => xorCipher[operation]('', { key: '' })).toThrow(MissingOptionError)
      for (const bad of ['ICE', '0', '494', 'g'.repeat(2), 12]) {
        expect(() => xorCipher[operation]('', { key: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of ['raw', 'HEX', 1]) {
        expect(() => xorCipher[operation]('', { key, bytes: bad })).toThrow(InvalidOptionError)
      }
    }
  })

  it('names what is wrong with hex it cannot read', () => {
    expect(() => xorCipher.decode('0b363', { key })).toThrow(/whole bytes/)
    expect(() => xorCipher.decode('0bzz', { key })).toThrow(/must be hex digits/)
    expect(() => xorCipher.encode('Burning', { key, bytes: 'hex' })).toThrow(/must be hex digits/)
  })

  it('reports the stream category and its options', () => {
    expect(resolveCipher('XOR')).toBe(xorCipher)
    expect(xorCipher.info()).toMatchObject({
      name: 'xor',
      category: 'stream',
      family: 'polyalphabetic',
      selfInverse: false,
      options: [
        { name: 'key', type: 'string', required: true },
        { name: 'bytes', type: 'string', required: false, default: 'text' },
      ],
    })
  })
})

describe('salsa20', () => {
  const salsa = create('salsa20')
  const zeros = (bytes: number) => '00'.repeat(bytes)

  /** eSTREAM verified test vectors, set 1 vector 0 (128-bit key) and set 3 vector 243 (256-bit). */
  it('matches the eSTREAM test vectors for both key lengths', () => {
    for (const [key, keystream] of [
      [
        '80000000000000000000000000000000',
        '4dfa5e481da23ea09a31022050859936da52fcee218005164f267cb65f5cfd7f2b4f97e0ff16924a52df269515110a07f9e460bc65ef95da58f740b7d1dbb0aa',
      ],
      [
        'f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112',
        'b4c0afa503be7fc29a62058166d56f8f5d27dc246f75b9ad8760c8c39dfd87492d3b76d5d9637f009eada14458a52dfb09815337e72672681dddc24633750d83',
      ],
    ] as const) {
      const options = { key, nonce: zeros(8), bytes: 'hex' }
      expect(salsa.encode(zeros(64), options).text).toBe(keystream)
      expect(salsa.decode(keystream, options).text).toBe(zeros(64))
    }
  })

  /** Crypto++ salsa.txt: from block 2^32 - 1 the 64-bit counter carries into its high word. */
  it('carries the block counter past 32 bits', () => {
    const options = { key: zeros(32), nonce: zeros(8), counter: 0xffffffff, bytes: 'hex' }
    const result = salsa.encode(zeros(1024), options)
    expect(result.text.slice(0, 256)).toBe(
      '59fc4dd73f4b7b28ce1b0ef562bab604824076898a800797b59902a99f3122545231e85b887ffa19f71f24aaf352dc6afe47281d8f546c9d419194479a369392b65fc777c4f950ec0274ff0ffbb0a6e3ededf78477e94945e87f26e3162bf6a1050933421833f249da1162db6e92a7678505190c80dc46350b81e831f974b28c',
    )
    expect(createHash('sha256').update(Buffer.from(result.text, 'hex')).digest('hex')).toBe(
      '81cf4342209a91783f1c2286b09a60ef8e1f318be782b143bd17facdee6f002f',
    )
    expect(result.options).toEqual({
      key: zeros(32),
      nonce: zeros(8),
      counter: 0xffffffff,
      bytes: 'hex',
    })
  })

  it('round-trips UTF-8 text and reports nonce and counter', () => {
    const key = '0f62b5085bae0154a7fa4da0f34699ec3f92e5388bde3184d72a7dd02376c91c'
    const nonce = '288ff65dc42b92f9'
    const encoded = salsa.encode('Zażółć gęślą jaźń', { key, nonce })
    expect(encoded.text).toHaveLength(2 * new TextEncoder().encode('Zażółć gęślą jaźń').length)
    expect(encoded.options).toEqual({ key, nonce, counter: 0 })
    expect(salsa.decode(encoded.text.toUpperCase(), { key, nonce: nonce.toUpperCase() }).text).toBe(
      'Zażółć gęślą jaźń',
    )
    expect(salsa.encode('', { key, nonce }).text).toBe('')
  })

  it('names a missing or malformed key, nonce and counter', () => {
    const key = zeros(16)
    const nonce = zeros(8)
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => salsa[operation]('', { nonce })).toThrow(MissingOptionError)
      expect(() => salsa[operation]('', { key })).toThrow(new MissingOptionError('nonce'))
      for (const bad of [zeros(24), zeros(15), 'g'.repeat(32)]) {
        expect(() => salsa[operation]('', { key: bad, nonce })).toThrow(/32 or 64 hex digits/)
      }
      for (const bad of [zeros(7), zeros(12), 8]) {
        expect(() => salsa[operation]('', { key, nonce: bad })).toThrow(InvalidOptionError)
      }
      for (const bad of [-1, 1.5, '1', 2 ** 53]) {
        expect(() => salsa[operation]('', { key, nonce, counter: bad })).toThrow(/counter/)
      }
    }
  })
})

describe('xsalsa20', () => {
  const xsalsa = create('xsalsa20')

  /** Crypto++ salsa.txt XSalsa20 vectors, which Wei Dai made with naclcrypto-20090308. */
  it('matches the NaCl XSalsa20 vectors', () => {
    const key = '1b27556473e985d462cd51197a9a46c76009549eac6474f206c4ee0844f68389'
    const nonce = '69696ee955b62b73cd62bda875fc73d68219e0036b7a0b37'
    const stream = xsalsa.encode('00'.repeat(139), { key, nonce, bytes: 'hex' }).text
    expect(stream.slice(0, 64)).toBe(
      'eea6a7251c1e72916d11c2cb214d3c252539121d8e234e652d651fa4c8cff880',
    )
    expect(createHash('sha256').update(Buffer.from(stream, 'hex')).digest('hex')).toBe(
      '49f52f990b99a4d5f34f4bb0e3015f9248e979599b0a9cf1fa22494fcc16c35a',
    )
    const options = {
      key: 'd5c7f6797b7e7e9c1d7fd2610b2abf2bc5a7885fb3ff78092fb3abe8986d35e2',
      nonce: '744e17312b27969d826444640e9c4a378ae334f185369c95',
      bytes: 'hex',
    }
    const plaintext =
      '7758298c628eb3a4b6963c5445ef66971222be5d1a4ad839715d1188071739b77cc6e05d5410f963a64167629757'
    const ciphertext =
      '27b8cfe81416a76301fd1eec6a4d99675069b2da2776c360db1bdfea7c0aa613913e10f7a60fec04d11e65f2d64e'
    expect(xsalsa.encode(plaintext, options).text).toBe(ciphertext)
    expect(xsalsa.decode(ciphertext, options).text).toBe(plaintext)
  })

  it('takes only a 256-bit key and a 192-bit nonce', () => {
    const nonce = '00'.repeat(24)
    expect(() => xsalsa.encode('', { key: '00'.repeat(16), nonce })).toThrow(/64 hex digits/)
    expect(() => xsalsa.encode('', { key: '00'.repeat(32), nonce: '00'.repeat(8) })).toThrow(
      /48 hex digits/,
    )
  })
})

describe('chacha20', () => {
  const chacha = create('chacha20')
  const key = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
  const sunscreen =
    "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."

  /** RFC 8439 §2.3.2: the block function for counter 1. */
  it('matches the RFC 8439 block function vector', () => {
    expect(toHex(chachaBlock(fromHex(key), 1, fromHex('000000090000004a00000000')))).toBe(
      '10f1e7e4d13b5915500fdd1fa32071c4c7d1f4c733c068030422aa9ac3d46c4ed2826446079faa0914c2d705d98b02a2b5129cd1de164eb9cbd083e8a2503c4e',
    )
  })

  /** RFC 8439 §2.4.2: the sunscreen text from counter 1. */
  it('encrypts the RFC 8439 sunscreen example', () => {
    const nonce = '000000000000004a00000000'
    const ciphertext =
      '6e2e359a2568f98041ba0728dd0d6981e97e7aec1d4360c20a27afccfd9fae0bf91b65c5524733ab8f593dabcd62b3571639d624e65152ab8f530c359f0861d807ca0dbf500d6a6156a38e088a22b65e52bc514d16ccf806818ce91ab77937365af90bbf74a35be6b40b8eedf2785e42874d'
    expect(chacha.encode(sunscreen, { key, nonce, counter: 1 })).toEqual({
      text: ciphertext,
      cipher: 'chacha20',
      operation: 'encode',
      options: { key, nonce, counter: 1 },
    })
    expect(chacha.decode(ciphertext, { key, nonce, counter: 1 }).text).toBe(sunscreen)
    expect(chacha.encode(sunscreen, { key, nonce }).text).not.toBe(ciphertext)
  })

  /** RFC 8439 A.2 test vectors #1 (zero key, counter 0) and #3 (Jabberwocky, counter 42). */
  it('matches the RFC 8439 encryption test vectors', () => {
    expect(
      chacha.encode('00'.repeat(64), { key: '00'.repeat(32), nonce: '00'.repeat(12), bytes: 'hex' })
        .text,
    ).toBe(
      '76b8e0ada0f13d90405d6ae55386bd28bdd219b8a08ded1aa836efcc8b770dc7da41597c5157488d7724e03fb8d84a376a43b8f41518a11cc387b669b2ee6586',
    )
    const jabberwocky =
      "'Twas brillig, and the slithy toves\nDid gyre and gimble in the wabe:\nAll mimsy were the borogoves,\nAnd the mome raths outgrabe."
    const options = {
      key: '1c9240a5eb55d38af333888604f6b5f0473917c1402b80099dca5cbc207075c0',
      nonce: '000000000000000000000002',
      counter: 42,
    }
    const ciphertext =
      '62e6347f95ed87a45ffae7426f27a1df5fb69110044c0d73118effa95b01e5cf166d3df2d721caf9b21e5fb14c616871fd84c54f9d65b283196c7fe4f60553ebf39c6402c42234e32a356b3e764312a61a5532055716ead6962568f87d3f3f7704c6a8d1bcd1bf4d50d6154b6da731b187b58dfd728afa36757a797ac188d1'
    expect(chacha.encode(jabberwocky, options).text).toBe(ciphertext)
    expect(chacha.decode(ciphertext, options).text).toBe(jabberwocky)
  })

  it('refuses a counter the text runs past', () => {
    const options = { key, nonce: '00'.repeat(12), counter: 0xffffffff }
    expect(chacha.encode('x'.repeat(64), options).text).toHaveLength(128)
    expect(() => chacha.encode('x'.repeat(65), options)).toThrow(
      new InvalidOptionError(
        'counter',
        0xffffffff,
        'runs past 4294967295 before the last 64-byte block of 65 bytes',
      ),
    )
    expect(() => chacha.encode('', { ...options, counter: 2 ** 32 })).toThrow(/32-bit/)
  })

  it('names a missing or malformed key and nonce', () => {
    for (const operation of ['encode', 'decode'] as const) {
      expect(() => chacha[operation]('', { nonce: '00'.repeat(12) })).toThrow(MissingOptionError)
      expect(() => chacha[operation]('', { key })).toThrow(new MissingOptionError('nonce'))
      expect(() => chacha[operation]('', { key: key.slice(32), nonce: '00'.repeat(12) })).toThrow(
        /64 hex digits/,
      )
      expect(() => chacha[operation]('', { key, nonce: '00'.repeat(8) })).toThrow(
        /24 hex digits \(a 96-bit nonce\)/,
      )
    }
    expect(() => chacha.decode('6e2', { key, nonce: '00'.repeat(12) })).toThrow(/whole bytes/)
  })
})

describe('xchacha20', () => {
  const xchacha = create('xchacha20')
  const key = '808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f'
  const nonce = '404142434445464748494a4b4c4d4e4f5051525354555658'
  const dhole =
    'The dhole (pronounced "dole") is also known as the Asiatic wild dog, red dog, and whistling dog. It is about the size of a German shepherd but looks more like a long-legged fox. This highly elusive and skilled jumper is classified with wolves, coyotes, jackals, and foxes in the taxonomic family Canidae.'

  /** draft-irtf-cfrg-xchacha-03 §2.2.1: HChaCha20 of the RFC 8439 key and nonce. */
  it('matches the HChaCha20 test vector', () => {
    expect(
      toHex(
        hchacha20(
          fromHex('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'),
          fromHex('000000090000004a0000000031415927'),
        ),
      ),
    ).toBe('82413b4227b27bfed30e42508a877d73a0f9e4d58a74a853c12ec41326d3ecdc')
  })

  /** draft-irtf-cfrg-xchacha-03 A.2.1 and A.2.2: the dhole text from counter 0 and from 1. */
  it('matches the XChaCha20 vectors for both counters', () => {
    for (const [counter, start, digest] of [
      [
        0,
        '4559abba4e48c16102e8bb2c05e6947f50a786de162f9b0b7e592a9b53d0d4e9',
        'e860577d95d918bb6d3627cb17fbfe8929764d292b75719a7fd933f63ba28e6a',
      ],
      [
        1,
        '7d0a2e6b7f7c65a236542630294e063b7ab9b555a5d5149aa21e4ae1e4fbce87',
        'b1cf1640535e383078566361b331b5e2e2c1f5e012e753e7ce3aefdb42705d10',
      ],
    ] as const) {
      const ciphertext = xchacha.encode(dhole, { key, nonce, counter }).text
      expect(ciphertext.slice(0, 64)).toBe(start)
      expect(createHash('sha256').update(Buffer.from(ciphertext, 'hex')).digest('hex')).toBe(digest)
      expect(xchacha.decode(ciphertext, { key, nonce, counter }).text).toBe(dhole)
    }
    expect(xchacha.decode('00'.repeat(32), { key, nonce, bytes: 'hex' }).text).toBe(
      '1131ce9a2a20ae0d67c8935c7789fa1025c9e5bb720fb96f11354fb97af0bd9a',
    )
  })

  it('takes a 192-bit nonce only', () => {
    expect(() => xchacha.encode('', { key, nonce: '00'.repeat(12) })).toThrow(/48 hex digits/)
  })
})

describe('chacha20-poly1305', () => {
  const aead = create('chacha20-poly1305')
  const key = '808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f'
  const nonce = '070000004041424344454647'
  const aad = '50515253c0c1c2c3c4c5c6c7'
  const sunscreen =
    "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."
  const sealed =
    'd31a8d34648e60db7b86afbc53ef7ec2a4aded51296e08fea9e2b5a736ee62d63dbea45e8ca9671282fafb69da92728b1a71de0a9e060b2905d6a5b67ecd3b3692ddbd7f2d778b8c9803aee328091b58fab324e4fad675945585808b4831d7bc3ff4def08e4b7a9de576d26586cec64b6116' +
    '1ae10b594f09e26a7e902ecbd0600691'

  /** RFC 8439 §2.5.2 and A.3 test vectors #5 to #11, the ones aimed at reduction and carries. */
  it('matches the RFC 8439 Poly1305 vectors', () => {
    expect(
      toHex(
        poly1305(
          [...new TextEncoder().encode('Cryptographic Forum Research Group')],
          fromHex('85d6be7857556d337f4452fe42d506a80103808afb0db2fd4abff6af4149f51b'),
        ),
      ),
    ).toBe('a8061dc1305136c6c22b8baf0c0127a9')
    const ones = 'ff'.repeat(16)
    const zero = '00'.repeat(16)
    for (const [r, s, data, tag] of [
      ['02' + '00'.repeat(15), zero, ones, '03' + '00'.repeat(15)],
      ['02' + '00'.repeat(15), ones, '02' + '00'.repeat(15), '03' + '00'.repeat(15)],
      [
        '01' + '00'.repeat(15),
        zero,
        ones + 'f0' + 'ff'.repeat(15) + '11' + '00'.repeat(15),
        '05' + '00'.repeat(15),
      ],
      ['01' + '00'.repeat(15), zero, ones + 'fb' + 'fe'.repeat(15) + '01'.repeat(16), zero],
      ['02' + '00'.repeat(15), zero, 'fd' + 'ff'.repeat(15), 'fa' + 'ff'.repeat(15)],
      [
        '0100000000000000' + '0400000000000000',
        zero,
        'e33594d7505e43b9' +
          '00'.repeat(8) +
          '3394d7505e4379cd01' +
          '00'.repeat(7) +
          zero +
          '01' +
          '00'.repeat(15),
        '14000000000000005500000000000000',
      ],
      [
        '0100000000000000' + '0400000000000000',
        zero,
        'e33594d7505e43b9' + '00'.repeat(8) + '3394d7505e4379cd01' + '00'.repeat(7) + zero,
        '13' + '00'.repeat(15),
      ],
    ] as const) {
      expect(toHex(poly1305(fromHex(data), fromHex(r + s)))).toBe(tag)
    }
  })

  /** RFC 8439 §2.8.2: the sunscreen text sealed, ciphertext then tag. */
  it('seals the RFC 8439 AEAD example', () => {
    expect(aead.encode(sunscreen, { key, nonce, aad })).toEqual({
      text: sealed,
      cipher: 'chacha20-poly1305',
      operation: 'encode',
      options: { key, nonce, aad },
    })
    expect(aead.decode(sealed, { key, nonce, aad }).text).toBe(sunscreen)
  })

  /** RFC 8439 A.5: a received ciphertext and tag that open to text with curly quotes. */
  it('opens the RFC 8439 A.5 message', () => {
    const ciphertext =
      '64a0861575861af460f062c79be643bd5e805cfd345cf389f108670ac76c8cb24c6cfc18755d43eea09ee94e382d26b0bdb7b73c321b0100d4f03b7f355894cf332f830e710b97ce98c8a84abd0b948114ad176e008d33bd60f982b1ff37c8559797a06ef4f0ef61c186324e2b3506383606907b6a7c02b0f9f6157b53c867e4b9166c767b804d46a59b5216cde7a4e99040c5a40433225ee282a1b0a06c523eaf4534d7f83fa1155b0047718cbc546a0d072b04b3564eea1b422273f548271a0bb2316053fa76991955ebd63159434ecebb4e466dae5a1073a6727627097a1049e617d91d361094fa68f0ff77987130305beaba2eda04df997b714d6c6f2c29a6ad5cb4022b02709b'
    const options = {
      key: '1c9240a5eb55d38af333888604f6b5f0473917c1402b80099dca5cbc207075c0',
      nonce: '000000000102030405060708',
      aad: 'f33388860000000000004e91',
    }
    expect(aead.decode(`${ciphertext}eead9d67890cbb22392336fea1851f38`, options).text).toBe(
      'Internet-Drafts are draft documents valid for a maximum of six months and may be updated, replaced, or obsoleted by other documents at any time. It is inappropriate to use Internet-Drafts as reference material or to cite them other than as /“work in progress./”',
    )
  })

  it('refuses a changed ciphertext, a wrong aad and a missing tag', () => {
    const mismatch =
      '[chacha20-poly1305] Tag does not match: wrong key, nonce or aad, or the ciphertext was changed'
    const flipped = `${sealed.slice(0, 10)}${sealed[10] === '0' ? '1' : '0'}${sealed.slice(11)}`
    expect(() => aead.decode(flipped, { key, nonce, aad })).toThrow(new CipherError(mismatch))
    expect(() => aead.decode(sealed, { key, nonce })).toThrow(new CipherError(mismatch))
    expect(() => aead.decode(sealed.slice(0, -2), { key, nonce, aad })).toThrow(
      new CipherError(mismatch),
    )
    expect(() => aead.decode('00'.repeat(15), { key, nonce })).toThrow(
      new CipherError('[chacha20-poly1305] Ciphertext must end in a 16-byte tag, got 15 bytes'),
    )
    expect(aead.encode('', { key, nonce }).text).toHaveLength(32)
    expect(aead.decode(aead.encode('', { key, nonce }).text, { key, nonce }).text).toBe('')
  })

  it('names a missing or malformed nonce and aad', () => {
    expect(() => aead.encode('', { key })).toThrow(new MissingOptionError('nonce'))
    expect(() => aead.encode('', { key, nonce: '00'.repeat(24) })).toThrow(/24 hex digits/)
    expect(() => aead.encode('', { key, nonce, aad: 'abc' })).toThrow(/whole bytes/)
  })
})

describe('chacha and salsa subpaths', () => {
  const bytes = (value: string) => Uint8Array.from(fromHex(value))
  const key = bytes('1c9240a5eb55d38af333888604f6b5f0473917c1402b80099dca5cbc207075c0')

  it('run the same streams on raw bytes', () => {
    const data = new TextEncoder().encode("'Twas brillig")
    const nonce = bytes('000000000000000000000002')
    const encrypted = chacha20(data, key, nonce, 42)
    expect(toHex([...encrypted])).toBe(
      create('chacha20').encode("'Twas brillig", {
        key: toHex([...key]),
        nonce: '000000000000000000000002',
        counter: 42,
      }).text,
    )
    expect(chacha20(encrypted, key, nonce, 42)).toEqual(data)
    expect(chacha20(new Uint8Array(), key, nonce)).toEqual(new Uint8Array())
    const longNonce = bytes('00'.repeat(24))
    expect(xchacha20(xchacha20(data, key, longNonce), key, longNonce)).toEqual(data)
    expect(
      salsa20(
        salsa20(data, key.subarray(0, 16), bytes('00'.repeat(8))),
        key.subarray(0, 16),
        bytes('00'.repeat(8)),
      ),
    ).toEqual(data)
    expect(xsalsa20(xsalsa20(data, key, longNonce, 7), key, longNonce, 7)).toEqual(data)
  })

  it('seals and opens with ChaCha20-Poly1305', () => {
    const data = new TextEncoder().encode('sunscreen')
    const nonce = bytes('070000004041424344454647')
    const aad = bytes('50515253')
    const sealedBytes = chacha20Poly1305(data, key, nonce, 'encrypt', aad)
    expect(sealedBytes).toHaveLength(data.length + 16)
    expect(chacha20Poly1305(sealedBytes, key, nonce, 'decrypt', aad)).toEqual(data)
    expect(() => chacha20Poly1305(sealedBytes, key, nonce, 'decrypt')).toThrow(/Tag does not match/)
    expect(() => chacha20Poly1305(data, key, nonce, 'sign' as 'encrypt')).toThrow(
      InvalidOptionError,
    )
  })

  it('name the length of a bad argument and never its bytes', () => {
    const nonce = new Uint8Array(12)
    expect(() => chacha20(new Uint8Array(), key.subarray(0, 31), nonce)).toThrow(
      new InvalidOptionError('key', '31 bytes', 'must be a Uint8Array of 32 bytes'),
    )
    expect(() => salsa20(new Uint8Array(), key.subarray(0, 24), new Uint8Array(8))).toThrow(
      new InvalidOptionError('key', '24 bytes', 'must be a Uint8Array of 16 or 32 bytes'),
    )
    expect(() => xchacha20(new Uint8Array(), key, nonce)).toThrow(/nonce=12 bytes/)
    expect(() => chacha20(new Uint8Array(), key, nonce, -1)).toThrow(/counter/)
    expect(() => chacha20(new Uint8Array(65), key, nonce, 0xffffffff)).toThrow(/runs past/)
    expect(() => xsalsa20([1, 2] as unknown as Uint8Array, key, new Uint8Array(24))).toThrow(
      new CipherError('[xsalsa20] Data must be a Uint8Array, got object'),
    )
  })
})

describe('bytes: hex', () => {
  const aesKey = '2b7e151628aed2a6abf7158809cf4f3c'
  const iv = '000102030405060708090a0b0c0d0e0f'

  /** The example from issue #191, and RFC 6229 section 2 for the 40-bit key at offset 0. */
  it('returns RC4 plaintext that is not UTF-8 as hex', () => {
    const rc4Cipher = create('rc4')
    expect(rc4Cipher.decode('00ff80aa', { key: '0102030405', bytes: 'hex' })).toEqual({
      text: 'b2c6e3af',
      cipher: 'rc4',
      operation: 'decode',
      options: { key: '0102030405', bytes: 'hex' },
    })
    expect(rc4Cipher.decode('00'.repeat(16), { key: '0102030405', bytes: 'hex' }).text).toBe(
      'b2396305f03dc027ccc3524a0a1118a8',
    )
    expect(() => rc4Cipher.decode('00ff80aa', { key: '0102030405' })).toThrow(/bytes: hex/)
  })

  /** RFC 4503 Appendix A.1: S[0] for the all-zero key, no IV. */
  it('returns the Rabbit keystream as hex for zero bytes', () => {
    expect(
      create('rabbit').decode('00'.repeat(16), { key: '00'.repeat(16), bytes: 'hex' }).text,
    ).toBe('b15754f036a5d6ecf56b45261c4af702')
  })

  /** NIST SP 800-38A F.2.1: the first CBC-AES128 block, then a PKCS#7 block of its own. */
  it('encrypts hex plaintext with AES-CBC and gives it back as hex', () => {
    const cbc = create('aes-cbc')
    const plaintext = '6bc1bee22e409f96e93d7e117393172a'
    const encoded = cbc.encode(plaintext.toUpperCase(), { key: aesKey, iv, bytes: 'hex' })
    expect(encoded.text).toHaveLength(64)
    expect(encoded.text.slice(0, 32)).toBe('7649abac8119b246cee98e9b12e9197d')
    expect(encoded.options).toEqual({ key: aesKey, mode: 'cbc', iv, bytes: 'hex' })
    expect(cbc.decode(encoded.text, { key: aesKey, iv, bytes: 'hex' }).text).toBe(plaintext)
  })

  /** openssl enc -aes-256-cbc -md md5 -S 0011223344556677 -pass pass:pw over the bytes 00 ff. */
  it('opens an aes-passphrase envelope around bytes that are not text', () => {
    const passphrase = create('aes-passphrase')
    const envelope = 'U2FsdGVkX18AESIzRFVmd8S/naEeWZgJMiYMWvAafTI='
    expect(passphrase.decode(envelope, { key: 'pw', bytes: 'hex' }).text).toBe('00ff')
    expect(
      passphrase.encode('00 ff', { key: 'pw', salt: '0011223344556677', bytes: 'hex' }).text,
    ).toBe(envelope)
    expect(() => passphrase.decode(envelope, { key: 'pw' })).toThrow(
      new CipherError(
        '[aes-passphrase] Decrypted bytes are not UTF-8 text; pass bytes: hex to get them as hex',
      ),
    )
  })

  it('leaves the result as it was without bytes', () => {
    expect(create('aes').encode('A', { key: aesKey })).toEqual({
      text: create('aes').encode('41', { key: aesKey, bytes: 'hex' }).text,
      cipher: 'aes',
      operation: 'encode',
      options: { key: aesKey, mode: 'ecb' },
    })
    expect(create('aes').encode('A', { key: aesKey, bytes: 'text' }).options).toEqual({
      key: aesKey,
      mode: 'ecb',
    })
  })

  it('refuses hex it cannot read and any other bytes value', () => {
    const aes = create('aes')
    expect(() => aes.encode('zz', { key: aesKey, bytes: 'hex' })).toThrow(
      new CipherError('[aes] Text must be hex digits when bytes is hex'),
    )
    expect(() => aes.encode('abc', { key: aesKey, bytes: 'hex' })).toThrow(
      new CipherError(
        '[aes] Text must be whole bytes (an even number of hex digits) when bytes is hex, got 3 hex digits',
      ),
    )
    for (const [name, key] of [
      ['aes', aesKey],
      ['rc4', '0102030405'],
      ['aes-passphrase', 'pw'],
    ] as const) {
      for (const bad of ['raw', 'HEX', 1]) {
        expect(() => create(name).encode('', { key, bytes: bad })).toThrow(InvalidOptionError)
        expect(() => create(name).decode('', { key, bytes: bad })).toThrow(InvalidOptionError)
      }
    }
  })
})

describe('info().worksOn', () => {
  const options: Record<string, CipherBaseOptions> = {
    substitution: { key: 'ZEBRAS' },
    vigenere: { key: 'LEMON' },
    beaufort: { key: 'KEY' },
    autokey: { key: 'QUEENLY' },
    alberti: { key: 'ALBERTI', period: 4 },
    playfair: { key: 'PLAYFAIR EXAMPLE' },
    columnar: { key: 'ZEBRA' },
    route: { width: 3 },
  }
  /** Book takes letters of any script, so it has its own test in its describe. */
  const classical = builtinCiphers.filter(
    (name) => create(name).info().category === 'classical' && name !== 'book',
  )
  const encode = (name: string, text: string): string =>
    create(name).encode(text, options[name]).text

  it.each(classical)('matches what %s does to the rest of the text', (name) => {
    const { worksOn } = create(name).info()
    if (worksOn.endsWith('the rest passes'))
      expect('€ßıé'.split('').filter((rest) => !encode(name, `AB${rest}1`).includes(rest))).toEqual(
        [],
      )
    else if (worksOn.endsWith('the rest dropped'))
      expect(encode(name, 'A€ßıB')).toBe(encode(name, 'AB'))
    else {
      expect(worksOn).toMatch(/^all\b.*, moved$/)
      expect(encode(name, 'AB €ß 1,').split('').sort()).toEqual('AB €ß 1,'.split('').sort())
    }
  })

  it('keeps a board filler outside A-Z in either case', () => {
    const key = 'ETAONRISBCDFGHJKLMPQéUVWXYZé'
    const board = create('straddling-checkerboard')
    expect(board.encode('Aé', { key }).text).toBe(board.encode('AÉ', { key }).text)
    expect(board.encode('Aé', { key }).text).not.toBe(board.encode('A', { key }).text)
  })

  it('leaves every line break out of the route grid', () => {
    expect(encode('route', 'AB\rC\u2028D\r\nE\u0085F\vG\fH')).toBe(encode('route', 'ABCDEFGH'))
  })
})
