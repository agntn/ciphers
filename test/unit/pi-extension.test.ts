import { beforeAll, describe, expect, it } from 'vite-plus/test'
import type { TSchema } from 'typebox'
import { Value } from 'typebox/value'
import { create } from '../../src'
import ciphersExtension from '../../packages/pi/extensions/ciphers'

type ToolResult = {
  readonly content: ReadonlyArray<{ readonly type: string; readonly text: string }>
  readonly details?: Readonly<Record<string, unknown>>
}

type RegisteredTool = {
  name: string
  parameters: TSchema & {
    properties?: Record<string, unknown>
  }
  execute(toolCallId: string, params: Readonly<Record<string, unknown>>): Promise<ToolResult>
  renderResult?: (
    result: Readonly<ToolResult>,
    options: Readonly<{ expanded: boolean; isPartial: boolean }>,
    theme: Readonly<Record<string, unknown>>,
  ) => unknown
}

const tools = new Map<string, RegisteredTool>()

function isRegisteredTool(value: unknown): value is RegisteredTool {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'name') === 'string' &&
    typeof Reflect.get(value, 'execute') === 'function'
  )
}

function getTool(name: string): RegisteredTool {
  const tool = tools.get(name)
  if (tool === undefined) throw new Error(`Tool not registered: ${name}`)
  return tool
}

beforeAll(() => {
  const api = {
    registerTool(tool: unknown) {
      if (!isRegisteredTool(tool)) throw new Error('Invalid tool registration')
      tools.set(tool.name, tool)
    },
  }

  // SAFETY: the extension uses only registerTool; this test double implements that runtime member.
  ciphersExtension(api as unknown as Parameters<typeof ciphersExtension>[0])
})

describe('Pi extension', () => {
  it('registers all five cipher tools', () => {
    expect([...tools.keys()]).toEqual([
      'cipher_encode',
      'cipher_decode',
      'cipher_brute_caesar',
      'cipher_frequency',
      'cipher_info',
    ])
  })

  it('renders the results whose width the tool cannot bound', () => {
    for (const name of ['cipher_encode', 'cipher_decode', 'cipher_brute_caesar']) {
      expect(getTool(name).renderResult).toBeTypeOf('function')
    }
    for (const name of ['cipher_frequency', 'cipher_info']) {
      expect(getTool(name).renderResult).toBeUndefined()
    }
  })

  it('describes ciphers for discovery', async () => {
    const info = getTool('cipher_info')

    const list = await info.execute('info', {})
    expect(list.content[0]?.text).toContain('caesar [substitution-shift]')
    expect(list.content[0]?.text).toContain('enigma [rotor]')

    const detail = await info.execute('info', { cipher: 'vigenere' })
    expect(detail.content[0]?.text).toContain('(vigenere) — polyalphabetic')
    expect(detail.content[0]?.text).toContain('key (string, required)')
  })

  it('executes Beaufort in both directions', async () => {
    const encoded = await getTool('cipher_encode').execute('encode', {
      cipher: 'beaufort',
      text: 'DCODE',
      key: 'KEY',
    })
    expect(encoded.content[0]?.text).toBe('HCKHA')
    const decoded = await getTool('cipher_decode').execute('decode', {
      cipher: 'beaufort',
      text: 'HCKHA',
      key: 'KEY',
    })
    expect(decoded.content[0]?.text).toBe('DCODE')
    const info = await getTool('cipher_info').execute('info', { cipher: 'beaufort' })
    expect(info.content[0]?.text).toContain('key (string, required)')
  })

  it('executes the 24-letter Bacon table in both directions', async () => {
    const encoded = await getTool('cipher_encode').execute('encode', {
      cipher: 'bacon',
      text: 'KNIGHT',
      letters: 24,
    })
    expect(encoded.content[0]?.text).toBe('ABAABABBAAABAAAAABBAAABBBBAABA')
    const decoded = await getTool('cipher_decode').execute('decode', {
      cipher: 'bacon',
      text: 'ABAABABBAAABAAAAABBAAABBBBAABA',
      letters: 24,
    })
    expect(decoded.content[0]?.text).toBe('KNIGHT')
    const info = await getTool('cipher_info').execute('info', { cipher: 'bacon' })
    expect(info.content[0]?.text).toContain('letters (number, default=26)')
  })

  it('executes ADFGVX with its transposition key in both directions', async () => {
    const options = { key: 'NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ', transposition: 'PRIVACY' }
    const encoded = await getTool('cipher_encode').execute('encode', {
      cipher: 'adfgvx',
      text: 'attack at 1200am',
      ...options,
    })
    expect(encoded.content[0]?.text).toBe('DGDDDAGDDGAFADDFDADVDVFAADVX')
    const decoded = await getTool('cipher_decode').execute('decode', {
      cipher: 'adfgvx',
      text: 'DGDDDAGDDGAFADDFDADVDVFAADVX',
      ...options,
    })
    expect(decoded.content[0]?.text).toBe('ATTACKAT1200AM')
  })

  it('executes Autokey in both directions', async () => {
    const encoded = await getTool('cipher_encode').execute('encode', {
      cipher: 'autokey',
      text: 'ATTACKATDAWN',
      key: 'QUEENLY',
    })
    expect(encoded.content[0]?.text).toBe('QNXEPVYTWTWP')
    const decoded = await getTool('cipher_decode').execute('decode', {
      cipher: 'autokey',
      text: 'QNXEPVYTWTWP',
      key: 'QUEENLY',
    })
    expect(decoded.content[0]?.text).toBe('ATTACKATDAWN')
    const info = await getTool('cipher_info').execute('info', { cipher: 'autokey' })
    expect(info.content[0]?.text).toContain('key (string, required)')
  })

  it('exposes and forwards common cipher options for encode and decode', async () => {
    const encode = getTool('cipher_encode')
    const decode = getTool('cipher_decode')
    for (const tool of [encode, decode]) {
      expect(tool.parameters.properties).toHaveProperty('preserveCase')
      expect(tool.parameters.properties).toHaveProperty('stripNonAlpha')
    }

    const options = {
      shift: 1,
      preserveCase: false,
      stripNonAlpha: true,
    }
    const encoded = await encode.execute('encode', {
      cipher: 'caesar',
      text: 'a-b c',
      ...options,
    })
    const decoded = await decode.execute('decode', {
      cipher: 'caesar',
      text: 'b-c d',
      ...options,
    })

    expect(encoded.content[0]?.text).toBe('BCD')
    expect(encoded.content[0]?.text).toBe(create('caesar').encode('a-b c', options).text)
    expect(decoded.content[0]?.text).toBe('ABC')
    expect(decoded.content[0]?.text).toBe(create('caesar').decode('b-c d', options).text)
  })

  it('bounds text, keys, and options the way OMP and MCP do', () => {
    const transform = getTool('cipher_encode').parameters
    expect(Value.Check(transform, { cipher: 'caesar', text: 'X'.repeat(10_000) })).toBe(true)
    expect(Value.Check(transform, { cipher: 'caesar', text: 'X'.repeat(10_001) })).toBe(false)
    expect(Value.Check(transform, { cipher: 'vigenere', text: 'X', key: 'K'.repeat(1_001) })).toBe(
      false,
    )
    expect(Value.Check(transform, { cipher: 'caesar', text: 'X', shift: 26 })).toBe(false)
    expect(Value.Check(transform, { cipher: 'rail-fence', text: 'X', rails: 1 })).toBe(false)
    expect(Value.Check(transform, { cipher: 'affine', text: 'X', a: 2 })).toBe(false)
    expect(Value.Check(transform, { cipher: 'affine', text: 'X', a: 3 })).toBe(true)
    expect(Value.Check(transform, { cipher: 'bifid', text: 'X', period: 0 })).toBe(false)
    expect(Value.Check(transform, { cipher: 'bacon', text: 'X', letters: 25 })).toBe(false)
    expect(Value.Check(transform, { cipher: 'bacon', text: 'X', letters: 24 })).toBe(true)

    const brute = getTool('cipher_brute_caesar').parameters
    expect(Value.Check(brute, { text: 'X'.repeat(2_001) })).toBe(false)

    const frequency = getTool('cipher_frequency').parameters
    expect(Value.Check(frequency, { text: 'X'.repeat(100_001) })).toBe(false)
    expect(Value.Check(frequency, { text: 'TEST', lang: 'de' })).toBe(false)
    expect(Value.Check(frequency, { text: 'TEST', lang: 'pl' })).toBe(true)
    expect(Value.Check(frequency, { text: 'TEST', lang: 'ja' })).toBe(true)
    expect(Value.Check(brute, { text: 'TEST', lang: 'ja' })).toBe(true)
  })

  it('answers through the shared executors and lets their errors reach the harness', async () => {
    const encoded = await getTool('cipher_encode').execute('encode', {
      cipher: 'caesar',
      text: 'ATTACK AT DAWN',
      shift: 3,
    })
    expect(encoded.content[0]?.text).toBe('DWWDFN DW GDZQ')
    expect(encoded.details).toEqual({
      cipher: 'caesar',
      operation: 'encode',
      options: { shift: 3, preserveCase: true, stripNonAlpha: false },
    })

    const brute = await getTool('cipher_brute_caesar').execute('brute', { text: 'KHOOR' })
    expect(brute.content[0]?.text.split('\n')).toHaveLength(25)
    expect(brute.content[0]?.text).toContain('shift= 3 -> HELLO')
    const polish = await getTool('cipher_brute_caesar').execute('brute', {
      text: 'OLWZR RMFCBCQR PRMD',
      lang: 'pl',
    })
    expect(polish.content[0]?.text.split('\n')[0]).toBe('shift= 3 -> LITWO OJCZYZNO MOJA')

    const frequency = await getTool('cipher_frequency').execute('frequency', {
      text: 'AAABBC',
      lang: 'en',
    })
    expect(frequency.content[0]?.text).toContain('A    3 ( 50.0%)')
    expect(frequency.content[0]?.text).toContain('Index of coincidence: 0.2667')

    await expect(
      getTool('cipher_encode').execute('failure', { cipher: 'cae', text: 'TEST' }),
    ).rejects.toThrow('Unknown cipher: "cae". Registered ciphers: caesar,')
  })
})
