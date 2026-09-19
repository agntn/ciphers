import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { builtinCiphers } from '../../src/core/ciphers'
import { create } from '../../src/core/registry'

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
 * Every count written as a word in front of a noun: `twenty ciphers`, `Eight families`.
 *
 * @param text - Prose to scan.
 * @param noun - The plural noun the count precedes.
 * @returns {string[]} The counts as written, lowercased.
 */
function countsIn(text: string, noun: string): string[] {
  const counts: string[] = []
  const pattern = new RegExp(String.raw`\b([a-z]+(?:-[a-z]+)?)(?: classical)? ${noun}\b`, 'gi')
  for (const match of text.matchAll(pattern)) {
    const word = match[1]!.toLowerCase()
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
    const readme = readFileSync(path.join(root, 'README.md'), 'utf8')
    expect(countsIn(readme, 'ciphers')).not.toHaveLength(0)
    expect(countsIn('Twenty-five shifts, one line each', 'ciphers')).toHaveLength(0)
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
