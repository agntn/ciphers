import { defineCommand } from 'citty'
import consola from 'consola'
import { ciphers as listCiphers, create } from '../core/registry'

function printVerboseCipher(name: string): void {
  const info = create(name).info()
  consola.info(`\x1B[1m${info.label}\x1B[0m (${info.name})`)
  consola.info(`  ${info.description}`)
  consola.info(`  Family: ${info.family}`)
  consola.info(`  Self-inverse: ${info.selfInverse ? 'yes' : 'no'}`)
  if (info.keyspace) consola.info(`  Keyspace: ${info.keyspace}`)
  if (info.options.length === 0) return

  consola.info('  Options:')
  for (const option of info.options) {
    const requirement = option.required ? 'required' : `default=${option.default ?? 'none'}`
    consola.info(`    --${option.name} (${option.type}, ${requirement}): ${option.description}`)
  }
}

function printCipherSummary(name: string): void {
  const info = create(name).info()
  consola.info(`  \x1B[1m${name}\x1B[0m \u2014 ${info.description}`)
}

export default defineCommand({
  meta: { name: 'ciphers', description: 'List all available ciphers' },
  args: {
    verbose: {
      type: 'boolean',
      description: 'Show detailed info for each cipher',
      alias: 'v',
      default: false,
    },
  },
  async run({ args }) {
    const names = listCiphers()
    if (args.verbose) {
      for (const name of names) printVerboseCipher(name)
      return
    }

    consola.info('Available ciphers:')
    for (const name of names) printCipherSummary(name)
  },
})
