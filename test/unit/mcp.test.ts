import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { Cipher, register, type CipherInfo, type CipherResult } from '../../src'
import { createMcpServer } from '../../src/mcp'

const openConnections: Array<{ close(): Promise<void> }> = []

async function connectTestClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createMcpServer()
  const client = new Client({ name: 'ciphers-test', version: '1.0.0' })
  openConnections.push(client, server)
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

afterEach(async () => {
  await Promise.all(openConnections.splice(0).map((connection) => connection.close()))
})

describe('Ciphers MCP server', () => {
  it('discovers the complete cipher tool surface', async () => {
    const client = await connectTestClient()

    const response = await client.listTools()

    expect(response.tools.map((tool) => tool.name)).toEqual([
      'cipher_encode',
      'cipher_decode',
      'cipher_brute_caesar',
      'cipher_frequency',
      'cipher_info',
    ])
    const encodeTool = response.tools.find((tool) => tool.name === 'cipher_encode')
    expect(encodeTool?.inputSchema).toMatchObject({
      type: 'object',
      required: ['cipher', 'text'],
    })
    const encodedSchema = JSON.stringify(encodeTool?.inputSchema)
    expect(encodedSchema).toContain('"const":"caesar"')
    expect(encodedSchema).toContain('"const":"enigma"')
    expect(encodeTool?.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    })
  })

  it('executes encode and decode through the protocol', async () => {
    const client = await connectTestClient()

    const encoded = await client.callTool({
      name: 'cipher_encode',
      arguments: { cipher: 'caesar', text: 'abc', shift: 1, preserveCase: false },
    })
    expect(encoded).toMatchObject({
      content: [{ type: 'text', text: 'BCD' }],
    })
    expect(encoded.isError).not.toBe(true)

    const decoded = await client.callTool({
      name: 'cipher_decode',
      arguments: { cipher: 'caesar', text: 'BCD', shift: 1, preserveCase: false },
    })
    expect(decoded).toMatchObject({
      content: [{ type: 'text', text: 'ABC' }],
    })
    expect(decoded.isError).not.toBe(true)
  })

  it('validates arguments before execution', async () => {
    const client = await connectTestClient()

    for (const [field, arguments_] of [
      ['shift', { cipher: 'caesar', text: 'abc', shift: 26 }],
      ['rails', { cipher: 'rail-fence', text: 'abc', rails: 10_001 }],
      ['a', { cipher: 'affine', text: 'abc', a: 2 }],
      ['period', { cipher: 'bifid', text: 'abc', period: 10_001 }],
    ] as const) {
      const response = await client.callTool({
        name: 'cipher_encode',
        arguments: arguments_,
      })

      expect(response.isError).toBe(true)
      expect(response.content).toEqual([
        { type: 'text', text: expect.stringContaining(`Invalid arguments at /${field}`) },
      ])
    }

    for (const [field, arguments_] of [
      ['key', { cipher: 'vigenere', text: 'abc' }],
      ['key', { cipher: 'alberti', text: 'abc', period: 5 }],
      ['period', { cipher: 'alberti', text: 'abc', key: 'KEY' }],
      ['key', { cipher: 'alberti', text: 'abc', key: '123', period: 5 }],
      ['key', { cipher: 'vigenere', text: 'abc', key: '123' }],
    ] as const) {
      const response = await client.callTool({
        name: 'cipher_encode',
        arguments: arguments_,
      })

      expect(response.isError).toBe(true)
      expect(response.content).toEqual([
        { type: 'text', text: expect.stringContaining(`Invalid arguments at /${field}`) },
      ])
    }

    const unrelatedSchema = await client.callTool({
      name: 'cipher_frequency',
      arguments: { cipher: 'vigenere' },
    })
    expect(unrelatedSchema.isError).toBe(true)
    expect(unrelatedSchema.content).toEqual([
      { type: 'text', text: expect.stringContaining('required properties text') },
    ])
    expect(unrelatedSchema.content).not.toEqual([
      { type: 'text', text: expect.stringContaining('/key') },
    ])
  })

  it('describes ciphers for discovery', async () => {
    const client = await connectTestClient()

    const list = await client.callTool({ name: 'cipher_info', arguments: {} })
    expect(list.isError).not.toBe(true)
    const [listEntry] = list.content as [{ type: string; text: string }]
    expect(listEntry.text).toContain('caesar [substitution-shift]')
    expect(listEntry.text).toContain('enigma [rotor]')

    const detail = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'playfair' } })
    expect(detail.isError).not.toBe(true)
    const [detailEntry] = detail.content as [{ type: string; text: string }]
    expect(detailEntry.text).toContain('(playfair) — digraph')
    expect(detailEntry.text).toContain('key (string, required)')

    const unknown = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'missing' } })
    expect(unknown.isError).toBe(true)
    expect(unknown.content).toEqual([
      { type: 'text', text: 'cipher_info failed: Unknown cipher: missing' },
    ])

    const oversized = await client.callTool({
      name: 'cipher_info',
      arguments: { cipher: 'x'.repeat(33) },
    })
    expect(oversized.isError).toBe(true)
    expect(oversized.content).toEqual([
      { type: 'text', text: expect.stringContaining('Invalid arguments at /cipher') },
    ])
  })

  it('serves ciphers registered beyond the built-ins', async () => {
    class CustomTest extends Cipher {
      name(): string {
        return 'custom-test'
      }

      info(): CipherInfo {
        return {
          name: 'custom-test',
          label: 'Custom Test',
          description: 'Registry round-trip probe',
          family: 'transposition',
          selfInverse: true,
          options: [],
        }
      }

      encode(text: string): CipherResult {
        return { text, cipher: 'custom-test', operation: 'encode', options: {} }
      }

      decode(text: string): CipherResult {
        return { text, cipher: 'custom-test', operation: 'decode', options: {} }
      }
    }
    register('custom-test', CustomTest)
    const client = await connectTestClient()

    const list = await client.callTool({ name: 'cipher_info', arguments: {} })
    const [listEntry] = list.content as [{ type: string; text: string }]
    expect(listEntry.text).toContain('custom-test [transposition]')

    const detail = await client.callTool({
      name: 'cipher_info',
      arguments: { cipher: 'custom-test' },
    })
    expect(detail.isError).not.toBe(true)
    const [detailEntry] = detail.content as [{ type: string; text: string }]
    expect(detailEntry.text).toContain('Custom Test (custom-test)')
  })

  it('reports the index of coincidence over the protocol', async () => {
    const client = await connectTestClient()

    const frequency = await client.callTool({
      name: 'cipher_frequency',
      arguments: { text: 'AAAA' },
    })
    expect(frequency.isError).not.toBe(true)
    const [entry] = frequency.content as [{ type: string; text: string }]
    expect(entry.text).toContain('Index of coincidence: 1.0000')
  })

  it('reports unknown tools and cipher names as tool errors', async () => {
    const client = await connectTestClient()

    const unknownTool = await client.callTool({ name: 'toString', arguments: {} })
    expect(unknownTool).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: 'Unknown cipher tool: toString' }],
    })

    const unknownCipher = await client.callTool({
      name: 'cipher_encode',
      arguments: { cipher: 'missing', text: 'abc' },
    })
    expect(unknownCipher.isError).toBe(true)
    expect(unknownCipher.content).toEqual([
      { type: 'text', text: expect.stringContaining('Invalid arguments at /cipher') },
    ])
  })
})
