import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { optionFlags } from '../../docs/app/utils/format.ts'
import { decodeTool, encodeTool } from '../../src/tools.ts'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))

/* Run `src/cli.ts` with plain Node, as `cli.test.ts` does. */
function runCli(args: readonly string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8', timeout: 10_000 })
}

describe('docs CLI line', () => {
  it('prints every option of encode and decode as a flag the CLI takes', () => {
    for (const tool of [encodeTool, decodeTool]) {
      const command = tool === encodeTool ? 'encode' : 'decode'
      const help = runCli([command, '--help']).stdout.replaceAll('--[no-]', '--')
      const taken = new Set(help.match(/--[a-z0-9-]+/g))
      for (const name of Object.keys(tool.input.properties)) {
        if (name === 'cipher' || name === 'text') continue
        for (const value of ['x', true, false]) {
          const flag = optionFlags({ [name]: value })
            .split(' ')[0]!
            .replace(/^--no-/, '--')
          expect(taken, `${command} ${name}`).toContain(flag)
        }
      }
    }
  })

  it('runs the rijndael line from issue #253', () => {
    const options = { key: '000102030405060708090a0b0c0d0e0f', blockSize: 160 }
    const result = runCli(['encode', 'rijndael', 'hello', ...optionFlags(options).split(' ')])

    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })
})
