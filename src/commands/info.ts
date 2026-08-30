import { defineCommand } from 'citty'
import consola from 'consola'
import { resolveCipher } from '../core/resolve'

export default defineCommand({
  meta: { name: 'info', description: 'Show info about a specific cipher' },
  args: {
    cipher: { type: 'positional', description: 'Cipher name', required: true },
  },
  async run({ args }) {
    const cipher = resolveCipher(args.cipher)
    const info = cipher.info()
    consola.info(`\x1B[1m${info.label}\x1B[0m (${info.name})`)
    consola.info(`  ${info.description}`)
    consola.info(`  Family: ${info.family}`)
    consola.info(`  Self-inverse: ${info.selfInverse ? 'yes' : 'no'}`)
    if (info.keyspace) consola.info(`  Keyspace: ${info.keyspace}`)
    if (info.options.length > 0) {
      consola.info('  Options:')
      for (const opt of info.options) {
        const req = opt.required ? 'required' : `default=${opt.default ?? 'none'}`
        consola.info(`    --${opt.name} (${opt.type}, ${req}): ${opt.description}`)
      }
    }
  },
})
