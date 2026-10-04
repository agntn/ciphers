import { describe, it, expect } from 'vite-plus/test'
import { normalizeMainArgs, separateText, shownArgument } from '../../src/cli-args.ts'

describe('normalizeMainArgs', () => {
  it('returns ciphers for empty argv', () => {
    expect(normalizeMainArgs([])).toEqual(['ciphers'])
  })
  it('preserves known subcommands', () => {
    expect(normalizeMainArgs(['encode', 'caesar', '3'])).toEqual(['encode', 'caesar', '3'])
    expect(normalizeMainArgs(['decode', 'caesar', '3'])).toEqual(['decode', 'caesar', '3'])
  })
  it('lowercases subcommands (case-insensitive check)', () => {
    expect(normalizeMainArgs(['Encode', 'caesar', '3'])).toEqual(['Encode', 'caesar', '3'])
  })
  it('prepends encode for unknown first arg (treated as cipher name)', () => {
    expect(normalizeMainArgs(['caesar', '3', 'hello'])).toEqual(['encode', 'caesar', '3', 'hello'])
  })
  it('prepends encode for numbers', () => {
    expect(normalizeMainArgs(['3', 'hello'])).toEqual(['encode', '3', 'hello'])
  })
  it('leaves the help and version flags to the main command', () => {
    expect(normalizeMainArgs(['--help'])).toEqual(['--help'])
    expect(normalizeMainArgs(['-h'])).toEqual(['-h'])
    expect(normalizeMainArgs(['--version'])).toEqual(['--version'])
    expect(normalizeMainArgs(['-v'])).toEqual(['-v'])
  })
  it('keeps the encode shortcut for every other leading flag', () => {
    expect(normalizeMainArgs(['--shift', '3', 'caesar', 'hello'])).toEqual([
      'encode',
      '--shift',
      '3',
      'caesar',
      'hello',
    ])
    expect(normalizeMainArgs(['caesar', 'hello', '--help'])).toEqual([
      'encode',
      'caesar',
      'hello',
      '--help',
    ])
  })
})

const decodeArgs = {
  cipher: { type: 'positional' },
  text: { type: 'positional' },
  key: { type: 'string', alias: 'k' },
  blockSize: { type: 'string' },
  verbose: { type: 'boolean', alias: 'v' },
} as const

describe('separateText', () => {
  it('takes dashed text that names no option as text', () => {
    expect(separateText(['morse', '-.-. .- -'], decodeArgs)).toEqual({
      args: ['--', 'morse', '-.-. .- -'],
    })
    expect(separateText(['morse', '---', '-k', 'x'], decodeArgs)).toEqual({
      args: ['-k', 'x', '--', 'morse', '---'],
    })
  })
  it('keeps every spelling of a declared option an option', () => {
    expect(
      separateText(
        ['--block-size', '160', 'rijndael', '--key=-ab', '-kx', 'hi', '--no-verbose'],
        decodeArgs,
      ),
    ).toEqual({
      args: ['--block-size', '160', '--key=-ab', '-kx', '--no-verbose', '--', 'rijndael', 'hi'],
    })
  })
  it('gives a dashed value to the option that takes it', () => {
    expect(separateText(['vigenere', 'attack', '--key', '-lemon'], decodeArgs)).toEqual({
      args: ['--key', '-lemon', '--', 'vigenere', 'attack'],
    })
  })
  it('reads a boolean cluster with letters it lacks as text', () => {
    expect(separateText(['morse', '-vx'], decodeArgs)).toEqual({ args: ['--', 'morse', '-vx'] })
  })
  it('passes whatever follows -- as text', () => {
    expect(separateText(['morse', '--', '--key'], decodeArgs)).toEqual({
      args: ['--', 'morse', '--key'],
    })
  })
  it('refuses a dashed argument once every positional is taken', () => {
    expect(separateText(['morse', '...', '--kye', 'x'], decodeArgs)).toEqual({ unknown: '--kye' })
    expect(separateText(['-_8'], {})).toEqual({ unknown: '-_8' })
  })
})

describe('shownArgument', () => {
  it('escapes control, format and separator characters', () => {
    expect(shownArgument('-\u001B]8;;x\u0007\u009B31m\u2028\u2029\u202E')).toBe(
      '"-\\u001b]8;;x\\u0007\\u{9b}31m\\u{2028}\\u{2029}\\u{202e}"',
    )
  })
  it('cuts a long argument to 40 graphemes', () => {
    expect(shownArgument(`-${'😀'.repeat(50)}`)).toBe(`"-${'😀'.repeat(39)}…"`)
  })
})
