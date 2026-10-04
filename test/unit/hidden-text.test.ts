import { describe, expect, it } from 'vite-plus/test'
import { InvalidOptionError, MissingOptionError } from '../../src/core/errors.ts'
import { meanPairLift } from '../../src/core/frequency.ts'
import {
  hiddenTextPicks,
  rankHiddenText,
  readHiddenText,
  type HiddenTextOptions,
} from '../../src/core/hidden-text.ts'

/* Carroll, Through the Looking-Glass (Project Gutenberg #12), the closing poem: an acrostic of Alice Pleasance Liddell. */
const CARROLL = `A boat beneath a sunny sky,
Lingering onward dreamily
In an evening of July—

Children three that nestle near,
Eager eye and willing ear,
Pleased a simple tale to hear—

Long has paled that sunny sky:
Echoes fade and memories die.
Autumn frosts have slain July.

Still she haunts me, phantomwise,
Alice moving under skies
Never seen by waking eyes.

Children yet, the tale to hear,
Eager eye and willing ear,
Lovingly shall nestle near.

In a Wonderland they lie,
Dreaming as the days go by,
Dreaming as the summers die:

Ever drifting down the stream—
Lingering in the golden gleam—
Life, what is it but a dream?`

/* Poe, A Valentine (Wikisource, Works of 1859): the first letter of the first line, the second of the second, and so on, spell Frances Sargent Osgood. */
const POE = `For her this rhyme is penned, whose luminous eyes,
Brightly expressive as the twins of Lœda,
Shall find her own sweet name, that, nestling lies
Upon the page, enwrapped from every reader.
Search narrowly the lines!—they hold a treasure
Divine—a talisman—an amulet
That must be worn at heart. Search well the measure—
The words—the syllables! Do not forget
The trivialest point, or you may lose your labor!
And yet there is in this no Gordian knot
Which one might not undo without a sabre,
If one could merely comprehend the plot.
Enwritten upon the leaf where now are peering
Eyes scintillating soul, there lie perdus
Three eloquent words oft uttered in the hearing
Of poets, by poets—as the name is a poet's, too.
Its letters, although naturally lying
Like the knight Pinto—Mendez Ferdinando—
Still form a synonym for Truth.—Cease trying!
You will not read the riddle, though you do the best you can do.`

/* Kahn, The Codebreakers, via the Wikipedia null cipher article: a German telegram of 1917, first letter of every word. */
const PRESIDENT =
  "PRESIDENT'S EMBARGO RULING SHOULD HAVE IMMEDIATE NOTICE. GRAVE SITUATION AFFECTING INTERNATIONAL LAW. STATEMENT FORESHADOWS RUIN OF MANY NEUTRALS. YELLOW JOURNALS UNIFYING NATIONAL EXCITEMENT IMMENSELY."

/* Kahn, via Kessler, An Overview of Steganography (2015): the same message in the second letter of every word. */
const NEUTRAL =
  "Apparently neutral's protest is thoroughly discounted and ignored. Isman hard hit. Blockade issue affects pretext for embargo on by-products, ejecting suets and vegetable oils."

/* FBI, Cryptanalysts: Breaking Codes to Stop Crime, Part 1 (2011), via Wikipedia: every fifth word from the fifth. */
const INMATE =
  "SALUDOS LOVED ONE SO TODAY I HEARD FROM UNCLE MOE OVER THE PHONE. HE TOLD ME THAT YOU AND ME GO THE SAME BIRTHDAY. HE SAYS YOUR TIME THERE TESTED YOUR STRENGTH SO STAY POSITIVE AT SUCH TIMES. I'M FOR ALL THAT CLEAN LIVING! METHAMPHETAMINES WAS MY DOWN FALL."

/* Dickens, A Tale of Two Cities, the opening: prose with nothing hidden in it. */
const DICKENS =
  'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way.'

describe('readHiddenText', () => {
  it('reads the first letter of every line, skipping blank ones', () => {
    expect(readHiddenText(CARROLL, { pick: 'line' })).toBe('ALICEPLEASANCELIDDELL')
  })

  it('reads the diagonal of the letters, not the characters', () => {
    expect(readHiddenText(POE, { pick: 'diagonal' })).toBe('Francessargentosgood')
  })

  it('reads a letter of every word', () => {
    expect(readHiddenText(PRESIDENT, { pick: 'word' })).toBe('PERSHINGSAILSFROMNYJUNEI')
    expect(readHiddenText(NEUTRAL, { pick: 'word', letter: 2 })).toBe('pershingsailsfromnyjunei')
  })

  it('reads every nth word from a start', () => {
    expect(readHiddenText(INMATE, { pick: 'every-word', every: 5, start: 5 })).toBe(
      'TODAY MOE TOLD ME HE TESTED POSITIVE FOR METHAMPHETAMINES',
    )
  })

  it('reads every nth letter from a start', () => {
    expect(readHiddenText('ab cd, ef-gh ij', { pick: 'every-letter', every: 3, start: 2 })).toBe(
      'beh',
    )
    expect(readHiddenText('abcdef', { pick: 'every-letter', every: 2 })).toBe('ace')
  })

  it('counts from the end with a negative letter and down-left', () => {
    expect(readHiddenText('one two three', { pick: 'word', letter: -1 })).toBe('eoe')
    expect(readHiddenText('abc\ndef\nghi', { pick: 'diagonal', direction: 'down-left' })).toBe(
      'ceg',
    )
    expect(readHiddenText('abc\ndef\nghi', { pick: 'diagonal', start: 2 })).toBe('bf')
  })

  it('splits sentences after closing quotes and paragraphs at blank lines', () => {
    const text = 'He said "Stop." Then left!  Over? Yes…\tEnd'
    expect(readHiddenText(text, { pick: 'sentence' })).toBe('HTOYE')
    expect(readHiddenText('Alpha\nbeta\n\n  \nGamma\r\n\r\nDelta', { pick: 'paragraph' })).toBe(
      'AGD',
    )
  })

  it('takes any letter with its combining marks and skips what is too short', () => {
    expect(readHiddenText('Żółw e\u0301a\u0301 x', { pick: 'word', letter: 2 })).toBe('óa\u0301')
    expect(readHiddenText('a bb ccc', { pick: 'word', letter: 3 })).toBe('c')
    expect(readHiddenText('123 ... !!!', { pick: 'line' })).toBe('')
  })

  it('refuses options the pick does not take and values out of range', () => {
    const cases: ReadonlyArray<readonly [HiddenTextOptions, string]> = [
      [{ pick: 'word', letter: 0 }, 'Invalid option letter=0: must be a nonzero integer'],
      [{ pick: 'word', letter: 1.5 }, 'Invalid option letter=1.5: must be a nonzero integer'],
      [{ pick: 'line', every: 2 }, 'Invalid option every=2: does not apply to pick line'],
      [{ pick: 'diagonal', letter: 2 }, 'Invalid option letter=2: does not apply to pick diagonal'],
      [
        { pick: 'every-letter', every: 0 },
        'Invalid option every=0: must be an integer of at least 1',
      ],
      [
        { pick: 'every-word', every: 2, start: 0 },
        'Invalid option start=0: must be an integer of at least 1',
      ],
      [
        { pick: 'diagonal', direction: 'up' as 'down-left' },
        'Invalid option direction=up: must be down-right or down-left',
      ],
      [
        { pick: 'column' as 'line' },
        `Invalid option pick=column: must be ${hiddenTextPicks.join(', ')}`,
      ],
    ]
    for (const [options, message] of cases) {
      expect(() => readHiddenText('abc', options)).toThrow(InvalidOptionError)
      expect(() => readHiddenText('abc', options)).toThrow(message)
    }
    expect(() => readHiddenText('abc', { pick: 'every-letter' })).toThrow(MissingOptionError)
  })
})

describe('meanPairLift', () => {
  it('puts English above zero and letters picked at random below', () => {
    expect(meanPairLift('ALICEPLEASANCELIDDELL', 'en')).toBeGreaterThan(0)
    expect(
      meanPairLift(readHiddenText(DICKENS, { pick: 'every-letter', every: 7 }), 'en'),
    ).toBeLessThan(0)
  })

  it('has nothing to say without a pair table or two letters', () => {
    expect(meanPairLift('ALICE', 'pl')).toBeUndefined()
    expect(meanPairLift('A.', 'en')).toBeUndefined()
  })
})

describe('rankHiddenText', () => {
  it.each([
    ['Carroll', CARROLL, { pick: 'line', letter: 1 }],
    ['Poe', POE, { pick: 'diagonal', direction: 'down-right' }],
    ['the 1917 telegram', PRESIDENT, { pick: 'word', letter: 1 }],
  ])('puts the message of %s first', (_name, text, options) => {
    const [top] = rankHiddenText(text).candidates
    expect(top?.options).toEqual(options)
    expect(top?.score).toBeGreaterThan(0)
    expect(top?.lift).toBe(true)
  })

  it('finds nothing above zero in prose that hides nothing', () => {
    const { candidates } = rankHiddenText(DICKENS)
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0]!.score).toBeLessThan(0)
  })

  it('keeps each text once, under its simplest reading', () => {
    const { candidates, tried } = rankHiddenText(
      'Alpha beta\nGamma delta\nEpsilon zeta\nEta theta\nIota kappa',
    )
    expect(tried).toBe(68)
    const texts = candidates.map(({ text }) => text)
    expect(new Set(texts).size).toBe(texts.length)
    expect(candidates.find(({ text }) => text === 'AGEEI')?.options).toEqual({
      pick: 'line',
      letter: 1,
    })
  })

  it('ranks by single letters where the language has no pair table', () => {
    const { candidates, language } = rankHiddenText(CARROLL, 'pl')
    expect(language).toBe('pl')
    expect(candidates.every(({ lift }) => !lift)).toBe(true)
  })

  it('drops readings with fewer than five A-Z letters and refuses an unknown language', () => {
    expect(rankHiddenText('Ab cd\nEf gh').candidates).toEqual([])
    expect(() => rankHiddenText(CARROLL, 'de' as 'en')).toThrow('Invalid option language=de')
  })
})
