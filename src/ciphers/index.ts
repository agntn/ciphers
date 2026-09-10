import type { CipherConstructor } from '../core/cipher'
import { Adfgvx } from './adfgvx'
import { Affine } from './affine'
import { Alberti } from './alberti'
import { Atbash } from './atbash'
import { Autokey } from './autokey'
import { Bacon } from './bacon'
import { Beaufort } from './beaufort'
import { Bifid } from './bifid'
import { Caesar } from './caesar'
import { Columnar } from './columnar'
import { Enigma } from './enigma'
import { Morse } from './morse'
import { Playfair } from './playfair'
import { Polybius } from './polybius'
import { RailFence } from './rail-fence'
import { Rot13 } from './rot13'
import { Rot47 } from './rot47'
import { TapCode } from './tap-code'
import { Trithemius } from './trithemius'
import { Vigenere } from './vigenere'

/** Every cipher the package ships. Not in this list, not in the registry. */
export const builtins: readonly CipherConstructor[] = [
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
