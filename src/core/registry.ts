import type { CipherProvider, CipherProviderFactory } from './types'
import { UnknownCipherError } from './errors'

const factories = new Map<string, CipherProviderFactory>()

/** Register a cipher provider factory. */
export function register(name: string, factory: CipherProviderFactory): void {
  factories.set(name, factory)
}

/** Create a cipher provider instance by name. */
export function create(name: string): CipherProvider {
  const factory = factories.get(name)
  if (!factory) throw new UnknownCipherError(name)
  return factory()
}

/** List all registered cipher names. */
export function ciphers(): string[] {
  return Array.from(factories.keys())
}

/** Check if a cipher is registered. */
export function has(name: string): boolean {
  return factories.has(name)
}
