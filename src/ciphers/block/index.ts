import type { CipherConstructor } from '../../core/cipher'
import { Aes } from './aes/ecb'
import { AesCbc } from './aes/cbc'
import { AesLrw } from './aes/lrw'
import { TripleDes } from './triple-des'

/** The block ciphers, in registry order. */
export const block: readonly CipherConstructor[] = [Aes, AesCbc, AesLrw, TripleDes]
