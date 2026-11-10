import { describe, expect, it } from 'vite-plus/test'
import { characterKinds, confusableSkeleton, inspectCharacters } from '../../src/core/characters.ts'
import {
  asciiLookalikes,
  characterNames,
  confusablePrototypes,
  unicodeScripts,
} from '../../src/core/confusables.ts'
import { InvalidOptionError } from '../../src/core/errors.ts'

/**
 * What the report lists, one short row per character.
 *
 * @param text - Text to inspect.
 * @param script - The expected script, when not guessed.
 * @returns {Array<[string, number, string]>} Code point in hex, position and kind.
 */
function listed(text: string, script?: string): Array<[string, number, string]> {
  return inspectCharacters(text, script === undefined ? {} : { script }).characters.map(
    ({ codePoint, position, kind }) => [codePoint.toString(16), position, kind],
  )
}

describe('inspectCharacters', () => {
  it('finds the Cyrillic letter in Bitcoin', () => {
    expect(inspectCharacters('Bitc\u043Ein')).toEqual({
      script: 'Latin',
      characters: [
        {
          character: '\u043E',
          codePoint: 0x43e,
          position: 5,
          kind: 'lookalike',
          script: 'Cyrillic',
          name: 'CYRILLIC SMALL LETTER O',
          lookalike: 'o',
        },
      ],
      words: [
        { word: 'Bitc\u043Ein', position: 1, scripts: ['Latin', 'Cyrillic'], skeleton: 'Bitcoin' },
      ],
      sequence: '\u043E',
    })
  })

  it('leaves plain text alone', () => {
    expect(inspectCharacters('Plain text, 100%.\n\tTabs and line breaks too.\r\n')).toEqual({
      script: 'Latin',
      characters: [],
      words: [],
      sequence: '',
    })
    expect(inspectCharacters('')).toEqual({
      script: 'Latin',
      characters: [],
      words: [],
      sequence: '',
    })
    expect(listed('Za\u017C\u00F3\u0142\u0107 g\u0119\u015Bl\u0105 ja\u017A\u0144')).toEqual([])
  })

  it('tells the four kinds apart', () => {
    expect(characterKinds).toEqual(['invisible', 'lookalike', 'combining', 'script'])
    expect(listed('pay\u200Bpal \uFF11\uFF12 cafe\u0301 a\u00A0b \u0436')).toEqual([
      ['200b', 4, 'invisible'],
      ['ff11', 9, 'lookalike'],
      ['ff12', 10, 'lookalike'],
      ['301', 16, 'combining'],
      ['a0', 19, 'invisible'],
      ['436', 22, 'script'],
    ])
  })

  it('counts an astral character as one position', () => {
    expect(listed('\u{1F600}\u{1D400}\u200D')).toEqual([
      ['1d400', 2, 'lookalike'],
      ['200d', 3, 'invisible'],
    ])
  })

  it('lists format, control and tag characters and odd spaces as invisible', () => {
    const text = 'a\u00ADb\u202Ec\u0000d\u2003e\u{E0061}f\uFEFFg\u2028h\uFE0Fi\u{E0100}'
    const { characters } = inspectCharacters(text)
    expect(characters.map(({ kind }) => kind)).toEqual(Array.from({ length: 9 }, () => 'invisible'))
    expect(characters.map(({ name }) => name)).toEqual([
      'SOFT HYPHEN',
      'RIGHT-TO-LEFT OVERRIDE',
      'NULL',
      'EM SPACE',
      'TAG LATIN SMALL LETTER A',
      'ZERO WIDTH NO-BREAK SPACE',
      'LINE SEPARATOR',
      'VARIATION SELECTOR-16',
      'VARIATION SELECTOR-17',
    ])
    expect(characters.every(({ lookalike }) => lookalike === undefined)).toBe(true)
  })

  it('leaves the joiners and selectors of an emoji alone', () => {
    expect(listed('\u{1F468}\u200D\u{1F469}\u200D\u{1F467} \u2764\uFE0F 1\uFE0F\u20E3')).toEqual([])
    expect(listed('a\u200Db')).toEqual([['200d', 2, 'invisible']])
  })

  it('says which ASCII a lookalike passes for', () => {
    const lookalikes = (text: string) =>
      inspectCharacters(text, { script: 'Latin' }).characters.map(({ lookalike }) => lookalike)
    expect(lookalikes('\u0406\u{1D7CF}\u2223\u{1D426}\uFF10\u2019\u2026\u0131')).toEqual([
      'I',
      '1',
      '|',
      'm',
      '0',
      "'",
      '...',
      'i',
    ])
  })

  it('holds a text against the script most of its letters share', () => {
    const russian = '\u043F\u0440\u0438\u0432\u0435\u0442 a\u043C\u0438\u0433\u043E'
    expect(inspectCharacters(russian).script).toBe('Cyrillic')
    expect(listed(russian)).toEqual([['61', 8, 'script']])
    expect(inspectCharacters(russian).words).toEqual([
      {
        word: 'a\u043C\u0438\u0433\u043E',
        position: 8,
        scripts: ['Latin', 'Cyrillic'],
        skeleton: confusableSkeleton('a\u043C\u0438\u0433\u043E'),
      },
    ])
  })

  it('takes the script when the guess would go wrong', () => {
    expect(inspectCharacters('\u0440\u0430\u0443').script).toBe('Cyrillic')
    expect(listed('\u0440\u0430\u0443')).toEqual([])
    expect(listed('\u0440\u0430\u0443', 'latin')).toEqual([
      ['440', 1, 'lookalike'],
      ['430', 2, 'lookalike'],
      ['443', 3, 'lookalike'],
    ])
    expect(inspectCharacters('abc', { script: ' old italic ' }).script).toBe('Old_Italic')
  })

  it('refuses a script Unicode does not have', () => {
    for (const script of ['Klingon', '', 'Common', 'Inherited', 'Latin}|.']) {
      expect(() => inspectCharacters('abc', { script })).toThrow(
        new InvalidOptionError(
          'script',
          script,
          'must be a Unicode script such as Latin, Cyrillic or Greek',
        ),
      )
    }
  })

  it('reads Japanese, Korean and Chinese as one writing system each', () => {
    expect(
      inspectCharacters('\u6F22\u5B57\u3068\u304B\u306A \u30AB\u30BF\u30AB\u30CA\u6F22'),
    ).toEqual({
      script: 'Katakana',
      characters: [],
      words: [],
      sequence: '',
    })
    expect(inspectCharacters('\uD55C\uAD6D\u6F22').words).toEqual([])
    expect(inspectCharacters('\u6F22\u3105').words).toEqual([])
    expect(inspectCharacters('\u6F22\u0430').words).toHaveLength(1)
  })

  it('drops the punctuation around a word that mixes scripts', () => {
    expect(inspectCharacters('See "\u0440aypal", then.').words).toEqual([
      { word: '\u0440aypal', position: 6, scripts: ['Cyrillic', 'Latin'], skeleton: 'paypal' },
    ])
  })

  it('refuses anything but a string', () => {
    for (const text of [null, undefined, 5, ['a']]) {
      expect(() => {
        Reflect.apply(inspectCharacters, undefined, [text])
      }).toThrow(InvalidOptionError)
      expect(() => {
        Reflect.apply(confusableSkeleton, undefined, [text])
      }).toThrow('must be a string')
    }
  })
})

describe('confusableSkeleton', () => {
  /* SpoofChecker.getSkeleton of ICU 78.3 (Unicode 17) through PyICU, for each text on the left. */
  it.each([
    ['paypal', 'paypal'],
    ['p\u0430yp\u0430l', 'paypal'],
    ['Bitc\u043Ein', 'Bitcoin'],
    ['\uFF21\uFF22\uFF11', 'AB\uFF11'],
    ['pay\u200Bpal', 'paypal'],
    ['caf\u00E9', 'cafe\u0301'],
    ['m1 I0', 'rnl lO'],
    ['\u0399\u03BF\u03C4\u03B1', 'lo\u1D1Ba'],
    ['\u{1D400}\u{1D7CE}', 'AO'],
    ['\u2160\u2161', 'lll'],
    ['soft\u00ADhyphen', 'softhyphen'],
    ['A\u030A', 'A\u030A'],
    ['\u212B', 'A\u030A'],
    ['\u05D0\u05D1', '\u05D0\u05D1'],
    ['a\uFE0Fb\u{E0061}', 'ab'],
  ])('folds %j as ICU does', (text, skeleton) => {
    expect(confusableSkeleton(text)).toBe(skeleton)
  })

  it('gives two words that look alike the same skeleton', () => {
    expect(confusableSkeleton('\u0440\u0430\u0443\u0440\u0430l')).toBe(confusableSkeleton('paypal'))
    expect(confusableSkeleton('paypa1')).toBe(confusableSkeleton('paypal'))
    expect(confusableSkeleton('paypal')).not.toBe(confusableSkeleton('paypol'))
  })
})

describe('the Unicode tables', () => {
  /* Rows of confusables.txt 17.0.0, the file counts 6565 mappings in its last line. */
  it('unpacks the confusables', () => {
    const prototypes = confusablePrototypes()
    expect(prototypes.size).toBe(6565)
    expect(prototypes.get(0x43e)).toBe('o')
    expect(prototypes.get(0x6d)).toBe('rn')
    expect(prototypes.get(0x2026)).toBe('...')
    expect(prototypes.get(0x2a74)).toBe('::=')
    expect(prototypes.get(0x1fbf9)).toBe('9')
    expect(prototypes.get(0x61)).toBeUndefined()
  })

  it('keeps ASCII out of the lookalikes and every lookalike in ASCII', () => {
    for (const [codePoint, lookalike] of asciiLookalikes()) {
      expect(codePoint).toBeGreaterThan(0x7f)
      expect(lookalike).toMatch(/^[\x20-\x7E]+$/)
    }
  })

  /* Names as UnicodeData.txt 17.0.0 has them, the first and the last entry included. */
  it('unpacks the names', () => {
    const names = characterNames()
    expect(names.get(0)).toBe('NULL')
    expect(names.get(0x85)).toBe('NEXT LINE (NEL)')
    expect(names.get(0x200b)).toBe('ZERO WIDTH SPACE')
    expect(names.get(0xff21)).toBe('FULLWIDTH LATIN CAPITAL LETTER A')
    expect(names.get(0x1d7ff)).toBe('MATHEMATICAL MONOSPACE DIGIT NINE')
    expect(names.get(0xe007f)).toBe('CANCEL TAG')
    for (const name of names.values()) expect(name).toMatch(/^[A-Z0-9][A-Z0-9 ()-]*$/)
  })

  it('knows every script name this runtime knows', () => {
    const scripts = unicodeScripts()
    expect(scripts.slice(0, 3)).toEqual(['Latin', 'Common', 'Inherited'])
    expect(new Set(scripts).size).toBe(scripts.length)
    for (const name of scripts) {
      expect(() => new RegExp(String.raw`\p{Script=${name}}`, 'u'), name).not.toThrow()
    }
  })
})
