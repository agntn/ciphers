import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { quagmire, quagmireInfo } from './quagmire.ts'

export class Quagmire3 extends Cipher {
  name(): string {
    return 'quagmire-3'
  }

  info(): CipherInfo {
    return quagmireInfo(3)
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return quagmire(text, 'encode', 3, options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return quagmire(text, 'decode', 3, options)
  }
}
