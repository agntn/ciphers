import {
  asciiLookalikes,
  characterNames,
  confusablePrototypes,
  unicodeScripts,
} from './confusables.ts'
import { InvalidOptionError } from './errors.ts'

/** Why a character is on the list. */
export const characterKinds = ['invisible', 'lookalike', 'combining', 'script'] as const

export type CharacterKind = (typeof characterKinds)[number]

/** One character that is not what the text around it makes it look like. */
export interface SuspiciousCharacter {
  readonly character: string
  readonly codePoint: number
  /** Place in the text counted in code points, 1 the first. */
  readonly position: number
  readonly kind: CharacterKind
  /** Unicode script, such as `Cyrillic`, or `Common` and `Inherited`. */
  readonly script: string
  /** Unicode name, for invisible characters and lookalikes; other letters go by `script` alone. */
  readonly name?: string
  /** The ASCII it is taken for, `o` for a Cyrillic U+043E. */
  readonly lookalike?: string
}

/** A word whose letters come from scripts that no writing system mixes. */
export interface MixedScriptWord {
  readonly word: string
  /** Place of its first character, counted like `SuspiciousCharacter.position`. */
  readonly position: number
  /** Scripts of its letters, in the order they first show up. */
  readonly scripts: readonly string[]
  /** `confusableSkeleton` of the word, equal for two words that look alike. */
  readonly skeleton: string
}

/** What `inspectCharacters` found in one text. */
export interface CharacterReport {
  /** The script the text was held against. */
  readonly script: string
  readonly characters: readonly SuspiciousCharacter[]
  readonly words: readonly MixedScriptWord[]
  /** The listed characters on their own, in order, since they can be the message. */
  readonly sequence: string
}

/** How `inspectCharacters` reads a text. */
export interface InspectCharactersOptions {
  /** Unicode script of the text, such as `Latin`. Default: the one most letters share. */
  readonly script?: string
}

/** Scripts one writing system uses side by side: Japanese, Korean and Chinese. */
const WRITING_SYSTEMS: ReadonlyArray<readonly string[]> = [
  ['Han', 'Hiragana', 'Katakana'],
  ['Han', 'Hangul'],
  ['Han', 'Bopomofo'],
]

let scriptTests: ReadonlyArray<readonly [name: string, test: RegExp]> | undefined

/**
 * One test per script this runtime knows; an engine on older Unicode skips the newest.
 *
 * @returns {ReadonlyArray<readonly [string, RegExp]>} Script names with their tests, Latin first.
 */
function scriptTable(): ReadonlyArray<readonly [name: string, test: RegExp]> {
  scriptTests ??= unicodeScripts().flatMap((name) => {
    try {
      return [[name, new RegExp(String.raw`^\p{Script=${name}}$`, 'u')] as const]
    } catch {
      return []
    }
  })
  return scriptTests
}

/** Looks up the Unicode script of one character. */
type ScriptLookup = (character: string) => string

/**
 * A script lookup that remembers every character it has seen.
 *
 * @returns {ScriptLookup} One code point in, its script name out, `Unknown` when unassigned.
 */
function scriptLookup(): ScriptLookup {
  const known = new Map<string, string>()
  return (character) => {
    let script = known.get(character)
    if (script === undefined) {
      script = scriptTable().find(([, test]) => test.test(character))?.[0] ?? 'Unknown'
      known.set(character, script)
    }
    return script
  }
}

/**
 * Whether two scripts belong in one text.
 *
 * @param left - A script name.
 * @param right - Another.
 * @returns {boolean} True for the same script and for two of one writing system.
 */
function sameWriting(left: string, right: string): boolean {
  if (left === right) return true
  return WRITING_SYSTEMS.some((system) => system.includes(left) && system.includes(right))
}

/**
 * The script most letters of a text share.
 *
 * @param text - Any text.
 * @param scriptOf - The script lookup.
 * @returns {string} The commonest script, the first seen on a tie, `Latin` without letters.
 */
function dominantScript(text: string, scriptOf: ScriptLookup): string {
  const counts = new Map<string, number>()
  for (const [letter] of text.matchAll(/\p{L}/gu)) {
    const script = scriptOf(letter)
    if (script !== 'Common' && script !== 'Inherited') {
      counts.set(script, (counts.get(script) ?? 0) + 1)
    }
  }
  let best = 'Latin'
  let most = 0
  for (const [script, count] of counts) {
    if (count > most) {
      best = script
      most = count
    }
  }
  return best
}

/**
 * Resolve the `script` option to the name the script tests use.
 *
 * @param script - The option as given.
 * @returns {string} The script name in Unicode's spelling.
 * @throws {InvalidOptionError} When it is not a script name.
 */
function expectedScript(script: unknown): string {
  const wanted = typeof script === 'string' ? script.trim().replaceAll(/[\s-]+/g, '_') : ''
  const name = unicodeScripts().find((known) => known.toLowerCase() === wanted.toLowerCase())
  if (name === undefined || name === 'Common' || name === 'Inherited') {
    throw new InvalidOptionError(
      'script',
      script,
      'must be a Unicode script such as Latin, Cyrillic or Greek',
    )
  }
  return name
}

/**
 * Whether a character shows nothing: a default ignorable, a format or control character or a
 * space other than U+0020. Tab, line feed and carriage return are ordinary.
 *
 * @param character - One code point.
 * @returns {boolean} True when it is invisible.
 */
function isInvisible(character: string): boolean {
  if (/^[ \t\n\r]$/.test(character)) return false
  return /^[\p{Default_Ignorable_Code_Point}\p{Cf}\p{Cc}\p{Zs}\p{Zl}\p{Zp}]$/u.test(character)
}

/**
 * Why a visible character of another script does not belong, if it does not.
 *
 * @param character - One code point.
 * @param script - Its script, neither the text's nor `Inherited`.
 * @param expected - The script of the text.
 * @returns {CharacterKind | undefined} `lookalike`, `script` or nothing.
 */
function foreignKind(
  character: string,
  script: string,
  expected: string,
): CharacterKind | undefined {
  const foreign = !sameWriting(script, expected)
  if (asciiLookalikes().has(character.codePointAt(0) ?? 0)) {
    return foreign || expected === 'Latin' ? 'lookalike' : undefined
  }
  if (!foreign || script === 'Common') return undefined
  return /[\p{L}\p{N}\p{M}]/u.test(character) ? 'script' : undefined
}

/**
 * Why a character does not belong, if it does not.
 *
 * @param character - One code point.
 * @param script - Its script.
 * @param expected - The script of the text.
 * @returns {CharacterKind | undefined} The kind, or nothing for an ordinary character.
 */
function kindOf(character: string, script: string, expected: string): CharacterKind | undefined {
  if (isInvisible(character)) return 'invisible'
  if (script === 'Inherited') return /\p{M}/u.test(character) ? 'combining' : undefined
  return foreignKind(character, script, expected)
}

/**
 * The Unicode name of a listed character, where the table or a rule has one.
 *
 * @param codePoint - Its code point.
 * @returns {string | undefined} The name.
 */
function nameOf(codePoint: number): string | undefined {
  if (codePoint >= 0xfe00 && codePoint <= 0xfe0f) return `VARIATION SELECTOR-${codePoint - 0xfdff}`
  if (codePoint >= 0xe0100 && codePoint <= 0xe01ef) {
    return `VARIATION SELECTOR-${codePoint - 0xe00ef}`
  }
  return characterNames().get(codePoint)
}

/**
 * The UTF-16 offsets inside emoji, whose joiners and variation selectors are doing their job.
 *
 * @param text - Any text.
 * @returns {Set<number>} Offsets of every code unit of every emoji sequence.
 */
function emojiOffsets(text: string): Set<number> {
  const offsets = new Set<number>()
  for (const match of text.matchAll(/\p{RGI_Emoji}/gv)) {
    for (let offset = match.index; offset < match.index + match[0].length; offset++) {
      offsets.add(offset)
    }
  }
  return offsets
}

/**
 * The words of a text whose letters mix scripts.
 *
 * @param text - Any text.
 * @param positions - Code point position of each UTF-16 offset.
 * @param scriptOf - The script lookup.
 * @returns {MixedScriptWord[]} The words in order, punctuation around them dropped.
 */
function mixedScriptWords(
  text: string,
  positions: ArrayLike<number>,
  scriptOf: ScriptLookup,
): MixedScriptWord[] {
  const words: MixedScriptWord[] = []
  for (const match of text.matchAll(/[\p{L}\p{N}](?:\S*[\p{L}\p{N}\p{M}])?/gu)) {
    const [word] = match
    const scripts = new Set<string>()
    for (const [letter] of word.matchAll(/\p{L}/gu)) {
      const script = scriptOf(letter)
      if (script !== 'Common' && script !== 'Inherited') scripts.add(script)
    }
    const names = Array.from(scripts)
    const oneSystem = WRITING_SYSTEMS.some((system) => names.every((name) => system.includes(name)))
    if (names.length > 1 && !oneSystem) {
      words.push({
        word,
        position: positions[match.index] ?? 0,
        scripts: names,
        skeleton: confusableSkeleton(word),
      })
    }
  }
  return words
}

/**
 * One entry of the list.
 *
 * @param character - One code point.
 * @param place - Its kind, its script and where it sits.
 * @returns {SuspiciousCharacter} The entry, with a name and a lookalike where there is one.
 */
function listedCharacter(
  character: string,
  place: Readonly<Pick<SuspiciousCharacter, 'kind' | 'script' | 'position'>>,
): SuspiciousCharacter {
  const codePoint = character.codePointAt(0) ?? 0
  const name = nameOf(codePoint)
  const lookalike = place.kind === 'invisible' ? undefined : asciiLookalikes().get(codePoint)
  return {
    character,
    codePoint,
    ...place,
    ...(name === undefined ? {} : { name }),
    ...(lookalike === undefined ? {} : { lookalike }),
  }
}

/**
 * Refuse anything but a string, which a typed caller never passes and a JavaScript one can.
 *
 * @param text - The value given as text.
 * @throws {InvalidOptionError} When it is not a string.
 */
function assertText(text: unknown): asserts text is string {
  if (typeof text !== 'string') throw new InvalidOptionError('text', text, 'must be a string')
}

/**
 * The UTS #39 skeleton of a text, equal for two texts that look alike. For comparing, never for
 * display: the fold also turns `m` into `rn` and `1` into `l`.
 *
 * @param text - Any text.
 * @returns {string} The skeleton.
 * @throws {InvalidOptionError} When `text` is not a string.
 */
export function confusableSkeleton(text: string): string {
  assertText(text)
  const prototypes = confusablePrototypes()
  const visible = text.normalize('NFD').replaceAll(/\p{Default_Ignorable_Code_Point}/gu, '')
  let folded = ''
  for (const character of visible) {
    folded += prototypes.get(character.codePointAt(0) ?? 0) ?? character
  }
  return folded.normalize('NFD')
}

/**
 * List the characters of a text that are not what they seem. Joiners and variation selectors
 * inside an emoji are left alone.
 *
 * @param text - Text to check.
 * @param options - The script to hold it against, when the commonest one is the wrong guess.
 * @returns {CharacterReport} The characters, the words that mix scripts and the sequence.
 * @throws {InvalidOptionError} When `text` is not a string or `script` is not a Unicode script.
 */
export function inspectCharacters(
  text: string,
  options: Readonly<InspectCharactersOptions> = {},
): CharacterReport {
  assertText(text)
  const scriptOf = scriptLookup()
  const expected =
    options.script === undefined ? dominantScript(text, scriptOf) : expectedScript(options.script)
  const emoji = emojiOffsets(text)
  const positions = new Uint32Array(text.length + 1)
  const characters: SuspiciousCharacter[] = []
  let offset = 0
  let position = 0
  for (const character of text) {
    position += 1
    positions[offset] = position
    const script = scriptOf(character)
    const kind = emoji.has(offset) ? undefined : kindOf(character, script, expected)
    offset += character.length
    if (kind !== undefined) characters.push(listedCharacter(character, { kind, script, position }))
  }
  return {
    script: expected,
    characters,
    words: mixedScriptWords(text, positions, scriptOf),
    sequence: characters.map(({ character }) => character).join(''),
  }
}
