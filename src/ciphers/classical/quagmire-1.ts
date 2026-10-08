import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { quagmire, quagmireInfo } from './quagmire.ts'

export class Quagmire1 extends Cipher {
  name(): string {
    return 'quagmire-1'
  }

  info(): CipherInfo {
    return quagmireInfo(1)
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return quagmire(text, 'encode', 1, options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return quagmire(text, 'decode', 1, options)
  }
}
