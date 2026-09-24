import { defineCommand } from 'citty'
import { resolveCipher } from '../core/resolve'
import { parseTransformOptions } from './transform-options'

export default defineCommand({
  meta: { name: 'decode', description: 'Decode ciphertext with a cipher' },
  args: {
    cipher: {
      type: 'positional',
      description: 'Cipher name (caesar, rot13, vigenere, ...)',
      required: true,
    },
    text: { type: 'positional', description: 'Text to decode', required: true },
    shift: { type: 'string', description: 'Shift value (Caesar)', alias: 's' },
    key: {
      type: 'string',
      description:
        'Keyword for keyed ciphers, hex digits for AES, AES-CBC, AES-CFB, AES-OFB, AES-CTR, AES-CCM, AES-LRW and Triple DES',
      alias: 'k',
    },
    transposition: { type: 'string', description: 'Transposition keyword (ADFGVX)' },
    iv: {
      type: 'string',
      description: 'Initialization vector, 32 hex digits (AES-CBC, AES-CFB, AES-OFB, AES-CTR)',
    },
    segment: {
      type: 'string',
      description: 'Bits fed back per step, 1, 8 or 128 (AES-CFB; default 128)',
    },
    tweak: { type: 'string', description: 'Index of the first block in hex (AES-LRW; default 1)' },
    nonce: { type: 'string', description: 'Nonce, 14 to 26 hex digits (AES-CCM)' },
    aad: { type: 'string', description: 'Associated data in hex, not encrypted (AES-CCM)' },
    tagLength: {
      type: 'string',
      description: 'Tag length in bits, 32 to 128 in steps of 16 (AES-CCM; default 128)',
    },
    rails: { type: 'string', description: 'Number of rails (Rail Fence)', alias: 'r' },
    period: { type: 'string', description: 'Rotation period (Alberti, Bifid)' },
    letters: { type: 'string', description: 'Alphabet size, 24 or 26 (Bacon; default 26)' },
    a: { type: 'string', description: 'Multiplier (Affine)' },
    b: { type: 'string', description: 'Additive shift (Affine)' },
    positions: { type: 'string', description: 'Initial rotor positions (Enigma; default AAA)' },
    rings: { type: 'string', description: 'Ring settings (Enigma; default AAA)' },
    plugboard: { type: 'string', description: 'Space-separated plugboard pairs (Enigma)' },
  },
  async run({ args }) {
    const cipher = resolveCipher(args.cipher)
    const result = cipher.decode(args.text, parseTransformOptions(args))
    process.stdout.write(`${result.text}\n`)
  },
})
