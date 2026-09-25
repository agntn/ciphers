import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vite-plus/test'
import { builtinCiphers } from '../../src/core/ciphers.ts'
import { create } from '../../src/core/registry.ts'
import { createMcpServer } from '../../src/mcp.ts'

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

/**
 * The option names a sentence lists in backticks, from the text after `lead` to the end of the
 * sentence.
 *
 * @param file - Path relative to the repository root.
 * @param lead - Text right before the list.
 * @returns {string[]} Option names, in the order the page gives them.
 */
function optionList(file: string, lead: string): string[] {
  const text = readFileSync(path.join(root, file), 'utf8')
  const start = text.indexOf(lead)
  if (start === -1) throw new Error(`${file} has no "${lead}"`)
  const list = text.slice(start + lead.length).split(/\.(?:\s|$)/)[0]!
  return [...list.matchAll(/`([A-Za-z]+)`/g)].map((match) => match[1]!)
}

describe('every option list names what the ciphers take', () => {
  it('the agents guide lists every cipher_encode argument', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createMcpServer()
    const client = new Client({ name: 'docs-test', version: '1.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    try {
      const { tools } = await client.listTools()
      const schema = tools.find((tool) => tool.name === 'cipher_encode')!.inputSchema
      const expected = Object.keys(schema.properties ?? {}).filter(
        (name) => name !== 'cipher' && name !== 'text',
      )
      const listed = optionList(
        'docs/content/1.guide/05.agents.md',
        'Option arguments mirror the library:',
      )
      expect(new Set(listed).size, 'no option twice').toBe(listed.length)
      expect([...listed].sort()).toEqual(expected.sort())
    } finally {
      await Promise.all([client.close(), server.close()])
    }
  })

  it('the guide lists every option a built-in declares', () => {
    const declared = new Set(
      builtinCiphers.flatMap((name) =>
        create(name)
          .info()
          .options.map((option) => option.name),
      ),
    )
    const listed = optionList('docs/content/1.guide/01.index.md', 'The rest is per cipher -')
    expect(new Set(listed).size, 'no option twice').toBe(listed.length)
    expect([...listed].sort()).toEqual([...declared].sort())
  })
})
