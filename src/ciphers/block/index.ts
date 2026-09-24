import type { CipherConstructor } from '../../core/cipher.ts'
import { Aes } from './aes/ecb.ts'
import { AesCbc } from './aes/cbc.ts'
import { AesCfb } from './aes/cfb.ts'
import { AesOfb } from './aes/ofb.ts'
import { AesCtr } from './aes/ctr.ts'
import { AesCcm } from './aes/ccm.ts'
import { AesOcb } from './aes/ocb.ts'
import { AesLrw } from './aes/lrw.ts'
import { AesXts } from './aes/xts.ts'
import { AesCbcMac } from './aes/cbc-mac.ts'
import { Rijndael } from './rijndael.ts'
import { TripleDes } from './triple-des/ecb.ts'
import { TripleDesCbc } from './triple-des/cbc.ts'
import { Blowfish } from './blowfish.ts'

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
