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
 * @param argv - Every argument after the bin.
 * @returns {boolean} Whether the line is a bare `mcp` and the source is there to serve.
 */
function servesSource(argv: readonly string[]): boolean {
  return (
    argv.length === 1 &&
    argv[0] === 'mcp' &&
    !import.meta.url.endsWith('.ts') &&
    process.env['CIPHERS_DIST'] !== '1' &&
    !sourceMcpPath.includes(`${sep}node_modules${sep}`) &&
    existsSync(sourceMcpPath)
  )
}

/**
 * Serves `src/mcp.ts` over stdio. The URL is built at runtime, so the bundler leaves `src` out.
 *
 * @returns {Promise<void>} Once the server is connected.
 */
async function serveSource(): Promise<void> {
  const module: unknown = await import(sourceMcp.href)
  if (!isMcpModule(module)) throw new TypeError(`${sourceMcpPath} has no createMcpServer`)
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
if (servesSource(argv)) {
  await serveSource()
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
