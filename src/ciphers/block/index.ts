import type { CipherConstructor } from '../../core/cipher'
import { Aes } from './aes/ecb'
import { AesCbc } from './aes/cbc'
import { AesCfb } from './aes/cfb'
import { AesOfb } from './aes/ofb'
import { AesCtr } from './aes/ctr'
import { AesCcm } from './aes/ccm'
import { AesOcb } from './aes/ocb'
import { AesLrw } from './aes/lrw'
import { Rijndael } from './rijndael'
import { TripleDes } from './triple-des/ecb'
import { TripleDesCbc } from './triple-des/cbc'

/** The block ciphers, in registry order. */
export const block: readonly CipherConstructor[] = [
  Aes,
  AesCbc,
  AesCfb,
  AesOfb,
  AesCtr,
  AesCcm,
  AesOcb,
  AesLrw,
  Rijndael,
  TripleDes,
  TripleDesCbc,
]
