import { beforeAll, describe, expect, it } from 'vite-plus/test'
import { create } from '../../src'
import ciphersExtension from '../../packages/pi/extensions/ciphers'

type ToolResult = {
  content: Array<{ type: string; text: string }>
}

type RegisteredTool = {
  name: string
  parameters: {
    properties?: Record<string, unknown>
  }
  execute(toolCallId: string, params: Record<string, unknown>): Promise<ToolResult>
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

  it('describes ciphers for discovery', async () => {
    const info = getTool('cipher_info')

    const list = await info.execute('info', {})
    expect(list.content[0]?.text).toContain('caesar [substitution-shift]')
    expect(list.content[0]?.text).toContain('enigma [rotor]')

    const detail = await info.execute('info', { cipher: 'vigenere' })
    expect(detail.content[0]?.text).toContain('(vigenere) — polyalphabetic')
    expect(detail.content[0]?.text).toContain('key (string, required)')
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
})
