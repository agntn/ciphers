import consola from 'consola'
import type { CipherBaseOptions } from '../core/types'

export interface TransformOptionArgs {
  readonly shift?: string
  readonly key?: string
  readonly rails?: string
  readonly period?: string
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
    ['period', args.period],
    ['a', args.a],
    ['b', args.b],
  ] as const
  for (const [name, value] of integers) {
    const parsed = parseInteger(value, name)
    if (parsed !== undefined) options[name] = parsed
  }

  const strings = [
    ['positions', args.positions],
    ['rings', args.rings],
    ['plugboard', args.plugboard],
  ] as const
  for (const [name, value] of strings) {
    if (value !== undefined) options[name] = value
  }
  if (args.key) options.key = args.key

  return options
}
