import type { CipherConstructor } from '../../core/cipher.ts'
import { Rabbit } from './rabbit.ts'
import { Rc4 } from './rc4.ts'
import { Xor } from './xor.ts'

/** The stream ciphers, in registry order. */
export const stream: readonly CipherConstructor[] = [Rabbit, Rc4, Xor]
