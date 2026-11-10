import { InvalidOptionError } from './errors.ts'
import { languageTables } from './frequency.ts'
import { QUADGRAM_STEP, quadgramFit, quadgramLevel, quadgramLevels } from './quadgrams.ts'
import { mulberry32 } from './utils.ts'

/** Nats per unit of chi-squared off English counts; without it E, T and A eat every symbol. */
const SPREAD_WEIGHT = 4

/** Temperature of the first annealing step, in nats, cooled in a straight line to zero. */
const START_TEMPERATURE = 12

/** Annealing steps per distinct symbol, so the time follows the text, not the symbol count. */
const STEPS_PER_SYMBOL = 2_800

/** Most steps of one start, reached at 100 symbols; past that the time limit of `/mcp` wins. */
const MAX_STEPS = 280_000

/** Mixed into the seed for the shuffle of the baseline. */
const NOISE_SEED = 0x5bd1e995

/** What splits symbols without `symbolWidth`, and what a fixed width skips. */
const SEPARATORS = /[\s,]+/u

/** A homophonic ciphertext as symbol numbers, and the symbols they stand for. */
export interface HomophonicStream {
  /** Symbol of each position, as an index into `symbols`. */
  readonly codes: readonly number[]
  /** The distinct symbols, in order of first appearance. */
  readonly symbols: readonly string[]
}

/** One plaintext letter per symbol, and what that makes of the text. */
export interface HomophonicCandidate {
  /** Each plaintext letter A to Z with its symbols, `A=12 31, B=05`; unused letters left out. */
  readonly key: string
  /** The plaintext letter of each symbol. */
  readonly map: Readonly<Record<string, string>>
  /** Mean natural-log probability per quadgram of `text`. */
  readonly fit: number
  /** The text decoded, one letter per symbol. */
  readonly text: string
  /** `fit` less the letter distribution penalty, plus any `score`; ranks the candidates. */
  readonly rank: number
}

/** A caller's score of a plaintext, added to its quadgram fit. */
export type HomophonicScore = (plain: string) => number

/** How one homophonic search runs. */
export interface HomophonicSearch {
  /** Picks the symbols to search on out of a whole text. */
  readonly sample: (codes: readonly number[]) => number[]
  readonly starts: number
  readonly seed: number
  readonly score?: HomophonicScore
}

/** What every start of the search shares: the text, where each symbol sits, the target counts. */
interface Layout {
  readonly codes: readonly number[]
  readonly positions: readonly (readonly number[])[]
  /** Start of every quadgram that holds the symbol, each start once. */
  readonly starts: readonly (readonly number[])[]
  /** Count of each letter in English text of this length. */
  readonly want: readonly number[]
  readonly levels: ArrayLike<number>
  readonly score: HomophonicScore | undefined
}

/**
 * English letter frequencies, A to Z.
 *
 * @returns {number[]} The probability of each letter.
 */
function englishFrequencies(): number[] {
  const logs = languageTables('en').letterLogs
  return Array.from({ length: 26 }, (_, code) =>
    Math.exp(logs.get(String.fromCodePoint(65 + code))!),
  )
}

/**
 * Split a homophonic ciphertext into its symbols.
 *
 * @param text - The ciphertext.
 * @param symbolWidth - Characters per symbol; without it whitespace and commas split them.
 * @returns {string[]} The symbols in order.
 * @throws {InvalidOptionError} When `symbolWidth` does not divide the text.
 */
export function homophonicSymbols(text: string, symbolWidth?: number): string[] {
  if (symbolWidth === undefined) return text.split(SEPARATORS).filter((symbol) => symbol !== '')
  const characters = Array.from(text.replaceAll(new RegExp(SEPARATORS, 'gu'), ''))
  const over = characters.length % symbolWidth
  if (over !== 0) {
    throw new InvalidOptionError(
      'symbolWidth',
      symbolWidth,
      `leaves ${over} of ${characters.length} characters over, so the symbols do not line up`,
    )
  }
  return Array.from({ length: characters.length / symbolWidth }, (_, index) =>
    characters.slice(index * symbolWidth, (index + 1) * symbolWidth).join(''),
  )
}

/**
 * Number each distinct symbol in order of first appearance.
 *
 * @param symbols - The symbols of a text.
 * @returns {HomophonicStream} The text as symbol numbers.
 */
export function homophonicStream(symbols: readonly string[]): HomophonicStream {
  const numbers = new Map<string, number>()
  const codes = symbols.map((symbol) => {
    if (!numbers.has(symbol)) numbers.set(symbol, numbers.size)
    return numbers.get(symbol)!
  })
  return { codes, symbols: [...numbers.keys()] }
}

/**
 * Where each symbol sits in a run of symbol numbers, and the quadgrams it touches.
 *
 * @param codes - Symbol numbers, counted from 0 without a gap.
 * @param score - The caller's score, if any.
 * @returns {Layout} The layout every start reuses.
 */
function layout(codes: readonly number[], score: HomophonicScore | undefined): Layout {
  const symbols = codes.reduce((most, code) => Math.max(most, code), -1) + 1
  const positions = Array.from({ length: symbols }, (): number[] => [])
  codes.forEach((code, index) => positions[code]!.push(index))
  const starts = positions.map((places) => {
    const found = new Set<number>()
    for (const place of places) {
      const last = Math.min(place, codes.length - 4)
      for (let start = Math.max(0, place - 3); start <= last; start++) found.add(start)
    }
    return [...found]
  })
  const want = englishFrequencies().map((share) => share * codes.length)
  return { codes, positions, starts, want, levels: quadgramLevels(), score }
}

/**
 * What the caller's score gives a plaintext.
 *
 * @param score - The caller's score, if any.
 * @param plain - Letter codes.
 * @returns {number} Its answer, 0 without a score.
 * @throws {InvalidOptionError} When it gives no finite number.
 */
function extraFit(score: HomophonicScore | undefined, plain: ArrayLike<number>): number {
  if (score === undefined) return 0
  const text = Array.from(plain, (letter) => String.fromCodePoint(65 + letter)).join('')
  const extra: unknown = score(text)
  if (typeof extra !== 'number' || !Number.isFinite(extra)) {
    throw new InvalidOptionError('score', extra, 'must return a finite number for every plaintext')
  }
  return extra
}

/**
 * Chi-squared term of one letter.
 *
 * @param count - How often the letter shows.
 * @param want - How often it shows in English of the same length.
 * @returns {number} Its share of chi-squared.
 */
function spread(count: number, want: number): number {
  return (count - want) ** 2 / want
}

/** One annealing run's map, kept in place: each step rewrites one symbol's letter. */
class Annealer {
  private readonly layout: Layout
  private readonly plainOf: number[]
  private readonly plain: Uint8Array
  private readonly counts: number[]
  /** The caller's score of the map kept and of the one `try` wrote. */
  private extra = 0
  private tried = 0
  /** Quadgram log probability less the weighted chi-squared, higher reads more like English. */
  score: number

  /**
   * @param layout - The text and its symbol positions.
   * @param plainOf - Plaintext letter code to start each symbol on.
   */
  constructor(layout: Readonly<Layout>, plainOf: readonly number[]) {
    this.layout = layout
    this.plainOf = [...plainOf]
    this.plain = Uint8Array.from(layout.codes, (code) => plainOf[code]!)
    this.counts = Array.from<number>({ length: 26 }).fill(0)
    for (const letter of this.plain) this.counts[letter]!++
    let levels = 0
    for (let start = 0; start + 3 < this.plain.length; start++) {
      levels += quadgramLevel(layout.levels, this.plain, start)
    }
    const penalty = this.counts.reduce(
      (sum, count, letter) => sum + spread(count, layout.want[letter]!),
      0,
    )
    this.extra = this.extraNow()
    this.score = -levels * QUADGRAM_STEP - SPREAD_WEIGHT * penalty + this.extra
  }

  /**
   * The plaintext letter of each symbol now.
   *
   * @returns {number[]} A copy, safe to keep.
   */
  map(): number[] {
    return [...this.plainOf]
  }

  /**
   * The letter one symbol stands for now.
   *
   * @param symbol - Symbol number.
   * @returns {number} Its letter code.
   */
  letterOf(symbol: number): number {
    return this.plainOf[symbol]!
  }

  /**
   * Write `letter` at every place of a symbol and return the score change; `keep` or `revert` next.
   *
   * @param symbol - Symbol number.
   * @param letter - The new letter code.
   * @returns {number} The change in score.
   */
  try(symbol: number, letter: number): number {
    const { want } = this.layout
    const old = this.plainOf[symbol]!
    const starts = this.layout.starts[symbol]!
    const before = this.levelsAt(starts)
    this.write(symbol, letter)
    const size = this.layout.positions[symbol]!.length
    const [oldCount, newCount] = [this.counts[old]!, this.counts[letter]!]
    const moved =
      spread(oldCount - size, want[old]!) +
      spread(newCount + size, want[letter]!) -
      spread(oldCount, want[old]!) -
      spread(newCount, want[letter]!)
    this.tried = this.extraNow()
    const read = (before - this.levelsAt(starts)) * QUADGRAM_STEP - SPREAD_WEIGHT * moved
    return read + (this.tried - this.extra)
  }

  /**
   * Accept the letter `try` wrote.
   *
   * @param symbol - Symbol number.
   * @param change - What `try` returned.
   */
  keep(symbol: number, change: number): void {
    const size = this.layout.positions[symbol]!.length
    this.counts[this.plainOf[symbol]!]! -= size
    const letter = this.plain[this.layout.positions[symbol]![0]!]!
    this.counts[letter]! += size
    this.plainOf[symbol] = letter
    this.extra = this.tried
    this.score += change
  }

  /**
   * Put back the letter a symbol had before `try`.
   *
   * @param symbol - Symbol number.
   */
  revert(symbol: number): void {
    this.write(symbol, this.plainOf[symbol]!)
  }

  /**
   * Write a letter at every place of a symbol.
   *
   * @param symbol - Symbol number.
   * @param letter - Letter code.
   */
  private write(symbol: number, letter: number): void {
    for (const place of this.layout.positions[symbol]!) this.plain[place] = letter
  }

  /**
   * The caller's score of the text as it stands.
   *
   * @returns {number} Nats to add to the score.
   */
  private extraNow(): number {
    return extraFit(this.layout.score, this.plain) * (this.plain.length - 3)
  }

  /**
   * Sum of the quadgram levels starting at the given places.
   *
   * @param starts - Quadgram starts.
   * @returns {number} The sum, lower reading more like English.
   */
  private levelsAt(starts: readonly number[]): number {
    let sum = 0
    for (const start of starts) sum += quadgramLevel(this.layout.levels, this.plain, start)
    return sum
  }
}

/**
 * A random letter per symbol, drawn by English frequency.
 *
 * @param symbols - How many symbols.
 * @param next - The generator.
 * @returns {number[]} Letter code per symbol.
 */
function randomMap(symbols: number, next: () => number): number[] {
  const shares = englishFrequencies()
  return Array.from({ length: symbols }, () => {
    let left = next()
    let letter = 0
    while (letter < 25 && (left -= shares[letter]!) > 0) letter++
    return letter
  })
}

/**
 * One annealing run from a random map.
 *
 * @param layout - The text and its symbol positions.
 * @param next - The generator.
 * @returns {number[]} The map the run cooled down to.
 */
function anneal(layout: Readonly<Layout>, next: () => number): number[] {
  const symbols = layout.positions.length
  const steps = Math.min(symbols * STEPS_PER_SYMBOL, MAX_STEPS)
  const annealer = new Annealer(layout, randomMap(symbols, next))
  for (let step = 0; step < steps; step++) {
    const symbol = Math.floor(next() * symbols)
    const shift = 1 + Math.floor(next() * 25)
    const change = annealer.try(symbol, (annealer.letterOf(symbol) + shift) % 26)
    const temperature = START_TEMPERATURE * (1 - step / steps)
    if (change < 0 && next() >= Math.exp(change / temperature)) {
      annealer.revert(symbol)
      continue
    }
    annealer.keep(symbol, change)
  }
  return annealer.map()
}

/**
 * Anneal a map from symbols to letters from several random starts.
 *
 * @param codes - Symbol numbers of the whole text, numbered from 0 in order of first appearance.
 * @param search - How the search runs.
 * @returns {number[][]} The map each start ended at; none under four symbols.
 * @throws {InvalidOptionError} When `score` gives no finite number.
 */
function homophonicMaps(codes: readonly number[], search: Readonly<HomophonicSearch>): number[][] {
  const sample = search.sample(codes)
  if (sample.length < 4) return []
  const shared = layout(sample, search.score)
  const next = mulberry32(search.seed)
  return Array.from({ length: search.starts }, () => anneal(shared, next))
}

/**
 * Fit the candidates' search reaches on the whole text shuffled: a many-to-one map's noise.
 *
 * @param codes - Symbol numbers of the whole text, numbered from 0 in order of first appearance.
 * @param search - The search the candidates came from.
 * @returns {number} Mean natural-log probability per quadgram of the shuffled text decoded.
 * @throws {InvalidOptionError} When `score` gives no finite number.
 */
export function homophonicNoiseFit(
  codes: readonly number[],
  search: Readonly<HomophonicSearch>,
): number {
  const next = mulberry32(search.seed ^ NOISE_SEED)
  const shuffled = [...codes]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(next() * (index + 1))
    ;[shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!]
  }
  const scores = homophonicMaps(shuffled, search).map((plainOf) => {
    const plain = shuffled.map((code) => plainOf[code]!)
    const { fit, rank } = scorePlain(plain)
    return { fit, rank: rank + extraFit(search.score, plain) }
  })
  return scores.reduce((best, score) => (score.rank > best.rank ? score : best)).fit
}

/**
 * Quadgram fit of decoded letters, and that fit less the letter count penalty.
 *
 * @param plain - Letter codes, at least four.
 * @returns {{ fit: number; rank: number }} The fit and the rank candidates sort by.
 */
function scorePlain(plain: readonly number[]): { fit: number; rank: number } {
  const counts = Array.from<number>({ length: 26 }).fill(0)
  for (const letter of plain) counts[letter]!++
  const want = englishFrequencies().map((share) => share * plain.length)
  const penalty = counts.reduce((sum, count, letter) => sum + spread(count, want[letter]!), 0)
  const fit = quadgramFit(quadgramLevels(), plain)
  return { fit, rank: fit - (SPREAD_WEIGHT * penalty) / (plain.length - 3) }
}

/**
 * Search a homophonic text and decode it with every distinct map found.
 *
 * @param stream - The text as symbol numbers.
 * @param search - How the search runs.
 * @returns {HomophonicCandidate[]} One candidate per distinct key.
 * @throws {InvalidOptionError} When `score` gives no finite number.
 */
export function homophonicCandidates(
  stream: Readonly<HomophonicStream>,
  search: Readonly<HomophonicSearch>,
): HomophonicCandidate[] {
  const found = new Map<string, HomophonicCandidate>()
  for (const plainOf of homophonicMaps(stream.codes, search)) {
    const candidate = homophonicCandidate(stream, plainOf)
    const extra = extraFit(
      search.score,
      stream.codes.map((code) => plainOf[code]!),
    )
    found.set(candidate.key, { ...candidate, rank: candidate.rank + extra })
  }
  return [...found.values()]
}

/**
 * Decode a whole homophonic text with one map and score it.
 *
 * @param stream - The text as symbol numbers.
 * @param plainOf - Letter code per symbol.
 * @returns {HomophonicCandidate} The key, map, decoded text and its scores.
 */
function homophonicCandidate(
  stream: Readonly<HomophonicStream>,
  plainOf: readonly number[],
): HomophonicCandidate {
  const plain = stream.codes.map((code) => plainOf[code]!)
  const { fit, rank } = scorePlain(plain)
  const groups = Array.from({ length: 26 }, (): string[] => [])
  stream.symbols.forEach((symbol, code) => groups[plainOf[code]!]!.push(symbol))
  return {
    key: groups
      .map((symbols, letter) => `${String.fromCodePoint(65 + letter)}=${symbols.join(' ')}`)
      .filter((_, letter) => groups[letter]!.length > 0)
      .join(', '),
    map: Object.fromEntries(
      stream.symbols.map((symbol, code) => [symbol, String.fromCodePoint(65 + plainOf[code]!)]),
    ),
    fit,
    text: plain.map((letter) => String.fromCodePoint(65 + letter)).join(''),
    rank,
  }
}
