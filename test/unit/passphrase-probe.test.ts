import { describe, expect, it } from 'vite-plus/test'
import { CipherError, InvalidOptionError, MissingOptionError } from '../../src/core/errors.ts'
import {
  MAX_PROBE_ITERATIONS,
  PADDING_CHANCE,
  probePassphrase,
} from '../../src/core/passphrase-probe.ts'
import { create } from '../../src/core/registry.ts'
import * as library from '../../src/index.ts'
import {
  PROBE_LIST_LIMITS,
  formatPassphraseProbe,
  quotedPreview,
} from '../../src/tool-operations.ts'

/** `openssl enc -a -pass pass:secret` 3.6.4 over ATTACK AT DAWN, as in the aes-passphrase tests. */
const OPENSSL = [
  ['sha256', 256, 'U2FsdGVkX18HYWQDuJcJTh2NoqzqwZ9pWaEBkXGGu54='],
  ['sha256', 128, 'U2FsdGVkX1+na5gHUrEN4hG7LZRQ7qjUsIM1RiIjkv0='],
  ['sha1', 256, 'U2FsdGVkX182QesVZh2QtuA2EYOeDO1srzryiKb6MNk='],
  ['sha1', 128, 'U2FsdGVkX1+ksWSuMc0rUgJ7Iq06e+5j0O7VtXqcIr4='],
] as const

/** crypto-js 4.2.0 with keySize 32 and 10,000 EvpKDF iterations, salt 0123456789abcdef. */
const CRYPTOJS_WIDE = 'U2FsdGVkX18BI0VniavN70YX2WYeKixus3JUmT8oEXqR/NZ3H+g78SrpV2crYs3H'

describe('probePassphrase', () => {
  it('finds the openssl enc settings on the default grid of nine', () => {
    for (const [digest, keyLength, blob] of OPENSSL) {
      const probe = probePassphrase(blob, 'secret')
      expect(probe.tries).toBe(9)
      expect(probe.blocks).toBe(1)
      expect(probe.hits[0]).toEqual({
        digest,
        keyLength,
        iterations: 1,
        padLength: 2,
        printable: 1,
        text: 'ATTACK AT DAWN',
        hex: '41545441434b204154204441574e',
      })
    }
  })

  it('reaches past the defaults to the key length and iterations CryptoJS was given', () => {
    const probe = probePassphrase(CRYPTOJS_WIDE, 'secret', {
      digests: ['md5'],
      keyLengths: [256, 1024],
      iterations: [1, 10_000],
    })
    expect(probe.tries).toBe(4)
    expect(probe.hits[0]).toMatchObject({
      digest: 'md5',
      keyLength: 1024,
      iterations: 10_000,
      printable: 1,
      text: 'Zażółć gęślą jaźń',
    })
  })

  it('puts the chance of a padding hit at one in 255', () => {
    let chance = 0
    for (let length = 1; length <= 16; length++) chance += 256 ** -length
    expect(PADDING_CHANCE).toBeCloseTo(chance, 15)
    expect(PADDING_CHANCE).toBeCloseTo(1 / 255, 10)
  })

  /* The grid from issue #156: 648 tries, where 2.5 hits come from chance alone. */
  it('ranks the setting that reads above the hits chance gives', () => {
    const text = 'The quick brown fox jumps over the lazy dog. '.repeat(20)
    const blob = create('aes-passphrase').encode(text, {
      key: 'secret',
      salt: '0123456789abcdef',
      digest: 'sha1',
      keyLength: 192,
      iterations: 7,
    }).text
    const probe = probePassphrase(blob, 'secret', {
      iterations: Array.from({ length: 72 }, (_, index) => index + 1),
    })
    expect(probe.tries).toBe(648)
    expect(probe.expected.toFixed(1)).toBe('2.5')
    expect(probe.hits[0]).toMatchObject({ digest: 'sha1', keyLength: 192, iterations: 7, text })
    expect(probe.hits.length).toBeGreaterThan(1)
    for (const noise of probe.hits.slice(1)) expect(noise.printable).toBeLessThan(0.9)
  })

  it('reports bytes that are not UTF-8 as hex', () => {
    const blob = create('aes-passphrase').encode('ff00fe01', {
      key: 'secret',
      bytes: 'hex',
      salt: '0123456789abcdef',
    }).text
    const [hit] = probePassphrase(blob, 'secret', { digests: ['md5'], keyLengths: [256] }).hits
    expect(hit).toMatchObject({ hex: 'ff00fe01', padLength: 12 })
    expect(hit?.text).toBeUndefined()
    expect(hit?.printable).toBe(0)
  })

  it('counts a repeated value once', () => {
    const probe = probePassphrase(OPENSSL[0][2], 'secret', {
      digests: ['sha256', 'sha256'],
      keyLengths: [256, 256, 128],
    })
    expect(probe.digests).toEqual(['sha256'])
    expect(probe.keyLengths).toEqual([256, 128])
    expect(probe.tries).toBe(2)
  })

  it('names the list a bad value came in', () => {
    const blob = OPENSSL[0][2]
    for (const [grid, option] of [
      [{ digests: ['sha512'] }, 'digests'],
      [{ digests: [] }, 'digests'],
      [{ keyLengths: [100] }, 'keyLengths'],
      [{ keyLengths: [1056] }, 'keyLengths'],
      [{ iterations: [0] }, 'iterations'],
      [{ iterations: [1.5] }, 'iterations'],
      [{ iterations: [1, undefined] as unknown as number[] }, 'iterations'],
    ] as const) {
      expect(() => probePassphrase(blob, 'secret', grid)).toThrow(InvalidOptionError)
      expect(() => probePassphrase(blob, 'secret', grid)).toThrow(`Invalid option ${option}=`)
    }
  })

  it('keeps a grid within the hash budget', () => {
    const blob = OPENSSL[0][2]
    const iterations = [100_000, 99_999, 99_998, 99_997]
    expect(3 * iterations.reduce((sum, count) => sum + count)).toBeGreaterThan(MAX_PROBE_ITERATIONS)
    expect(() => probePassphrase(blob, 'secret', { iterations })).toThrow(
      /must add up to at most 333333 with 3 digests/,
    )
    expect(() =>
      probePassphrase(blob, 'secret', { digests: ['md5'], iterations: [100_000, 99_999] }),
    ).not.toThrow()
  })

  it('refuses what is not a passphrase blob', () => {
    expect(() => probePassphrase(OPENSSL[0][2], '')).toThrow(MissingOptionError)
    expect(() => probePassphrase('AAAAAAAAAAAAAAAAAAAAAA==', 'secret')).toThrow(/Salted__/)
    expect(() => probePassphrase('U2FsdGVkX18BI0VniavN7w==', 'secret')).toThrow(CipherError)
  })
})

describe('formatPassphraseProbe', () => {
  it('writes the hits against the count chance gives', () => {
    expect(formatPassphraseProbe(library, OPENSSL[0][2], 'secret').content[0]?.text).toBe(
      [
        'Passphrase probe (salt 07616403b897094e, 1 block, 9 tries: digests md5, sha1, sha256 × keyLength 128, 192, 256 × iterations 1):',
        'Padding held in 1 of 9 tries, about 0.035 expected by chance. Most printable first:',
        '',
        '  digest sha256, keyLength 256, iterations 1: pad 2, 100% printable, "ATTACK AT DAWN"',
        '',
        'A wrong setting passes the padding check about once in 255 tries, nearly always with pad 1, and decrypts to bytes that are not text. ciphers_decode with cipher aes-passphrase, the same key and the digest, keyLength and iterations of a hit returns its whole text.',
      ].join('\n'),
    )
  })

  it('says what else a blob without hits can be', () => {
    expect(formatPassphraseProbe(library, OPENSSL[0][2], 'wrong').content[0]?.text).toContain(
      'Padding held in none of 9 tries (about 0.035 expected by chance): a wrong passphrase, settings outside this grid, or not this format. openssl enc -pbkdf2',
    )
  })

  it('keeps hostile decrypted text on one quoted line', () => {
    const hostile = 'one\ntwo\u001B]0;x\u0007\u009B31m\u007F\u2028three\u2029\u202Efour'
    const blob = create('aes-passphrase').encode(hostile, {
      key: 'secret',
      salt: '0123456789abcdef',
    }).text
    const text = formatPassphraseProbe(library, blob, 'secret', {
      digests: ['md5'],
      keyLengths: [256],
    }).content[0]?.text
    expect(text).toContain(
      '"one\\ntwo\\u001b]0;x\\u0007\\u009b31m\\u007f\\u2028three\\u2029\\u202efour"',
    )
    const hit = text?.split('\n').find((line) => line.includes('printable'))
    expect(hit).not.toMatch(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u)
  })

  it('cuts a long preview between code points', () => {
    expect(quotedPreview('🙂'.repeat(3), 2)).toBe('"🙂🙂"…')
    expect(quotedPreview('ab', 2)).toBe('"ab"')
  })

  it('bounds each list as the schema does', () => {
    for (const [name, limit] of Object.entries(PROBE_LIST_LIMITS)) {
      const list = name === 'digests' ? Array.from({ length: limit + 1 }, () => 'md5') : []
      const numbers = Array.from({ length: limit + 1 }, (_, index) => 128 + 32 * (index % 29))
      expect(() =>
        formatPassphraseProbe(library, OPENSSL[0][2], 'secret', {
          [name]: name === 'digests' ? list : numbers,
        }),
      ).toThrow(`Invalid option ${name}=${limit + 1}: must list at most ${limit} values`)
    }
  })
})
