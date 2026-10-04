import { callTool, toolListings } from "#mcp";
import {
  defineMcpTool,
  type McpToolDefinition,
  type McpToolDefinitionListItem,
} from "@nuxtjs/mcp-toolkit/server";
import { z } from "zod";

/**
 * One cipher tool for the Docus MCP server, with the name, prose, annotations and executor of
 * `ciphers mcp`. Zod gets the whole object, since a bare shape strips a key the tool doesn't take.
 *
 * @param {string} name - The tool's name, such as `ciphers_encode`.
 * @returns {McpToolDefinitionListItem} The tool definition for `server/mcp/tools/`.
 */
export function ciphersMcpTool(name: string): McpToolDefinitionListItem {
  const listing = toolListings.find((candidate) => candidate.name === name);
  if (listing === undefined) {
    throw new Error(`Unknown ciphers tool: ${name}`);
  }
  const schema = z.fromJSONSchema(listing.inputSchema as z.core.JSONSchema.JSONSchema);
  /** The toolkit types a raw shape only, while the SDK it hands the schema to takes an object too. */
  const inputSchema = schema as unknown as NonNullable<McpToolDefinition["inputSchema"]>;
  return defineMcpTool({
    name: listing.name,
    title: listing.title,
    description: listing.description,
    annotations: listing.annotations,
    inputSchema,
    handler: (args: Readonly<Record<string, unknown>>) => callTool(name, args),
  });
}
