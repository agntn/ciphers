import { describe, it, expect } from 'vite-plus/test'
import { normalizeMainArgs } from '../../src/cli-args'

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
})
