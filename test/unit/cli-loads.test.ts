import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))
const hookPath = fileURLToPath(new URL('../record-loads.ts', import.meta.url))

type CliRun = SpawnSyncReturns<string> & { readonly loaded: readonly string[] }

/**
 * Run `src/cli.ts` under the load hook, not the built bin: Publish tests before it builds. Plain Node
 * strips the types, since the sources name every relative import with its `.ts` extension, and the
 * hook reports at exit, into a file owned by this call.
 *
 * @param args - CLI arguments.
 * @param input - Text handed to the child's stdin; empty stdin ends `mcp` on EOF.
 * @returns {CliRun} The spawn result plus every module URL the child loaded.
 */
function runCli(args: readonly string[], input = ''): CliRun {
  const directory = mkdtempSync(path.join(tmpdir(), 'ciphers-loads-'))
  const report = path.join(directory, 'loaded.json')
  try {
    const result = spawnSync(process.execPath, ['--import', hookPath, cliPath, ...args], {
      encoding: 'utf8',
      env: { ...process.env, CIPHERS_RECORD_LOADS: report },
      input,
      timeout: 20_000,
    })
    expect(existsSync(report), `the load hook wrote no report:\n${result.stderr}`).toBe(true)
    const loaded: unknown = JSON.parse(readFileSync(report, 'utf8'))
    expect(Array.isArray(loaded)).toBe(true)
    return { ...result, loaded: (loaded as unknown[]).map(String) }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
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
  it.each([['--help'], ['-h'], ['mcp', '--help'], ['encode', '--help']])(
    'ciphers %j prints the usage without the MCP server or the ciphers',
    (...args) => {
      const result = runCli(args)

      expect(result.status).toBe(0)
      expect(result.stdout).toMatch(/^USAGE ciphers(?: mcp| encode)? /mu)
      expect(result.loaded.some((url) => url.endsWith('/src/tools.ts'))).toBe(true)
      expect(loadedFrom(result.loaded, '/node_modules/@modelcontextprotocol/')).toEqual([])
      expect(loadedFrom(result.loaded, '/node_modules/typebox/')).toEqual([])
      expect(result.loaded.filter((url) => url.endsWith('/src/mcp.ts'))).toEqual([])
      expect(result.loaded.filter((url) => url.endsWith('/src/index.ts'))).toEqual([])
    },
  )

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
