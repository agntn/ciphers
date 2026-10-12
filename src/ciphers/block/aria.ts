import type { CipherInfo } from '../../core/types.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  type Bytes,
  BlockCipher,
  blockEcb,
  xorBytes,
} from '../../core/block-mode.ts'

const BLOCK_SIZE = 16

/**
 * Reads hex as RFC 5794 prints it, with or without whitespace between the bytes.
 *
 * @param digits - Pairs of hex digits.
 * @returns {number[]} One byte per pair.
 */
/* @__NO_SIDE_EFFECTS__ */ function hexBytes(digits: string): number[] {
  return (digits.replaceAll(/\s/g, '').match(/../g) ?? []).map((pair) => Number.parseInt(pair, 16))
}

/** SB1 of §2.4.2, which is the AES S-box. */
const SB1 = hexBytes(`
63 7c 77 7b f2 6b 6f c5 30 01 67 2b fe d7 ab 76
ca 82 c9 7d fa 59 47 f0 ad d4 a2 af 9c a4 72 c0
b7 fd 93 26 36 3f f7 cc 34 a5 e5 f1 71 d8 31 15
04 c7 23 c3 18 96 05 9a 07 12 80 e2 eb 27 b2 75
09 83 2c 1a 1b 6e 5a a0 52 3b d6 b3 29 e3 2f 84
53 d1 00 ed 20 fc b1 5b 6a cb be 39 4a 4c 58 cf
d0 ef aa fb 43 4d 33 85 45 f9 02 7f 50 3c 9f a8
51 a3 40 8f 92 9d 38 f5 bc b6 da 21 10 ff f3 d2
cd 0c 13 ec 5f 97 44 17 c4 a7 7e 3d 64 5d 19 73
60 81 4f dc 22 2a 90 88 46 ee b8 14 de 5e 0b db
e0 32 3a 0a 49 06 24 5c c2 d3 ac 62 91 95 e4 79
e7 c8 37 6d 8d d5 4e a9 6c 56 f4 ea 65 7a ae 08
ba 78 25 2e 1c a6 b4 c6 e8 dd 74 1f 4b bd 8b 8a
70 3e b5 66 48 03 f6 0e 61 35 57 b9 86 c1 1d 9e
e1 f8 98 11 69 d9 8e 94 9b 1e 87 e9 ce 55 28 df
8c a1 89 0d bf e6 42 68 41 99 2d 0f b0 54 bb 16
`)

/** SB2 of §2.4.2, the S-box ARIA adds to the AES one. */
const SB2 = hexBytes(`
e2 4e 54 fc 94 c2 4a cc 62 0d 6a 46 3c 4d 8b d1
5e fa 64 cb b4 97 be 2b bc 77 2e 03 d3 19 59 c1
1d 06 41 6b 55 f0 99 69 ea 9c 18 ae 63 df e7 bb
00 73 66 fb 96 4c 85 e4 3a 09 45 aa 0f ee 10 eb
2d 7f f4 29 ac cf ad 91 8d 78 c8 95 f9 2f ce cd
08 7a 88 38 5c 83 2a 28 47 db b8 c7 93 a4 12 53
ff 87 0e 31 36 21 58 48 01 8e 37 74 32 ca e9 b1
b7 ab 0c d7 c4 56 42 26 07 98 60 d9 b6 b9 11 40
ec 20 8c bd a0 c9 84 04 49 23 f1 4f 50 1f 13 dc
d8 c0 9e 57 e3 c3 7b 65 3b 02 8f 3e e8 25 92 e5
15 dd fd 17 a9 bf d4 9a 7e c5 39 67 fe 76 9d 43
a7 e1 d0 f5 68 f2 1b 34 70 05 a3 8a d5 79 86 a8
30 c6 51 4b 1e a6 27 f6 35 d2 6e 24 16 82 5f da
e6 75 a2 ef 2c b2 1c 9f 5d 6f 80 0a 72 44 9b 6c
90 0b 5b 33 7d 5a 52 f3 61 a1 f7 b0 d6 3f 7c 6d
ed 14 e0 a5 3d 22 b3 f8 89 de 71 1a af ba b5 81
`)

/** SL1 and SL2 of §2.4.2, the four S-boxes in the order each one takes them by byte position. */
interface Layers {
  readonly odd: readonly Bytes[]
  readonly even: readonly Bytes[]
}

let layers: Layers | undefined

/**
 * Build SL1 and SL2 on first use. SB3 and SB4 are the inverses of SB1 and SB2, as §2.4.2 notes,
 * so they are computed rather than stored, and SL2 comes out as the inverse of SL1.
 *
 * @returns {Layers} SL1 for the odd rounds, SL2 for the even ones and the last.
 */
function substitutionLayers(): Layers {
  if (layers) return layers
  const inverse = (box: Bytes): number[] => {
    const result: number[] = []
    for (const [x, y] of box.entries()) result[y] = x
    return result
  }
  const [sb3, sb4] = [inverse(SB1), inverse(SB2)]
  layers = { odd: [SB1, SB2, sb3, sb4], even: [sb3, sb4, SB1, SB2] }
  return layers
}

/** C1 to C3 of §2.2, the first 384 bits of the fractional part of 1/π. */
const C = [
  hexBytes('517cc1b727220a94fe13abe8fa9a6ee0'),
  hexBytes('6db14acc9e21c820ff28b1d5ef5de2b0'),
  hexBytes('db92371d2126e9700324977504e8c90e'),
] as const

/** Which constants CK1 to CK3 are, by key length in bytes. */
const CK: Readonly<Record<number, readonly [number, number, number]>> = {
  16: [0, 1, 2],
  24: [1, 2, 0],
  32: [2, 0, 1],
}

/** The input bytes each output byte of the diffusion layer A XORs, §2.4.3. */
const DIFFUSION = [
  [3, 4, 6, 8, 9, 13, 14],
  [2, 5, 7, 8, 9, 12, 15],
  [1, 4, 6, 10, 11, 12, 15],
  [0, 5, 7, 10, 11, 13, 14],
  [0, 2, 5, 8, 11, 14, 15],
  [1, 3, 4, 9, 10, 14, 15],
  [0, 2, 7, 9, 10, 12, 13],
  [1, 3, 6, 8, 11, 12, 13],
  [0, 1, 4, 7, 10, 13, 15],
  [0, 1, 5, 6, 11, 12, 14],
  [2, 3, 5, 6, 8, 13, 15],
  [2, 3, 4, 7, 9, 12, 14],
  [1, 2, 6, 7, 9, 11, 12],
  [0, 3, 6, 7, 8, 10, 13],
  [0, 3, 4, 5, 9, 11, 14],
  [1, 2, 4, 5, 8, 10, 15],
] as const

/** Right turns of the next W in ek1 to ek17, one per group of four, so <<< 61 becomes >>> 67. */
const ROTATIONS = [19, 31, 67, 97, 109] as const

/**
 * Rotate a 128-bit value right.
 *
 * @param x - 16 bytes, the most significant first.
 * @param n - Bits to rotate by, 0 to 127.
 * @returns {number[]} The rotated value.
 */
function rotr(x: Bytes, n: number): number[] {
  const bytes = n >>> 3
  const bits = n & 7
  return x.map((_, i) => {
    const high = x[(i - bytes + 16) % 16]!
    const low = x[(i - bytes + 15) % 16]!
    return ((high >>> bits) | (low << (8 - bits))) & 0xff
  })
}

/**
 * The diffusion layer A of §2.4.3. It is an involution, so it also undoes itself.
 *
 * @param x - 16 bytes.
 * @returns {number[]} 16 bytes.
 */
function diffuse(x: Bytes): number[] {
  return DIFFUSION.map((inputs) => inputs.reduce<number>((sum, i) => sum ^ x[i]!, 0))
}

/**
 * A substitution layer, SL1 or SL2.
 *
 * @param x - 16 bytes.
 * @param layer - The four S-boxes, by byte position mod 4.
 * @returns {number[]} 16 bytes.
 */
function substitute(x: Bytes, layer: readonly Bytes[]): number[] {
  return x.map((byte, i) => layer[i % 4]![byte]!)
}

/**
 * FO of §2.4.1, the odd round.
 *
 * @param d - 16 bytes.
 * @param rk - The round key.
 * @returns {number[]} `A(SL1(d ^ rk))`.
 */
function odd(d: Bytes, rk: Bytes): number[] {
  return diffuse(substitute(xorBytes(d, rk), substitutionLayers().odd))
}

/**
 * FE of §2.4.1, the even round.
 *
 * @param d - 16 bytes.
 * @param rk - The round key.
 * @returns {number[]} `A(SL2(d ^ rk))`.
 */
function even(d: Bytes, rk: Bytes): number[] {
  return diffuse(substitute(xorBytes(d, rk), substitutionLayers().even))
}

/**
 * The encryption round keys of §2.2: W0 to W3 from a three-round Feistel over KL || KR, then
 * ek1 to ek{n+1}, each one W XORed with the next W rotated.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @returns {number[][]} 13, 15 or 17 round keys of 16 bytes.
 */
function encryptionKeys(key: Bytes): number[][] {
  const [ck1, ck2, ck3] = CK[key.length]!.map((i) => C[i]!)
  const kl = key.slice(0, 16)
  const kr = [...key.slice(16), ...Array.from<number>({ length: 32 - key.length }).fill(0)]
  const w0 = kl
  const w1 = xorBytes(odd(w0, ck1!), kr)
  const w2 = xorBytes(even(w1, ck2!), w0)
  const w3 = xorBytes(odd(w2, ck3!), w1)
  const w = [w0, w1, w2, w3]
  const rounds = key.length / 4 + 8
  return Array.from({ length: rounds + 1 }, (_, i) =>
    xorBytes(w[i % 4]!, rotr(w[(i + 1) % 4]!, ROTATIONS[i >>> 2]!)),
  )
}

/**
 * The round keys one direction uses. Decryption runs the same rounds over the keys in reverse,
 * with every key but the first and the last passed through A, as §2.2 says.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[][]} The round keys in the order the rounds use them.
 */
function roundKeys(key: Bytes, operation: 'encrypt' | 'decrypt'): number[][] {
  const ek = encryptionKeys(key)
  if (operation === 'encrypt') return ek
  const last = ek.length - 1
  return ek.toReversed().map((k, i) => (i === 0 || i === last ? k : diffuse(k)))
}

/**
 * ARIA on one block, 12 rounds for a 128-bit key, 14 for 192 and 16 for 256.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {(block: Bytes) => Bytes} One 16-byte block in, one out.
 */
export function ariaBlock(key: Bytes, operation: 'encrypt' | 'decrypt'): (block: Bytes) => Bytes {
  const keys = roundKeys(key, operation)
  const rounds = keys.length - 1
  return (block) => {
    let state: Bytes = block
    for (let round = 0; round < rounds - 1; round++) {
      state = round % 2 === 0 ? odd(state, keys[round]!) : even(state, keys[round]!)
    }
    return xorBytes(
      substitute(xorBytes(state, keys[rounds - 1]!), substitutionLayers().even),
      keys[rounds]!,
    )
  }
}

/** ARIA on each 16-byte block alone, the way ECB does. */
export const ariaEcb = blockEcb(ariaBlock, BLOCK_SIZE)

const ARIA: BlockMode = {
  name: 'aria',
  label: 'ARIA ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit ARIA key)',
  run: ariaEcb,
}

export class Aria extends BlockCipher {
  name(): string {
    return 'aria'
  }

  info(): CipherInfo {
    return {
      name: 'aria',
      label: 'ARIA (ECB)',
      description:
        "ARIA from RFC 5794, South Korea's standard block cipher from 2003, in ECB mode: 12, 14 or 16 rounds over 16-byte blocks for a 128, 192 or 256-bit key, odd and even rounds taking the four S-boxes in opposite order. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'substitution-permutation',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32, 48 or 64 hex digits, a 128, 192 or 256-bit key',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^128, 2^192 or 2^256 keys',
    }
  }

  protected mode(): BlockMode {
    return ARIA
  }
}
