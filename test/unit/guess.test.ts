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

/* ASCII text as decimal character codes, one per letter. */
function codesOf(text: string): string {
  return Array.from(text, (letter) => letter.codePointAt(0)).join(' ')
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
        'quagmire-1',
        'quagmire-2',
        'quagmire-3',
        'quagmire-4',
        'chaocipher',
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

  it('puts two-square ahead of four-square when its pairs show through', () => {
    const keys = { key: 'DIALOGUE', secondKey: 'BIOGRAPHY' }
    for (const orientation of ['vertical', 'horizontal']) {
      const encoded = create('two-square').encode(DICKENS, { ...keys, orientation }).text
      const guess = guessFamily(encoded)
      const names = guess.candidates.map(({ ciphers }) => ciphers[0])
      expect(names.indexOf('two-square')).toBeLessThan(names.indexOf('four-square'))
      expect(guess.candidates.find(({ ciphers }) => ciphers[0] === 'two-square')?.signal).toContain(
        `a ${orientation} two-square`,
      )
    }
  })

  it('keeps two-square one step behind four-square when nothing shows through', () => {
    const encoded = create('four-square').encode(`${DICKENS} ${DICKENS}`, {
      key: 'EXAMPLE',
      secondKey: 'KEYWORD',
    }).text
    expect(ranking(guessFamily(encoded)).slice(0, 3)).toEqual([
      'bifid:high',
      'four-square:high',
      'two-square:medium',
    ])
    const polish = guessFamily(encoded, 'pl').candidates.find(
      ({ ciphers }) => ciphers[0] === 'two-square',
    )
    expect(polish?.signal).toContain('no pl pair table')
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
    expect(ranking(guessFamily(low))).toEqual(['a1z26:high', 'nihilist:medium', 'polybius:low'])
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
    expect(ranking(guessFamily('12 34 56 78'))).toEqual(['polybius:low'])
    expect(ranking(guessFamily(create('adfgvx').encode(word).text))).toEqual(['adfgvx:high'])
    expect(
      ranking(guessFamily(create('adfgvx').encode(word, { transposition: 'CARGO' }).text)),
    ).toEqual(['adfgvx:high'])
    expect(ranking(guessFamily(create('bacon').encode(word).text))).toEqual(['bacon:high'])
    const [other] = guessFamily('XYYXX YXXYX XXYYY').candidates
    expect(other).toMatchObject({ ciphers: ['bacon'], confidence: 'medium' })
    expect(other?.signal).toContain('bacon reads only A and B')
  })

  it('reads pairs with a digit above 5 as a wider Polybius square that wants its alphabet', () => {
    const square = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const wide = '23 42 45 11 41 42 22 15 12 15 41 42 33 16 42'
    expect(create('polybius').decode(wide, { alphabet: square }).text).toBe('ITWASTHEBESTOFT')
    const guess = guessFamily(wide)
    expect(ranking(guess)).toEqual(['polybius:medium'])
    expect(guess.candidates[0]).toMatchObject({ families: ['fractionation'], needs: ['alphabet'] })
    expect(guess.candidates[0]?.signal).toContain('6×6 or wider')
    expect(guessFamily('19 91 55').candidates[0]?.signal).toContain('a 9×9 square')
    expect(ranking(guessFamily('26 14'))).toEqual(['a1z26:medium', 'polybius:low'])
  })

  it('keeps the 5×5 square, tap code and a zero out of the wider square', () => {
    const [classic] = guessFamily('23 15 31 31 34').candidates
    expect(classic).toMatchObject({ ciphers: ['polybius'], confidence: 'high' })
    expect(classic).not.toHaveProperty('needs')
    expect(ranking(guessFamily('2 3 1 6 3 1')).join()).not.toMatch(/tap-code|polybius/)
    expect(ranking(guessFamily('23 42 45 10 41 42 16')).join()).not.toContain('polybius')
    expect(ranking(guessFamily('236 24 51')).join()).not.toContain('polybius')
  })

  it('lets A1Z26 and Nihilist go first where their numbers fit, and never calls the wider square sure', () => {
    expect(ranking(guessFamily('16 26 19 18 25 17'))).toEqual(['a1z26:high', 'polybius:low'])
    expect(ranking(guessFamily('37 46 62 28 39 55'))).toEqual(['nihilist:low', 'polybius:low'])
  })

  it('reads decimal character codes as text and sends the squares to the back', () => {
    const goodbye = guessFamily('72 69 76 76 79 71 79 79 68 66 89 69')
    expect(goodbye.encoding).toEqual({
      name: 'decimal',
      text: 'HELLOGOODBYE',
      signal: 'Every number is a printable ASCII code, and the letters they spell fit en.',
    })
    expect(ranking(goodbye)).toEqual(['polybius:low'])
    const world = guessFamily('72 69 76 76 79 32 87 79 82 76 68')
    expect(world.encoding?.text).toBe('HELLO WORLD')
    expect(ranking(world)).toEqual(['nihilist:low', 'polybius:low'])

    const hello = guessFamily('72 101 108 108 111')
    expect(hello.encoding).toEqual({
      name: 'decimal',
      text: 'Hello',
      signal: 'Every number is a printable ASCII code, and together they look like words.',
    })
    expect(ranking(hello)).toEqual(['aes-ctr:low'])
    expect(guessFamily('072069076076079')).toMatchObject({
      encoding: { text: 'HELLO' },
      candidates: [],
    })
    expect(guessFamily('72,101,108,108,111').encoding?.text).toBe('Hello')
    const short = guessFamily('72 73 32 72 73 32 72 73 32 72 73 46')
    expect(short.encoding?.text).toBe('HI HI HI HI.')
    expect(ranking(short)).toEqual(['nihilist:medium', 'polybius:low'])

    expect(guessFamily(codesOf('flag{n0t_a_c1ph3r}')).encoding).toEqual({
      name: 'decimal',
      text: 'flag{n0t_a_c1ph3r}',
      signal: 'Every number is a printable ASCII code, mostly letters and digits.',
    })
  })

  it('reads decimal codes across a line break', () => {
    expect(guessFamily(codesOf('Hello\nworld'))).toMatchObject({
      encoding: {
        name: 'decimal',
        text: 'Hello\nworld',
        signal:
          'Every number is a printable ASCII code or a line break, and the letters they spell fit en.',
      },
      candidates: [],
    })
    expect(guessFamily('72 101 108 108 111 10').encoding?.text).toBe('Hello\n')
    expect(guessFamily(codesOf('Hello\r\nworld')).encoding?.text).toBe('Hello\r\nworld')
    expect(guessFamily(codesOf('Hello\tworld'))).not.toHaveProperty('encoding')
  })

  it('reads hex and base64 of text as text and sends the ciphers to the back', () => {
    const hex = guessFamily('48656c6c6f20776f726c6421')
    expect(hex.encoding).toEqual({
      name: 'hex',
      text: 'Hello world!',
      signal:
        'Every pair of hex digits is a printable ASCII code, and the letters they spell fit en.',
    })
    expect(ranking(hex)).toEqual(['aes-ctr:low'])
    const spaced = guessFamily('48 65 6c 6c 6f 20 77 6f 72 6c 64')
    expect(spaced.encoding?.text).toBe('Hello world')
    expect(ranking(spaced)).toEqual(['aes-ctr:low'])
    expect(guessFamily('0x48656C6C6F').encoding?.text).toBe('Hello')

    const base64 = guessFamily('SGVsbG8gd29ybGQh')
    expect(base64.encoding).toEqual({
      name: 'base64',
      text: 'Hello world!',
      signal:
        'Every byte the base64 holds is a printable ASCII code, and the letters they spell fit en.',
    })
    expect(base64.candidates.every(({ confidence }) => confidence === 'low')).toBe(true)
    expect(guessFamily('aGVsbG8K').encoding).toEqual({
      name: 'base64',
      text: 'hello\n',
      signal:
        'Every byte the base64 holds is a printable ASCII code or a line break, and together they look like words.',
    })
    expect(guessFamily('SGVsbG8').encoding?.text).toBe('Hello')

    const block = Buffer.from('It was the best of times, it was').toString('hex')
    expect(block).toHaveLength(64)
    expect(ranking(guessFamily(block))).toEqual(['aes:low', 'des:low', 'aes-ctr:low'])
    const word = guessFamily('48656c6c6f')
    expect(word.encoding?.signal).toBe(
      'Every pair of hex digits is a printable ASCII code, and together they look like words.',
    )
    expect(ranking(word)).toEqual(['aes-ctr:high'])
    const polish = Buffer.from('Litwo ojczyzno moja ty jestes jak zdrowie').toString('base64')
    expect(guessFamily(polish, 'pl').encoding?.signal).toBe(
      'Every byte the base64 holds is a printable ASCII code, and the letters they spell fit pl.',
    )
  })

  it('keeps ciphertext a cipher when its bytes only happen to be printable', () => {
    for (const text of [
      '69c4e0d86a7b0430d8cdb78070b4c55a',
      '504b03041400090008004b6f5a5c',
      'U2FsdGVkX1+Ab3x9Kq0mN2pL5vT8wYzR',
      Buffer.from('{"id":42,"ok":[1,2]}').toString('hex'),
      Buffer.from('{"id":42,"ok":[1,2]}').toString('base64'),
      Buffer.from('caf\u00E9 au lait').toString('hex'),
      '486921',
    ]) {
      expect(guessFamily(text)).not.toHaveProperty('encoding')
    }
    expect(guessFamily('54686973')).not.toHaveProperty('encoding')
    expect(Buffer.from('54686973206973207468652062657374', 'hex').toString()).toBe(
      'This is the best',
    )
    expect(guessFamily('54686973206973207468652062657374').encoding?.text).toBe('This is the best')

    const trust = create('polybius').encode('TRY TRUST TRY TRUST').text
    expect(Buffer.from(trust.replaceAll(' ', ''), 'hex').toString()).toBe('DBTDBECDDBTDBECD')
    expect(guessFamily(trust)).not.toHaveProperty('encoding')
    expect(ranking(guessFamily(trust))).toEqual(['polybius:high'])
    expect(Buffer.from('QUJDREVG', 'base64').toString()).toBe('ABCDEF')
    expect(guessFamily('QUJDREVG')).not.toHaveProperty('encoding')
    expect(guessFamily('VGVDXFVGVDVVVFVGVGVDXFVGVDVVVFVG')).not.toHaveProperty('encoding')
  })

  it('keeps a square cipher a cipher when its numbers only happen to be printable', () => {
    const sums = create('nihilist').encode('HELLO WORLD', { key: 'TSAR' }).text
    expect(sums).toBe('67 58 42 73 78 95 45 84 75 57')
    const tsar = guessFamily(sums)
    expect(tsar).not.toHaveProperty('encoding')
    expect(ranking(tsar)).toEqual(['nihilist:medium', 'polybius:low'])

    const letters = create('nihilist').encode(DICKENS, { key: 'ZZ' }).text
    expect(letters.match(/\d+/g)?.every((sum) => Number(sum) >= 65)).toBe(true)
    expect(guessFamily(letters)).not.toHaveProperty('encoding')

    for (const text of [
      '72 105',
      '72 69 76 31',
      '72 69 76 300',
      '72 101 108 108 111 200',
      '33 33 63 63',
      '72 69 76 76 x',
    ]) {
      expect(guessFamily(text)).not.toHaveProperty('encoding')
    }
    expect(ranking(guessFamily('32 33 34 35'))).toEqual(['polybius:medium'])
    expect(guessFamily('72 49 76 53')).not.toHaveProperty('encoding')
    expect(guessFamily('72 49 76 101').encoding?.text).toBe('H1Le')
    const polish = codesOf('Litwo ojczyzno moja ty jestes jak zdrowie')
    expect(guessFamily(polish, 'pl').encoding?.signal).toBe(
      'Every number is a printable ASCII code, and the letters they spell fit pl.',
    )
  })

  it('sorts hex by block length', () => {
    expect(ranking(guessFamily('69c4e0d86a7b0430d8cdb78070b4c55a'))).toEqual([
      'aes:high',
      'des:medium',
      'aes-ctr:low',
    ])
    expect(guessFamily('4fd50f17717460459c4924d6c54d4881').candidates[0]?.ciphers).toContain(
      'camellia',
    )
    expect(guessFamily('e372f8a14e6654bc1f325283f65fea91').candidates[0]?.ciphers).toContain('aria')
    expect(guessFamily('47dea04afc3c7e332fcac11987a2ec6e').candidates[0]?.ciphers).toContain('sm4')
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

  /** The first bytes of what zip -e writes, in hex and in base64. */
  it('knows a ZIP archive', () => {
    for (const archive of ['504B030414000100080000002100', 'UEsDBBQAAQAIAAAAIQA=']) {
      expect(ranking(guessFamily(archive))).toEqual(['zipcrypto:high'])
    }
    expect(ranking(guessFamily('504b0506000000000000'))).not.toContain('zipcrypto:high')
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

  it('lists each family once, in the order of its ciphers', () => {
    const families = (text: string) => guessFamily(text).candidates.map((found) => found.families)
    expect(families('69c4e0d86a7b0430d8cdb78070b4c55a')).toEqual([
      ['substitution-permutation', 'feistel'],
      ['feistel', 'lai-massey'],
      ['substitution-permutation', 'permutation', 'polyalphabetic', 'arx'],
    ])
    expect(families(create('enigma').encode(DICKENS).text)).toEqual([
      ['polyalphabetic'],
      ['rotor'],
      [
        'substitution-shift',
        'substitution-reflection',
        'substitution-multiplicative',
        'substitution-keyed',
      ],
    ])
  })

  it('refuses a language without a table', () => {
    expect(() => guessFamily('TEXT', 'de' as 'en')).toThrow(InvalidOptionError)
  })
})
