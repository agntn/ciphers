/** Ciphers whose key `recoverKey` searches for. */
export const keyRecoveryCiphers = [
  'vigenere',
  'beaufort',
  'variant-beaufort',
  'substitution',
  'columnar',
] as const

/** One cipher `recoverKey` searches a key for. */
export type KeyRecoveryCipher = (typeof keyRecoveryCiphers)[number]

/** Ciphers with a repeating keyword, the ones that take `period`. */
export const periodicKeyRecoveryCiphers = ['vigenere', 'beaufort', 'variant-beaufort'] as const

/** Key lengths a columnar search tries when `keyLength` is not given: 2 to this one. */
export const DEFAULT_COLUMNAR_KEY_LENGTH = 8

/** Longest columnar key: every order of its columns is tried, 9! of them. */
export const MAX_COLUMNAR_KEY_LENGTH = 9

/** Candidates `recoverKey` returns unless told otherwise. */
export const DEFAULT_KEY_CANDIDATES = 5

/** Most candidates `recoverKey` returns; the columnar search keeps that many orders in order. */
export const MAX_KEY_CANDIDATES = 20
