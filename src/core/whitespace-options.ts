/** Where spaces, tabs and line endings can carry a message by position. */
export const whitespaceChannels = ['line-ending', 'trailing', 'interior', 'sentence'] as const

export type WhitespaceChannel = (typeof whitespaceChannels)[number]

/** Classes a mapping can name per channel. A trailing run is read one character at a time. */
export const whitespaceSymbols = {
  'line-ending': ['lf', 'crlf', 'cr'],
  trailing: ['space', 'tab'],
  interior: ['single', 'double', 'wide', 'tab', 'mixed'],
  sentence: ['single', 'double', 'wide', 'tab', 'mixed'],
} as const satisfies Record<WhitespaceChannel, readonly string[]>

export type WhitespaceSymbol = (typeof whitespaceSymbols)[WhitespaceChannel][number]

/** Which bit of a group comes first in the text. */
export const whitespaceOrders = ['msb', 'lsb'] as const

export type WhitespaceOrder = (typeof whitespaceOrders)[number]

/** What happens to a place the mapping gives no bit. */
export const whitespaceUnmapped = ['refuse', 'skip'] as const

export type WhitespaceUnmapped = (typeof whitespaceUnmapped)[number]

/** Characters a gap follows to count as a sentence gap, unless `boundaries` says otherwise. */
export const SENTENCE_BOUNDARIES = '.!?'

/** Most characters `boundaries` takes. */
export const MAX_SENTENCE_BOUNDARIES = 32

/** Bits `hideWhitespace` puts on one line unless told otherwise: a byte. */
export const DEFAULT_BITS_PER_LINE = 8

/** Most bits one line takes, enough for a wide line and short of a wall of blanks. */
export const MAX_BITS_PER_LINE = 64
