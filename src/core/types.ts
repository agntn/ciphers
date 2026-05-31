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

/** Options for cipher encoding. */
export interface EncodeOptions {
  /** Preserve original case. Default: true. */
  preserveCase?: boolean
  /** Preserve non-alpha characters. Default: true. */
  preserveNonAlpha?: boolean
  /** Cipher-specific options (shift, key, rails, multiplier, etc.). */
  [key: string]: unknown
}

/** Options for cipher decoding. */
export interface DecodeOptions extends EncodeOptions {}

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

/** A cipher provider — can encode and decode text. */
export interface CipherProvider {
  /** Cipher name. */
  name(): string
  /** Cipher metadata. */
  info(): CipherInfo
  /** Encode plaintext. */
  encode(text: string, options?: EncodeOptions): CipherResult
  /** Decode ciphertext. */
  decode(text: string, options?: DecodeOptions): CipherResult
}

/** Factory function to create a cipher provider. */
export type CipherProviderFactory = () => CipherProvider
