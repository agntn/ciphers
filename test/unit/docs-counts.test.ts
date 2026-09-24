import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { builtinCiphers } from '../../src/core/ciphers.ts'
import { create } from '../../src/core/registry.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/**
 * A count as the prose writes it. Same table as `docs/app/utils/format.ts`, which a root test can't
 * import: vite would read `docs/tsconfig.json`, and that only resolves after the docs install.
 *
 * @param count - A whole number below one hundred.
 * @returns {string} The English word, lowercase.
 */
function spellOut(count: number): string {
  if (count < 20) return ONES[count]!
  const ones = count % 10
  const tens = TENS[(count - ones) / 10]!
  return ones === 0 ? tens : `${tens}-${ONES[ones]}`
}

const numberWords = new Set(Array.from({ length: 100 }, (_, count) => spellOut(count)))

/**
 * Every count in front of a noun, as a word or in digits: `twenty ciphers`, `20 ciphers`.
 *
 * @param text - Prose to scan.
 * @param noun - The plural noun the count precedes.
 * @returns {string[]} The counts, each as the word `spellOut` writes.
 */
function countsIn(text: string, noun: string): string[] {
  const counts: string[] = []
  const pattern = new RegExp(
    String.raw`\b([a-z]+(?:-[a-z]+)?|\d{1,2})(?: classical)? ${noun}\b`,
    'gi',
  )
  for (const match of text.matchAll(pattern)) {
    const token = match[1]!
    const word = /^\d+$/.test(token) ? spellOut(Number(token)) : token.toLowerCase()
    if (numberWords.has(word)) counts.push(word)
  }
  return counts
}

/**
 * The README and every docs page, relative to the repository root.
 *
 * @returns {string[]} Relative paths.
 */
function proseFiles(): string[] {
  const pages = readdirSync(path.join(root, 'docs/content'), { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join('docs/content', name))
  return ['README.md', ...pages.sort()]
}

describe('the prose counts what the registry ships', () => {
  const families = new Set(builtinCiphers.map((name) => create(name).info().family))
  const expected = { ciphers: spellOut(builtinCiphers.length), families: spellOut(families.size) }

  it('finds the counts it checks', () => {
    expect(countsIn('Twenty ciphers in eight families, 20 ciphers, 8 families', 'ciphers')).toEqual(
      ['twenty', 'twenty'],
    )
    expect(
      countsIn('Twenty ciphers in eight families, 20 ciphers, 8 families', 'families'),
    ).toEqual(['eight', 'eight'])
    expect(countsIn('Twenty-five shifts, one line each, 1 to 25', 'ciphers')).toHaveLength(0)
    const corpus = proseFiles().map((file) => readFileSync(path.join(root, file), 'utf8'))
    for (const noun of ['ciphers', 'families'] as const) {
      expect(
        corpus.flatMap((text) => countsIn(text, noun)),
        noun,
      ).not.toHaveLength(0)
    }
  })

  it.each(proseFiles())('%s', (file) => {
    const text = readFileSync(path.join(root, file), 'utf8')
    for (const noun of ['ciphers', 'families'] as const) {
      for (const count of countsIn(text, noun)) {
        expect(count, `${noun} in ${file}`).toBe(expected[noun])
      }
    }
  })
})

/**
 * The cipher each table row names, from its page link or its bold name.
 *
 * @param text - Prose to scan.
 * @returns {string[]} Cipher names, in row order.
 */
function tableRows(text: string): string[] {
  const pattern = /^\| (?:\[[^\]]+\]\(\/ciphers\/([a-z0-9-]+)\)|\*\*([a-z0-9-]+)\*\*)/gm
  return [...text.matchAll(pattern)].map((match) => (match[1] ?? match[2])!)
}

describe('every cipher table lists what the registry ships', () => {
  it('finds the rows it checks', () => {
    expect(tableRows('| [AES (ECB)](/ciphers/aes) | x |\n| **aes-cbc** | x |\n| `key` |')).toEqual([
      'aes',
      'aes-cbc',
    ])
    expect(
      proseFiles().filter((file) => tableRows(readFileSync(path.join(root, file), 'utf8')).length),
    ).not.toHaveLength(0)
  })

  it.each(proseFiles())('%s', (file) => {
    const rows = tableRows(readFileSync(path.join(root, file), 'utf8'))
    if (rows.length === 0) return
    expect([...rows].sort(), file).toEqual([...builtinCiphers].sort())
  })
})
