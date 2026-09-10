import { builtins } from '../ciphers/index'
import { type CipherConstructor, Cipher } from './cipher'
import { builtinCiphers } from './ciphers'
import { UnknownCipherError } from './errors'

const constructors = new Map<string, CipherConstructor>()
const instances = new Map<string, Cipher>()
let seeded = false

function seedBuiltins(): void {
  if (seeded) return
  seeded = true
  for (const [index, CipherClass] of builtins.entries()) {
    const name = builtinCiphers[index]
    if (name === undefined) continue
    constructors.set(name, CipherClass)
  }
}

/**
 * Register a cipher class.
 *
 * @param name - Exact registry name.
 * @param CipherClass - Cipher constructor.
 */
export function register(name: string, CipherClass: CipherConstructor): void {
  seedBuiltins()
  constructors.set(name, CipherClass)
  instances.delete(name)
}

/**
 * Create a cached cipher instance by name.
 *
 * @param name - Exact registry name.
 * @returns {Cipher} The cached cipher instance.
 */
export function create(name: string): Cipher {
  seedBuiltins()
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
  seedBuiltins()
  return [...constructors.keys()]
}

/**
 * Check whether a cipher is registered.
 *
 * @param name - Exact registry name.
 * @returns {boolean} Whether the name is registered.
 */
export function has(name: string): boolean {
  seedBuiltins()
  return constructors.has(name)
}
