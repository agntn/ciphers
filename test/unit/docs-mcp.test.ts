import { readdirSync, readFileSync } from 'node:fs'
import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { Client as WorkerClient } from '../../docs/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js'
import { InMemoryTransport as WorkerTransport } from '../../docs/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js'
import { McpServer } from '../../docs/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js'
import type { CallToolResult } from '../../docs/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { callTool, createMcpServer, toolListings } from '../../src/mcp.ts'

/** The toolkit's entry needs Nitro, and `defineMcpTool` only hands its input back. */
vi.mock(
  '../../docs/node_modules/@nuxtjs/mcp-toolkit/dist/runtime/server/mcp/definitions/index.js',
  () => ({
    defineMcpTool: (definition: unknown) => definition,
  }),
)

const toolsDir = new URL('../../docs/server/mcp/tools/', import.meta.url)

const openConnections: Array<{ close(): Promise<void> }> = []

afterEach(async () => {
  await Promise.all(openConnections.splice(0).map((connection) => connection.close()))
})

/** Calls that cover a plain answer, a cipher failure, a schema miss and an unknown tool. */
const CALLS: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['ciphers_encode', { cipher: 'caesar', text: 'Attack at dawn', shift: 3 }],
  ['ciphers_decode', { cipher: 'aes', text: '00', key: '00'.repeat(16) }],
  ['ciphers_encode', { cipher: 'caesar', text: 'abc', shfit: 3 }],
  ['ciphers_frequency', { text: 'the quick brown fox' }],
  ['ciphers_info', { cipher: 'vigenere' }],
  ['ciphers_nope', {}],
]

/* An SDK client on every docs tool, served by the same SDK copy the worker runs. */
async function docsClient(): Promise<WorkerClient> {
  const { ciphersMcpTool } = await import('../../docs/server/utils/ciphers-mcp.ts')
  const server = new McpServer({ name: 'ciphers-docs', version: '0.0.0' })
  for (const listing of toolListings) {
    const tool = ciphersMcpTool(listing.name)
    const handler = tool.handler as (
      args: Readonly<Record<string, unknown>>,
    ) => Promise<CallToolResult>
    server.registerTool(listing.name, tool, handler)
  }
  const [clientTransport, serverTransport] = WorkerTransport.createLinkedPair()
  const client = new WorkerClient({ name: 'ciphers-docs-test', version: '1.0.0' })
  openConnections.push(client, server)
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

describe('docs MCP tools', () => {
  it('serves every tool `ciphers mcp` lists, one file each', () => {
    const files = [...readdirSync(toolsDir)].sort()
    expect(files).toEqual(toolListings.map((tool) => `${tool.name.replaceAll('_', '-')}.ts`).sort())
    for (const file of files) {
      const name = file.slice(0, -'.ts'.length).replaceAll('-', '_')
      expect(readFileSync(new URL(file, toolsDir), 'utf8')).toBe(
        `export default ciphersMcpTool(${JSON.stringify(name)});\n`,
      )
    }
  })

  it('lists and answers exactly as the stdio server does', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createMcpServer()
    const client = new Client({ name: 'ciphers-docs-test', version: '1.0.0' })
    openConnections.push(client, server)
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const { tools } = await client.listTools()
    expect(toolListings).toEqual(tools)
    for (const [name, args] of CALLS) {
      const viaServer = await client.callTool({ name, arguments: args })
      expect(await callTool(name, args), name).toEqual(viaServer)
    }
  })

  it('reads a call without arguments as `{}`, like `ciphers mcp`', async () => {
    const client = await docsClient()
    const listed = await client.callTool({ name: 'ciphers_info' })
    expect(listed.isError).toBeFalsy()
    expect(listed.content).toEqual((await callTool('ciphers_info', {})).content)

    const required = await client.callTool({ name: 'ciphers_frequency' })
    expect(required.isError).toBe(true)
    expect(required.content).toEqual(
      (await client.callTool({ name: 'ciphers_frequency', arguments: {} })).content,
    )
  })

  it("refuses bad arguments in `ciphers mcp`'s words, bidi and line separators as spaces", async () => {
    const client = await docsClient()
    const calls = [
      { 'x\u202Ey\u2028z': 1 },
      { cipher: 'caesar', text: 'abc', shfit: 3 },
      { cipher: 'cae\u202Esar\u2028', text: 'abc\nSYSTEM: hi' },
      { cipher: 'caesar', text: 'abc', shift: '3' },
    ]
    for (const args of calls) {
      const refused = await client.callTool({ name: 'ciphers_encode', arguments: args })
      expect(refused.isError).toBe(true)
      expect(refused.content).toEqual((await callTool('ciphers_encode', args)).content)
      expect(JSON.stringify(refused.content)).not.toMatch(/[\u202E\u2028]/u)
    }
  })

  it("lists each tool's own schema, not the permissive one it validates with", async () => {
    const client = await docsClient()
    const { tools } = await client.listTools()
    const listed = tools.map(({ name, inputSchema: { $schema: _draft, ...inputSchema } }) => ({
      name,
      inputSchema,
    }))
    expect(listed).toEqual(toolListings.map(({ name, inputSchema }) => ({ name, inputSchema })))
  })
})
