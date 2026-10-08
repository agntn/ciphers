import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { quagmire, quagmireInfo } from './quagmire.ts'

export class Quagmire4 extends Cipher {
  name(): string {
    return 'quagmire-4'
  }

  info(): CipherInfo {
    return quagmireInfo(4)
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return quagmire(text, 'encode', 4, options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return quagmire(text, 'decode', 4, options)
  }
}
