/** What one number of a hidden message stands for. */
export const zeroWidthUnits = ['byte', 'code-unit', 'code-point'] as const

export type ZeroWidthUnit = (typeof zeroWidthUnits)[number]

/** How invisible characters spell numbers, and what the numbers are. */
export interface ZeroWidthScheme {
  /** The character for each digit, digit 0 first; as many as the base, each one code point. */
  readonly symbols: readonly string[]
  /**
   * Digits per number. Without `separator` every number has exactly this many, and it is
   * required; with one, shorter numbers are padded to it when hiding.
   */
  readonly digits?: number
  /** A character between two numbers, for numbers of any length. */
  readonly separator?: string
  /** UTF-8 bytes, UTF-16 code units or whole code points. */
  readonly unit: ZeroWidthUnit
}

/**
 * Schemes other tools write: `330k` is the text mode of Kei Misawa's Unicode Steganography page,
 * `zwsp-steg` the default mode of the zwsp-steg packages, `zero-width-lib` the npm package.
 */
export const zeroWidthSchemes = {
  binary: { symbols: ['\u200B', '\u200C'], digits: 8, unit: 'byte' },
  '330k': { symbols: ['\u200C', '\u200D', '\u202C', '\uFEFF'], digits: 8, unit: 'code-unit' },
  'zwsp-steg': {
    symbols: ['\u200B', '\u200C', '\u200D', '\u200E', '\u200F'],
    digits: 7,
    unit: 'code-point',
  },
  'zero-width-lib': {
    symbols: ['\u200E', '\u200F', '\u200C', '\u200D', '\uFEFF'],
    separator: '\u200B',
    unit: 'code-point',
  },
} as const satisfies Record<string, ZeroWidthScheme>

export type ZeroWidthSchemeName = keyof typeof zeroWidthSchemes

/** Most digits one number takes; 32 binary digits already pass the last code point. */
export const MAX_ZERO_WIDTH_DIGITS = 32
