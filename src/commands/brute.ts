import { defineCommand } from 'citty'
import consola from 'consola'
import { create } from '../core/registry'

export default defineCommand({
  meta: { name: 'brute', description: 'Brute-force Caesar cipher (all 25 shifts)' },
  args: {
    text: { type: 'positional', description: 'Ciphertext to brute-force', required: true },
  },
  async run({ args }) {
    const cipher = create('caesar')
    consola.info('Caesar brute-force (shift 1-25):\n')
    for (let shift = 1; shift <= 25; shift++) {
      const result = cipher.decode(args.text, { shift })
      consola.log(`  shift=\x1b[1m${String(shift).padStart(2)}\x1b[0m \u2192 ${result.text}`)
    }
  },
})
