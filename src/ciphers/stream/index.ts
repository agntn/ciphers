import type { CipherConstructor } from '../../core/cipher.ts'
import { Rabbit } from './rabbit.ts'
import { Rc4 } from './rc4.ts'

/** The stream ciphers, in registry order. */
export const stream: readonly CipherConstructor[] = [Rabbit, Rc4]
