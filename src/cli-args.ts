/**
 * If the first argument is not a known subcommand, prepend `encode`.
 *
 * @param argv - Raw command-line arguments.
 * @returns {string[]} Normalized arguments with an explicit subcommand.
 */
export function normalizeMainArgs(argv: readonly string[]): string[] {
  const subcommands = ['encode', 'decode', 'ciphers', 'info', 'brute', 'frequency', 'mcp']
  if (argv.length === 0) return ['ciphers']
  const first = argv[0]!.toLowerCase()
  if (subcommands.includes(first)) return [...argv]
  // If it looks like a cipher name, prepend encode
  return ['encode', ...argv]
}
