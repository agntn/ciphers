import type { Cipher } from './cipher.ts'
import { UnknownCipherError } from './errors.ts'
import { ciphers, create, has } from './registry.ts'

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

  throw new UnknownCipherError(preferred ?? '(none)', ciphers())
}
