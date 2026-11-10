/** Ciphers whose key `recoverKey` searches for. */
export const keyRecoveryCiphers = [
  'vigenere',
  'beaufort',
  'variant-beaufort',
  'substitution',
  'columnar',
  'homophonic',
] as const

/** One cipher `recoverKey` searches a key for. */
export type KeyRecoveryCipher = (typeof keyRecoveryCiphers)[number]

/** Ciphers with a repeating keyword, the ones that take `period`. */
export const periodicKeyRecoveryCiphers = ['vigenere', 'beaufort', 'variant-beaufort'] as const

/** Key lengths a columnar search tries when `keyLength` is not given: 2 to this one. */
export const DEFAULT_COLUMNAR_KEY_LENGTH = 8

/** Longest columnar key: every order of its columns is tried, 9! of them. */
export const MAX_COLUMNAR_KEY_LENGTH = 9

/** Most characters a homophonic symbol takes with `symbolWidth`. */
export const MAX_SYMBOL_WIDTH = 8

/** Random starts of a homophonic search unless `starts` says otherwise. */
export const DEFAULT_HOMOPHONIC_STARTS = 8

/** Seed of a homophonic search unless `seed` says otherwise. */
export const DEFAULT_HOMOPHONIC_SEED = 0x9e3779b9

/** Highest seed: the generator keeps 32 bits of it. */
export const MAX_SEED = 0xffffffff

/** Candidates `recoverKey` returns unless told otherwise. */
export const DEFAULT_KEY_CANDIDATES = 5

/** Most candidates `recoverKey` returns; the columnar search keeps that many orders in order. */
export const MAX_KEY_CANDIDATES = 20
