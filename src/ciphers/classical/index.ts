import type { CipherConstructor } from '../../core/cipher.ts'
import { Adfgvx } from './adfgvx.ts'
import { Affine } from './affine.ts'
import { Alberti } from './alberti.ts'
import { Atbash } from './atbash.ts'
import { Autokey } from './autokey.ts'
import { Bacon } from './bacon.ts'
import { Beaufort } from './beaufort.ts'
import { Bifid } from './bifid.ts'
import { Caesar } from './caesar.ts'
import { Columnar } from './columnar.ts'
import { Enigma } from './enigma.ts'
import { Morse } from './morse.ts'
import { Playfair } from './playfair.ts'
import { Polybius } from './polybius.ts'
import { RailFence } from './rail-fence.ts'
import { Rot13 } from './rot13.ts'
import { Rot47 } from './rot47.ts'
import { TapCode } from './tap-code.ts'
import { Trithemius } from './trithemius.ts'
import { Vigenere } from './vigenere.ts'

/** The classical ciphers, in registry order. */
export const classical: readonly CipherConstructor[] = [
  Caesar,
  Rot13,
  Rot47,
  Atbash,
  Vigenere,
  Beaufort,
  Autokey,
  Trithemius,
  Alberti,
  RailFence,
  Affine,
  Playfair,
  Polybius,
  Morse,
  Bacon,
  TapCode,
  Columnar,
  Adfgvx,
  Bifid,
  Enigma,
]
