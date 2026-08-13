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

function stringOption(options: CipherBaseOptions, name: string, fallback: string): string {
  const value = getOpt<unknown>(options, name, fallback)
  if (typeof value !== 'string') throw new InvalidOptionError(name, value, 'must be a string')
  return value
}

function parseLetters(options: CipherBaseOptions, name: string, fallback: string): number[] {
  const value = stringOption(options, name, fallback)
  if (!/^[A-Za-z]{3}$/.test(value)) throw new InvalidOptionError(name, value, 'must be exactly three letters A-Z')
  return Array.from(value.toUpperCase(), (letter) => letter.charCodeAt(0) - 65)
}

function parsePlugboard(options: CipherBaseOptions): number[] {
  const wiring = Array.from({ length: 26 }, (_, index) => index)
  const value = stringOption(options, 'plugboard', '').trim()
  if (value === '') return wiring

  const used = new Set<string>()
  for (const rawPair of value.split(/\s+/)) {
    if (!/^[A-Za-z]{2}$/.test(rawPair) || rawPair[0]!.toUpperCase() === rawPair[1]!.toUpperCase()) {
      throw new InvalidOptionError('plugboard', value, 'must contain distinct letter pairs such as "AB CD"')
    }
    const pair = rawPair.toUpperCase()
    const [a, b] = pair
    if (used.has(a!) || used.has(b!)) {
      throw new InvalidOptionError('plugboard', value, 'each letter may occur in at most one pair')
    }
    used.add(a!)
    used.add(b!)
    const ai = a!.charCodeAt(0) - 65
    const bi = b!.charCodeAt(0) - 65
    wiring[ai] = bi
    wiring[bi] = ai
  }
  return wiring
}

function mod26(value: number): number {
  return ((value % 26) + 26) % 26
}

function throughRotor(value: number, rotorIndex: number, position: number, ring: number, reverse: boolean): number {
  const wiring = ROTORS[rotorIndex]!.wiring
  const shifted = mod26(value + position - ring)
  const wired = reverse ? wiring.indexOf(ALPHABET[shifted]!) : wiring.charCodeAt(shifted) - 65
  return mod26(wired - position + ring)
}

function transform(text: string, options: CipherBaseOptions): string {
  const positions = parseLetters(options, 'positions', 'AAA')
  const rings = parseLetters(options, 'rings', 'AAA')
  const plugboard = parsePlugboard(options)
  const stripNonAlpha = options.stripNonAlpha ?? false
  const preserveCase = options.preserveCase ?? true
  let output = ''

  for (const character of text) {
    const isUpper = character >= 'A' && character <= 'Z'
    const isLower = character >= 'a' && character <= 'z'
    if (!isUpper && !isLower) {
      if (!stripNonAlpha) output += character
      continue
    }
    const input = (isUpper ? character : character.toUpperCase()).charCodeAt(0) - 65

    const middleAtNotch = positions[1] === ROTORS[1].notch.charCodeAt(0) - 65
    const rightAtNotch = positions[2] === ROTORS[2].notch.charCodeAt(0) - 65
    if (middleAtNotch) positions[0] = mod26(positions[0]! + 1)
    if (middleAtNotch || rightAtNotch) positions[1] = mod26(positions[1]! + 1)
    positions[2] = mod26(positions[2]! + 1)

    let value = plugboard[input]!
    for (let rotor = 2; rotor >= 0; rotor--) value = throughRotor(value, rotor, positions[rotor]!, rings[rotor]!, false)
    value = REFLECTOR_B.charCodeAt(value) - 65
    for (let rotor = 0; rotor < 3; rotor++) value = throughRotor(value, rotor, positions[rotor]!, rings[rotor]!, true)
    value = plugboard[value]!

    const encoded = ALPHABET[value]!
    output += preserveCase && isLower ? encoded.toLowerCase() : encoded
  }

  return output
}

class Enigma extends Cipher {
  name(): string { return 'enigma' }

  info(): CipherInfo {
    return {
      name: 'enigma',
      label: 'Enigma M3',
      description: 'Wehrmacht Enigma M3 with rotors I-II-III and reflector B',
      family: 'rotor',
      selfInverse: true,
      options: [
        { name: 'positions', type: 'string', required: false, default: 'AAA', description: 'Initial rotor positions, left to right' },
        { name: 'rings', type: 'string', required: false, default: 'AAA', description: 'Ring settings, left to right' },
        { name: 'plugboard', type: 'string', required: false, default: '', description: 'Space-separated letter pairs, for example "AV BS CG"' },
      ],
      keyspace: '26^6 × plugboard configurations',
    }
  }

  encode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const opts = options ?? {}
      const positions = stringOption(opts, 'positions', 'AAA').toUpperCase()
      const rings = stringOption(opts, 'rings', 'AAA').toUpperCase()
      const plugboard = stringOption(opts, 'plugboard', '').trim().toUpperCase()
      return { text: transform(text, opts), cipher: 'enigma', operation: 'encode', options: { positions, rings, plugboard } }
    } catch (error) { throw normalizeError(error, 'enigma') }
  }

  decode(text: string, options?: CipherBaseOptions): CipherResult {
    try {
      const opts = options ?? {}
      const positions = stringOption(opts, 'positions', 'AAA').toUpperCase()
      const rings = stringOption(opts, 'rings', 'AAA').toUpperCase()
      const plugboard = stringOption(opts, 'plugboard', '').trim().toUpperCase()
      return { text: transform(text, opts), cipher: 'enigma', operation: 'decode', options: { positions, rings, plugboard } }
    } catch (error) { throw normalizeError(error, 'enigma') }
  }
}

register('enigma', Enigma)
