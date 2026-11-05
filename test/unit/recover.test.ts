import { describe, expect, it } from 'vite-plus/test'
import { create } from '../../src/core/registry.ts'
import { InvalidOptionError } from '../../src/core/errors.ts'
import { homophonicSymbols } from '../../src/core/homophonic.ts'
import { recoverKey, type KeyRecoveryOptions } from '../../src/core/recover.ts'
import { ENGLISH_QUADGRAM_FIT, scoreQuadgrams } from '../../src/core/quadgrams.ts'
import '../../src/index.ts'

/*
 * The opening of Doyle's A Scandal in Bohemia, public domain and outside the ten books the
 * quadgram table was counted from.
 */
const SCANDAL =
  'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen.'

/* The paragraph after it, so a homophonic text runs past the 600 letters the search reads. */
const GRIT =
  "He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer, excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results. Grit in a sensitive instrument, or a crack in one of his own high-power lenses, would not be more disturbing than a strong emotion in a nature such as his."

/* Its first 132 letters, near the 150 issue #167 calls typical for hard puzzles. */
const SHORT =
  'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex.'

/* The invocation of Mickiewicz's Pan Tadeusz, public domain. */
const TADEUSZ =
  'Litwo! Ojczyzno moja! ty jesteś jak zdrowie. Ile cię trzeba cenić, ten tylko się dowie, Kto cię stracił. Dziś piękność twą w całej ozdobie Widzę i opisuję, bo tęsknię po tobie. Panno Święta, co jasnej bronisz Częstochowy I w Ostrej świecisz Bramie! Ty, co gród zamkowy Nowogródzki ochraniasz z jego wiernym ludem!'

/* Example 1.11 of Stinson's Cryptography: Theory and Practice, Vigenère under JANET. */
const STINSON =
  'CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBWRVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWIAKLXFPSKAUTEMNDCMGTSXMXBTUIADNGMGPSRELXNJELXVRVPRTULHDNQWTWDTYGBPHXTFALJHASVBFXNGLLCHRZBWELEKMSJIKNBHWRJGNMGJSGLXFEYPHAGNRBIEQJTAMRVLCRREMNDGLXRRIMGNSNRWCHRQHAEYEVTAQEBBIPEEWEVKAKOEWADREMXMTBHHCHRTKDNVRZCHRCLQOHPWQAIIWXNRMGWOIIFKEE'

/* The top candidate's key and text. */
function top(text: string, options: Readonly<KeyRecoveryOptions>): [string, string] {
  const [best] = recoverKey(text, options).candidates
  return [best?.key ?? '', best?.text ?? '']
}

/* Share of letters two texts of the same layout agree on. */
function sameLetters(text: string, expected: string): number {
  const letters = Array.from(expected).filter((letter) => /[A-Za-z]/.test(letter))
  const got = Array.from(text).filter((letter) => /[A-Za-z]/.test(letter))
  return letters.filter((letter, index) => letter === got[index]).length / letters.length
}

/* Substitute each letter through a cipher alphabet given for plaintext A to Z, case kept. */
function substitute(text: string, alphabet: string): string {
  return text.replaceAll(/[A-Za-z]/g, (letter) => {
    const cipher = alphabet[letter.toUpperCase().codePointAt(0)! - 65]!
    return letter === letter.toUpperCase() ? cipher : cipher.toLowerCase()
  })
}

/*
 * A homophonic encoding of the letters: each letter gets symbols in proportion to how often the
 * text uses it, at least one, and takes them in turn. Symbols are two-digit numbers, scrambled.
 */
function homophonic(text: string, symbols: number): string[] {
  const letters = Array.from(text.toUpperCase().replaceAll(/[^A-Z]/g, ''))
  const counts = new Map<string, number>()
  for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1)
  const shares = new Map([...counts.keys()].map((letter) => [letter, 1]))
  for (let given = shares.size; given < symbols; given++) {
    const [richest] = [...shares].sort(
      ([left, a], [right, b]) => counts.get(right)! / b - counts.get(left)! / a,
    )[0]!
    shares.set(richest, shares.get(richest)! + 1)
  }
  let next = 0
  const owned = new Map(
    [...shares].map(([letter, share]) => [
      letter,
      Array.from({ length: share }, () => String(10 + ((next++ * 37) % symbols))),
    ]),
  )
  const used = new Map<string, number>()
  return letters.map((letter) => {
    const turn = used.get(letter) ?? 0
    used.set(letter, turn + 1)
    const own = owned.get(letter)!
    return own[turn % own.length]!
  })
}

describe('recoverKey', () => {
  it('finds a Vigenère key without the key length', () => {
    const ciphertext = create('vigenere').encode(SCANDAL, { key: 'BOHEMIA' }).text

    expect(top(ciphertext, { cipher: 'vigenere' })).toEqual(['BOHEMIA', SCANDAL])
  })

  it('reads a Gronsfeld key back as the Vigenère key with letters A to J', () => {
    const ciphertext = create('gronsfeld').encode(SCANDAL, { key: '31415' }).text

    expect(top(ciphertext, { cipher: 'vigenere' })).toEqual(['DBEBF', SCANDAL])
  })

  it("reads Stinson's Example 1.11 under JANET", () => {
    const [key, text] = top(STINSON, { cipher: 'vigenere' })

    expect(key).toBe('JANET')
    expect(text).toMatch(/^THEALMONDTREEWASINTENTATIVEBLOSSOM/)
  })

  it('finds a Beaufort and a variant Beaufort key', () => {
    const beaufort = create('beaufort').encode(SCANDAL, { key: 'IRENEADLER' }).text
    const variant = create('vigenere').decode(SCANDAL, { key: 'WATSON' }).text

    expect(top(beaufort, { cipher: 'beaufort' })).toEqual(['IRENEADLER', SCANDAL])
    expect(top(variant, { cipher: 'variant-beaufort' })).toEqual(['WATSON', SCANDAL])
  })

  it('gives a key length that the estimate would not rank first', () => {
    const ciphertext = create('vigenere').encode(SHORT, { key: 'HOLMESWATSON' }).text

    expect(top(ciphertext, { cipher: 'vigenere', period: 12 })).toEqual(['HOLMESWATSON', SHORT])
  })

  it('ranks several keys for a short text, the right one first', () => {
    const recovery = recoverKey(create('vigenere').encode(SHORT, { key: 'CRYPTOGRAM' }).text, {
      cipher: 'vigenere',
    })

    expect(recovery.letters).toBe(132)
    expect(recovery.candidates.length).toBeGreaterThan(1)
    expect(recovery.candidates[0]).toMatchObject({ key: 'CRYPTOGRAM', text: SHORT })
    expect(recovery.candidates.map(({ fit }) => fit)).toEqual(
      recovery.candidates.map(({ fit }) => fit).sort((left, right) => right - left),
    )
  })

  it('reports a key repeated within its length once, at its shortest', () => {
    const ciphertext = create('vigenere').encode(SCANDAL, { key: 'KEYKEY' }).text

    expect(top(ciphertext, { cipher: 'vigenere', period: 6 })).toEqual(['KEY', SCANDAL])
  })

  it('scores Polish by letters and prefers the shorter key', () => {
    const ciphertext = create('vigenere').encode(TADEUSZ, { key: 'POLSKA' }).text
    const recovery = recoverKey(ciphertext, { cipher: 'vigenere', language: 'pl' })

    expect(recovery.scoredBy).toBe('letters')
    expect(recovery.candidates[0]).toMatchObject({ key: 'POLSKA', text: TADEUSZ })
    expect(recovery.candidates.map(({ key }) => key)).toContain('PWLSKAPOLSKA')
  })

  /** The text has no J, Q or Z, so the solver leaves their cells as ?. */
  it('solves a mixed alphabet substitution', () => {
    const alphabet = 'QWERTYUIOPASDFGHJKLZXCVBNM'
    const ciphertext = substitute(SCANDAL, alphabet)
    const [key, text] = top(ciphertext, { cipher: 'substitution' })

    expect(text).toBe(SCANDAL)
    expect(key).toBe('QWERTYUIO?ASDFGH?KLZXCVBN?')
    expect(create('substitution').encode(SCANDAL, { key: alphabet }).text).toBe(ciphertext)
    expect(create('substitution').decode(ciphertext, { key }).text).toBe(SCANDAL)
  })

  it('reads most of a short Atbash text, ? for the letters it lacks', () => {
    const recovery = recoverKey(create('atbash').encode(SHORT).text, { cipher: 'substitution' })
    const [best] = recovery.candidates

    expect(recovery.candidates.length).toBeGreaterThan(1)
    expect(sameLetters(best!.text, SHORT)).toBeGreaterThan(0.95)
    expect(best!.key.replaceAll('?', '')).toHaveLength(
      new Set(SHORT.toUpperCase().replaceAll(/[^A-Z]/g, '')).size,
    )
  })

  it('assigns a letter that shows only past the searched start', () => {
    const late = `${SCANDAL} ${SCANDAL} Quiet, said the judge.`
    const [key, text] = top(create('atbash').encode(late).text, { cipher: 'substitution' })

    expect(SCANDAL).not.toMatch(/[jq]/i)
    expect(key[9]).toBe('Q')
    expect(key[16]).toBe('J')
    expect(text).toBe(late)
  })

  it('finds a columnar key as a keyword columnar decodes with', () => {
    const ciphertext = create('columnar').encode(SCANDAL, { key: 'ZEBRAS' }).text
    const [key, text] = top(ciphertext, { cipher: 'columnar' })

    expect(key).toBe('FCBDAE')
    expect(text).toBe(SCANDAL)
    expect(create('columnar').decode(ciphertext, { key }).text).toBe(SCANDAL)
  })

  it('searches a columnar key as long as the text, or longer', () => {
    for (const keyLength of [4, 6]) {
      const { candidates } = recoverKey('NEHT', { cipher: 'columnar', keyLength })

      expect(candidates.length).toBeGreaterThan(0)
      for (const { key, text } of candidates) {
        expect(create('columnar').decode('NEHT', { key }).text).toBe(text)
      }
    }
  })

  it('takes a columnar key length up to nine', () => {
    const ciphertext = create('columnar').encode(SCANDAL, { key: 'WATSONKEY' }).text

    expect(top(ciphertext, { cipher: 'columnar', keyLength: 9 })).toEqual(['HAGFEDCBI', SCANDAL])
  })

  it('reads English near the reference fit and gives the same answer twice', () => {
    const ciphertext = create('atbash').encode(SCANDAL).text
    const first = recoverKey(ciphertext, { cipher: 'substitution', limit: 3 })

    expect(first.candidates[0]!.fit).toBeGreaterThan(ENGLISH_QUADGRAM_FIT - 0.5)
    expect(first.randomFit).toBeLessThan(first.referenceFit - 2)
    expect(recoverKey(ciphertext, { cipher: 'substitution', limit: 3 })).toEqual(first)
  })

  it('ranks every key on the whole text before the limit cuts', () => {
    let seed = 3
    const junk = Array.from({ length: 600 }, () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
      return 'QXZJVKWY'[Math.floor((seed / 2_147_483_648) * 8)]
    }).join('')
    const ciphertext = create('vigenere').encode(`${junk} ${TADEUSZ.repeat(3)}`, {
      key: 'POLSKA',
    }).text
    const options = { cipher: 'vigenere', language: 'pl' } as const

    expect(recoverKey(ciphertext, { ...options, limit: 1 }).candidates[0]).toEqual(
      recoverKey(ciphertext, { ...options, limit: 5 }).candidates[0],
    )
  })

  it('returns no candidates for a text without enough letters', () => {
    expect(recoverKey('ABC', { cipher: 'vigenere', period: 1 }).candidates).toEqual([])
    expect(recoverKey('', { cipher: 'vigenere' }).candidates).toEqual([])
    expect(recoverKey('123 456', { cipher: 'columnar' }).candidates).toEqual([])
    expect(recoverKey('ABC', { cipher: 'substitution' }).candidates).toEqual([])
    expect(recoverKey('12 34 56', { cipher: 'homophonic' }).candidates).toEqual([])
  })

  it('refuses options the cipher does not take', () => {
    for (const options of [
      { cipher: 'enigma' },
      { cipher: 'substitution', period: 3 },
      { cipher: 'vigenere', keyLength: 3 },
      { cipher: 'vigenere', period: 0 },
      { cipher: 'columnar', keyLength: 10 },
      { cipher: 'columnar', keyLength: 1 },
      { cipher: 'columnar', language: 'pl' },
      { cipher: 'substitution', language: 'ja' },
      { cipher: 'vigenere', language: 'de' },
      { cipher: 'vigenere', limit: 0 },
      { cipher: 'columnar', limit: 21 },
      { cipher: 'homophonic', language: 'pl' },
      { cipher: 'homophonic', period: 2 },
      { cipher: 'vigenere', symbolWidth: 2 },
      { cipher: 'homophonic', symbolWidth: 0 },
      { cipher: 'homophonic', symbolWidth: 9 },
      { cipher: 'homophonic', symbolWidth: 1.5 },
    ]) {
      expect(() => recoverKey(SCANDAL, options as KeyRecoveryOptions)).toThrow(InvalidOptionError)
    }
  })
})

describe('recoverKey with homophonic', () => {
  const PLAIN = `${SCANDAL} ${GRIT}`

  it('reads back over 90% of the letters with 50 to 90 symbols', () => {
    for (const symbols of [50, 70, 90]) {
      const ciphertext = homophonic(PLAIN, symbols).join(' ')
      const [best] = recoverKey(ciphertext, { cipher: 'homophonic', limit: 1 }).candidates

      expect(sameLetters(best!.text, PLAIN.toUpperCase())).toBeGreaterThan(0.9)
    }
  }, 30_000)

  it('scores symbols in no order near the fit of the same symbols shuffled', () => {
    for (const [start, symbols, length] of [
      [7, 60, 600],
      [11, 40, 2000],
    ] as const) {
      let seed: number = start
      const noise = Array.from({ length }, () => {
        seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
        return String(10 + Math.floor((seed / 2_147_483_648) * symbols))
      })
      const random = recoverKey(noise.join(' '), { cipher: 'homophonic', limit: 1 })

      expect(Math.abs(random.candidates[0]!.fit - random.randomFit)).toBeLessThan(0.08)
    }
    const english = recoverKey(homophonic(PLAIN, 60).join(' '), { cipher: 'homophonic', limit: 1 })

    expect(english.candidates[0]!.fit - english.randomFit).toBeGreaterThan(1)
    expect(english.randomFit).toBeGreaterThan(scoreQuadgrams('QXZJ')!.randomFit)
  }, 40_000)

  it('splits symbols on whitespace and commas, or by width with both skipped', () => {
    expect(homophonicSymbols(' 12, 34\n5\u00A0†‡ ,,')).toEqual(['12', '34', '5', '†‡'])
    expect(homophonicSymbols('1234\n56, 78', 2)).toEqual(['12', '34', '56', '78'])
    expect(homophonicSymbols('†‡𝔄𝔅', 2)).toEqual(['†‡', '𝔄𝔅'])
    expect(homophonicSymbols('', 3)).toEqual([])
  })

  it('keys each letter with its own symbols, and maps each symbol to its letter', () => {
    const symbols = homophonic(PLAIN, 50)
    const spaced = recoverKey(symbols.join(' '), { cipher: 'homophonic', limit: 2 })
    const [best] = spaced.candidates

    expect(spaced.letters).toBe(symbols.length)
    expect(Array.from(best!.text)).toEqual(symbols.map((symbol) => best!.map![symbol]))
    expect(best!.key).toMatch(/^[A-Z]=\d\d( \d\d)*(, [A-Z]=\d\d( \d\d)*)*$/)
    const groups = best!.key.split(', ')
    const letters = groups.map((group) => group[0])
    expect(letters).toEqual([...letters].sort())
    expect(
      Object.fromEntries(
        groups.flatMap((group) =>
          group
            .slice(2)
            .split(' ')
            .map((symbol) => [symbol, group[0]]),
        ),
      ),
    ).toEqual(best!.map)
  }, 15_000)

  it('refuses a width that leaves characters over', () => {
    expect(() => recoverKey('12 34 5', { cipher: 'homophonic', symbolWidth: 2 })).toThrow(
      'Invalid option symbolWidth=2: leaves 1 of 5 characters over, so the symbols do not line up',
    )
  })
})

describe('scoreQuadgrams', () => {
  it('gives every candidate text the fit recoverKey ranked it by', () => {
    const recoveries = [
      recoverKey(STINSON, { cipher: 'vigenere', limit: 5 }),
      recoverKey(create('atbash').encode(SHORT).text, { cipher: 'substitution', limit: 3 }),
      recoverKey(create('columnar').encode(SHORT, { key: 'BAKER' }).text, {
        cipher: 'columnar',
        limit: 3,
      }),
    ]
    for (const recovery of recoveries) {
      expect(recovery.candidates.length).toBeGreaterThan(1)
      for (const { fit, text } of recovery.candidates) {
        expect(scoreQuadgrams(text)).toEqual({
          letters: recovery.letters,
          fit,
          referenceFit: recovery.referenceFit,
          randomFit: recovery.randomFit,
        })
      }
    }
  })

  it('reads only the A-Z letters, case ignored', () => {
    expect(scoreQuadgrams('To Sherlock Holmes, she is always the woman.')).toEqual(
      scoreQuadgrams('TOSHERLOCKHOLMESSHEISALWAYSTHEWOMAN'),
    )
  })

  it('puts English near the reference and its ciphertext near random letters', () => {
    const plain = scoreQuadgrams(SCANDAL)!
    const cipher = scoreQuadgrams(create('vigenere').encode(SCANDAL, { key: 'IRENE' }).text)!

    expect(plain.fit).toBeGreaterThan(plain.referenceFit - 0.5)
    expect(cipher.fit).toBeLessThan(plain.randomFit + 2)
  })

  it('returns undefined below four letters', () => {
    expect(scoreQuadgrams('ab c!')).toBeUndefined()
    expect(scoreQuadgrams('')).toBeUndefined()
    expect(scoreQuadgrams('abcd')?.letters).toBe(4)
  })
})
