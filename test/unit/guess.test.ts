import { describe, expect, it } from 'vite-plus/test'
import { InvalidOptionError } from '../../src/core/errors.ts'
import { analyzeFrequency } from '../../src/core/frequency.ts'
import { guessFamily, type FamilyGuess } from '../../src/core/guess.ts'
import { create } from '../../src/core/registry.ts'

/** Stinson, Cryptography: Theory and Practice (1995), Example 1.11, Vigenère with keyword JANET. */
const STINSON_VIGENERE =
  'CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBWRVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWIAKLXFPSKAUTEMNDCMGTSXMXBTUIADNGMGPSRELXNJELXVRVPRTULHDNQWTWDTYGBPHXTFALJHASVBFXNGLLCHRZBWELEKMSJIKNBHWRJGNMGJSGLXFEYPHAGNRBIEQJTAMRVLCRREMNDGLXRRIMGNSNRWCHRQHAEYEVTAQEBBIPEEWEVKAKOEWADREMXMTBHHCHRTKDNVRZCHRCLQOHPWQAIIWXNRMGWOIIFKEE'

/** Stinson, Example 1.10, affine with a = 3 and b = 5. */
const STINSON_AFFINE = 'FMXVEDKAPHFERBNDKRXRSREFMORUDSDKDVSHVUFEDKAPRKDLYEVLRHHRH'

/** Dickens, A Tale of Two Cities, the opening. */
const DICKENS =
  'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness'

/** Mickiewicz, Pan Tadeusz, the opening lines. */
const MICKIEWICZ =
  'Litwo! Ojczyzno moja! ty jesteś jak zdrowie. Ile cię trzeba cenić, ten tylko się dowie, kto cię stracił. Dziś piękność twą w całej ozdobie widzę i opisuję, bo tęsknię po tobie.'

/**
 * The first cipher of each candidate, with its confidence.
 *
 * @param guess - A guess.
 * @returns {string[]} One `cipher:confidence` per candidate.
 */
function ranking(guess: FamilyGuess): string[] {
  return guess.candidates.map(({ ciphers, confidence }) => `${ciphers[0]}:${confidence}`)
}

describe('guessFamily', () => {
  it("puts Stinson's Vigenère among the polyalphabetic ciphers", () => {
    const guess = guessFamily(STINSON_VIGENERE)
    expect(guess.letters).toBe(313)
    expect(guess.candidates[0]).toMatchObject({
      families: ['polyalphabetic'],
      ciphers: [
        'vigenere',
        'gronsfeld',
        'beaufort',
        'porta',
        'autokey',
        'running-key',
        'trithemius',
        'alberti',
      ],
      confidence: 'high',
    })
  })

  it("finds Stinson's affine key, and the key reads his plaintext", () => {
    const guess = guessFamily(STINSON_AFFINE)
    expect(guess.ic).toBe(analyzeFrequency(STINSON_AFFINE)!.ic)
    expect(guess.candidates).toHaveLength(1)
    const [top] = guess.candidates
    expect(top).toMatchObject({ ciphers: ['affine', 'caesar', 'atbash'], options: { a: 3, b: 5 } })
    expect(create('affine').decode(STINSON_AFFINE, top!.options).text).toBe(
      'ALGORITHMSAREQUITEGENERALDEFINITIONSOFARITHMETICPROCESSES',
    )
  })

  it('names the Caesar shift, ROT13 and Atbash by the key that reads', () => {
    expect(guessFamily(create('caesar').encode(DICKENS, { shift: 3 }).text).candidates[0]).toEqual(
      expect.objectContaining({ ciphers: ['caesar', 'atbash', 'affine'], options: { shift: 3 } }),
    )
    expect(guessFamily(create('rot13').encode(DICKENS).text).candidates[0]?.signal).toContain(
      'Caesar shift 13 (ROT13)',
    )
    const atbash = guessFamily(create('atbash').encode(DICKENS).text).candidates[0]!
    expect(atbash.ciphers[0]).toBe('atbash')
    expect(atbash).not.toHaveProperty('options')
  })

  it('reads a Polish Caesar against the Polish table', () => {
    const encoded = create('caesar').encode(MICKIEWICZ, { shift: 10 }).text
    expect(guessFamily(encoded, 'pl').candidates[0]).toMatchObject({
      ciphers: ['caesar', 'atbash', 'affine'],
      options: { shift: 10 },
    })
  })

  it('puts a mixed alphabet first when one alphabet fits and no simple key does', () => {
    const mixed = create('substitution').encode(DICKENS, { key: 'ZEBRAS' }).text
    expect(guessFamily(mixed).candidates[0]).toMatchObject({
      families: [
        'substitution-keyed',
        'substitution-shift',
        'substitution-reflection',
        'substitution-multiplicative',
      ],
      ciphers: ['substitution', 'caesar', 'atbash', 'affine'],
    })
    expect(guessFamily(mixed).candidates[0]).not.toHaveProperty('options')
  })

  it('takes letters that fit the language as moved, not replaced', () => {
    for (const encoded of [
      create('rail-fence').encode(DICKENS, { rails: 4 }).text,
      create('columnar').encode(DICKENS, { key: 'ZEBRAS' }).text,
    ]) {
      expect(guessFamily(encoded).candidates[0]).toMatchObject({
        families: ['transposition'],
        confidence: 'high',
      })
    }
    expect(ranking(guessFamily('WECRLTEERDSOEEFEAOCAIVDEN'))).toEqual(['rail-fence:low'])
  })

  it("lists Wikipedia's Playfair, but only with low confidence on 26 letters", () => {
    const guess = guessFamily('BMODZBXDNABEKUDMUIXMMOUVIF')
    expect(ranking(guess)).toContain('playfair:low')
    expect(guess.candidates.every(({ confidence }) => confidence === 'low')).toBe(true)
    const long = guessFamily(
      create('playfair').encode(`${DICKENS} ${DICKENS}`, { key: 'MONARCHY' }).text,
    )
    expect(long.candidates[0]).toMatchObject({ ciphers: ['playfair'], confidence: 'high' })
  })

  it('names four-square for an even count with a doubled pair, next to bifid', () => {
    const encoded = create('four-square').encode(`${DICKENS} ${DICKENS}`, {
      key: 'EXAMPLE',
      secondKey: 'KEYWORD',
    }).text
    expect(encoded).toMatch(/^(?:..)*?(.)\1/)
    expect(ranking(guessFamily(encoded)).slice(0, 2)).toEqual(['bifid:high', 'four-square:high'])
    expect(ranking(guessFamily(encoded))).not.toContain('playfair:high')
    expect(
      guessFamily(encoded).candidates.find(({ ciphers }) => ciphers[0] === 'four-square'),
    ).toMatchObject({ families: ['digraph'] })
    expect(ranking(guessFamily(`${encoded}A`)).filter((entry) => entry.startsWith('four'))).toEqual(
      [],
    )
  })

  it('never puts four-square ahead of bifid, whatever the length', () => {
    const encoded = create('four-square').encode(`${DICKENS} ${DICKENS}`, {
      key: 'EXAMPLE',
      secondKey: 'KEYWORD',
    }).text
    for (const length of [240, 260, 280]) {
      const top = ranking(guessFamily(encoded.slice(0, length))).slice(0, 2)
      expect(top.map((entry) => entry.split(':')[0])).toEqual(['bifid', 'four-square'])
      expect(new Set(top.map((entry) => entry.split(':')[1])).size).toBe(1)
    }
  })

  it('keeps four-square one step behind Playfair when no pair doubles', () => {
    const encoded = create('playfair').encode(`${DICKENS} ${DICKENS}`, { key: 'MONARCHY' }).text
    expect(ranking(guessFamily(encoded))).toContain('four-square:medium')
  })

  it('points at Hill for flat blocks with a J, after the periodic ciphers', () => {
    for (const key of ['DDCF', 'GYBNQKURP']) {
      const encoded = create('hill').encode(`${DICKENS} ${DICKENS}`, { key }).text
      expect(encoded).toMatch(/J/)
      expect(ranking(guessFamily(encoded))).toContain('hill:medium')
      expect(guessFamily(encoded).candidates[0]?.ciphers[0]).toBe('vigenere')
      expect(
        guessFamily(encoded).candidates.find(({ ciphers }) => ciphers[0] === 'hill'),
      ).toMatchObject({
        families: ['polygraphic'],
      })
    }
  })

  it('reads Hill in groups of five, but not with punctuation, without a J or in one alphabet', () => {
    const encoded = create('hill').encode(`${DICKENS} ${DICKENS}`, { key: 'DDCF' }).text
    const hill = (text: string) =>
      ranking(guessFamily(text)).filter((entry) => entry.startsWith('hill'))
    expect(hill(encoded.replaceAll(/(.{5})/g, '$1 '))).toEqual(['hill:medium'])
    expect(hill(`${encoded}.`)).toEqual([])
    expect(hill(encoded.replaceAll('J', 'K'))).toEqual([])
    expect(hill(create('atbash').encode(DICKENS, { stripNonAlpha: true }).text)).toEqual([])
  })

  it("points at Nihilist for Wikipedia's sums, and lets a 1 at the end rule it out", () => {
    const encoded = create('nihilist').encode(DICKENS, { key: 'RUSSIAN', square: 'ZEBRAS' }).text
    expect(ranking(guessFamily(encoded))).toEqual(['nihilist:medium'])
    expect(guessFamily(encoded).candidates[0]?.families).toEqual(['fractionation'])
    expect(ranking(guessFamily('37 106 62'))).toEqual(['nihilist:low'])
    expect(ranking(guessFamily('37 106 61'))).toEqual([])
    expect(ranking(guessFamily('37 111 62'))).toEqual([])
    const low = create('nihilist').encode('AAAAAAAAAA', { key: 'E' }).text
    expect(ranking(guessFamily(low))).toEqual(['a1z26:high', 'nihilist:medium'])
  })

  it('reads punctuation in place of letters as ROT47', () => {
    expect(ranking(guessFamily(create('rot47').encode(DICKENS).text))).toEqual(['rot47:high'])
  })

  it('reads the layouts of the fractionating ciphers', () => {
    const word = 'ATTACK AT DAWN'
    expect(ranking(guessFamily(create('morse').encode(word).text))).toEqual(['morse:high'])
    expect(ranking(guessFamily(create('polybius').encode(word).text))[0]).toBe('polybius:high')
    expect(ranking(guessFamily(create('tap-code').encode(word).text))).toEqual([
      'tap-code:high',
      'polybius:low',
    ])
    expect(ranking(guessFamily('1144441113251144'))[0]).toBe('polybius:medium')
    expect(ranking(guessFamily(create('a1z26').encode(word).text))).toEqual(['a1z26:high'])
    const [dotted] = guessFamily('1.12.16.8.1.2.5.20').candidates
    expect(dotted?.signal).toContain('split by "."')
    expect(ranking(guessFamily('12 34 56 78')).join()).not.toContain('a1z26')
    expect(ranking(guessFamily(create('adfgvx').encode(word).text))).toEqual(['adfgvx:high'])
    expect(
      ranking(guessFamily(create('adfgvx').encode(word, { transposition: 'CARGO' }).text)),
    ).toEqual(['adfgvx:high'])
    expect(ranking(guessFamily(create('bacon').encode(word).text))).toEqual(['bacon:high'])
    const [other] = guessFamily('XYYXX YXXYX XXYYY').candidates
    expect(other).toMatchObject({ ciphers: ['bacon'], confidence: 'medium' })
    expect(other?.signal).toContain('bacon reads only A and B')
  })

  it('sorts hex by block length', () => {
    expect(ranking(guessFamily('69c4e0d86a7b0430d8cdb78070b4c55a'))).toEqual([
      'aes:high',
      'des:medium',
      'aes-ctr:low',
    ])
    expect(ranking(guessFamily('85E813540F0AB405'))).toEqual(['des:high', 'aes-ctr:low'])
    expect(ranking(guessFamily('6e4c6ff5b2ba'))).toEqual(['aes-ctr:high'])
    expect(guessFamily('69c4e0d86a7b0430d8cdb78070b4c55a')).not.toHaveProperty('ic')
  })

  it('knows the CryptoJS passphrase envelope', () => {
    expect(ranking(guessFamily('U2FsdGVkX18BI0VniavN73vYVeKsrRmd74V3dwhYQ3E='))).toEqual([
      'aes-passphrase:high',
    ])
  })

  /** The message from issue #165, written by GnuPG 2.4; Morse must not read its dashes. */
  it('knows an armored OpenPGP message', () => {
    const armor = `-----BEGIN PGP MESSAGE-----

jA0ECQMKHwVT8OzL5gn90lIBzGgrwInQTM+5oFODSD8QMJaarJsJ7kftcv4jWWpP
2I2U9qLHZ83SeQ1Ol/i2LutftOLxNYgigrj7idS03A5V1Psl+79RGbXLRDgSQKr7
Co2B
=XQvs
-----END PGP MESSAGE-----`
    expect(ranking(guessFamily(armor))).toEqual(['openpgp:high'])
    expect(ranking(guessFamily(`See below.\n\n${armor}\n`))).toEqual(['openpgp:high'])
  })

  it('keeps the confidence low on a short text and guesses nothing below ten letters', () => {
    const short = guessFamily(
      create('vigenere').encode('MEET ME AT THE OLD MILL', { key: 'KEY' }).text,
    )
    expect(short.candidates.length).toBeGreaterThan(0)
    expect(short.candidates.every(({ confidence }) => confidence === 'low')).toBe(true)
    expect(guessFamily('hi')).toMatchObject({ length: 2, letters: 2, candidates: [] })
    expect(guessFamily('')).toMatchObject({ length: 0, letters: 0, candidates: [] })
    expect(guessFamily('9 8 7 6 0')).toMatchObject({ letters: 0, candidates: [] })
    expect(guessFamily(' \n\t ').candidates).toEqual([])
    for (const tiny of ['1', '12', '-', '00000000']) {
      expect(guessFamily(tiny).candidates.map(({ confidence }) => confidence)).not.toContain('high')
      expect(guessFamily(tiny).candidates.map(({ confidence }) => confidence)).not.toContain(
        'medium',
      )
    }
  })

  it('reports the families info() gives each cipher', () => {
    const texts = [
      STINSON_VIGENERE,
      STINSON_AFFINE,
      create('enigma').encode(DICKENS).text,
      create('bifid').encode(DICKENS, { key: 'MONARCHY' }).text,
      '69c4e0d86a7b0430d8cdb78070b4c55a',
      '6e4c6ff5b2ba',
    ]
    for (const text of texts) {
      for (const { families, ciphers } of guessFamily(text).candidates) {
        expect(families).toEqual([...new Set(ciphers.map((name) => create(name).info().family))])
      }
    }
  })

  it('refuses a language without a table', () => {
    expect(() => guessFamily('TEXT', 'de' as 'en')).toThrow(InvalidOptionError)
  })
})
