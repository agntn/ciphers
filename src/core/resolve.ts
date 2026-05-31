import type { CipherProvider } from './types'
import { UnknownCipherError } from './errors'
import { has, create } from './registry'

/** Resolve a cipher by exact name. */
export function resolveCipher(preferred?: string): CipherProvider {
  if (preferred) {
    const normalized = preferred.toLowerCase().replace(/\s+/g, '-')
    if (has(normalized)) return create(normalized)
  }
  
  throw new UnknownCipherError(preferred ?? '(none)')
}
