import { beforeAll, describe, expect, it } from 'vite-plus/test'
import { Type } from '@oh-my-pi/omptype/typebox'
import ciphersExtension from '../../packages/omp/extensions/ciphers'

type ToolResult = {
  readonly content: ReadonlyArray<{ readonly type: string; readonly text: string }>
  readonly isError?: boolean
}

type RegisteredTool = {
  name: string
  label: string
  approval?: string
  loadMode?: string
  parameters: {
    safeParse(input: unknown): { success: boolean }
  }
  execute(toolCallId: string, params: Readonly<Record<string, unknown>>): Promise<ToolResult>
  renderResult?: (
    result: Readonly<ToolResult>,
    options: Readonly<{ expanded?: boolean }>,
    theme: Readonly<Record<string, unknown>>,
  ) => RenderedText
}

/** Stand-in for the host Text component, which records what it was given. */
class RenderedText {
  constructor(readonly text: string) {}
}

const tools = new Map<string, RegisteredTool>()

function isRegisteredTool(value: unknown): value is RegisteredTool {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'name') === 'string' &&
    typeof Reflect.get(value, 'label') === 'string' &&
    typeof Reflect.get(value, 'parameters') === 'function' &&
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
): string {
  const renderer = getTool(toolName).renderResult
  if (renderer === undefined) throw new Error(`Tool has no result renderer: ${toolName}`)
  return renderer(result, options, {}).text
}

beforeAll(() => {
  const api = {
    typebox: { Type },
    pi: { Text: RenderedText },
    registerTool(tool: unknown) {
      if (!isRegisteredTool(tool)) throw new Error('Invalid tool registration')
      tools.set(tool.name, tool)
    },
  }

  // SAFETY: the extension uses only typebox.Type, pi.Text, and registerTool; this test double implements all three runtime members.
  ciphersExtension(api as unknown as Parameters<typeof ciphersExtension>[0])
})

describe('OMP extension', () => {
  it('registers five essential read-only tools', () => {
    expect(
      [...tools.values()].map(({ name, label, approval, loadMode }) => ({
        name,
        label,
        approval,
        loadMode,
      })),
    ).toEqual([
      { name: 'cipher_encode', label: 'Cipher Encode', approval: 'read', loadMode: 'essential' },
      { name: 'cipher_decode', label: 'Cipher Decode', approval: 'read', loadMode: 'essential' },
      {
        name: 'cipher_brute_caesar',
        label: 'Brute Force Caesar',
        approval: 'read',
        loadMode: 'essential',
      },
      {
        name: 'cipher_frequency',
        label: 'Frequency Analysis',
        approval: 'read',
        loadMode: 'essential',
      },
      { name: 'cipher_info', label: 'Cipher Info', approval: 'read', loadMode: 'essential' },
    ])
  })

  it('describes ciphers for discovery', async () => {
    const list = await getTool('cipher_info').execute('info', {})
    expect(list.content[0]?.text).toContain('caesar [substitution-shift]')
    expect(list.content[0]?.text).toContain('enigma [rotor]')

    const detail = await getTool('cipher_info').execute('info', { cipher: 'playfair' })
    expect(detail.content[0]?.text).toContain('(playfair) — digraph')
    expect(detail.content[0]?.text).toContain('key (string, required)')
  })

  it('encodes, decodes, and throws on resolution failures', async () => {
    const encoded = await getTool('cipher_encode').execute('encode', {
      cipher: 'caesar',
      text: 'ATTACK AT DAWN',
      shift: 3,
    })
    expect(encoded.content[0]?.text).toBe('DWWDFN DW GDZQ')

    const decoded = await getTool('cipher_decode').execute('decode', {
      cipher: 'caesar',
      text: 'DWWDFN DW GDZQ',
      shift: 3,
    })
    expect(decoded.content[0]?.text).toBe('ATTACK AT DAWN')

    await expect(
      getTool('cipher_encode').execute('failure', {
        cipher: 'cae',
        text: 'TEST',
      }),
    ).rejects.toThrow('Unknown cipher')
  })

  it('enforces language, option, and resource boundaries in OMP schemas', () => {
    const frequencySchema = getTool('cipher_frequency').parameters
    expect(frequencySchema.safeParse({ text: 'TEST', lang: 'pl' }).success).toBe(true)
    expect(frequencySchema.safeParse({ text: 'TEST', lang: 'de' }).success).toBe(false)
    expect(frequencySchema.safeParse({ text: 'X'.repeat(100_001) }).success).toBe(false)

    const transformSchema = getTool('cipher_encode').parameters
    expect(transformSchema.safeParse({ cipher: 'caesar', text: 'X'.repeat(10_000) }).success).toBe(
      true,
    )
    expect(transformSchema.safeParse({ cipher: 'caesar', text: 'X'.repeat(10_001) }).success).toBe(
      false,
    )
    expect(transformSchema.safeParse({ cipher: 'bifid', text: 'X', period: 0 }).success).toBe(false)
    expect(transformSchema.safeParse({ cipher: 'rail-fence', text: 'X', rails: 1 }).success).toBe(
      false,
    )
    expect(
      transformSchema.safeParse({ cipher: 'vigenere', text: 'X', key: 'K'.repeat(1_001) }).success,
    ).toBe(false)
    expect(
      transformSchema.safeParse({
        cipher: 'enigma',
        text: 'A',
        positions: 'AAA',
        rings: 'AAA',
        plugboard: 'AV BS',
      }).success,
    ).toBe(true)
    expect(
      transformSchema.safeParse({ cipher: 'enigma', text: 'A', positions: 'AA' }).success,
    ).toBe(false)
    expect(transformSchema.safeParse({ cipher: 'enigma', text: 'A', rings: 'AAAA' }).success).toBe(
      false,
    )
    expect(
      transformSchema.safeParse({ cipher: 'enigma', text: 'A', positions: '123' }).success,
    ).toBe(false)
    expect(transformSchema.safeParse({ cipher: 'enigma', text: 'A', rings: 'A1A' }).success).toBe(
      false,
    )
    expect(
      transformSchema.safeParse({ cipher: 'enigma', text: 'A', plugboard: 'A'.repeat(78) }).success,
    ).toBe(false)

    const bruteSchema = getTool('cipher_brute_caesar').parameters
    expect(bruteSchema.safeParse({ text: 'X'.repeat(2_001) }).success).toBe(false)
  })

  it('clips a collapsed result preview and keeps the expanded one whole', async () => {
    const tool = getTool('cipher_brute_caesar')
    const result = await tool.execute('brute', { text: 'K'.repeat(2_000) })

    const collapsed = renderText(tool.name, result).split('\n')
    expect(collapsed).toHaveLength(11)
    for (const line of collapsed.slice(0, 10)) expect(line).toHaveLength(200)
    expect(collapsed[10]).toBe('… 15 more lines')

    expect(renderText(tool.name, result, { expanded: true })).toBe(result.content[0]?.text)
  })

  it('renders encode and decode results through the same preview', async () => {
    const encoded = await getTool('cipher_encode').execute('encode', {
      cipher: 'caesar',
      text: 'A'.repeat(10_000),
      shift: 3,
    })
    const decoded = await getTool('cipher_decode').execute('decode', {
      cipher: 'caesar',
      text: 'D'.repeat(10_000),
      shift: 3,
    })

    for (const [toolName, result] of [
      ['cipher_encode', encoded],
      ['cipher_decode', decoded],
    ] as const) {
      const preview = renderText(toolName, result)
      expect(preview).toHaveLength(200)
      expect(preview.endsWith('…')).toBe(true)
      expect(renderText(toolName, result, { expanded: true })).toBe(result.content[0]?.text)
    }

    expect(getTool('cipher_info').renderResult).toBeUndefined()
    expect(getTool('cipher_frequency').renderResult).toBeUndefined()
  })

  it('renders the trailing spaces caesar carries over from its input', async () => {
    const tool = getTool('cipher_encode')
    const result = await tool.execute('encode', {
      cipher: 'caesar',
      text: 'ATTACK AT DAWN  ',
      shift: 3,
    })

    expect(result.content[0]?.text).toBe('DWWDFN DW GDZQ  ')
    expect(tool.renderResult?.(result, { expanded: true }, {})?.text).toBe('DWWDFN DW GDZQ  ')
  })

  it('brute-forces Caesar and analyzes frequencies', async () => {
    const brute = await getTool('cipher_brute_caesar').execute('brute', { text: 'KHOOR' })
    expect(brute.content[0]?.text.split('\n')).toHaveLength(25)
    expect(brute.content[0]?.text).toContain('shift= 3 -> HELLO')

    const frequency = await getTool('cipher_frequency').execute('frequency', {
      text: 'AAABBC',
      lang: 'en',
    })
    expect(frequency.content[0]?.text).toContain('A    3 ( 50.0%)')
    expect(frequency.content[0]?.text).toContain('Actual:         A B C')
    expect(frequency.content[0]?.text).toContain('Index of coincidence: 0.2667')
  })
})
