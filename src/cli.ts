import { runMain, defineCommand } from 'citty'
import { normalizeMainArgs } from './cli-args'
import { version } from './version'

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

await runMain(main, { rawArgs: normalizeMainArgs(process.argv.slice(2)) })
