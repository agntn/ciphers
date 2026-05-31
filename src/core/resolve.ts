import type { CipherProvider } from './types'
import { ciphers, has, create } from './registry'

/** Resolve a cipher by exact name. */
export function resolveCipher(preferred?: string): CipherProvider {
  if (preferred) {
    const normalized = preferred.toLowerCase().replace(/\s+/g, '-')
    if (has(normalized)) return create(normalized)
  }
  const available = ciphers()
  throw new Error(
    `Unknown cipher: ${preferred ?? '(none)'}\nAvailable: ${available.join(', ')}`,
  )
}
