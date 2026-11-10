import { InvalidOptionError } from './errors.ts'

/**
 * A character and its case partners that map straight back, so `a` finds `A` and `ı` never `I`.
 *
 * @param character - One code point.
 * @returns {string[]} The character, then its upper and lower case when they round trip.
 */
export function spellings(character: string): string[] {
  const upper = character.toUpperCase()
  const lower = character.toLowerCase()
  return [
    character,
    ...(upper.toLowerCase() === character ? [upper] : []),
    ...(lower.toUpperCase() === character ? [lower] : []),
  ]
}

/**
 * The `alphabet` option split into its symbols.
 *
 * @param alphabet - The option as passed.
 * @param least - Fewest symbols it may hold.
 * @returns {string[]} The symbols in order.
 * @throws {InvalidOptionError} On anything but a string, too few symbols, whitespace or a repeat.
 */
export function alphabetSymbols(alphabet: unknown, least: number): string[] {
  if (typeof alphabet !== 'string') {
    throw new InvalidOptionError('alphabet', alphabet, 'must be a string')
  }
  const symbols = Array.from(alphabet)
  if (symbols.length < least) {
    throw new InvalidOptionError('alphabet', alphabet, `must hold at least ${least} symbols`)
  }
  if (symbols.some((symbol) => /\s/u.test(symbol))) {
    throw new InvalidOptionError(
      'alphabet',
      alphabet,
      "can't hold whitespace, which decoding skips",
    )
  }
  const seen = new Set<string>()
  const repeated = symbols.find((symbol) => {
    if (seen.has(symbol)) return true
    seen.add(symbol)
    return false
  })
  if (repeated !== undefined) {
    throw new InvalidOptionError('alphabet', alphabet, `has ${repeated} twice`)
  }
  return symbols
}
