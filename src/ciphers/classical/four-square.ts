import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { normalizeError } from '../../core/errors.ts'
import { corners, keyedSquare, keyword, omitted, pairs, PLAIN } from './squares.ts'

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const key = keyword(options, 'key')
    const secondKey = keyword(options, 'secondKey')
    const omit = omitted(options)
    const plainSquares = [PLAIN[omit], PLAIN[omit]] as const
    const keyedSquares = [keyedSquare(key, omit), keyedSquare(secondKey, omit)] as const
    const [from, to] =
      operation === 'encode' ? [plainSquares, keyedSquares] : [keyedSquares, plainSquares]
    const output = pairs(text, operation, omit, 'four-square')
      .map((pair) => corners(pair, from, to))
      .join('')
    return {
      text: output,
      cipher: 'four-square',
      operation,
      options: omit === 'q' ? { key, secondKey, omit } : { key, secondKey },
    }
  } catch (error) {
    throw normalizeError(error, 'four-square')
  }
}

export class FourSquare extends Cipher {
  name(): string {
    return 'four-square'
  }

  info(): CipherInfo {
    return {
      name: 'four-square',
      label: 'Four-square',
      description:
        "Digraph substitution: Delastelle's two plain and two keyed 5×5 squares, each pair read across the corners (I/J share a cell, or Q is left out)",
      category: 'classical',
      family: 'digraph',
      selfInverse: false,
      worksOn: 'A-Z in pairs, J as I (or Q dropped), X pads an odd length, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description:
            'Keyword for the keyed square at the top right, which gives the first letter',
        },
        {
          name: 'secondKey',
          type: 'string',
          required: true,
          description:
            'Keyword for the keyed square at the bottom left, which gives the second letter',
        },
        {
          name: 'omit',
          type: 'string',
          required: false,
          default: 'j',
          description:
            'The letter the squares leave out: j folds J into I, q drops Q from squares and text as Wikipedia does',
        },
      ],
      keyspace: '(25!)² ≈ 2.4×10⁵⁰',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'encode', options)
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    return transform(text, 'decode', options)
  }
}
