import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types.ts'
import { Cipher } from '../../core/cipher.ts'
import { applyBaseOptions, getOpt, processBaseOptions } from '../../core/utils.ts'
import { InvalidOptionError, MissingOptionError, normalizeError } from '../../core/errors.ts'

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
const PATHS = [
  'spiral-clockwise',
  'spiral-counterclockwise',
  'snake-rows',
  'snake-columns',
  'columns',
] as const

type RouteCorner = (typeof CORNERS)[number]
type RoutePath = (typeof PATHS)[number]

const TURNS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
]

/**
 * Cells of a full grid clockwise from the top left, turning wherever the next cell is taken.
 *
 * @param rows - Grid height.
 * @param width - Grid width.
 * @returns {[number, number][]} Row and column of every cell in visiting order.
 */
function spiral(rows: number, width: number): [number, number][] {
  const taken = new Set<number>()
  const cells: [number, number][] = []
  let r = 0
  let c = 0
  let turn = 0
  for (let step = 0; step < rows * width; step++) {
    cells.push([r, c])
    taken.add(r * width + c)
    const [nr, nc] = [r + TURNS[turn]![0], c + TURNS[turn]![1]]
    if (nr < 0 || nr >= rows || nc < 0 || nc >= width || taken.has(nr * width + nc)) {
      turn = (turn + 1) % 4
    }
    r += TURNS[turn]![0]
    c += TURNS[turn]![1]
  }
  return cells
}

/**
 * Cells of a full grid row by row from the top left, every other row backwards for a snake.
 *
 * @param rows - Grid height.
 * @param width - Grid width.
 * @param snake - Whether odd rows run right to left.
 * @returns {[number, number][]} Row and column of every cell in visiting order.
 */
function byRows(rows: number, width: number, snake: boolean): [number, number][] {
  return Array.from({ length: rows * width }, (_, i): [number, number] => {
    const r = Math.floor(i / width)
    const c = i % width
    return [r, snake && r % 2 === 1 ? width - 1 - c : c]
  })
}

/**
 * Cells along the path from the top left. Column paths are row paths with the axes swapped.
 *
 * @param rows - Grid height.
 * @param width - Grid width.
 * @param path - The path.
 * @returns {[number, number][]} Row and column of every cell in visiting order.
 */
function fromTopLeft(rows: number, width: number, path: RoutePath): [number, number][] {
  if (path === 'spiral-clockwise') return spiral(rows, width)
  if (path === 'snake-rows') return byRows(rows, width, true)
  const transposed =
    path === 'spiral-counterclockwise'
      ? spiral(width, rows)
      : byRows(width, rows, path === 'snake-columns')
  return transposed.map(([r, c]) => [c, r])
}

/**
 * The path to draw from the top left so that one mirror turns it into the asked one.
 *
 * @param path - The path as asked.
 * @param flip - Whether exactly one axis is mirrored.
 * @returns {RoutePath} The other spiral direction under one mirror, the same path otherwise.
 */
function mirrored(path: RoutePath, flip: boolean): RoutePath {
  if (!flip) return path
  if (path === 'spiral-clockwise') return 'spiral-counterclockwise'
  return path === 'spiral-counterclockwise' ? 'spiral-clockwise' : path
}

/**
 * Text indexes in path order. A lone row wider than the text walks like one exactly as wide.
 *
 * @param length - Number of cells the text fills.
 * @param wanted - Grid width as asked.
 * @param corner - Corner the path starts from.
 * @param path - The path.
 * @returns {number[]} Indexes into the text, in path order.
 */
function routeOrder(
  length: number,
  wanted: number,
  corner: RouteCorner,
  path: RoutePath,
): number[] {
  if (length === 0) return []
  const width = Math.min(wanted, length)
  const rows = Math.ceil(length / width)
  const right = corner.endsWith('right')
  const bottom = corner.startsWith('bottom')
  const order: number[] = []
  for (const [r, c] of fromTopLeft(rows, width, mirrored(path, right !== bottom))) {
    const index = (bottom ? rows - 1 - r : r) * width + (right ? width - 1 - c : c)
    if (index < length) order.push(index)
  }
  return order
}

function validate(opts: Readonly<CipherBaseOptions>): {
  width: number
  corner: RouteCorner
  path: RoutePath
  preserveCase: boolean
  stripNonAlpha: boolean
} {
  const width = getOpt<number | undefined>(opts, 'width', undefined)
  if (width === undefined) throw new MissingOptionError('width')
  if (!Number.isInteger(width) || width < 2)
    throw new InvalidOptionError('width', width, 'must be integer >= 2')
  const corner = getOpt<unknown>(opts, 'corner', 'top-left')
  if (!CORNERS.includes(corner as RouteCorner))
    throw new InvalidOptionError('corner', corner, `must be one of ${CORNERS.join(', ')}`)
  const path = getOpt<unknown>(opts, 'path', 'spiral-clockwise')
  if (!PATHS.includes(path as RoutePath))
    throw new InvalidOptionError('path', path, `must be one of ${PATHS.join(', ')}`)
  return {
    width,
    corner: corner as RouteCorner,
    path: path as RoutePath,
    ...processBaseOptions(opts),
  }
}

/**
 * Every character but line breaks, which only lay the grid out.
 *
 * @param text - Input text.
 * @param base - Resolved shared flags.
 * @returns {string[]} The cells.
 */
function cells(
  text: string,
  base: Readonly<{ preserveCase: boolean; stripNonAlpha: boolean }>,
): string[] {
  return Array.from(applyBaseOptions(text, base).replaceAll(/\r?\n/g, ''))
}

export class Route extends Cipher {
  name(): string {
    return 'route'
  }

  info(): CipherInfo {
    return {
      name: 'route',
      label: 'Route Transposition',
      description:
        'Grid filled row by row and read along a path: a spiral, a snake or plain columns, from one corner. Decoding reads the path',
      category: 'classical',
      family: 'transposition',
      selfInverse: false,
      worksOn: 'all but line breaks, moved',
      options: [
        {
          name: 'width',
          type: 'number',
          required: true,
          description: 'Cells per row (2 or more)',
        },
        {
          name: 'corner',
          type: 'string',
          required: false,
          default: 'top-left',
          description: `Corner the path starts from: ${CORNERS.join(', ')}`,
        },
        {
          name: 'path',
          type: 'string',
          required: false,
          default: 'spiral-clockwise',
          description: `Path through the grid: ${PATHS.join(', ')}`,
        },
      ],
      keyspace: '~20n (width, 4 corners, 5 paths)',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { width, corner, path, ...base } = validate(options ?? {})
      const chars = cells(text, base)
      const grid = Array.from({ length: chars.length }, () => '')
      routeOrder(chars.length, width, corner, path).forEach((index, i) => {
        grid[index] = chars[i]!
      })
      return {
        text: grid.join(''),
        cipher: 'route',
        operation: 'encode',
        options: { width, corner, path, ...base },
      }
    } catch (e) {
      throw normalizeError(e, 'route')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      const { width, corner, path, ...base } = validate(options ?? {})
      const chars = cells(text, base)
      return {
        text: routeOrder(chars.length, width, corner, path)
          .map((index) => chars[index]!)
          .join(''),
        cipher: 'route',
        operation: 'decode',
        options: { width, corner, path, ...base },
      }
    } catch (e) {
      throw normalizeError(e, 'route')
    }
  }
}
