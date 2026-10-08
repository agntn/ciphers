import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { quagmire, quagmireInfo } from './quagmire.ts'

export class Quagmire2 extends Cipher {
  name(): string {
    return 'quagmire-2'
  }

  info(): CipherInfo {
    return quagmireInfo(2)
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return quagmire(text, 'encode', 2, options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return quagmire(text, 'decode', 2, options)
  }
}
