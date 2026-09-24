import { defineCommand } from 'citty'
import { resolveCipher } from '../core/resolve.ts'
import { parseTransformOptions } from './transform-options.ts'

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
    key: {
      type: 'string',
      description:
        'Keyword for keyed ciphers, hex digits for block ciphers (ciphers ciphers -c block lists them)',
      alias: 'k',
    },
    transposition: { type: 'string', description: 'Transposition keyword (ADFGVX)' },
    iv: {
      type: 'string',
      description:
        'Initialization vector, 32 hex digits (AES-CBC, AES-CFB, AES-OFB, AES-CTR) or 16 (Triple DES CBC)',
    },
    segment: {
      type: 'string',
      description: 'Bits fed back per step, 1, 8 or 128 (AES-CFB; default 128)',
    },
    blockSize: {
      type: 'string',
      description: 'Block length in bits, 128, 160, 192, 224 or 256 (Rijndael; default 128)',
    },
    tweak: {
      type: 'string',
      description:
        'Index of the first block in hex (AES-LRW; default 1), or the data unit number (AES-XTS; default 0)',
    },
    nonce: {
      type: 'string',
      description: 'Nonce in hex, 14 to 26 digits for AES-CCM, 2 to 30 for AES-OCB',
    },
    aad: {
      type: 'string',
      description: 'Associated data in hex, not encrypted (AES-CCM, AES-OCB)',
    },
    tagLength: {
      type: 'string',
      description:
        'Tag length in bits, 32 to 128 in steps of 16 for AES-CCM, 64, 96 or 128 for AES-OCB (default 128)',
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
    const result = cipher.encode(args.text, parseTransformOptions(args))
    process.stdout.write(`${result.text}\n`)
  },
})
