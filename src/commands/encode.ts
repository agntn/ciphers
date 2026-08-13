import { defineCommand } from 'citty'
import consola from 'consola'
import { resolveCipher } from '../core/resolve'
import type { CipherBaseOptions } from '../core/types'

function parseIntOrFail(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined
  const n = Number(value)
  if (!Number.isInteger(n)) {
    consola.error(`Invalid --${name}: "${value}" is not an integer`)
    process.exit(1)
  }
  return n
}

export default defineCommand({
  meta: { name: 'encode', description: 'Encode plaintext with a cipher' },
  args: {
    cipher: { type: 'positional', description: 'Cipher name (caesar, rot13, vigenere, ...)', required: true },
    text: { type: 'positional', description: 'Text to encode', required: true },
    shift: { type: 'string', description: 'Shift value (Caesar)', alias: 's' },
    key: { type: 'string', description: 'Keyword for keyed ciphers', alias: 'k' },
    rails: { type: 'string', description: 'Number of rails (Rail Fence)', alias: 'r' },
    period: { type: 'string', description: 'Rotation period (Alberti, Bifid)' },
    a: { type: 'string', description: 'Multiplier (Affine)' },
    b: { type: 'string', description: 'Additive shift (Affine)' },
    positions: { type: 'string', description: 'Initial rotor positions (Enigma; default AAA)' },
    rings: { type: 'string', description: 'Ring settings (Enigma; default AAA)' },
    plugboard: { type: 'string', description: 'Space-separated plugboard pairs (Enigma)' },
  },
  async run({ args }) {
    const cipher = resolveCipher(args.cipher)
    const opts: CipherBaseOptions & Record<string, unknown> = {}
    const shift = parseIntOrFail(args.shift, 'shift')
    const rails = parseIntOrFail(args.rails, 'rails')
    const a = parseIntOrFail(args.a, 'a')
    const b = parseIntOrFail(args.b, 'b')
    const period = parseIntOrFail(args.period, 'period')
    if (shift !== undefined) opts.shift = shift
    if (args.key) opts.key = args.key
    if (rails !== undefined) opts.rails = rails
    if (period !== undefined) opts.period = period
    if (a !== undefined) opts.a = a
    if (b !== undefined) opts.b = b
    if (args.positions !== undefined) opts.positions = args.positions
    if (args.rings !== undefined) opts.rings = args.rings
    if (args.plugboard !== undefined) opts.plugboard = args.plugboard
    const result = cipher.encode(args.text, opts)
    consola.log(result.text)
  },
})
