import { defineCommand } from 'citty'
import consola from 'consola'
import { ciphers as listCiphers, create } from '../core/registry'

export default defineCommand({
  meta: { name: 'ciphers', description: 'List all available ciphers' },
  args: {
    verbose: { type: 'boolean', description: 'Show detailed info for each cipher', alias: 'v', default: false },
  },
  async run({ args }) {
    const names = listCiphers()
    if (args.verbose) {
      for (const name of names) {
        const cipher = create(name)
        const info = cipher.info()
        consola.info(`\x1b[1m${info.label}\x1b[0m (${info.name})`)
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
      }
    } else {
      consola.info('Available ciphers:')
      for (const name of names) {
        const info = create(name).info()
        consola.info(`  \x1b[1m${name}\x1b[0m \u2014 ${info.description}`)
      }
    }
  },
})
