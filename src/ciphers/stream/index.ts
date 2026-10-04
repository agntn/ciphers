import type { CipherConstructor } from '../../core/cipher.ts'
import { ChaCha20 } from './chacha/chacha20.ts'
import { ChaCha20Poly1305 } from './chacha/chacha20-poly1305.ts'
import { XChaCha20 } from './chacha/xchacha20.ts'
import { Rabbit } from './rabbit.ts'
import { Rc4 } from './rc4.ts'
import { Salsa20 } from './salsa/salsa20.ts'
import { XSalsa20 } from './salsa/xsalsa20.ts'
import { Xor } from './xor.ts'

/** The stream ciphers, in registry order. */
export const stream: readonly CipherConstructor[] = [
  Rabbit,
  Rc4,
  Xor,
  Salsa20,
  XSalsa20,
  ChaCha20,
  XChaCha20,
  ChaCha20Poly1305,
]
