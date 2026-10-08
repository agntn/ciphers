import type { CipherConstructor } from '../../core/cipher.ts'
import { A1z26 } from './a1z26.ts'
import { Adfgvx } from './adfgvx.ts'
import { Affine } from './affine.ts'
import { Alberti } from './alberti.ts'
import { Atbash } from './atbash.ts'
import { Autokey } from './autokey.ts'
import { Bacon } from './bacon.ts'
import { Book } from './book.ts'
import { Beaufort } from './beaufort.ts'
import { Bifid } from './bifid.ts'
import { Chaocipher } from './chaocipher.ts'
import { Caesar } from './caesar.ts'
import { Columnar } from './columnar.ts'
import { Enigma } from './enigma.ts'
import { FourSquare } from './four-square.ts'
import { Gronsfeld } from './gronsfeld.ts'
import { Hill } from './hill.ts'
import { Morse } from './morse.ts'
import { Nihilist } from './nihilist.ts'
import { Playfair } from './playfair.ts'
import { Polybius } from './polybius.ts'
import { Porta } from './porta.ts'
import { Quagmire1 } from './quagmire-1.ts'
import { Quagmire2 } from './quagmire-2.ts'
import { Quagmire3 } from './quagmire-3.ts'
import { Quagmire4 } from './quagmire-4.ts'
import { RailFence } from './rail-fence.ts'
import { Route } from './route.ts'
import { RunningKey } from './running-key.ts'
import { StraddlingCheckerboard } from './straddling-checkerboard.ts'
import { Substitution } from './substitution.ts'
import { Rot13 } from './rot13.ts'
import { Rot47 } from './rot47.ts'
import { TapCode } from './tap-code.ts'
import { Trithemius } from './trithemius.ts'
import { TwoSquare } from './two-square.ts'
import { Vigenere } from './vigenere.ts'

/** The classical ciphers, in registry order. */
export const classical: readonly CipherConstructor[] = [
  Caesar,
  Rot13,
  Rot47,
  Atbash,
  Substitution,
  Vigenere,
  Gronsfeld,
  Beaufort,
  Porta,
  Autokey,
  RunningKey,
  Trithemius,
  Alberti,
  Quagmire1,
  Quagmire2,
  Quagmire3,
  Quagmire4,
  Chaocipher,
  RailFence,
  Affine,
  Playfair,
  FourSquare,
  TwoSquare,
  Hill,
  Polybius,
  Nihilist,
  Morse,
  Bacon,
  TapCode,
  A1z26,
  Book,
  Columnar,
  Route,
  Adfgvx,
  Bifid,
  StraddlingCheckerboard,
  Enigma,
]
