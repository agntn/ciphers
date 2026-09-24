import type { CipherConstructor } from '../../core/cipher'
import { Aes } from './aes'

/** The block ciphers, in registry order. */
export const block: readonly CipherConstructor[] = [Aes]
