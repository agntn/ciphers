import { beforeAll, describe, expect, it } from 'vite-plus/test'
import ciphersExtension from '../../packages/omp/extensions/ciphers.ts'
import { ciphersTools } from '../../src/tools.ts'

type ToolResult = {
  readonly content: ReadonlyArray<{ readonly type: string; readonly text: string }>
  readonly isError?: boolean
}

type RegisteredTool = {
  name: string
  label: string
  approval?: string
  loadMode?: string
  parameters: unknown
  execute(toolCallId: string, params: Readonly<Record<string, unknown>>): Promise<ToolResult>
  renderResult?: (
    result: Readonly<ToolResult>,
    options: Readonly<{ expanded?: boolean }>,
    theme: Readonly<Record<string, unknown>>,
  ) => RenderedText
}

/** Stand-in for the host Text component, which records what it was given. */
class RenderedText {
  readonly text: string

  constructor(text: string) {
    this.text = text
  }
}

const tools = new Map<string, RegisteredTool>()

function isRegisteredTool(value: unknown): value is RegisteredTool {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'name') === 'string' &&
    typeof Reflect.get(value, 'label') === 'string' &&
    typeof Reflect.get(value, 'parameters') === 'object' &&
    typeof Reflect.get(value, 'execute') === 'function'
  )
}

function getTool(name: string): RegisteredTool {
  const tool = tools.get(name)
  if (tool === undefined) throw new Error(`Tool not registered: ${name}`)
  return tool
}

function renderText(
  toolName: string,
  result: Readonly<ToolResult>,
  options: Readonly<{ expanded?: boolean }> = {},
  styles: Readonly<Record<string, unknown>> = {},
): string {
  const renderer = getTool(toolName).renderResult
  if (renderer === undefined) throw new Error(`Tool has no result renderer: ${toolName}`)
  return renderer(result, options, styles).text
}

/** A theme that writes its styling calls into the output, with what the status line reads. */
const theme = {
  fg: (color: string, text: string) => `${color}(${text})`,
  styledSymbol: (symbol: string, color: string) => `${color}:${symbol}`,
  format: { bracketLeft: '[', bracketRight: ']' },
  sep: { dot: ' · ' },
}

beforeAll(async () => {
  const api = {
    /* Compiled OMP validates the JSON Schema it is handed and emits it unchanged. */
    typebox: { Type: { Unsafe: (schema: unknown) => schema } },
    pi: { Text: RenderedText },
    registerTool(tool: unknown) {
      if (!isRegisteredTool(tool)) throw new Error('Invalid tool registration')
      tools.set(tool.name, tool)
    },
  }

  // SAFETY: the extension uses only typebox.Type, pi.Text, and registerTool; this test double implements all three runtime members.
  await ciphersExtension(api as unknown as Parameters<typeof ciphersExtension>[0])
})

describe('OMP extension', () => {
  it('registers every tool read-only, with the schema of its definition', () => {
    expect(
      [...tools.values()].map(({ name, label, approval, loadMode }) => ({
        name,
        label,
        approval,
        loadMode,
      })),
    ).toEqual(
      ciphersTools.map((tool) => ({
        name: tool.name,
        label: tool.title,
        approval: 'read',
        loadMode: undefined,
      })),
    )
    for (const definition of ciphersTools) {
      expect(getTool(definition.name).parameters, definition.name).toEqual(definition.input)
    }
  })

  it('executes Beaufort in both directions', async () => {
    const encoded = await getTool('ciphers_encode').execute('encode', {
      cipher: 'beaufort',
      text: 'DCODE',
      key: 'KEY',
    })
    expect(encoded.content[0]?.text).toBe('HCKHA')
    const decoded = await getTool('ciphers_decode').execute('decode', {
      cipher: 'beaufort',
      text: 'HCKHA',
      key: 'KEY',
    })
    expect(decoded.content[0]?.text).toBe('DCODE')
    const info = await getTool('ciphers_info').execute('info', { cipher: 'beaufort' })
    expect(info.content[0]?.text).toContain('key (string, required)')
  })

  it('executes the 24-letter Bacon table in both directions', async () => {
    const encoded = await getTool('ciphers_encode').execute('encode', {
      cipher: 'bacon',
      text: 'KNIGHT',
      letters: 24,
    })
    expect(encoded.content[0]?.text).toBe('ABAABABBAAABAAAAABBAAABBBBAABA')
    const decoded = await getTool('ciphers_decode').execute('decode', {
      cipher: 'bacon',
      text: 'ABAABABBAAABAAAAABBAAABBBBAABA',
      letters: 24,
    })
    expect(decoded.content[0]?.text).toBe('KNIGHT')
    const info = await getTool('ciphers_info').execute('info', { cipher: 'bacon' })
    expect(info.content[0]?.text).toContain('letters (number, default=26)')
  })

  it('executes ADFGVX with its transposition key in both directions', async () => {
    const options = { key: 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ', transposition: 'PRIVACY' }
    const encoded = await getTool('ciphers_encode').execute('encode', {
      cipher: 'adfgvx',
      text: 'attack at 1200am',
      ...options,
    })
    expect(encoded.content[0]?.text).toBe('DGDDDAGDDGAFADDFDADVDVFAADVX')
    const decoded = await getTool('ciphers_decode').execute('decode', {
      cipher: 'adfgvx',
      text: 'DGDDDAGDDGAFADDFDADVDVFAADVX',
      ...options,
    })
    expect(decoded.content[0]?.text).toBe('ATTACKAT1200AM')
  })

  it('executes Autokey in both directions', async () => {
    const encoded = await getTool('ciphers_encode').execute('encode', {
      cipher: 'autokey',
      text: 'ATTACKATDAWN',
      key: 'QUEENLY',
    })
    expect(encoded.content[0]?.text).toBe('QNXEPVYTWTWP')
    const decoded = await getTool('ciphers_decode').execute('decode', {
      cipher: 'autokey',
      text: 'QNXEPVYTWTWP',
      key: 'QUEENLY',
    })
    expect(decoded.content[0]?.text).toBe('ATTACKATDAWN')
    const info = await getTool('ciphers_info').execute('info', { cipher: 'autokey' })
    expect(info.content[0]?.text).toContain('key (string, required)')
  })

  it('lists the stream ciphers in their own category', async () => {
    const list = await getTool('ciphers_info').execute('info', {})
    expect(list.content[0]?.text).toContain('\nstream:\n  rabbit [arx]')
    const block = await getTool('ciphers_info').execute('info', { category: 'block' })
    expect(block.content[0]?.text).not.toContain('rabbit')
    const stream = await getTool('ciphers_info').execute('info', { category: 'stream' })
    expect(stream.content[0]?.text).toMatch(/^stream:\n {2}rabbit \[arx\] — Rabbit stream cipher/)
  })

  it('describes ciphers for discovery', async () => {
    const list = await getTool('ciphers_info').execute('info', {})
    expect(list.content[0]?.text).toMatch(/^classical:\n {2}caesar \[substitution-shift\]/)
    expect(list.content[0]?.text).toContain('enigma [rotor]')
    expect(list.content[0]?.text).toContain('\nblock:\n  aes [substitution-permutation]')
    const classical = await getTool('ciphers_info').execute('info', { category: 'classical' })
    expect(classical.content[0]?.text).toContain('enigma [rotor]')
    expect(classical.content[0]?.text).not.toMatch(/\baes\b/)
    const block = await getTool('ciphers_info').execute('info', { category: 'block' })
    expect(block.content[0]?.text).toMatch(
      /^block:\n {2}aes \[substitution-permutation\].*\n {2}aes-cbc \[substitution-permutation\].*\n {2}aes-cfb \[substitution-permutation\].*\n {2}aes-ofb \[substitution-permutation\].*\n {2}aes-ctr \[substitution-permutation\].*\n {2}aes-ccm \[substitution-permutation\].*\n {2}aes-ocb \[substitution-permutation\].*\n {2}aes-lrw \[substitution-permutation\].*\n {2}aes-xts \[substitution-permutation\].*\n {2}aes-cbc-mac \[substitution-permutation\].*\n {2}aes-passphrase \[substitution-permutation\].*\n {2}rijndael \[substitution-permutation\].*\n {2}des \[feistel\].*\n {2}desx \[feistel\].*\n {2}triple-des \[feistel\].*\n {2}triple-des-cbc \[feistel\].*\n {2}blowfish \[feistel\].*\n {2}idea \[lai-massey\].*\n {2}lucifer \[feistel\].*\n {2}mars \[feistel\].*\n {2}serpent \[substitution-permutation\]/,
    )

    const detail = await getTool('ciphers_info').execute('info', { cipher: 'playfair' })
    expect(detail.content[0]?.text).toContain('(playfair) — classical, digraph')
    expect(detail.content[0]?.text).toContain('key (string, required)')
  })

  it('encodes, decodes, and throws on resolution failures', async () => {
    const encoded = await getTool('ciphers_encode').execute('encode', {
      cipher: 'caesar',
      text: 'ATTACK AT DAWN',
      shift: 3,
    })
    expect(encoded.content[0]?.text).toBe('DWWDFN DW GDZQ')

    const decoded = await getTool('ciphers_decode').execute('decode', {
      cipher: 'caesar',
      text: 'DWWDFN DW GDZQ',
      shift: 3,
    })
    expect(decoded.content[0]?.text).toBe('ATTACK AT DAWN')

    await expect(
      getTool('ciphers_encode').execute('failure', {
        cipher: 'cae',
        text: 'TEST',
      }),
    ).rejects.toThrow('Invalid arguments at /cipher: must be one of caesar, ')
    await expect(getTool('ciphers_info').execute('failure', { cipher: 'cae' })).rejects.toThrow(
      'Unknown cipher: "cae"',
    )
    await expect(
      getTool('ciphers_encode').execute('key', { cipher: 'vigenere', text: 'TEST' }),
    ).rejects.toThrow('Invalid arguments at /key: required for vigenere')
  })

  it('enforces language, option, and resource boundaries before the executors', async () => {
    const rejects = async (toolName: string, params: Readonly<Record<string, unknown>>) =>
      await expect(getTool(toolName).execute('bounds', params)).rejects.toThrow('Invalid arguments')
    const accepts = async (toolName: string, params: Readonly<Record<string, unknown>>) =>
      await expect(getTool(toolName).execute('bounds', params)).resolves.toBeDefined()

    await accepts('ciphers_frequency', { text: 'TEST', lang: 'pl' })
    await accepts('ciphers_frequency', { text: 'TEST', lang: 'ja' })
    await rejects('ciphers_frequency', { text: 'TEST', lang: 'de' })
    await rejects('ciphers_frequency', { text: 'X'.repeat(100_001) })

    await accepts('ciphers_period_estimate', { text: 'TEST', maxPeriod: 100 })
    await rejects('ciphers_period_estimate', { text: 'TEST', maxPeriod: 101 })
    await rejects('ciphers_period_estimate', { text: 'TEST', maxPeriod: 1 })
    await rejects('ciphers_period_estimate', { text: 'TEST', lang: 'de' })

    await accepts('ciphers_family_guess', { text: 'TEST', lang: 'ja' })
    await rejects('ciphers_family_guess', { text: 'TEST', lang: 'de' })
    await rejects('ciphers_family_guess', { text: 'X'.repeat(100_001) })

    const blob = 'U2FsdGVkX18HYWQDuJcJTh2NoqzqwZ9pWaEBkXGGu54='
    await accepts('ciphers_passphrase_probe', { text: blob, key: 'secret', keyLengths: [1024] })
    await accepts('ciphers_passphrase_probe', { text: blob, key: 'secret', iterations: [1, 2] })
    await rejects('ciphers_passphrase_probe', { text: blob, key: '' })
    await rejects('ciphers_passphrase_probe', { text: blob, key: 'secret', digests: ['sha512'] })
    await rejects('ciphers_passphrase_probe', { text: blob, key: 'secret', digests: [] })
    await rejects('ciphers_passphrase_probe', { text: blob, key: 'secret', keyLengths: [100] })
    await rejects('ciphers_passphrase_probe', { text: blob, key: 'secret', iterations: [0] })
    await rejects('ciphers_passphrase_probe', {
      text: blob,
      key: 'secret',
      iterations: Array.from({ length: 33 }, (_, index) => index + 1),
    })
    await rejects('ciphers_passphrase_probe', { text: blob, key: 'secret', digest: 'md5' })
    await accepts('ciphers_hidden_text_read', { text: 'TEST', pick: 'word', letter: -1 })
    await accepts('ciphers_hidden_text_read', {
      text: 'TEST',
      pick: 'diagonal',
      direction: 'down-left',
    })
    await rejects('ciphers_hidden_text_read', { text: 'TEST', pick: 'column' })
    await rejects('ciphers_hidden_text_read', { text: 'TEST', pick: 'every-letter', every: 0 })
    await rejects('ciphers_hidden_text_read', { text: 'TEST', letter: 1.5 })
    await accepts('ciphers_hidden_text_read', { text: 'TEST', pick: 'word', letter: -1_001 })
    await rejects('ciphers_hidden_text_read', { text: 'TEST', pick: 'word', letter: 100_001 })
    await rejects('ciphers_hidden_text_read', { text: 'TEST', direction: 'up' })
    await rejects('ciphers_hidden_text_read', { text: 'X'.repeat(100_001) })

    await accepts('ciphers_encode', { cipher: 'caesar', text: 'X'.repeat(10_000) })
    await rejects('ciphers_encode', { cipher: 'caesar', text: 'X'.repeat(10_001) })
    await rejects('ciphers_encode', { cipher: 'bifid', text: 'X', period: 0 })
    await rejects('ciphers_encode', { cipher: 'bacon', text: 'X', letters: 25 })
    await accepts('ciphers_encode', { cipher: 'bacon', text: 'X', letters: 24 })
    await rejects('ciphers_encode', { cipher: 'rail-fence', text: 'X', rails: 1 })
    await rejects('ciphers_encode', { cipher: 'affine', text: 'X', a: 2 })
    await accepts('ciphers_encode', { cipher: 'affine', text: 'X', a: 3 })
    await rejects('ciphers_encode', { cipher: 'vigenere', text: 'X', key: 'K'.repeat(1_001) })
    await accepts('ciphers_encode', {
      cipher: 'enigma',
      text: 'A',
      positions: 'AAA',
      rings: 'AAA',
      plugboard: 'AV BS',
    })
    await rejects('ciphers_encode', { cipher: 'enigma', text: 'A', positions: 'AA' })
    await rejects('ciphers_encode', { cipher: 'enigma', text: 'A', rings: 'AAAA' })
    await rejects('ciphers_encode', { cipher: 'enigma', text: 'A', positions: '123' })
    await rejects('ciphers_encode', { cipher: 'enigma', text: 'A', rings: 'A1A' })
    await rejects('ciphers_encode', { cipher: 'enigma', text: 'A', plugboard: 'A'.repeat(78) })
    await rejects('ciphers_encode', { cipher: 'caesar', text: 'A', shfit: 1 })

    await rejects('ciphers_caesar_brute', { text: 'X'.repeat(2_001) })

    await accepts('ciphers_crib_drag', { ciphertexts: ['00', '01'], crib: 'a', limit: 50 })
    await rejects('ciphers_crib_drag', { ciphertexts: ['00'], crib: 'a' })
    await rejects('ciphers_crib_drag', { ciphertexts: ['00', '01'], crib: '' })
    await rejects('ciphers_crib_drag', { ciphertexts: ['00', '01'], limit: 51 })
    await rejects('ciphers_crib_drag', {
      ciphertexts: ['00', '01'],
      known: [{ message: 0, offset: 0, text: 'a', at: 1 }],
    })
  })

  it('clips a collapsed result preview and keeps the expanded one whole', async () => {
    const tool = getTool('ciphers_caesar_brute')
    const result = await tool.execute('brute', { text: 'K'.repeat(2_000) })

    const collapsed = renderText(tool.name, result).split('\n')
    expect(collapsed).toHaveLength(11)
    expect(collapsed[0]).toHaveLength(200)
    for (const line of collapsed.slice(1, 10)) expect(line.endsWith('…')).toBe(true)
    expect(collapsed[10]).toBe('… 15 more lines')

    expect(renderText(tool.name, result, { expanded: true })).toBe(result.content[0]?.text)
  })

  it('renders encode and decode results through the same preview', async () => {
    const encoded = await getTool('ciphers_encode').execute('encode', {
      cipher: 'caesar',
      text: 'A'.repeat(10_000),
      shift: 3,
    })
    const decoded = await getTool('ciphers_decode').execute('decode', {
      cipher: 'caesar',
      text: 'D'.repeat(10_000),
      shift: 3,
    })

    for (const [toolName, result] of [
      ['ciphers_encode', encoded],
      ['ciphers_decode', decoded],
    ] as const) {
      const preview = renderText(toolName, result)
      expect(preview).toHaveLength(200)
      expect(preview.endsWith('…')).toBe(true)
      expect(renderText(toolName, result, { expanded: true })).toBe(result.content[0]?.text)
    }

    const info = await getTool('ciphers_info').execute('info', {})
    expect(renderText('ciphers_info', info, {}, theme)).toBe(
      'success:status.done accent(Cipher Info) accent([read])',
    )
  })

  it('renders the trailing spaces caesar carries over from its input', async () => {
    const tool = getTool('ciphers_encode')
    const result = await tool.execute('encode', {
      cipher: 'caesar',
      text: 'ATTACK AT DAWN  ',
      shift: 3,
    })

    expect(result.content[0]?.text).toBe('DWWDFN DW GDZQ  ')
    expect(tool.renderResult?.(result, { expanded: true }, theme)?.text).toBe(
      'toolOutput(DWWDFN DW GDZQ  )',
    )
  })

  it('brute-forces Caesar and analyzes frequencies', async () => {
    const brute = await getTool('ciphers_caesar_brute').execute('brute', { text: 'KHOOR' })
    expect(brute.content[0]?.text.split('\n')).toHaveLength(25)
    expect(brute.content[0]?.text).toContain('shift= 3 -> HELLO')
    const polish = await getTool('ciphers_caesar_brute').execute('brute', {
      text: 'OLWZR RMFCBCQR PRMD',
      lang: 'pl',
    })
    expect(polish.content[0]?.text.split('\n')[0]).toBe('shift= 3 -> LITWO OJCZYZNO MOJA')

    const frequency = await getTool('ciphers_frequency').execute('frequency', {
      text: 'AAABBC',
      lang: 'en',
    })
    expect(frequency.content[0]?.text).toContain('A    3 ( 50.0%)')
    expect(frequency.content[0]?.text).toContain('Actual:         A B C')
    expect(frequency.content[0]?.text).toContain('Index of coincidence: 0.2667')
  })
})
