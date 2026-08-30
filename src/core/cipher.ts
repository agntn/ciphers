import type { CipherBaseOptions, CipherInfo, CipherResult } from './types'

/** Base class for all ciphers. */
export abstract class Cipher {
  /** Return the unique cipher name. */
  abstract name(): string

  /** Return metadata describing the cipher. */
  abstract info(): CipherInfo

  /** Encode plaintext with this cipher. */
  abstract encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult

  /** Decode ciphertext with this cipher. */
  abstract decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult
}

/** Constructor accepted by the cipher registry. */
export type CipherConstructor = new () => Cipher
