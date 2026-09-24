import type { CipherConstructor } from '../../core/cipher'
import { Aes } from './aes/ecb'
import { AesCbc } from './aes/cbc'
import { AesCfb } from './aes/cfb'
import { AesOfb } from './aes/ofb'
import { AesCtr } from './aes/ctr'
import { AesCcm } from './aes/ccm'
import { AesLrw } from './aes/lrw'
import { TripleDes } from './triple-des'

/** The block ciphers, in registry order. */
export const block: readonly CipherConstructor[] = [
  Aes,
  AesCbc,
  AesCfb,
  AesOfb,
  AesCtr,
  AesCcm,
  AesLrw,
  TripleDes,
]
