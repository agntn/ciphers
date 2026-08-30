#!/usr/bin/env node
import { runMain, defineCommand, type ArgsDef, type CommandDef } from 'citty'
import { normalizeMainArgs } from './cli-args'
import { CipherError } from './core/errors'
import { version } from './version'

// Register all ciphers
import './ciphers/index'

async function loadCommand<T extends ArgsDef>(
  loader: () => Promise<{ readonly default: CommandDef<T> }>,
): Promise<CommandDef<T>> {
  const command = (await loader()).default
  const run = command.run
  if (!run) return command

  return {
    ...command,
    async run(context) {
      try {
        const result: unknown = await run(context)
        return result
      } catch (error) {
        if (!(error instanceof CipherError)) throw error
        process.stderr.write(`${error.message}\n`)
        process.exitCode = 1
      }
    },
  }
}

const main = defineCommand({
  meta: {
    name: 'ciphers',
    version,
    description: 'ciphers: educational and puzzle cipher encode/decode/analyze CLI',
  },
  subCommands: {
    encode: () => loadCommand(() => import('./commands/encode')),
    decode: () => loadCommand(() => import('./commands/decode')),
    ciphers: () => loadCommand(() => import('./commands/ciphers')),
    info: () => loadCommand(() => import('./commands/info')),
    brute: () => loadCommand(() => import('./commands/brute')),
    mcp: () => loadCommand(() => import('./commands/mcp')),
    frequency: () => loadCommand(() => import('./commands/frequency')),
  },
})

await runMain(main, { rawArgs: normalizeMainArgs(process.argv.slice(2)) })
