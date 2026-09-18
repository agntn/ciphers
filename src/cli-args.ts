/**
 * If the first argument is not a known subcommand, prepend `encode`.
 * The help and version flags stay where they are: citty answers them on the main command.
 *
 * @param argv - Raw command-line arguments.
 * @returns {string[]} Normalized arguments with an explicit subcommand.
 */
export function normalizeMainArgs(argv: readonly string[]): string[] {
  const subcommands = ['encode', 'decode', 'ciphers', 'info', 'brute', 'frequency', 'mcp']
  const builtinFlags = ['--help', '-h', '--version', '-v']
  if (argv.length === 0) return ['ciphers']
  const first = argv[0]!
  if (subcommands.includes(first.toLowerCase()) || builtinFlags.includes(first)) return [...argv]
  // If it looks like a cipher name, prepend encode
  return ['encode', ...argv]
}
