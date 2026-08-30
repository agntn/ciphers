import type { Cipher } from './cipher'
import { UnknownCipherError } from './errors'
import { has, create } from './registry'

/**
 * Resolve a cipher by exact name.
 *
 * @param preferred - Registered cipher name.
 * @returns {Cipher} The matching cipher instance.
 */
export function resolveCipher(preferred?: string): Cipher {
  if (preferred) {
    const normalized = preferred.toLowerCase().replaceAll(/\s+/g, '-')
    if (has(normalized)) return create(normalized)
  }

  throw new UnknownCipherError(preferred ?? '(none)')
}
