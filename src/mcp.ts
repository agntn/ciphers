import { indexTools, invokeTool, ToolInputError, wireSchema } from '@agntn/tools'
import { createMcpServer as createToolServer, errorResult, toolAnnotations } from '@agntn/tools/mcp'
import type { CallToolResult, Server, Tool } from '@modelcontextprotocol/server'
import { serverInfo } from './server-info.ts'
import { ciphersTools } from './tools.ts'

/** The `tools/list` entries, in order, for the server at ciphers.agntn.dev/mcp. */
export const toolListings: readonly Tool[] = ciphersTools.map((tool) => ({
  name: tool.name,
  title: tool.title,
  description: tool.description,
  inputSchema: { ...wireSchema(tool), type: 'object' },
  annotations: toolAnnotations(tool),
}))

const toolsByName = indexTools(ciphersTools)

/**
 * Runs one tool the way `tools/call` does over stdio. An unknown name, a schema miss and a cipher
 * failure all come back as an error result, never as a throw.
 *
 * @param {string} name - The tool's name, such as `ciphers_encode`.
 * @param {Readonly<Record<string, unknown>>} args - The arguments the client sent.
 * @returns {Promise<CallToolResult>} The tool's text, or the sanitized error.
 */
export async function callTool(
  name: string,
  args: Readonly<Record<string, unknown>>,
): Promise<CallToolResult> {
  const tool = toolsByName.get(name)
  if (!tool) return errorResult(`Unknown ciphers tool: ${JSON.stringify(name)}`)

  try {
    const result = await invokeTool(tool, args)
    return {
      content: result.content,
      ...(result.isError === undefined ? {} : { isError: result.isError }),
    }
  } catch (error) {
    if (error instanceof ToolInputError) return errorResult(...error.lines)
    return errorResult(
      `${tool.name} failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Create an unconnected MCP server exposing the local cipher tools.
 *
 * @returns {Server} A server ready to connect to an MCP transport.
 */
export function createMcpServer(): Server {
  return createToolServer(serverInfo, ciphersTools)
}
