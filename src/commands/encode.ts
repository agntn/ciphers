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
        'Keyword for keyed ciphers, hex digits for block and stream ciphers (ciphers ciphers -v lists them)',
      alias: 'k',
    },
    transposition: { type: 'string', description: 'Transposition keyword (ADFGVX)' },
    iv: {
      type: 'string',
      description:
        'Initialization vector, 32 hex digits (AES-CBC, AES-CFB, AES-OFB, AES-CTR) or 16 (Triple DES CBC; Rabbit, optional)',
    },
    segment: {
      type: 'string',
      description: 'Bits fed back per step, 1, 8 or 128 (AES-CFB; default 128)',
    },
    blockSize: {
      type: 'string',
      description: 'Block length in bits, 128, 160, 192, 224 or 256 (Rijndael; default 128)',
    },
    endian: {
      type: 'string',
      description: 'Byte order, big as in RFC 4503 or little as in Crypto++ (Rabbit; default big)',
    },
    blanks: {
      type: 'string',
      description: 'The two blank digits of the top row (straddling checkerboard; default 26)',
    },
    bytes: {
      type: 'string',
      description:
        'text for UTF-8 text, or hex to read and write the plain side as hex (block and stream ciphers; default text)',
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
    digest: {
      type: 'string',
      description:
        'Hash for the key, md5, sha1 or sha256 as in openssl enc -md (AES passphrase; default md5)',
    },
    keyLength: {
      type: 'string',
      description: 'Key length in bits, 128 to 1024 in steps of 32 (AES passphrase; default 256)',
    },
    iterations: {
      type: 'string',
      description: 'Hash passes per derived block, 1 to 100000 (AES passphrase; default 1)',
    },
    salt: {
      type: 'string',
      description: 'Salt, 16 hex digits, when encoding (AES passphrase; default random)',
    },
    rails: { type: 'string', description: 'Number of rails (Rail Fence)', alias: 'r' },
    width: { type: 'string', description: 'Cells per row (Route)' },
    corner: {
      type: 'string',
      description:
        'Corner the path starts from: top-left, top-right, bottom-left, bottom-right (Route; default top-left)',
    },
    path: {
      type: 'string',
      description:
        'Path through the grid: spiral-clockwise, spiral-counterclockwise, snake-rows, snake-columns or columns (Route; default spiral-clockwise)',
    },
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
