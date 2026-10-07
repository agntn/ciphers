import { serverInfo } from "../../../src/server-info.ts";

/** Introduces itself like `ciphers mcp`, with the Docus page tools beside the cipher ones. */
export default defineMcpHandler({ ...serverInfo });
