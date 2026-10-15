import { toToolkitTools } from "@agntn/tools/toolkit";
import { defineMcpHandler, getMcpTools } from "@nuxtjs/mcp-toolkit/server";
import { serverInfo } from "../../../src/server-info.ts";
import { ciphersTools } from "../../../src/tools.ts";

const cipherTools = toToolkitTools(serverInfo, ciphersTools);

/** Introduces itself like `ciphers mcp`. An array here would drop the Docus page tools. */
export default defineMcpHandler({
  ...serverInfo,
  tools: async (event) => [...(await getMcpTools({ event })), ...cipherTools],
});
