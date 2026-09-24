import type { CipherInfo, CipherResult, CipherBaseOptions } from '../../core/types'
import { Cipher } from '../../core/cipher'
import { normalizeError } from '../../core/errors'
import { type BlockMode, type Bytes, decodeBlocks, encodeBlocks } from '../../core/block-mode'

const BLOCK_SIZE = 16

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
 * FIPS-197 §5.2: the key schedule, one 16-byte round key per round plus the initial one.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @returns {Bytes[]} The round keys, `rounds + 1` of them.
 */
function expandKey(key: Bytes): Bytes[] {
  const { sbox } = aesTables()
  const length = key.length / 4
  const rounds = length + 6
  const words: Bytes[] = Array.from({ length }, (_, i) => key.slice(4 * i, 4 * i + 4))
  let rcon = 1
  for (let i = length; i < 4 * (rounds + 1); i++) {
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
    words.slice(4 * round, 4 * round + 4).flat(),
  )
}

// The state is column-major, as FIPS-197 fills it: byte i sits in row i % 4, column i / 4.
function addRoundKey(state: Bytes, roundKey: Bytes): Bytes {
  return state.map((byte, i) => byte ^ roundKey[i]!)
}

function substitute(state: Bytes, box: Bytes): Bytes {
  return state.map((byte) => box[byte]!)
}

function shiftRows(state: Bytes, inverse: boolean): Bytes {
  return state.map((_, i) => {
    const row = i % 4
    const column = Math.floor(i / 4)
    const source = (column + (inverse ? 4 - row : row)) % 4
    return state[row + 4 * source]!
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
 * Run each 16-byte block through AES on its own, the way ECB does. Equal plaintext blocks
 * come out as equal ciphertext blocks, which is the leak the mode is known for.
 *
 * @param data - Whole blocks to transform.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function aesEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const roundKeys = expandKey(key)
  const transform = operation === 'encrypt' ? encryptBlock : decryptBlock
  const output: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    output.push(...transform(data.slice(offset, offset + BLOCK_SIZE), roundKeys))
  }
  return output
}

const AES: BlockMode = {
  name: 'aes',
  label: 'AES-ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit AES key)',
  run: aesEcb,
}

export class Aes extends Cipher {
  name(): string {
    return 'aes'
  }

  info(): CipherInfo {
    return {
      name: 'aes',
      label: 'AES (ECB)',
      description:
        'AES-128/192/256 in ECB mode: each 16-byte block is encrypted on its own, so equal plaintext blocks give equal ciphertext blocks. UTF-8 text with PKCS#7 padding in, hex out',
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32, 48 or 64 hex digits for AES-128, AES-192 or AES-256',
        },
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  encode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return encodeBlocks(AES, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes')
    }
  }

  decode(text: string, options?: Readonly<CipherBaseOptions>): CipherResult {
    try {
      return decodeBlocks(AES, text, options ?? {})
    } catch (e) {
      throw normalizeError(e, 'aes')
    }
  }
}
