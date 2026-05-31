import { runMain, defineCommand } from 'citty'
import { normalizeMainArgs } from './cli-args'
import { version } from './version'

// Register all providers
import './providers/index'

const main = defineCommand({
  meta: {
    name: 'ch',
    version,
    description: 'cipherhouse — classical cipher encode/decode/analyze CLI',
  },
  subCommands: {
    encode: () => import('./commands/encode').then((m) => m.default),
    decode: () => import('./commands/decode').then((m) => m.default),
    ciphers: () => import('./commands/ciphers').then((m) => m.default),
    info: () => import('./commands/info').then((m) => m.default),
    brute: () => import('./commands/brute').then((m) => m.default),
    frequency: () => import('./commands/frequency').then((m) => m.default),
  },
})

await runMain(main, { rawArgs: normalizeMainArgs(process.argv.slice(2)) })
