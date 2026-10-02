import type { CipherCategory } from './ciphers.ts'

/** Result of a cipher operation. */
export interface CipherResult {
  /** Processed text (encoded or decoded). */
  text: string
  /** Name of the cipher that produced this result. */
  cipher: string
  /** Operation performed. */
  operation: 'encode' | 'decode'
  /** Options used (shift, key, rails, etc.). */
  options: Record<string, unknown>
  /** Normalized input before processing. */
  normalizedInput?: string
}

/** Common options for all ciphers. Cipher-specific keys (shift, key, rails, a, b) allowed. */
export interface CipherBaseOptions {
  /** Preserve original case. Default: true. */
  preserveCase?: boolean
  /** Strip non-alpha characters before processing. Default: false. */
  stripNonAlpha?: boolean
  /** Cipher-specific options (shift, key, rails, a, b). */
  [key: string]: unknown
}

/** Caesar cipher options. */
export interface CaesarOptions extends CipherBaseOptions {
  /** Number of positions to shift (1-25). Default: 3. */
  shift?: number
}

/** Vigenère cipher options. */
export interface VigenereOptions extends CipherBaseOptions {
  /** Keyword (letters only, case-insensitive). Required. */
  key: string
}

/** Standard Beaufort cipher options. */
export interface BeaufortOptions extends CipherBaseOptions {
  /** Repeating keyword; only ASCII letters are used, ignoring case. */
  key: string
}

/** Autokey cipher options, using plaintext to extend the primer. */
export interface AutokeyOptions extends CipherBaseOptions {
  /** Primer keyword; only ASCII letters are used, ignoring case. */
  key: string
}

/** Alberti disk cipher options. */
export interface AlbertiOptions extends CipherBaseOptions {
  /** Keyword used to construct the movable inner disk. Required. */
  key: string
  /** Letters processed before rotating the inner disk. Required. */
  period: number
}

/** Enigma M3 options. */
export interface EnigmaOptions extends CipherBaseOptions {
  /** Initial rotor positions, left to right. Default: AAA. */
  positions?: string
  /** Ring settings, left to right. Default: AAA. */
  rings?: string
  /** Space-separated plugboard pairs. Default: none. */
  plugboard?: string
}

/** Rail Fence cipher options. */
export interface RailFenceOptions extends CipherBaseOptions {
  /** Number of rails (2 or more). Default: 3. */
  rails?: number
}

/** Affine cipher options. */
export interface AffineOptions extends CipherBaseOptions {
  /** Multiplier (must be coprime with 26). Default: 5. */
  a?: number
  /** Additive shift (0-25). Default: 8. */
  b?: number
}

/** Playfair cipher options. */
export interface PlayfairOptions extends CipherBaseOptions {
  /** Keyword for the 5×5 table. Required. */
  key: string
}

/** Polybius cipher options. */
export interface PolybiusOptions extends CipherBaseOptions {
  /** Optional keyword for the 5×5 table. */
  key?: string
}

/** ADFGVX cipher options. */
export interface AdfgvxOptions extends CipherBaseOptions {
  /** Optional keyword for the 6×6 grid. */
  key?: string
  /** Keyword for the columnar transposition after the grid step. Empty or missing skips it. */
  transposition?: string
}

/** Straddling checkerboard options. */
export interface StraddlingCheckerboardOptions extends CipherBaseOptions {
  /** The 28 cells row by row, each letter A-Z once and two fillers. Default: `ETAONRISBCDFGHJKLMPQ/UVWXYZ.`. */
  key?: string
  /** The two blank digits of the top row. Default: `26`. */
  blanks?: string
}

/** Bacon's cipher options. */
export interface BaconOptions extends CipherBaseOptions {
  /** Table size: 26 codes every letter, 24 shares I/J and U/V. Default: 26. */
  letters?: 24 | 26
}

/** AES-ECB options. */
export interface AesOptions extends CipherBaseOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
}

/** AES-CBC options. */
export interface AesCbcOptions extends CipherBaseOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** Initialization vector, 32 hex digits; case and spaces are ignored. */
  iv: string
}

/** AES-CFB options. */
export interface AesCfbOptions extends CipherBaseOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** Initialization vector, 32 hex digits; case and spaces are ignored. */
  iv: string
  /** Bits fed back per step: 1, 8 or 128. Default: 128. */
  segment?: 1 | 8 | 128
}

/** AES-OFB options. */
export interface AesOfbOptions extends CipherBaseOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** Initialization vector, 32 hex digits; case and spaces are ignored. */
  iv: string
}

/** AES-CTR options. */
export interface AesCtrOptions extends CipherBaseOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** Initial counter block, 32 hex digits; case and spaces are ignored. */
  iv: string
}

/** AES-CCM options. */
export interface AesCcmOptions extends CipherBaseOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** 14 to 26 hex digits, a 7 to 13-byte nonce; case and spaces are ignored. */
  nonce: string
  /** Associated data in hex, covered by the tag and not encrypted. Default: none. */
  aad?: string
  /** Tag length in bits: 32, 48, 64, 80, 96, 112 or 128. Default: 128. */
  tagLength?: 32 | 48 | 64 | 80 | 96 | 112 | 128
}

/** AES-OCB options. */
export interface AesOcbOptions extends CipherBaseOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** 2 to 30 hex digits, a 1 to 15-byte nonce; case and spaces are ignored. */
  nonce: string
  /** Associated data in hex, covered by the tag and not encrypted. Default: none. */
  aad?: string
  /** Tag length in bits: 64, 96 or 128. Default: 128. */
  tagLength?: 64 | 96 | 128
}

/** AES-LRW options. */
export interface AesLrwOptions extends CipherBaseOptions {
  /** 64, 80 or 96 hex digits: the AES key, then 32 for the tweak key; case and spaces are ignored. */
  key: string
  /** Index of the first block in hex, up to 32 digits. Default: 1. */
  tweak?: string
}

/** AES-XTS options. */
export interface AesXtsOptions extends CipherBaseOptions {
  /**
   * 64 or 128 hex digits: the data key, then the tweak key, both AES-128 or both AES-256; case
   * and spaces are ignored.
   */
  key: string
  /** Data unit (sector) number in hex, up to 32 digits. Default: 0. */
  tweak?: string
}

/** AES passphrase options, as CryptoJS.AES.encrypt(message, passphrase) takes them. */
export interface AesPassphraseOptions extends CipherBaseOptions {
  /** The passphrase, any text, read as UTF-8. */
  key: string
  /** Key length in bits, 128 to 1024 in steps of 32. Default: 256. */
  keyLength?: number
  /** MD5 passes per derived block, 1 to 100000. Default: 1. */
  iterations?: number
  /** Encoding only: 16 hex digits. Default: random. */
  salt?: string
}

/** Rijndael options. */
export interface RijndaelOptions extends CipherBaseOptions {
  /** 32, 40, 48, 56 or 64 hex digits for a 128 to 256-bit key; case and spaces are ignored. */
  key: string
  /** Block length in bits: 128, 160, 192, 224 or 256. Default: 128, which is AES. */
  blockSize?: 128 | 160 | 192 | 224 | 256
}

/** DES ECB options. */
export interface DesOptions extends CipherBaseOptions {
  /** 16 hex digits for a 64-bit key, parity bits included; case and spaces are ignored. */
  key: string
}

/** DESX ECB options. */
export interface DesxOptions extends CipherBaseOptions {
  /**
   * 48 hex digits: the DES key, then the input and the output whitening key, as OpenSSL's `desx`
   * takes them; case and spaces are ignored.
   */
  key: string
}

/** Triple DES ECB options. */
export interface TripleDesOptions extends CipherBaseOptions {
  /** 32 hex digits for two keys (K3 = K1) or 48 for three; case and spaces are ignored. */
  key: string
}

/** Triple DES CBC options. */
export interface TripleDesCbcOptions extends CipherBaseOptions {
  /** 32 hex digits for two keys (K3 = K1) or 48 for three; case and spaces are ignored. */
  key: string
  /** Initialization vector, 16 hex digits; case and spaces are ignored. */
  iv: string
}

/** Blowfish ECB options. */
export interface BlowfishOptions extends CipherBaseOptions {
  /** An even number of hex digits from 8 to 112, a 32 to 448-bit key; case and spaces are ignored. */
  key: string
}

/** IDEA ECB options. */
export interface IdeaOptions extends CipherBaseOptions {
  /** 32 hex digits, a 128-bit key; case and spaces are ignored. */
  key: string
}

/** Lucifer ECB options. */
export interface LuciferOptions extends CipherBaseOptions {
  /** 32 hex digits, a 128-bit key; case and spaces are ignored. */
  key: string
}

/** MARS ECB options. */
export interface MarsOptions extends CipherBaseOptions {
  /** 32 to 112 hex digits in steps of 8, a key of 4 to 14 words; case and spaces are ignored. */
  key: string
}

/** Serpent ECB options. */
export interface SerpentOptions extends CipherBaseOptions {
  /** 32, 48 or 64 hex digits, a 128, 192 or 256-bit key; case and spaces are ignored. */
  key: string
}

/** Rabbit options. */
export interface RabbitOptions extends CipherBaseOptions {
  /** 32 hex digits, a 128-bit key; case and spaces are ignored. */
  key: string
  /** 16 hex digits, a 64-bit IV; case and spaces are ignored. Without it the IV setup is skipped. */
  iv?: string
  /** Byte order of key, IV and keystream: `big` as in RFC 4503, `little` as in Crypto++. Default: `big`. */
  endian?: 'big' | 'little'
}

/** RC4 options. */
export interface Rc4Options extends CipherBaseOptions {
  /** 2 to 512 hex digits in whole bytes, a 1 to 256-byte key; case and spaces are ignored. */
  key: string
}

/** Repeating-key XOR options. */
export interface XorOptions extends CipherBaseOptions {
  /** Any nonzero even number of hex digits, a key of whole bytes; case and spaces are ignored. */
  key: string
  /** `text` for UTF-8 text in and out, `hex` for hex on both sides. Default: `text`. */
  bytes?: 'text' | 'hex'
}

/**
 * Get a cipher-specific option with type safety.
 *
 * @param opts - Cipher options to read.
 * @param key - Option name.
 * @param fallback - Value returned when the option is absent.
 * @returns {T} The configured value or `fallback`.
 */
export function getOpt<T>(opts: Readonly<CipherBaseOptions>, key: string, fallback: T): T {
  const val = opts[key]
  return val !== undefined ? (val as T) : fallback
}

/** Cipher-specific options exposed to the user. */
export interface CipherOption {
  name: string
  type: 'number' | 'string'
  required: boolean
  default?: number | string
  description: string
}

/** Metadata about a cipher. */
export interface CipherInfo {
  /** Unique cipher name. */
  name: string
  /** Human-readable label. */
  label: string
  /** One-line description. */
  description: string
  /** Category the cipher belongs to, such as `classical` or `block`. */
  category: CipherCategory
  /** Cipher family within the category. */
  family:
    | 'substitution-shift'
    | 'substitution-keyed'
    | 'substitution-multiplicative'
    | 'substitution-reflection'
    | 'digraph'
    | 'fractionation'
    | 'transposition'
    | 'polyalphabetic'
    | 'rotor'
    | 'substitution-permutation'
    | 'feistel'
    | 'lai-massey'
    | 'arx'
    | 'permutation'
  /** Self-inverse: encode(encode(x)) == x. */
  selfInverse: boolean
  /** Required/optional options. */
  options: CipherOption[]
  /** Keyspace size description. */
  keyspace?: string
}
