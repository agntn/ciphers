/** Shared cipher utilities — extracted from provider implementations. */

/**
 * Build a 5×5 Polybius square from an optional keyword.
 * I/J share a cell. Used by Polybius, Bifid, Playfair.
 * Returns 1-indexed positions for compatibility with all consumers.
 */
export function buildPolybiusSquare(key?: string): {
  square: string[][]
  pos: Map<string, [number, number]>
} {
  const seen = new Set<string>()
  const letters: string[] = []
  const src = (key ?? '').toUpperCase()
  for (const c of src) {
    if (c < 'A' || c > 'Z') continue
    const ch = c === 'J' ? 'I' : c
    if (!seen.has(ch)) { seen.add(ch); letters.push(ch) }
  }
  for (let i = 65; i <= 90; i++) {
    const ch = String.fromCharCode(i) === 'J' ? 'I' : String.fromCharCode(i)
    if (!seen.has(ch)) { seen.add(ch); letters.push(ch) }
  }
  const square: string[][] = []
  const pos = new Map<string, [number, number]>()
  for (let r = 0; r < 5; r++) {
    square[r] = []
    for (let c = 0; c < 5; c++) {
      const ch = letters[r * 5 + c]!
      square[r]![c] = ch
      pos.set(ch, [r + 1, c + 1])
    }
  }
  return { square, pos }
}

/** Extract common base options (preserveCase, stripNonAlpha) with defaults. */
export function processBaseOptions(opts: Record<string, unknown>): {
  preserveCase: boolean
  stripNonAlpha: boolean
} {
  return {
    preserveCase: (opts.preserveCase as boolean | undefined) ?? true,
    stripNonAlpha: (opts.stripNonAlpha as boolean | undefined) ?? false,
  }
}

/** Get a cipher-specific option with type safety and fallback. */
export function getOpt<T>(opts: Record<string, unknown>, key: string, fallback: T): T {
  const val = opts[key]
  return val !== undefined ? (val as T) : fallback
}

/**
 * Wrap a cipher operation with standardized error handling.
 * Catches any error and normalizes it via normalizeError.
 */
export function withCipherError<T>(name: string, fn: () => T): T {
  try {
    return fn()
  } catch (e) {
    if (e instanceof Error && e.name === 'CipherError') throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw new (class extends Error {
      name = 'CipherError'
      constructor() { super(`[${name}] ${msg}`) }
    })()
  }
}
