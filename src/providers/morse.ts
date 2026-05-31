import type { CipherProvider, CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { normalizeError } from '../core/errors'
import { register } from '../core/registry'

const CHAR_TO_MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.',
  '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.',
  '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
  '$': '...-..-', '@': '.--.-.', "'": '.----.',
}

const MORSE_TO_CHAR: Record<string, string> = Object.fromEntries(
  Object.entries(CHAR_TO_MORSE).map(([k, v]) => [v, k]),
)

function encodeMorse(text: string): string {
  return Array.from(text.toUpperCase(), (c) => {
    if (c === ' ') return '/'
    return CHAR_TO_MORSE[c] ?? c
  }).join(' ')
}

function decodeMorse(text: string): string {
  const words = text.trim().split(/\s*\/\s*/)
  return words.map((word) =>
    word.split(/\s+/).map((code) => MORSE_TO_CHAR[code] ?? code).join('')
  ).join(' ')
}

class MorseProvider implements CipherProvider {
  name(): string { return 'morse' }

  info(): CipherInfo {
    return {
      name: 'morse',
      label: 'Morse Code',
      description: 'Telegraph encoding — letters to dot/dash sequences, words separated by /',
      family: 'fractionation',
      selfInverse: false,
      options: [],
      keyspace: '1 (fixed table)',
    }
  }

  encode(text: string, _options?: CipherBaseOptions): CipherResult {
    try {
      return { text: encodeMorse(text), cipher: 'morse', operation: 'encode', options: {} }
    } catch (e) { throw normalizeError(e, 'morse') }
  }

  decode(text: string, _options?: CipherBaseOptions): CipherResult {
    try {
      return { text: decodeMorse(text), cipher: 'morse', operation: 'decode', options: {} }
    } catch (e) { throw normalizeError(e, 'morse') }
  }
}

register('morse', () => new MorseProvider())
