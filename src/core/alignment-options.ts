/** Where a text is cut: runs of letters, marks and digits, or anything between whitespace. */
export const alignmentTokens = ['words', 'whitespace'] as const

export type AlignmentTokens = (typeof alignmentTokens)[number]

/** When two tokens count as the same word, each step looser than the one before. */
export const alignmentCompares = ['exact', 'canonical', 'caseless', 'unaccented'] as const

export type AlignmentCompare = (typeof alignmentCompares)[number]

/** What a row says happened between the two texts. */
export const alignmentOperations = ['equal', 'replace', 'insert', 'delete'] as const

export type AlignmentOperation = (typeof alignmentOperations)[number]

/** Table cells one alignment may fill: left tokens plus one, times right tokens plus one. */
export const MAX_ALIGNMENT_CELLS = 4_000_000

/** Problems `checkAlignment` spells out before it only counts. */
export const MAX_ALIGNMENT_PROBLEMS = 50
