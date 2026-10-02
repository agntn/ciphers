import { styleText } from 'node:util'
import { defineCommand } from 'citty'
import consola from 'consola'
import { resolveCipher } from '../core/resolve.ts'

export default defineCommand({
  meta: { name: 'info', description: 'Show info about a specific cipher' },
  args: {
    cipher: { type: 'positional', description: 'Cipher name', required: true },
  },
  async run({ args }) {
    const cipher = resolveCipher(args.cipher)
    const info = cipher.info()
    consola.info(`${styleText('bold', info.label)} (${info.name})`)
    consola.info(`  ${info.description}`)
    consola.info(`  Category: ${info.category}`)
    consola.info(`  Family: ${info.family}`)
    consola.info(`  Self-inverse: ${info.selfInverse ? 'yes' : 'no'}`)
    consola.info(`  Works on: ${info.worksOn}`)
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
