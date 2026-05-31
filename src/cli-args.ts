/** If first arg is not a known subcommand, prepend 'encode' as default. */
export function normalizeMainArgs(argv: string[]): string[] {
  const subcommands = ['encode', 'decode', 'ciphers', 'info', 'brute', 'frequency']
  if (argv.length === 0) return ['ciphers']
  const first = argv[0].toLowerCase()
  if (subcommands.includes(first)) return argv
  // If it looks like a cipher name, prepend encode
  return ['encode', ...argv]
}
