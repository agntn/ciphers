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

/** Monoalphabetic substitution options. */
export interface SubstitutionOptions extends CipherBaseOptions {
  /** 26 letters with `?` for an unknown one, or a keyword the rest of A-Z follows. */
  key: string
}

/** Vigenère cipher options. */
export interface VigenereOptions extends CipherBaseOptions {
  /** Keyword (letters only, case-insensitive). Required. */
  key: string
}

/** Gronsfeld cipher options. */
export interface GronsfeldOptions extends CipherBaseOptions {
  /** Repeating digits 0 to 9, one shift per letter. Required. */
  key: string
}

/** Standard Beaufort cipher options. */
export interface BeaufortOptions extends CipherBaseOptions {
  /** Repeating keyword; only ASCII letters are used, ignoring case. */
  key: string
}

/** Porta cipher options. */
export interface PortaOptions extends CipherBaseOptions {
  /** Repeating keyword; only ASCII letters are used, ignoring case. Required. */
  key: string
  /** Which way the N-Z half turns from table to table: `left` (ACA, default) or `right` (dCode). */
  rotation?: 'left' | 'right'
}

/** Autokey cipher options, using plaintext to extend the primer. */
export interface AutokeyOptions extends CipherBaseOptions {
  /** Primer keyword; only ASCII letters are used, ignoring case. */
  key: string
}

/** Running key cipher options. */
export interface RunningKeyOptions extends CipherBaseOptions {
  /** A passage with at least one ASCII letter per letter of the text; only its letters count. Required. */
  key: string
}

/** Alberti disk cipher options. */
export interface AlbertiOptions extends CipherBaseOptions {
  /** Keyword used to construct the movable inner disk. Required. */
  key: string
  /** Letters processed before rotating the inner disk. Required. */
  period: number
}

/** Quagmire I, II and III options. */
export interface QuagmireOptions extends CipherBaseOptions {
  /** Keyword for the keyed alphabet: plain for I, cipher for II, both for III. Required. */
  key: string
  /** Indicator keyword; each letter sets the cipher row for one letter of the text. Required. */
  indicator: string
  /** The plain letter the indicator keyword stands under. Default: `A`. */
  indicatorUnder?: string
}

/** Quagmire IV options. */
export interface Quagmire4Options extends QuagmireOptions {
  /** Keyword for the cipher alphabet; `key` keys the plain one. Required. */
  secondKey: string
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

/** Route transposition options. */
export interface RouteOptions extends CipherBaseOptions {
  /** Cells per row (2 or more). */
  width: number
  /** Corner the path starts from. Default: `top-left`. */
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Path through the grid. Default: `spiral-clockwise`. */
  path?: 'spiral-clockwise' | 'spiral-counterclockwise' | 'snake-rows' | 'snake-columns' | 'columns'
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

/** Four-square cipher options. */
export interface FourSquareOptions extends CipherBaseOptions {
  /** Keyword for the keyed square at the top right. Required. */
  key: string
  /** Keyword for the keyed square at the bottom left. Required. */
  secondKey: string
  /** The letter the squares leave out: `j` folds J into I (default), `q` drops Q. */
  omit?: 'j' | 'q'
}

/** Two-square cipher options. */
export interface TwoSquareOptions extends CipherBaseOptions {
  /** Keyword for the top square, or the left one side by side. Required. */
  key: string
  /** Keyword for the bottom square, or the right one side by side. Required. */
  secondKey: string
  /** `vertical` stacks the squares (default), `horizontal` sets them side by side. */
  orientation?: 'vertical' | 'horizontal'
  /** The letter the squares leave out: `j` folds J into I (default), `q` drops Q. */
  omit?: 'j' | 'q'
}

/** Hill cipher options. */
export interface HillOptions extends CipherBaseOptions {
  /** 4 or 9 letters, the matrix row by row with A as 0. Required. */
  key: string
}

/** Polybius cipher options. */
export interface PolybiusOptions extends CipherBaseOptions {
  /** Optional keyword for the 5×5 table. */
  key?: string
}

/** Nihilist cipher options. */
export interface NihilistOptions extends CipherBaseOptions {
  /** Keyword added to the text, letter by letter as square numbers. Required. */
  key: string
  /** Optional keyword for the 5×5 square. */
  square?: string
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

/** A1Z26 options. */
export interface A1z26Options extends CipherBaseOptions {
  /** Text between the numbers of one word, up to 10 characters without digits. Default: `-`. */
  separator?: string
  /** Letter from J to Z for 0, which switches to the single digit form: A to I for 1 to 9. */
  zero?: string
}

/** Book cipher options. */
export interface BookOptions extends CipherBaseOptions {
  /** The text to count in. A form feed starts a page, a line without a word does not count. */
  book: string
  /** One address: `word`, `line-word` or `page-line-word`. Default: `word`. */
  address?: 'word' | 'line-word' | 'page-line-word'
  /** `word` for the whole word, `letter` for its first letter. Default: `word`. */
  pick?: 'word' | 'letter'
  /** Number of the first word, line and page. Default: 1. */
  start?: 0 | 1
}

/** Options every block and stream cipher shares. */
export interface ByteCipherOptions extends CipherBaseOptions {
  /** `text` for UTF-8 text on the plain side, `hex` for hex bytes there. Default: `text`. */
  bytes?: 'text' | 'hex'
}

/** AES-ECB options. */
export interface AesOptions extends ByteCipherOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
}

/** AES-CBC options. */
export interface AesCbcOptions extends ByteCipherOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** Initialization vector, 32 hex digits; case and spaces are ignored. */
  iv: string
}

/** AES-CFB options. */
export interface AesCfbOptions extends ByteCipherOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** Initialization vector, 32 hex digits; case and spaces are ignored. */
  iv: string
  /** Bits fed back per step: 1, 8 or 128. Default: 128. */
  segment?: 1 | 8 | 128
}

/** AES-OFB options. */
export interface AesOfbOptions extends ByteCipherOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** Initialization vector, 32 hex digits; case and spaces are ignored. */
  iv: string
}

/** AES-CTR options. */
export interface AesCtrOptions extends ByteCipherOptions {
  /** 32, 48 or 64 hex digits for AES-128, AES-192 or AES-256; case and spaces are ignored. */
  key: string
  /** Initial counter block, 32 hex digits; case and spaces are ignored. */
  iv: string
}

/** AES-CCM options. */
export interface AesCcmOptions extends ByteCipherOptions {
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
export interface AesOcbOptions extends ByteCipherOptions {
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
export interface AesLrwOptions extends ByteCipherOptions {
  /** 64, 80 or 96 hex digits: the AES key, then 32 for the tweak key; case and spaces are ignored. */
  key: string
  /** Index of the first block in hex, up to 32 digits. Default: 1. */
  tweak?: string
}

/** AES-XTS options. */
export interface AesXtsOptions extends ByteCipherOptions {
  /**
   * 64 or 128 hex digits: the data key, then the tweak key, both AES-128 or both AES-256; case
   * and spaces are ignored.
   */
  key: string
  /** Data unit (sector) number in hex, up to 32 digits. Default: 0. */
  tweak?: string
}

/** AES passphrase options, as CryptoJS.AES.encrypt(message, passphrase) takes them. */
export interface AesPassphraseOptions extends ByteCipherOptions {
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
export interface RijndaelOptions extends ByteCipherOptions {
  /** 32, 40, 48, 56 or 64 hex digits for a 128 to 256-bit key; case and spaces are ignored. */
  key: string
  /** Block length in bits: 128, 160, 192, 224 or 256. Default: 128, which is AES. */
  blockSize?: 128 | 160 | 192 | 224 | 256
}

/** DES ECB options. */
export interface DesOptions extends ByteCipherOptions {
  /** 16 hex digits for a 64-bit key, parity bits included; case and spaces are ignored. */
  key: string
}

/** DESX ECB options. */
export interface DesxOptions extends ByteCipherOptions {
  /**
   * 48 hex digits: the DES key, then the input and the output whitening key, as OpenSSL's `desx`
   * takes them; case and spaces are ignored.
   */
  key: string
}

/** Triple DES ECB options. */
export interface TripleDesOptions extends ByteCipherOptions {
  /** 32 hex digits for two keys (K3 = K1) or 48 for three; case and spaces are ignored. */
  key: string
}

/** Triple DES CBC options. */
export interface TripleDesCbcOptions extends ByteCipherOptions {
  /** 32 hex digits for two keys (K3 = K1) or 48 for three; case and spaces are ignored. */
  key: string
  /** Initialization vector, 16 hex digits; case and spaces are ignored. */
  iv: string
}

/** Blowfish ECB options. */
export interface BlowfishOptions extends ByteCipherOptions {
  /** An even number of hex digits from 8 to 112, a 32 to 448-bit key; case and spaces are ignored. */
  key: string
}

/** IDEA ECB options. */
export interface IdeaOptions extends ByteCipherOptions {
  /** 32 hex digits, a 128-bit key; case and spaces are ignored. */
  key: string
}

/** Lucifer ECB options. */
export interface LuciferOptions extends ByteCipherOptions {
  /** 32 hex digits, a 128-bit key; case and spaces are ignored. */
  key: string
}

/** MARS ECB options. */
export interface MarsOptions extends ByteCipherOptions {
  /** 32 to 112 hex digits in steps of 8, a key of 4 to 14 words; case and spaces are ignored. */
  key: string
}

/** Serpent ECB options. */
export interface SerpentOptions extends ByteCipherOptions {
  /** 32, 48 or 64 hex digits, a 128, 192 or 256-bit key; case and spaces are ignored. */
  key: string
}

/** CAST5 ECB options. */
export interface Cast5Options extends ByteCipherOptions {
  /** 10 to 32 hex digits in whole bytes, a 40 to 128-bit key; case and spaces are ignored. */
  key: string
}

/** OpenPGP passphrase options. Decoding reads everything but the passphrase from the message. */
export interface OpenPgpOptions extends ByteCipherOptions {
  /** The passphrase, any text, read as UTF-8. */
  key: string
  /** Encoding only: the block cipher. Default: `aes256`. */
  algorithm?: 'idea' | '3des' | 'cast5' | 'blowfish' | 'aes128' | 'aes192' | 'aes256'
  /** Encoding only: the S2K hash. Default: `sha512`. */
  digest?:
    | 'md5'
    | 'sha1'
    | 'ripemd160'
    | 'sha224'
    | 'sha256'
    | 'sha384'
    | 'sha512'
    | 'sha3-256'
    | 'sha3-512'
  /** Encoding only: bytes the S2K hashes, 1024 to 65011712, rounded up. Default: 65011712. */
  count?: number
  /** Encoding only: 16 hex digits. Default: random. */
  salt?: string
  /** Encoding only: the random first block, 16 hex digits, or 32 for AES. Default: random. */
  iv?: string
}

/** Rabbit options. */
export interface RabbitOptions extends ByteCipherOptions {
  /** 32 hex digits, a 128-bit key; case and spaces are ignored. */
  key: string
  /** 16 hex digits, a 64-bit IV; case and spaces are ignored. Without it the IV setup is skipped. */
  iv?: string
  /** Byte order of key, IV and keystream: `big` as in RFC 4503, `little` as in Crypto++. Default: `big`. */
  endian?: 'big' | 'little'
}

/** RC4 options. */
export interface Rc4Options extends ByteCipherOptions {
  /** 2 to 512 hex digits in whole bytes, a 1 to 256-byte key; case and spaces are ignored. */
  key: string
}

/** Repeating-key XOR options. */
export interface XorOptions extends ByteCipherOptions {
  /** Any nonzero even number of hex digits, a key of whole bytes; case and spaces are ignored. */
  key: string
}

/** Salsa20 options. */
export interface Salsa20Options extends ByteCipherOptions {
  /** 32 or 64 hex digits, a 128 or 256-bit key; case and spaces are ignored. */
  key: string
  /** 16 hex digits, a 64-bit nonce; case and spaces are ignored. */
  nonce: string
  /** Block counter of the first 64 bytes, 0 to 2^53 - 1. Default: 0. */
  counter?: number
}

/** XSalsa20 options. */
export interface XSalsa20Options extends ByteCipherOptions {
  /** 64 hex digits, a 256-bit key; case and spaces are ignored. */
  key: string
  /** 48 hex digits, a 192-bit nonce; case and spaces are ignored. */
  nonce: string
  /** Block counter of the first 64 bytes, 0 to 2^53 - 1. Default: 0. */
  counter?: number
}

/** ChaCha20 options. */
export interface ChaCha20Options extends ByteCipherOptions {
  /** 64 hex digits, a 256-bit key; case and spaces are ignored. */
  key: string
  /** 24 hex digits, a 96-bit nonce; case and spaces are ignored. */
  nonce: string
  /** Block counter of the first 64 bytes, 0 to 2^32 - 1. Default: 0. */
  counter?: number
}

/** XChaCha20 options. */
export interface XChaCha20Options extends ByteCipherOptions {
  /** 64 hex digits, a 256-bit key; case and spaces are ignored. */
  key: string
  /** 48 hex digits, a 192-bit nonce; case and spaces are ignored. */
  nonce: string
  /** Block counter of the first 64 bytes, 0 to 2^32 - 1. Default: 0. */
  counter?: number
}

/** ChaCha20-Poly1305 options. */
export interface ChaCha20Poly1305Options extends ByteCipherOptions {
  /** 64 hex digits, a 256-bit key; case and spaces are ignored. */
  key: string
  /** 24 hex digits, a 96-bit nonce; case and spaces are ignored. */
  nonce: string
  /** Associated data in hex, covered by the tag and not encrypted. Default: none. */
  aad?: string
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
    | 'polygraphic'
    | 'fractionation'
    | 'homophonic'
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
  /** What `encode` reads and does with the rest by default, such as `A-Z, the rest passes`. */
  worksOn: string
  /** Required/optional options. */
  options: CipherOption[]
  /** Keyspace size description. */
  keyspace?: string
}
