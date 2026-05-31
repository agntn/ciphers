import type { CipherProvider, CipherProviderFactory } from './types'
import { UnknownCipherError } from './errors'

const factories = new Map<string, CipherProviderFactory>()
const instances = new Map<string, CipherProvider>()

/** Register a cipher provider factory. */
export function register(name: string, factory: CipherProviderFactory): void {
  factories.set(name, factory)
  instances.delete(name) // invalidate cached instance on re-register
}

/** Create a cipher provider instance by name (cached singleton). */
export function create(name: string): CipherProvider {
  const cached = instances.get(name)
  if (cached) return cached
  const factory = factories.get(name)
  if (!factory) throw new UnknownCipherError(name)
  const provider = factory()
  instances.set(name, provider)
  return provider
}

/** List all registered cipher names. */
export function ciphers(): string[] {
  return [...factories.keys()]
}

/** Check if a cipher is registered. */
export function has(name: string): boolean {
  return factories.has(name)
}
