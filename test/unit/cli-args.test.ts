import { describe, it, expect } from 'vite-plus/test'
import { normalizeMainArgs } from '../../src/cli-args.ts'

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
