import type { CipherBaseOptions, CipherInfo, CipherResult } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { InvalidOptionError, normalizeError } from '../../core/errors.ts'
import { getOpt } from '../../core/utils.ts'
import { corners, keyedSquare, keyword, omitted, pairs } from './squares.ts'

/** How the two squares sit: one above the other, or side by side. */
type Orientation = 'vertical' | 'horizontal'

/**
 * The `orientation` option, vertical unless it says horizontal.
 *
 * @param options - The call's options.
 * @returns {Orientation} How the squares sit.
 * @throws {InvalidOptionError} On anything but `vertical` or `horizontal`.
 */
function orientation(options: Readonly<CipherBaseOptions>): Orientation {
  const value = getOpt<unknown>(options, 'orientation', 'vertical')
  if (value !== 'vertical' && value !== 'horizontal') {
    throw new InvalidOptionError('orientation', value, 'must be vertical or horizontal')
  }
  return value
}

/**
 * Where to find a pair and where to read it: side by side, the far corners sit in the other square.
 *
 * @param squares - The keyed squares, top or left first.
 * @param layout - How they sit.
 * @param operation - Which way the text goes.
 * @returns {[from, to]} Squares of the first and second letter in, then out.
 */
function route(
  squares: readonly [string, string],
  layout: Orientation,
  operation: 'encode' | 'decode',
): readonly [readonly [string, string], readonly [string, string]] {
  if (layout === 'vertical') return [squares, squares]
  const swapped = [squares[1], squares[0]] as const
  return operation === 'encode' ? [squares, swapped] : [swapped, squares]
}

function transform(
  text: string,
  operation: 'encode' | 'decode',
  options: Readonly<CipherBaseOptions> = {},
): CipherResult {
  try {
    const key = keyword(options, 'key')
    const secondKey = keyword(options, 'secondKey')
    const omit = omitted(options)
    const layout = orientation(options)
    const squares = [keyedSquare(key, omit), keyedSquare(secondKey, omit)] as const
    const [from, to] = route(squares, layout, operation)
    const output = pairs(text, operation, omit, 'two-square')
      .map((pair) => corners(pair, from, to))
      .join('')
    return {
      text: output,
      cipher: 'two-square',
      operation,
      options: {
        key,
        secondKey,
        ...(layout === 'horizontal' ? { orientation: layout } : {}),
        ...(omit === 'q' ? { omit } : {}),
      },
    }
  } catch (error) {
    throw normalizeError(error, 'two-square')
  }
}

export class TwoSquare extends Cipher {
  name(): string {
    return 'two-square'
  }

  info(): CipherInfo {
    return {
      name: 'two-square',
      label: 'Two-square',
      description:
        "Digraph substitution: Delastelle's two keyed 5×5 squares, stacked or side by side, each pair read across the corners (I/J share a cell, or Q is left out)",
      category: 'classical',
      family: 'digraph',
      selfInverse: false,
      worksOn: 'A-Z in pairs, J as I (or Q dropped), X pads an odd length, the rest dropped',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Keyword for the top square, or the left one side by side',
        },
        {
          name: 'secondKey',
          type: 'string',
          required: true,
          description: 'Keyword for the bottom square, or the right one side by side',
        },
        {
          name: 'orientation',
          type: 'string',
          required: false,
          default: 'vertical',
          description:
            'vertical stacks the squares and leaves a pair in one column as it was, horizontal sets them side by side and reverses a pair in one row',
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
