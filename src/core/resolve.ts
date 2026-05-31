import type { CipherProvider } from './types'
import { ciphers, has, create } from './registry'

/** Resolve a cipher by name, or list available ciphers. */
export function resolveCipher(preferred?: string): CipherProvider {
  if (preferred) {
    // Normalize: lowercase, replace spaces with hyphens
    const normalized = preferred.toLowerCase().replace(/\s+/g, '-')
    if (has(normalized)) return create(normalized)
    // Fuzzy: try startsWith
    const match = ciphers().find((c) => c.startsWith(normalized))
    if (match) return create(match)
  }
  // List all available if nothing specified
  const available = ciphers()
  throw new Error(
    `No cipher specified. Available: ${available.join(', ')}\nUsage: ch encode <cipher> <text> [--shift N] [--key KEY]`,
  )
}
