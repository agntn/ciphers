import { readdirSync, readFileSync } from 'node:fs'
import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { callTool, createMcpServer, toolListings } from '../../src/mcp.ts'

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
})
