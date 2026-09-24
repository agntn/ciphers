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
  'adfgvx',
  'bifid',
  'enigma',
] as const

export type BuiltinCipher = (typeof builtinCiphers)[number]

/**
 * Cipher categories, each with its own folder under `src/ciphers/`. Pen-and-paper and machine
 * ciphers are `classical`; a block or stream cipher gets a new category next to it.
 */
export const cipherCategories = ['classical'] as const

export type CipherCategory = (typeof cipherCategories)[number]
