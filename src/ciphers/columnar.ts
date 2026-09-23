import type { CipherInfo, CipherResult, CipherBaseOptions } from '../core/types'
import { Cipher } from '../core/cipher'
import {
  applyBaseOptions,
  cipherCacheKey,
  decodeColumnar,
  encodeColumnar,
  getOpt,
  LruCache,
  processBaseOptions,
} from '../core/utils'
import { MissingOptionError, normalizeError } from '../core/errors'

function validate(opts: Readonly<CipherBaseOptions>): {
  key: string
  preserveCase: boolean
  stripNonAlpha: boolean
} {
  const key = getOpt<string | undefined>(opts, 'key', undefined)
  if (!key) throw new MissingOptionError('key')
  return { key, ...processBaseOptions(opts) }
}

// ── Cache, one per instance ─────────────────────────────────────────────

const DEFAULT_CACHE_SIZE = 128

export class Columnar extends Cipher {
  private cache: LruCache<string, string>

  constructor() {
    super()
    this.cache = new LruCache(DEFAULT_CACHE_SIZE)
  }

  name(): string {
    return 'columnar'
  }

  info(): CipherInfo {
    return {
      name: 'columnar',
      label: 'Columnar Transposition',
      description: 'Plaintext written in rows, columns read in keyword order',
      family: 'transposition',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Keyword determining column order',
        },
      ],
      keyspace: 'n! (column permutations)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const resolved = validate(options ?? {})
      const input = applyBaseOptions(text, resolved)
      const ck = cipherCacheKey('encode', input, { key: resolved.key })
      const cached = this.cache.get(ck)
      if (cached !== undefined) {
        return { text: cached, cipher: 'columnar', operation: 'encode', options: resolved }
      }
      const result = encodeColumnar(input, resolved.key)
      this.cache.set(ck, result)
      return { text: result, cipher: 'columnar', operation: 'encode', options: resolved }
    } catch (e) {
      throw normalizeError(e, 'columnar')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const resolved = validate(options ?? {})
      const input = applyBaseOptions(text, resolved)
      const ck = cipherCacheKey('decode', input, { key: resolved.key })
      const cached = this.cache.get(ck)
      if (cached !== undefined) {
        return { text: cached, cipher: 'columnar', operation: 'decode', options: resolved }
      }
      const result = decodeColumnar(input, resolved.key)
      this.cache.set(ck, result)
      return { text: result, cipher: 'columnar', operation: 'decode', options: resolved }
    } catch (e) {
      throw normalizeError(e, 'columnar')
    }
  }

  /** Clear the cache. Useful for testing. */
  reset(): void {
    this.cache.clear()
  }
}
