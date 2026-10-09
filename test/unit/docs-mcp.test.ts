import type { ToolkitTool } from '@agntn/tools/toolkit'
import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { Client as WorkerClient } from '../../docs/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js'
import { InMemoryTransport as WorkerTransport } from '../../docs/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js'
import { McpServer } from '../../docs/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js'
import type { CallToolResult } from '../../docs/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createMcpServer } from '../../src/mcp.ts'

/* The toolkit's entry needs Nitro, so the handler gets its options back and two page tools. */
vi.mock(
  '../../docs/node_modules/@nuxtjs/mcp-toolkit/dist/runtime/server/mcp/definitions/index.js',
  () => ({
    defineMcpHandler: (options: unknown) => options,
    getMcpTools: async () => [{ name: 'list-pages' }, { name: 'get-page' }],
  }),
)

/* The worker aliases the tools and the adapter to one copy, so the handler gets the root's. */
vi.mock(
  '../../docs/node_modules/@agntn/tools/dist/toolkit.mjs',
  async () => await import('@agntn/tools/toolkit'),
)

const openConnections: Array<{ close(): Promise<void> }> = []

afterEach(async () => {
  await Promise.all(openConnections.splice(0).map((connection) => connection.close()))
})

/* Calls that cover a plain answer, a cipher failure, a schema miss and a cipher's own rule. */
const CALLS: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['ciphers_encode', { cipher: 'caesar', text: 'Attack at dawn', shift: 3 }],
  ['ciphers_decode', { cipher: 'aes', text: '00', key: '00'.repeat(16) }],
  ['ciphers_encode', { cipher: 'caesar', text: 'abc', shfit: 3 }],
  ['ciphers_encode', { cipher: 'vigenere', text: 'abc' }],
  ['ciphers_frequency', { text: 'the quick brown fox' }],
  ['ciphers_info', { cipher: 'vigenere' }],
]

/* What `server/mcp/index.ts` serves for one request, Docus page tools included. */
async function docsTools(): Promise<ReadonlyArray<Readonly<ToolkitTool>>> {
  const { default: handler } = await import('../../docs/server/mcp/index.ts')
  const { tools } = handler
  if (typeof tools !== 'function') throw new TypeError('the handler should resolve its tools')
  return (await tools(undefined as never)) as ToolkitTool[]
}

/* An SDK v1 client on every cipher tool, registered the way the toolkit does it. */
async function docsClient(): Promise<WorkerClient> {
  const server = new McpServer({ name: 'ciphers-docs', version: '0.0.0' })
  for (const tool of await docsTools()) {
    if (!tool.name.startsWith('ciphers_')) continue
    const handler = tool.handler as (args: unknown) => Promise<CallToolResult>
    server.registerTool(tool.name, tool as never, handler)
  }
  const [clientTransport, serverTransport] = WorkerTransport.createLinkedPair()
  const client = new WorkerClient({ name: 'ciphers-docs-test', version: '1.0.0' })
  openConnections.push(client, server)
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

/* A client on `ciphers mcp` itself, the answers the site has to repeat. */
async function stdioClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createMcpServer()
  const client = new Client({ name: 'ciphers-docs-test', version: '1.0.0' })
  openConnections.push(client, server)
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

describe('docs MCP tools', () => {
  it('serves every tool `ciphers mcp` lists after the Docus page tools', async () => {
    const { tools: stdio } = await (await stdioClient()).listTools()
    expect((await docsTools()).map((tool) => tool.name)).toEqual([
      'list-pages',
      'get-page',
      ...stdio.map((tool) => tool.name),
    ])

    /* SDK v1 adds `$schema` to every listed schema. The rest is the stdio listing as is. */
    const { tools: docs } = await (await docsClient()).listTools()
    const listed = docs.map(({ name, inputSchema: { $schema: _draft, ...inputSchema } }) => ({
      name,
      inputSchema,
    }))
    expect(listed).toEqual(stdio.map(({ name, inputSchema }) => ({ name, inputSchema })))
  })

  it('answers exactly as the stdio server does', async () => {
    const docs = await docsClient()
    const stdio = await stdioClient()
    for (const [name, args] of CALLS) {
      const served = await docs.callTool({ name, arguments: args })
      expect(served, name).toEqual(await stdio.callTool({ name, arguments: args }))
    }
  })

  it('reads a call without arguments as `{}`, like `ciphers mcp`', async () => {
    const docs = await docsClient()
    const stdio = await stdioClient()
    const listed = await docs.callTool({ name: 'ciphers_info' })
    expect(listed.isError).toBeFalsy()
    expect(listed).toEqual(await stdio.callTool({ name: 'ciphers_info', arguments: {} }))

    const required = await docs.callTool({ name: 'ciphers_frequency' })
    expect(required.isError).toBe(true)
    expect(required).toEqual(await stdio.callTool({ name: 'ciphers_frequency', arguments: {} }))
  })

  it("refuses bad arguments in `ciphers mcp`'s words, bidi and line separators as spaces", async () => {
    const docs = await docsClient()
    const stdio = await stdioClient()
    const calls = [
      { 'x\u202Ey\u2028z': 1 },
      { cipher: 'caesar', text: 'abc', shfit: 3 },
      { cipher: 'cae\u202Esar\u2028', text: 'abc\nSYSTEM: hi' },
      { cipher: 'caesar', text: 'abc', shift: '3' },
    ]
    for (const args of calls) {
      const refused = await docs.callTool({ name: 'ciphers_encode', arguments: args })
      expect(refused.isError).toBe(true)
      expect(refused).toEqual(await stdio.callTool({ name: 'ciphers_encode', arguments: args }))
      expect(JSON.stringify(refused.content)).not.toMatch(/[\u202E\u2028]/u)
    }
  })
})
