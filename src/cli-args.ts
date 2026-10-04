/**
 * If the first argument is not a known subcommand, prepend `encode`.
 * The help and version flags stay where they are: citty answers them on the main command.
 *
 * @param argv - Raw command-line arguments.
 * @returns {string[]} Normalized arguments with an explicit subcommand.
 */
export function normalizeMainArgs(argv: readonly string[]): string[] {
  const subcommands = [
    'encode',
    'decode',
    'ciphers',
    'info',
    'brute',
    'frequency',
    'period',
    'guess',
    'probe',
    'crib',
    'hidden',
    'recover',
    'mcp',
  ]
  const builtinFlags = ['--help', '-h', '--version', '-v']
  if (argv.length === 0) return ['ciphers']
  const first = argv[0]!
  if (subcommands.includes(first.toLowerCase()) || builtinFlags.includes(first)) return [...argv]
  // If it looks like a cipher name, prepend encode
  return ['encode', ...argv]
}

/** The fields of a citty argument that tell an option from text. */
type Declared = Readonly<{ type?: string; alias?: string | readonly string[] }>

/** The arguments after a subcommand, ready for citty, or the dashed one that names no option. */
export type Separated = { readonly args: readonly string[] } | { readonly unknown: string }

/**
 * Maps every name citty takes for an option of the command to whether it takes a value.
 *
 * @param defs - The command's argument definitions.
 * @returns {Record<string, boolean>} Names, both spellings, aliases, `no-` forms, help and version.
 */
function optionNames(defs: Readonly<Record<string, Declared>>): Record<string, boolean> {
  const names: Record<string, boolean> = { help: false, h: false, version: false, v: false }
  for (const [key, def] of Object.entries(defs)) {
    if (def.type === 'positional') continue
    const kebab = key.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
    for (const name of [key, kebab, ...[def.alias ?? []].flat()]) {
      names[name] = def.type !== 'boolean'
      names[`no-${name}`] = false
    }
  }
  return names
}

/**
 * Reads a group of short options the way `util.parseArgs` does: a value-taking one ends the group.
 *
 * @param letters - The group without its leading `-`.
 * @param names - What `optionNames` returned.
 * @returns {boolean | undefined} Whether the next argument is a value, `undefined` for text.
 */
function shortGroup(
  letters: string,
  names: Readonly<Record<string, boolean>>,
): boolean | undefined {
  for (let index = 0; index < letters.length; index++) {
    const letter = letters.charAt(index)
    if (!Object.hasOwn(names, letter)) return undefined
    if (names[letter] === true) return index === letters.length - 1
  }
  return false
}

/**
 * Tells whether an argument is an option and whether it takes the next argument as its value.
 *
 * @param arg - One argument.
 * @param names - What `optionNames` returned.
 * @returns {boolean | undefined} `undefined` for text: no dash, a lone `-`, or no such option.
 */
function takesValue(arg: string, names: Readonly<Record<string, boolean>>): boolean | undefined {
  if (arg === '-' || !arg.startsWith('-')) return undefined
  if (!arg.startsWith('--')) return shortGroup(arg.slice(1), names)
  const [name = '', ...value] = arg.slice(2).split('=')
  if (!Object.hasOwn(names, name)) return undefined
  return names[name] === true && value.length === 0
}

/**
 * Puts the text after `--`, since citty reads `-.-. .- -` as short flags. Dashed text fills a free
 * positional, and with none left it's an unknown option.
 *
 * @param args - The arguments after the subcommand name.
 * @param defs - The subcommand's argument definitions.
 * @returns {Separated} The options, then `--` and the text, or the argument that fits nowhere.
 */
export function separateText(
  args: readonly string[],
  defs: Readonly<Record<string, Declared>>,
): Separated {
  const names = optionNames(defs)
  const slots = Object.values(defs).filter((def) => def.type === 'positional').length
  const options: string[] = []
  const texts: string[] = []
  let value = false
  for (const [index, arg] of args.entries()) {
    if (value) {
      options.push(arg)
      value = false
      continue
    }
    if (arg === '--') {
      texts.push(...args.slice(index + 1))
      break
    }
    const valued = takesValue(arg, names)
    if (valued !== undefined) {
      options.push(arg)
      value = valued
      continue
    }
    if (arg.startsWith('-') && arg !== '-' && texts.length >= slots) return { unknown: arg }
    texts.push(arg)
  }
  return { args: texts.length === 0 ? options : [...options, '--', ...texts] }
}

/**
 * Quotes an argument for a one line error, with every `Cc`, `Cf`, `Zl` and `Zp` character escaped.
 *
 * @param arg - The argument as the shell passed it.
 * @returns {string} At most 40 graphemes of it, quoted.
 */
export function shownArgument(arg: string): string {
  const graphemes = Array.from(new Intl.Segmenter().segment(arg), ({ segment }) => segment)
  const cut = graphemes.length > 40 ? `${graphemes.slice(0, 40).join('')}…` : arg
  return JSON.stringify(cut).replaceAll(
    /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu,
    (char) => `\\u{${char.codePointAt(0)!.toString(16)}}`,
  )
}
