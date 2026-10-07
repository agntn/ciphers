#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCli } from '@agntn/tools/cli'
import { CipherError } from './core/errors.ts'
import type { createMcpServer } from './mcp.ts'
import { ciphersTools } from './tools.ts'
import { version } from './version.ts'

/** The same file from `src/cli.ts` and `dist/cli.mjs`; the npm package ships no `src/`. */
const sourceMcp = new URL('../src/mcp.ts', import.meta.url)
const sourceMcpPath = fileURLToPath(sourceMcp)

/**
 * Narrows the module a runtime URL import returned, which TypeScript types as `any`.
 *
 * @param value - The imported module namespace.
 * @returns {boolean} Whether it exports the server.
 */
function isMcpModule(
  value: unknown,
): value is { readonly createMcpServer: typeof createMcpServer } {
  return typeof value === 'object' && value !== null && 'createMcpServer' in value
}

/**
 * A built bin inside a checkout serves the live source, as the Pi and OMP extensions do, so a local
 * server needs a restart after a change instead of `pnpm build`. Node refuses to strip types under
 * `node_modules`, so a copy there keeps the bundle, and so does the npm package, which ships no
 * `src/`. `CIPHERS_DIST=1` keeps it everywhere, for tests of the build.
 *
 * @returns {boolean} Whether the source is there to serve.
 */
function servesSource(): boolean {
  return (
    !import.meta.url.endsWith('.ts') &&
    process.env['CIPHERS_DIST'] !== '1' &&
    !sourceMcpPath.includes(`${sep}node_modules${sep}`) &&
    existsSync(sourceMcpPath)
  )
}

/**
 * Serves `createMcpServer` over stdio rather than the `mcp` of `runCli`, which can't show icons.
 * The source URL is built at runtime, so the bundler leaves `src` out.
 *
 * @returns {Promise<void>} Once the server is connected.
 */
async function serveMcp(): Promise<void> {
  const module: unknown = servesSource() ? await import(sourceMcp.href) : await import('./mcp.ts')
  if (!isMcpModule(module)) throw new TypeError('The MCP module has no createMcpServer')
  const { StdioServerTransport } = await import('@modelcontextprotocol/server/stdio')
  await module.createMcpServer().connect(new StdioServerTransport())
}

/**
 * A cipher that refuses its input says why in one line; anything else is a bug and keeps its stack.
 *
 * @param error - What a command threw.
 * @returns {boolean} Whether it prints as one line instead of a stack trace.
 */
function isRefusal(error: unknown): boolean {
  return error instanceof CipherError
}

const argv = process.argv.slice(2)
if (argv.length === 1 && argv[0] === 'mcp') {
  await serveMcp()
} else {
  await runCli(
    {
      name: 'ciphers',
      version,
      description: 'Educational and puzzle ciphers: encode, decode and analyze',
      tools: ciphersTools,
      default: 'info',
      fallback: 'encode',
      mcp: true,
      expected: isRefusal,
    },
    argv,
  )
}
