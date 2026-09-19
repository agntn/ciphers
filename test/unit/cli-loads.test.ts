import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))
const hookPath = fileURLToPath(new URL('../record-loads.ts', import.meta.url))

type CliRun = SpawnSyncReturns<string> & { readonly loaded: readonly string[] }

/**
 * Run `src/cli.ts` under the load hook, not the built bin: Publish tests before it builds. tsx goes
 * first because the sources import each other without extensions, and citty exits the process itself.
 *
 * @param args - CLI arguments.
 * @param input - Text handed to the child's stdin; empty stdin ends `mcp` on EOF.
 * @returns {CliRun} The spawn result plus every module URL the child loaded.
 */
function runCli(args: readonly string[], input = ''): CliRun {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--import', hookPath, cliPath, ...args],
    {
      encoding: 'utf8',
      input,
      timeout: 20_000,
    },
  )
  const report = /^@loaded (\[.*\])$/mu.exec(result.stderr)?.[1]
  expect(report, `the load hook reported nothing:\n${result.stderr}`).toBeDefined()
  const loaded: unknown = JSON.parse(report ?? '[]')
  expect(Array.isArray(loaded)).toBe(true)
  return { ...result, loaded: (loaded as unknown[]).map(String) }
}

/**
 * pnpm's store paths carry peer hashes in their names, so only the package directory itself counts.
 *
 * @param loaded - Module URLs the child loaded.
 * @param directory - Path fragment of one package directory.
 * @returns {string[]} The URLs under that directory.
 */
function loadedFrom(loaded: readonly string[], directory: string): string[] {
  return loaded.filter((url) => url.includes(directory))
}

describe('CLI usage paths', () => {
  it.each([
    { args: ['--help'], status: 0 },
    { args: ['-h'], status: 0 },
    { args: ['mcp', '--help'], status: 0 },
    { args: ['Encode', 'caesar', 'HELLO'], status: 1 },
  ])('ciphers $args prints the usage without the MCP server', ({ args, status }) => {
    const result = runCli(args)

    expect(result.status).toBe(status)
    expect(result.stdout).toMatch(/USAGE.*ciphers (encode\|decode|mcp)/u)
    expect(result.loaded.some((url) => url.endsWith('/src/commands/mcp.ts'))).toBe(true)
    expect(loadedFrom(result.loaded, '/node_modules/@modelcontextprotocol/')).toEqual([])
    expect(loadedFrom(result.loaded, '/node_modules/typebox/')).toEqual([])
    expect(result.loaded.filter((url) => url.endsWith('/src/mcp.ts'))).toEqual([])
  })

  it('ciphers mcp serves the server over stdio', () => {
    const initialize = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'ciphers-test', version: '1.0.0' },
      },
    }
    const result = runCli(['mcp'], `${JSON.stringify(initialize)}\n`)

    expect(result.status).toBe(0)
    const [responseLine = ''] = result.stdout.trim().split('\n')
    expect(responseLine, `the server answered nothing:\n${result.stderr}`).not.toBe('')
    const response: unknown = JSON.parse(responseLine)
    expect(response).toMatchObject({ id: 1, result: { serverInfo: { name: 'ciphers' } } })
    expect(loadedFrom(result.loaded, '/node_modules/@modelcontextprotocol/')).not.toEqual([])
  })
})
