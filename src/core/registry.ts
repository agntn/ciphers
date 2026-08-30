import { type CipherConstructor, Cipher } from './cipher'
import { UnknownCipherError } from './errors'

const constructors = new Map<string, CipherConstructor>()
const instances = new Map<string, Cipher>()

/**
 * Register a cipher class.
 *
 * @param name - Exact registry name.
 * @param CipherClass - Cipher constructor.
 */
export function register(name: string, CipherClass: CipherConstructor): void {
  constructors.set(name, CipherClass)
  instances.delete(name) // invalidate cached instance on re-register
}

/**
 * Create a cached cipher instance by name.
 *
 * @param name - Exact registry name.
 * @returns {Cipher} The cached cipher instance.
 */
export function create(name: string): Cipher {
  const cached = instances.get(name)
  if (cached) return cached
  const CipherClass = constructors.get(name)
  if (!CipherClass) throw new UnknownCipherError(name)
  const cipher = new CipherClass()
  instances.set(name, cipher)
  return cipher
}

/**
 * List all registered cipher names.
 *
 * @returns {string[]} Registered names in insertion order.
 */
export function ciphers(): string[] {
  return [...constructors.keys()]
}

/**
 * Check whether a cipher is registered.
 *
 * @param name - Exact registry name.
 * @returns {boolean} Whether the name is registered.
 */
export function has(name: string): boolean {
  return constructors.has(name)
}
