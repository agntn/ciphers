import { styleText } from 'node:util'
import { defineCommand } from 'citty'
import consola from 'consola'
import { InvalidOptionError } from '../core/errors.ts'
import { probePassphrase, type PassphraseProbeHit } from '../core/passphrase-probe.ts'
import { quotedPreview } from '../tool-operations.ts'

/**
 * Read a comma-separated flag, nothing when it's left out.
 *
 * @param raw - The flag as typed.
 * @returns {string[] | undefined} The values, trimmed.
 */
function parseList(raw: string | undefined): string[] | undefined {
  return raw === undefined ? undefined : raw.split(',').map((value) => value.trim())
}

/**
 * Read a comma-separated flag of whole numbers.
 *
 * @param raw - The flag as typed.
 * @param name - The flag's name, for the error.
 * @returns {number[] | undefined} The numbers, nothing when the flag is left out.
 * @throws {InvalidOptionError} When a value isn't a whole number.
 */
function parseNumbers(raw: string | undefined, name: string): number[] | undefined {
  const values = parseList(raw)
  if (values?.some((value) => !/^\d+$/.test(value))) {
    throw new InvalidOptionError(name, raw, 'must be whole numbers separated by commas')
  }
  return values?.map(Number)
}

/**
 * One hit as the CLI prints it: settings, padding, printable share and the start of the text.
 *
 * @param hit - A setting whose padding held.
 * @returns {string} The line.
 */
function hitLine(hit: PassphraseProbeHit): string {
  const settings = `--digest ${hit.digest} --key-length ${hit.keyLength} --iterations ${hit.iterations}`
  const reading =
    hit.text === undefined ? `not UTF-8, hex ${hit.hex.slice(0, 32)}` : quotedPreview(hit.text, 60)
  return `  ${styleText('bold', settings)}  pad ${hit.padLength}  ${Math.round(hit.printable * 100)}% printable  ${reading}`
}

export default defineCommand({
  meta: {
    name: 'probe',
    description:
      'Try a passphrase on a Salted__ blob across digests, key lengths and iterations (padding hits against chance)',
  },
  args: {
    text: { type: 'positional', description: 'Base64 starting U2FsdGVkX1', required: true },
    key: { type: 'string', description: 'The passphrase to try', alias: 'k', required: true },
    digests: {
      type: 'string',
      description: 'Hashes to try, comma-separated: md5, sha1, sha256 (default all three)',
    },
    keyLengths: {
      type: 'string',
      description:
        'Key lengths in bits, comma-separated, 128 to 1024 in steps of 32 (default 128,192,256)',
    },
    iterations: {
      type: 'string',
      description: 'Hash passes per derived block, comma-separated, 1 to 100000 (default 1)',
    },
  },
  async run({ args }) {
    const probe = probePassphrase(args.text, args.key, {
      digests: parseList(args.digests),
      keyLengths: parseNumbers(args.keyLengths, 'key-lengths'),
      iterations: parseNumbers(args.iterations, 'iterations'),
    })
    const expected = `about ${Number(probe.expected.toPrecision(2))} expected by chance`
    if (probe.hits.length === 0) {
      consola.warn(
        `Padding held in none of ${probe.tries} tries (${expected}): wrong passphrase, settings outside the grid, or openssl enc -pbkdf2, which this format does not take`,
      )
      return
    }
    consola.info(
      `${styleText('bold', 'Passphrase probe')} (salt ${probe.salt}): padding held in ${probe.hits.length} of ${probe.tries} tries, ${expected}. Most printable first:\n`,
    )
    for (const hit of probe.hits) consola.log(hitLine(hit))
    consola.log('')
    consola.info('A wrong setting passes padding about once in 255 tries, nearly always with pad 1')
    consola.info(
      `Next: ciphers decode aes-passphrase "<text>" --key <passphrase> and a hit's flags`,
    )
  },
})
