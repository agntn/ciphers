import { beforeAll, describe, expect, it } from 'vitest'
import { Type } from '@oh-my-pi/omptype/typebox'
import ciphersExtension from '../../packages/omp/extensions/ciphers'

type ToolResult = {
  content: Array<{ type: string; text: string }>
  isError?: boolean
}

type RegisteredTool = {
  name: string
  label: string
  approval?: string
  loadMode?: string
  parameters: {
    safeParse(input: unknown): { success: boolean }
  }
  execute(toolCallId: string, params: Record<string, unknown>): Promise<ToolResult>
}

const tools = new Map<string, RegisteredTool>()

function isRegisteredTool(value: unknown): value is RegisteredTool {
  return typeof value === 'object'
    && value !== null
    && typeof Reflect.get(value, 'name') === 'string'
    && typeof Reflect.get(value, 'label') === 'string'
    && typeof Reflect.get(value, 'parameters') === 'function'
    && typeof Reflect.get(value, 'execute') === 'function'
}

function getTool(name: string): RegisteredTool {
  const tool = tools.get(name)
  if (tool === undefined) throw new Error(`Tool not registered: ${name}`)
  return tool
}

beforeAll(() => {
  const api = {
    typebox: { Type },
    registerTool(tool: unknown) {
      if (!isRegisteredTool(tool)) throw new Error('Invalid tool registration')
      tools.set(tool.name, tool)
    },
  }

  // SAFETY: the extension uses only typebox.Type and registerTool; this test double implements both runtime members.
  ciphersExtension(api as unknown as Parameters<typeof ciphersExtension>[0])
})

describe('OMP extension', () => {
  it('registers four essential read-only tools', () => {
    expect([...tools.values()].map(({ name, label, approval, loadMode }) => ({
      name,
      label,
      approval,
      loadMode,
    }))).toEqual([
      { name: 'cipher_encode', label: 'Cipher Encode', approval: 'read', loadMode: 'essential' },
      { name: 'cipher_decode', label: 'Cipher Decode', approval: 'read', loadMode: 'essential' },
      { name: 'cipher_brute_caesar', label: 'Brute Force Caesar', approval: 'read', loadMode: 'essential' },
      { name: 'cipher_frequency', label: 'Frequency Analysis', approval: 'read', loadMode: 'essential' },
    ])
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

    await expect(getTool('cipher_encode').execute('failure', {
      cipher: 'cae',
      text: 'TEST',
    })).rejects.toThrow('Unknown cipher')
  })

  it('enforces language, option, and resource boundaries in OMP schemas', () => {
    const frequencySchema = getTool('cipher_frequency').parameters
    expect(frequencySchema.safeParse({ text: 'TEST', lang: 'pl' }).success).toBe(true)
    expect(frequencySchema.safeParse({ text: 'TEST', lang: 'de' }).success).toBe(false)
    expect(frequencySchema.safeParse({ text: 'X'.repeat(100_001) }).success).toBe(false)

    const transformSchema = getTool('cipher_encode').parameters
    expect(transformSchema.safeParse({ cipher: 'caesar', text: 'X'.repeat(10_000) }).success).toBe(true)
    expect(transformSchema.safeParse({ cipher: 'caesar', text: 'X'.repeat(10_001) }).success).toBe(false)
    expect(transformSchema.safeParse({ cipher: 'bifid', text: 'X', period: 0 }).success).toBe(false)
    expect(transformSchema.safeParse({ cipher: 'rail-fence', text: 'X', rails: 1 }).success).toBe(false)
    expect(transformSchema.safeParse({ cipher: 'vigenere', text: 'X', key: 'K'.repeat(1_001) }).success).toBe(false)

    const bruteSchema = getTool('cipher_brute_caesar').parameters
    expect(bruteSchema.safeParse({ text: 'X'.repeat(2_001) }).success).toBe(false)
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
  })
})
