import { type CipherConstructor, Cipher } from './cipher'
import { UnknownCipherError } from './errors'

const constructors = new Map<string, CipherConstructor>()
const instances = new Map<string, Cipher>()

/** Register a cipher class. */
export function register(name: string, CipherClass: CipherConstructor): void {
  constructors.set(name, CipherClass)
  instances.delete(name) // invalidate cached instance on re-register
}

/** Create a cipher instance by name (cached singleton). */
export function create(name: string): Cipher {
  const cached = instances.get(name)
  if (cached) return cached
  const CipherClass = constructors.get(name)
  if (!CipherClass) throw new UnknownCipherError(name)
  const cipher = new CipherClass()
  instances.set(name, cipher)
  return cipher
}

/** List all registered cipher names. */
export function ciphers(): string[] {
  return [...constructors.keys()]
}

/** Check if a cipher is registered. */
export function has(name: string): boolean {
  return constructors.has(name)
}
