import { defineCommand } from 'citty'
import consola from 'consola'
import { resolveCipher } from '../core/resolve'
import { parseTransformOptions } from './transform-options'

export default defineCommand({
  meta: { name: 'encode', description: 'Encode plaintext with a cipher' },
  args: {
    cipher: {
      type: 'positional',
      description: 'Cipher name (caesar, rot13, vigenere, ...)',
      required: true,
    },
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
    const result = cipher.encode(args.text, parseTransformOptions(args))
    consola.log(result.text)
  },
})
