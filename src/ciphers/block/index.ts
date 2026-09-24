import type { CipherConstructor } from '../../core/cipher'
import { Aes } from './aes/ecb'
import { AesCbc } from './aes/cbc'
import { AesCfb } from './aes/cfb'
import { AesOfb } from './aes/ofb'
import { AesCtr } from './aes/ctr'
import { AesCcm } from './aes/ccm'
import { AesOcb } from './aes/ocb'
import { AesLrw } from './aes/lrw'
import { AesXts } from './aes/xts'
import { AesCbcMac } from './aes/cbc-mac'
import { Rijndael } from './rijndael'
import { TripleDes } from './triple-des/ecb'
import { TripleDesCbc } from './triple-des/cbc'
import { Blowfish } from './blowfish'

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
  AesXts,
  AesCbcMac,
  Rijndael,
  TripleDes,
  TripleDesCbc,
  Blowfish,
]
