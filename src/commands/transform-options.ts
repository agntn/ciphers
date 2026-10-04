import { readFileSync } from 'node:fs'
import consola from 'consola'
import type { CipherBaseOptions } from '../core/types.ts'

export interface TransformOptionArgs {
  readonly shift?: string
  readonly key?: string
  readonly transposition?: string
  readonly blanks?: string
  readonly separator?: string
  readonly zero?: string
  readonly book?: string
  readonly bookFile?: string
  readonly address?: string
  readonly pick?: string
  readonly start?: string
  readonly iv?: string
  readonly tweak?: string
  readonly nonce?: string
  readonly aad?: string
  readonly counter?: string
  readonly rails?: string
  readonly width?: string
  readonly corner?: string
  readonly path?: string
  readonly period?: string
  readonly letters?: string
  readonly segment?: string
  readonly blockSize?: string
  readonly endian?: string
  readonly bytes?: string
  readonly tagLength?: string
  readonly digest?: string
  readonly keyLength?: string
  readonly iterations?: string
  readonly salt?: string
  readonly a?: string
  readonly b?: string
  readonly positions?: string
  readonly rings?: string
  readonly plugboard?: string
}

function parseInteger(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    consola.error(`Invalid --${name}: "${value}" is not an integer`)
    process.exit(1)
  }
  return parsed
}

/**
 * Read the book for the book cipher from a file.
 *
 * @param file - Path to the file.
 * @param book - The --book value, which must be absent.
 * @returns {string} The file as UTF-8 text.
 */
function readBookFile(file: string, book: string | undefined): string {
  if (book !== undefined) {
    consola.error('Use --book or --book-file, not both')
    process.exit(1)
  }
  try {
    return readFileSync(file, 'utf8')
  } catch (error) {
    consola.error(
      `Cannot read --book-file: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exit(1)
  }
}

/**
 * Parse the options shared by the encode and decode commands.
 *
 * @param args - Raw Citty option values.
 * @returns {CipherBaseOptions} Normalized cipher options.
 */
export function parseTransformOptions(args: Readonly<TransformOptionArgs>): CipherBaseOptions {
  const options: CipherBaseOptions = {}
  const integers = [
    ['shift', args.shift],
    ['rails', args.rails],
    ['width', args.width],
    ['period', args.period],
    ['letters', args.letters],
    ['segment', args.segment],
    ['blockSize', args.blockSize],
    ['tagLength', args.tagLength],
    ['keyLength', args.keyLength],
    ['iterations', args.iterations],
    ['counter', args.counter],
    ['a', args.a],
    ['b', args.b],
    ['start', args.start],
  ] as const
  for (const [name, value] of integers) {
    const parsed = parseInteger(value, name)
    if (parsed !== undefined) options[name] = parsed
  }

  const strings = [
    ['positions', args.positions],
    ['rings', args.rings],
    ['plugboard', args.plugboard],
    ['iv', args.iv],
    ['tweak', args.tweak],
    ['nonce', args.nonce],
    ['aad', args.aad],
    ['endian', args.endian],
    ['bytes', args.bytes],
    ['blanks', args.blanks],
    ['separator', args.separator],
    ['zero', args.zero],
    ['book', args.book],
    ['address', args.address],
    ['pick', args.pick],
    ['corner', args.corner],
    ['path', args.path],
    ['digest', args.digest],
    ['salt', args.salt],
  ] as const
  for (const [name, value] of strings) {
    if (value !== undefined) options[name] = value
  }
  if (args.bookFile !== undefined) options.book = readBookFile(args.bookFile, args.book)
  if (args.key) options.key = args.key
  if (args.transposition) options.transposition = args.transposition

  return options
}
