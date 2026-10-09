import { createMcpServer as createToolServer } from '@agntn/tools/mcp'
import type { Server } from '@modelcontextprotocol/server'
import { serverInfo } from './server-info.ts'
import { ciphersTools } from './tools.ts'

/**
 * Create an unconnected MCP server exposing the local cipher tools.
 *
 * @returns {Server} A server ready to connect to an MCP transport.
 */
export function createMcpServer(): Server {
  return createToolServer(serverInfo, ciphersTools)
}
