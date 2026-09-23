import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { builtinCiphers } from '../../src/core/ciphers'
import { version } from '../../src/version'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))

function runCli(args: readonly string[], env?: Readonly<NodeJS.ProcessEnv>) {
  return spawnSync(process.execPath, ['--import', 'tsx', cliPath, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
    env,
  })
}

describe('CLI domain errors', () => {
  it('prints an unknown cipher as one line without a stack trace', () => {
    const result = runCli(['encode', 'unknown', 'foo'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      `Unknown cipher: "unknown". Registered ciphers: ${builtinCiphers.join(', ')}\n`,
    )
  })
})

describe('CLI frequency language', () => {
  it('rejects a language the other surfaces do not accept', () => {
    const result = runCli(['frequency', 'HELLO', '--lang', 'de'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Invalid option lang=de: must be en, pl or ja\n')
  })

  it('rejects a language that only matches after case folding', () => {
    const result = runCli(['frequency', 'HELLO', '-l', 'PL'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Invalid option lang=PL: must be en, pl or ja\n')
  })

  it('keeps English as the default reference order', () => {
    const result = runCli(['frequency', 'HELLO'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('lang=en')
    expect(`${result.stdout}${result.stderr}`).toContain(
      'E T A O I N S H R D L C U M W F G Y P B V K J X Q Z',
    )
  })

  it('prints the Polish reference order for --lang pl', () => {
    const result = runCli(['frequency', 'HELLO', '--lang', 'pl'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('lang=pl')
    expect(`${result.stdout}${result.stderr}`).toContain(
      'A I O E Z N R W S T C Y K D P M U J L B G H F Q V X',
    )
  })

  it('prints the Hepburn reference order for --lang ja', () => {
    const result = runCli(['frequency', 'KONNICHIWA', '--lang', 'ja'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('lang=ja')
    expect(`${result.stdout}${result.stderr}`).toContain(
      'A O N I T E R U H S K D M G Y B W C Z J F P L Q V X',
    )
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
