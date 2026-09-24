import type { CipherConstructor } from '../../core/cipher'
import { Aes } from './aes'
import { TripleDes } from './triple-des'

/** The block ciphers, in registry order. */
export const block: readonly CipherConstructor[] = [Aes, TripleDes]
