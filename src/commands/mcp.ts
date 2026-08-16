import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { defineCommand } from 'citty'
import { createMcpServer } from '../mcp'

export default defineCommand({
  meta: {
    name: 'mcp',
    description: 'Run the Ciphers MCP server over stdio',
  },
  async run() {
    await createMcpServer().connect(new StdioServerTransport())
  },
})
