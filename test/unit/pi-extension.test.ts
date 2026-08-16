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
  it('exposes and forwards common cipher options', async () => {
    const encode = getTool('cipher_encode')
    expect(encode.parameters.properties).toHaveProperty('preserveCase')
    expect(encode.parameters.properties).toHaveProperty('stripNonAlpha')

    const encoded = await encode.execute('encode', {
      cipher: 'caesar',
      text: 'a-b c',
      shift: 1,
      preserveCase: false,
      stripNonAlpha: true,
    })

    const libraryResult = create('caesar').encode('a-b c', {
      shift: 1,
      preserveCase: false,
      stripNonAlpha: true,
    })
    expect(encoded.content[0]?.text).toBe('BCD')
    expect(encoded.content[0]?.text).toBe(libraryResult.text)
  })
})
