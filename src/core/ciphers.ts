/** Built-in cipher names — used for type-safe iteration. */
export const builtinCiphers = [
  'caesar',
  'rot13',
  'rot47',
  'atbash',
  'vigenere',
  'beaufort',
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
