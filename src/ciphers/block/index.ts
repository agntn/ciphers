import type { CipherConstructor } from '../../core/cipher'
import { Aes } from './aes/ecb'
import { AesCbc } from './aes/cbc'
import { AesCfb } from './aes/cfb'
import { AesLrw } from './aes/lrw'
import { TripleDes } from './triple-des'

/** The block ciphers, in registry order. */
export const block: readonly CipherConstructor[] = [Aes, AesCbc, AesCfb, AesLrw, TripleDes]
