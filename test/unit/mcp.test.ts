import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, describe, expect, it } from 'vite-plus/test'
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
