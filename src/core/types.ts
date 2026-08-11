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

/** Get a cipher-specific option with type safety. */
export function getOpt<T>(opts: CipherBaseOptions, key: string, fallback: T): T {
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
  /** Cipher family. */
  family: 'substitution-shift' | 'substitution-keyed' | 'substitution-multiplicative' | 'substitution-reflection' | 'digraph' | 'fractionation' | 'transposition' | 'polyalphabetic'
  /** Self-inverse: encode(encode(x)) == x. */
  selfInverse: boolean
  /** Required/optional options. */
  options: CipherOption[]
  /** Keyspace size description. */
  keyspace?: string
}

