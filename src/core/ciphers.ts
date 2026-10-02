/** Built-in cipher names — used for type-safe iteration. */
export const builtinCiphers = [
  'caesar',
  'rot13',
  'rot47',
  'atbash',
  'vigenere',
  'beaufort',
  'autokey',
  'trithemius',
  'alberti',
  'rail-fence',
  'affine',
  'playfair',
  'polybius',
  'morse',
  'bacon',
  'tap-code',
  'columnar',
  'route',
  'adfgvx',
  'bifid',
  'straddling-checkerboard',
  'enigma',
  'aes',
  'aes-cbc',
  'aes-cfb',
  'aes-ofb',
  'aes-ctr',
  'aes-ccm',
  'aes-ocb',
  'aes-lrw',
  'aes-xts',
  'aes-cbc-mac',
  'aes-passphrase',
  'rijndael',
  'des',
  'desx',
  'triple-des',
  'triple-des-cbc',
  'blowfish',
  'idea',
  'lucifer',
  'mars',
  'serpent',
  'rabbit',
  'rc4',
  'xor',
] as const

export type BuiltinCipher = (typeof builtinCiphers)[number]

/**
 * Cipher categories, each with its own folder under `src/ciphers/`. Pen-and-paper and machine
 * ciphers are `classical`, modern block ciphers are `block`, and ciphers that XOR a keystream into
 * the text are `stream`.
 */
export const cipherCategories = ['classical', 'block', 'stream'] as const

export type CipherCategory = (typeof cipherCategories)[number]
