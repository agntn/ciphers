import type { CipherConstructor } from '../../core/cipher.ts'
import { Rabbit } from './rabbit.ts'

/** The stream ciphers, in registry order. */
export const stream: readonly CipherConstructor[] = [Rabbit]
