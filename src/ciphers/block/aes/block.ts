import type { Bytes } from '../../../core/block-mode'

interface AesTables {
  sbox: Bytes
  inverseSbox: Bytes
}

let tables: AesTables | undefined

function xtime(byte: number): number {
  return ((byte << 1) ^ (byte & 0x80 ? 0x1b : 0)) & 0xff
}

function multiply(a: number, b: number): number {
  let product = 0
  for (let factor = a, rest = b; rest > 0; factor = xtime(factor), rest >>= 1) {
    if (rest & 1) product ^= factor
  }
  return product
}

function rotateLeft(byte: number, bits: number): number {
  return ((byte << bits) | (byte >> (8 - bits))) & 0xff
}

// FIPS-197 §5.1.1: the multiplicative inverse in GF(2^8), then the affine map with 0x63.
function aesTables(): AesTables {
  if (tables) return tables
  const exp: number[] = []
  const log: number[] = []
  for (let i = 0, value = 1; i < 255; i++, value = multiply(value, 3)) {
    exp[i] = value
    log[value] = i
  }
  const sbox = Array.from({ length: 256 }, (_, x) => {
    const inverse = x === 0 ? 0 : exp[(255 - log[x]!) % 255]!
    return (
      inverse ^
      rotateLeft(inverse, 1) ^
      rotateLeft(inverse, 2) ^
      rotateLeft(inverse, 3) ^
      rotateLeft(inverse, 4) ^
      0x63
    )
  })
  const inverseSbox: number[] = []
  for (const [x, s] of sbox.entries()) inverseSbox[s] = x
  tables = { sbox, inverseSbox }
  return tables
}

/**
 * FIPS-197 §5.2, widened to Rijndael: the key schedule, one round key of `columns` words per round
 * plus the initial one. Rijndael runs `max(Nk, Nb) + 6` rounds, which for the AES block of four
 * columns gives 10, 12 and 14.
 *
 * @param key - 16 to 32 key bytes, a multiple of 4.
 * @param columns - Block length in 4-byte columns, 4 to 8.
 * @returns {Bytes[]} The round keys, `rounds + 1` of them.
 */
function expandKey(key: Bytes, columns: number): Bytes[] {
  const { sbox } = aesTables()
  const length = key.length / 4
  const rounds = Math.max(length, columns) + 6
  const words: Bytes[] = Array.from({ length }, (_, i) => key.slice(4 * i, 4 * i + 4))
  let rcon = 1
  for (let i = length; i < columns * (rounds + 1); i++) {
    let temp = words[i - 1]!
    if (i % length === 0) {
      temp = [sbox[temp[1]!]! ^ rcon, sbox[temp[2]!]!, sbox[temp[3]!]!, sbox[temp[0]!]!]
      rcon = xtime(rcon)
    } else if (length > 6 && i % length === 4) {
      temp = temp.map((byte) => sbox[byte]!)
    }
    const previous = words[i - length]!
    words.push(temp.map((byte, j) => byte ^ previous[j]!))
  }
  return Array.from({ length: rounds + 1 }, (_, round) =>
    words.slice(columns * round, columns * (round + 1)).flat(),
  )
}

// The state is column-major, as FIPS-197 fills it: byte i sits in row i % 4, column i / 4.
function addRoundKey(state: Bytes, roundKey: Bytes): Bytes {
  return state.map((byte, i) => byte ^ roundKey[i]!)
}

function substitute(state: Bytes, box: Bytes): Bytes {
  return state.map((byte) => box[byte]!)
}

/**
 * How far each row shifts left: Table 2 of the Rijndael proposal for 4, 6 and 8 columns, Table 8
 * for 5 and 7.
 *
 * @param columns - Block length in 4-byte columns, 4 to 8.
 * @returns {readonly number[]} The shift of rows 0 to 3; row 0 never moves.
 */
function rowShifts(columns: number): readonly number[] {
  if (columns === 8) return [0, 1, 3, 4]
  if (columns === 7) return [0, 1, 2, 4]
  return [0, 1, 2, 3]
}

function shiftRows(state: Bytes, inverse: boolean): Bytes {
  const columns = state.length / 4
  const shifts = rowShifts(columns)
  return state.map((_, i) => {
    const row = i % 4
    const column = Math.floor(i / 4)
    const shift = inverse ? columns - shifts[row]! : shifts[row]!
    return state[row + 4 * ((column + shift) % columns)]!
  })
}

function mixColumns(state: Bytes, matrix: Bytes): Bytes {
  return state.map((_, i) => {
    const row = i % 4
    const column = i - row
    let byte = 0
    for (let k = 0; k < 4; k++) byte ^= multiply(state[column + k]!, matrix[(k - row + 4) % 4]!)
    return byte
  })
}

const MIX = [2, 3, 1, 1] as const
const INVERSE_MIX = [14, 11, 13, 9] as const

function encryptBlock(block: Bytes, roundKeys: readonly Bytes[]): Bytes {
  const { sbox } = aesTables()
  const last = roundKeys.length - 1
  let state = addRoundKey(block, roundKeys[0]!)
  for (let round = 1; round <= last; round++) {
    state = shiftRows(substitute(state, sbox), false)
    if (round < last) state = mixColumns(state, MIX)
    state = addRoundKey(state, roundKeys[round]!)
  }
  return state
}

function decryptBlock(block: Bytes, roundKeys: readonly Bytes[]): Bytes {
  const { inverseSbox } = aesTables()
  let state = addRoundKey(block, roundKeys.at(-1)!)
  for (let round = roundKeys.length - 2; round >= 0; round--) {
    state = substitute(shiftRows(state, true), inverseSbox)
    state = addRoundKey(state, roundKeys[round]!)
    if (round > 0) state = mixColumns(state, INVERSE_MIX)
  }
  return state
}

/**
 * Expand the key once and return Rijndael on a single block of any of its five lengths.
 *
 * @param key - 16, 20, 24, 28 or 32 key bytes.
 * @param blockSize - 16, 20, 24, 28 or 32 bytes per block.
 * @param operation - Encrypt or decrypt.
 * @returns {(block: Bytes) => Bytes} One block in, one out.
 */
export function rijndaelBlock(
  key: Bytes,
  blockSize: number,
  operation: 'encrypt' | 'decrypt',
): (block: Bytes) => Bytes {
  const roundKeys = expandKey(key, blockSize / 4)
  const transform = operation === 'encrypt' ? encryptBlock : decryptBlock
  return (block) => transform(block, roundKeys)
}

/**
 * Expand the key once and return AES on a single block, for the modes that chain one block into
 * the next. AES is Rijndael with the block fixed at 16 bytes.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {(block: Bytes) => Bytes} One 16-byte block in, one out.
 */
export function aesBlock(key: Bytes, operation: 'encrypt' | 'decrypt'): (block: Bytes) => Bytes {
  return rijndaelBlock(key, 16, operation)
}
