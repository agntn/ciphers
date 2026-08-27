#!/usr/bin/env node
import { runCommand, runMain, defineCommand } from 'citty'
import consola from 'consola'
import { normalizeMainArgs } from './cli-args'
import { version } from './version'
import { CipherError } from './core/errors'

// Register all ciphers
import './ciphers/index'

const main = defineCommand({
  meta: {
    name: 'ciphers',
    version,
    description: 'ciphers: educational and puzzle cipher encode/decode/analyze CLI',
  },
  subCommands: {
    encode: () => import('./commands/encode').then((m) => m.default),
    decode: () => import('./commands/decode').then((m) => m.default),
    ciphers: () => import('./commands/ciphers').then((m) => m.default),
    info: () => import('./commands/info').then((m) => m.default),
    brute: () => import('./commands/brute').then((m) => m.default),
    mcp: () => import('./commands/mcp').then((m) => m.default),
    frequency: () => import('./commands/frequency').then((m) => m.default),
  },
})

const rawArgs = normalizeMainArgs(process.argv.slice(2))

try {
  if (
    rawArgs.includes('-h') ||
    rawArgs.includes('--help') ||
    rawArgs.includes('-v') ||
    rawArgs.includes('--version')
  ) {
    await runMain(main, { rawArgs })
  } else {
    await runCommand(main, { rawArgs })
  }
} catch (error) {
  if (error instanceof CipherError) {
    consola.error(error.message)
    process.exit(1)
  }
  throw error
}
