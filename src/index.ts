// Register all built-in providers on import
import './providers/index'

export { version } from './version'
export type {
  CipherResult,
  EncodeOptions,
  DecodeOptions,
  CipherInfo,
  CipherOption,
  CipherProvider,
  CipherProviderFactory,
} from './core/types'
export {
  CipherError,
  UnknownCipherError,
  InvalidOptionError,
  MissingOptionError,
  normalizeError,
} from './core/errors'
export { register, create, ciphers, has } from './core/registry'
export { resolveCipher } from './core/resolve'
export { builtinCiphers, type BuiltinCipher } from './core/providers'
