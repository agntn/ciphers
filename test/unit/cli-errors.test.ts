import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { version } from '../../src/version'

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

describe('CLI builtin flags', () => {
  it('prints the version instead of the encode usage', () => {
    const result = runCli(['--version'])

    expect(result.status).toBe(0)
    expect(result.stdout).toBe(`${version}\n`)
    expect(result.stderr).toBe('')
  })

  it('prints the main usage with every subcommand', () => {
    const result = runCli(['--help'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('ciphers encode|decode|ciphers|info|brute|mcp|frequency')
    expect(result.stderr).toBe('')
  })
})
