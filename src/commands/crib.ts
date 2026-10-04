import { styleText } from 'node:util'
import { defineCommand } from 'citty'
import consola from 'consola'
import {
  DEFAULT_CRIB_LIMIT,
  dragCrib,
  showCribBytes,
  type CribDrag,
  type CribPlacement,
} from '../core/crib.ts'
import { InvalidOptionError } from '../core/errors.ts'

/**
 * Whether a parsed JSON value is one placement.
 *
 * @param value - One entry of the parsed `--known`.
 * @returns {boolean} Whether it has a numeric message and offset and a string text.
 */
function isPlacement(value: unknown): value is CribPlacement {
  if (typeof value !== 'object' || value === null) return false
  if (!('message' in value && 'offset' in value && 'text' in value)) return false
  return (
    typeof value.message === 'number' &&
    typeof value.offset === 'number' &&
    typeof value.text === 'string'
  )
}

/**
 * Read `--known`: a JSON array of placements, the same shape as the tool's `known`.
 *
 * @param raw - The flag as typed.
 * @returns {CribPlacement[]} The placements, none when the flag is left out.
 * @throws {InvalidOptionError} When it is not JSON or not an array of placements.
 */
function parseKnown(raw: string | undefined): CribPlacement[] {
  if (raw === undefined) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = undefined
  }
  if (!Array.isArray(parsed) || !parsed.every((entry) => isPlacement(entry))) {
    throw new InvalidOptionError(
      'known',
      'JSON',
      'must be a JSON array of {"message": 0, "offset": 0, "text": "..."}',
    )
  }
  return parsed
}

/**
 * Read `--limit`, the default when it's left out.
 *
 * @param raw - The flag as typed.
 * @returns {number} How many places to print.
 * @throws {InvalidOptionError} When it isn't a whole number of at least 1.
 */
function parseLimit(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_CRIB_LIMIT
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new InvalidOptionError('limit', raw, 'must be an integer of at least 1')
  }
  return Number(raw)
}

/**
 * Print the ranked places of the crib.
 *
 * @param drag - The drag's result.
 * @param crib - The crib as typed.
 * @param count - How many ciphertexts there are.
 */
function printPlaces(drag: CribDrag, crib: string, count: number): void {
  const shown = showCribBytes([...new TextEncoder().encode(crib)])
  if (drag.total === 0) {
    consola.warn(`Crib "${shown}" fits no new place`)
    return
  }
  consola.info(
    `${styleText('bold', 'Crib drag')} "${shown}" across ${count} ciphertexts (lang=${drag.language}), ${drag.total} places, most readable first:\n`,
  )
  drag.candidates.forEach(({ message, offset, score, reveals }, index) => {
    const read = reveals
      .map((reveal) => `#${reveal.message} "${showCribBytes(reveal.bytes)}"`)
      .join(', ')
    consola.log(`  ${index + 1}. #${message} at ${offset} (score ${score.toFixed(2)}): ${read}`)
  })
  consola.log('')
}

/**
 * Print the key and plaintexts the known placements give.
 *
 * @param drag - The drag's result.
 */
function printKnown(drag: CribDrag): void {
  if (drag.key.every((byte) => byte === undefined)) {
    consola.info(
      'Nothing known yet: accept a place with --known \'[{"message":0,"offset":0,"text":"..."}]\'',
    )
    return
  }
  const key = drag.key
    .map((byte) => (byte === undefined ? '??' : byte.toString(16).padStart(2, '0')))
    .join('')
  consola.info(`Key (?? unknown): ${key}`)
  consola.info('Plaintexts (· unknown):')
  drag.plaintexts.forEach((bytes, message) => {
    consola.log(`  #${message} "${showCribBytes(bytes)}"`)
  })
}

export default defineCommand({
  meta: {
    name: 'crib',
    description:
      'Drag a crib across hex ciphertexts XORed with one reused key (most readable places first)',
  },
  args: {
    ciphertexts: {
      type: 'positional',
      description: 'Two or more ciphertexts in hex, encrypted under the same keystream',
      required: true,
    },
    crib: { type: 'string', description: 'Plaintext guess to slide across them', alias: 'c' },
    known: {
      type: 'string',
      description: 'Places accepted so far, a JSON array of {"message", "offset", "text"}',
    },
    lang: {
      type: 'string',
      description: 'Language the plaintexts read in (en, pl, ja for Hepburn romaji)',
      alias: 'l',
      default: 'en',
    },
    limit: { type: 'string', description: `Places to print (default ${DEFAULT_CRIB_LIMIT})` },
  },
  async run({ args }) {
    if (args.lang !== 'en' && args.lang !== 'pl' && args.lang !== 'ja') {
      throw new InvalidOptionError('lang', args.lang, 'must be en, pl or ja')
    }
    const ciphertexts = args._.map(String)
    const drag = dragCrib(ciphertexts, {
      ...(args.crib === undefined ? {} : { crib: args.crib }),
      known: parseKnown(args.known),
      language: args.lang,
      limit: parseLimit(args.limit),
    })
    if (args.crib !== undefined) printPlaces(drag, args.crib, ciphertexts.length)
    printKnown(drag)
  },
})
