import { defineCommand } from 'citty'
import consola from 'consola'
import { resolveCipher } from '../core/resolve'
import type { EncodeOptions } from '../core/types'

export default defineCommand({
  meta: { name: 'encode', description: 'Encode plaintext with a cipher' },
  args: {
    cipher: { type: 'positional', description: 'Cipher name (caesar, rot13, vigenere, ...)', required: true },
    text: { type: 'positional', description: 'Text to encode', required: true },
    shift: { type: 'string', description: 'Shift value (Caesar)', alias: 's' },
    key: { type: 'string', description: 'Keyword (Vigenère, Playfair, Polybius)', alias: 'k' },
    rails: { type: 'string', description: 'Number of rails (Rail Fence)', alias: 'r' },
    a: { type: 'string', description: 'Multiplier (Affine)' },
    b: { type: 'string', description: 'Additive shift (Affine)' },
  },
  async run({ args }) {
    const provider = resolveCipher(args.cipher)
    const opts: EncodeOptions = {}
    if (args.shift) opts.shift = parseInt(args.shift, 10)
    if (args.key) opts.key = args.key
    if (args.rails) opts.rails = parseInt(args.rails, 10)
    if (args.a) opts.a = parseInt(args.a, 10)
    if (args.b) opts.b = parseInt(args.b, 10)
    const result = provider.encode(args.text, opts)
    consola.log(result.text)
  },
})
