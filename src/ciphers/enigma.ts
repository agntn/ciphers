import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import { getOpt } from '../core/utils'
import { InvalidOptionError, normalizeError } from '../core/errors'
import { register } from '../core/registry'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ROTORS = [
  { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
] as const
const REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT'

function stringOption(
  options: Readonly<CipherBaseOptions>,
  name: string,
  fallback: string,
): string {
  const value = getOpt<unknown>(options, name, fallback)
  if (typeof value !== 'string') throw new InvalidOptionError(name, value, 'must be a string')
  return value
}

function parseLetters(value: string, name: string): { normalized: string; values: number[] } {
  if (!/^[A-Za-z]{3}$/.test(value))
    throw new InvalidOptionError(name, value, 'must be exactly three letters A-Z')
  const normalized = value.toUpperCase()
  return { normalized, values: Array.from(normalized, (letter) => letter.codePointAt(0)! - 65) }
}

function parsePlugboard(value: string): { normalized: string; wiring: number[] } {
  const wiring = Array.from({ length: 26 }, (_, index) => index)
  if (value === '') return { normalized: '', wiring }

  const used = new Set<string>()
  for (const rawPair of value.split(/\s+/)) {
    if (!/^[A-Za-z]{2}$/.test(rawPair) || rawPair[0]!.toUpperCase() === rawPair[1]!.toUpperCase()) {
      throw new InvalidOptionError(
        'plugboard',
        value,
        'must contain distinct letter pairs such as "AB CD"',
      )
    }
    const pair = rawPair.toUpperCase()
    const [a, b] = pair
    if (used.has(a!) || used.has(b!)) {
      throw new InvalidOptionError('plugboard', value, 'each letter may occur in at most one pair')
    }
    used.add(a!)
    used.add(b!)
    const ai = a!.codePointAt(0)! - 65
    const bi = b!.codePointAt(0)! - 65
    wiring[ai] = bi
    wiring[bi] = ai
  }
  return { normalized: value.toUpperCase(), wiring }
}

type RotorPositions = readonly [number, number, number]

interface EnigmaConfig {
  readonly positions: readonly number[]
  readonly rings: readonly number[]
  readonly plugboard: readonly number[]
  readonly preserveCase: boolean
  readonly stripNonAlpha: boolean
  readonly resultOptions: Readonly<Record<string, unknown>>
}

function parseConfig(options: Readonly<CipherBaseOptions>): EnigmaConfig {
  const positions = parseLetters(stringOption(options, 'positions', 'AAA'), 'positions')
  const rings = parseLetters(stringOption(options, 'rings', 'AAA'), 'rings')
  const plugboard = parsePlugboard(stringOption(options, 'plugboard', '').trim())
  return {
    positions: positions.values,
    rings: rings.values,
    plugboard: plugboard.wiring,
    preserveCase: options.preserveCase ?? true,
    stripNonAlpha: options.stripNonAlpha ?? false,
    resultOptions: {
      positions: positions.normalized,
      rings: rings.normalized,
      plugboard: plugboard.normalized,
    },
  }
}

function mod26(value: number): number {
  return ((value % 26) + 26) % 26
}

function throughRotor(
  value: number,
  rotorIndex: number,
  position: number,
  ring: number,
  reverse: boolean,
): number {
  const wiring = ROTORS[rotorIndex]!.wiring
  const shifted = mod26(value + position - ring)
  const wired = reverse ? wiring.indexOf(ALPHABET[shifted]!) : wiring.codePointAt(shifted)! - 65
  return mod26(wired - position + ring)
}

function stepRotors(positions: RotorPositions): RotorPositions {
  const middleAtNotch = positions[1] === ROTORS[1].notch.codePointAt(0)! - 65
  const rightAtNotch = positions[2] === ROTORS[2].notch.codePointAt(0)! - 65
  return [
    middleAtNotch ? mod26(positions[0] + 1) : positions[0],
    middleAtNotch || rightAtNotch ? mod26(positions[1] + 1) : positions[1],
    mod26(positions[2] + 1),
  ]
}

function transformLetter(
  character: string,
  positions: RotorPositions,
  config: EnigmaConfig,
): string {
  const input = character.toUpperCase().codePointAt(0)! - 65
  let value = config.plugboard[input]!
  for (let rotor = 2; rotor >= 0; rotor--)
    value = throughRotor(value, rotor, positions[rotor]!, config.rings[rotor]!, false)
  value = REFLECTOR_B.codePointAt(value)! - 65
  for (let rotor = 0; rotor < 3; rotor++)
    value = throughRotor(value, rotor, positions[rotor]!, config.rings[rotor]!, true)
  value = config.plugboard[value]!

  const encoded = ALPHABET[value]!
  const isLower = character >= 'a' && character <= 'z'
  return config.preserveCase && isLower ? encoded.toLowerCase() : encoded
}

function transform(text: string, config: EnigmaConfig): string {
  let positions: RotorPositions = [config.positions[0]!, config.positions[1]!, config.positions[2]!]
  let output = ''

  for (const character of text) {
    const isAsciiLetter =
      (character >= 'A' && character <= 'Z') || (character >= 'a' && character <= 'z')
    if (!isAsciiLetter) {
      if (!config.stripNonAlpha) output += character
      continue
    }
    positions = stepRotors(positions)
    output += transformLetter(character, positions, config)
  }

  return output
}

class Enigma extends Cipher {
  name(): string {
    return 'enigma'
  }

  info(): CipherInfo {
    return {
      name: 'enigma',
      label: 'Enigma M3',
      description: 'Wehrmacht Enigma M3 with rotors I-II-III and reflector B',
      family: 'rotor',
      selfInverse: true,
      options: [
        {
          name: 'positions',
          type: 'string',
          required: false,
          default: 'AAA',
          description: 'Initial rotor positions, left to right',
        },
        {
          name: 'rings',
          type: 'string',
          required: false,
          default: 'AAA',
          description: 'Ring settings, left to right',
        },
        {
          name: 'plugboard',
          type: 'string',
          required: false,
          default: '',
          description: 'Space-separated letter pairs, for example "AV BS CG"',
        },
      ],
      keyspace: '26^6 × plugboard configurations',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const config = parseConfig(options ?? {})
      return {
        text: transform(text, config),
        cipher: 'enigma',
        operation: 'encode',
        options: config.resultOptions,
      }
    } catch (error) {
      throw normalizeError(error, 'enigma')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const config = parseConfig(options ?? {})
      return {
        text: transform(text, config),
        cipher: 'enigma',
        operation: 'decode',
        options: config.resultOptions,
      }
    } catch (error) {
      throw normalizeError(error, 'enigma')
    }
  }
}

register('enigma', Enigma)
