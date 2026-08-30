import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))

function runCli(args: readonly string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', cliPath, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
  })
}

describe('CLI domain errors', () => {
  it('prints an unknown cipher as one line without a stack trace', () => {
    const result = runCli(['encode', 'unknown', 'foo'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Unknown cipher: unknown\n')
  })
})
