import type { CipherInfo } from '../../core/types.ts'
import { BYTES_OPTION, type BlockMode, type Bytes, BlockCipher } from '../../core/block-mode.ts'

const BLOCK_SIZE = 16

/** A 64-bit value as its high and low 32-bit words. */
type Pair = readonly [number, number]

/** The 128-bit key values RFC 3713 cuts the subkeys from. */
type Source = 'KL' | 'KR' | 'KA' | 'KB'

/** A 64-bit subkey: the source rotated left by `rotation` bits, then half 0 (left) or 1 (right). */
type Cut = readonly [source: Source, rotation: number, half: 0 | 1]

/** Where every subkey of one key length comes from, in the order encryption uses them. */
interface Schedule {
  /** kw1 to kw4, XORed in before the first round and after the last. */
  readonly kw: readonly Cut[]
  /** k1 to k18, or to k24 for a longer key, one per round. */
  readonly k: readonly Cut[]
  /** ke1 to ke4, or to ke6, for the FL and FLINV layers between every six rounds. */
  readonly ke: readonly Cut[]
}

/** The subkeys themselves, in the order one direction uses them. */
interface Subkeys {
  readonly kw: readonly Pair[]
  readonly k: readonly Pair[]
  readonly ke: readonly Pair[]
}

/**
 * Splits SBOX1 as RFC 3713 §2.4.1 prints it, decimal, one row per high nibble.
 *
 * @param table - 256 decimal numbers, separated by whitespace.
 * @returns {number[]} The bytes.
 */
/* @__NO_SIDE_EFFECTS__ */ function bytes(table: string): number[] {
  return table.trim().split(/\s+/).map(Number)
}

const SBOX1 = bytes(`
112 130  44 236 179  39 192 229 228 133  87  53 234  12 174  65
 35 239 107 147  69  25 165  33 237  14  79  78  29 101 146 189
134 184 175 143 124 235  31 206  62  48 220  95  94 197  11  26
166 225  57 202 213  71  93  61 217   1  90 214  81  86 108  77
139  13 154 102 251 204 176  45 116  18  43  32 240 177 132 153
223  76 203 194  52 126 118   5 109 183 169  49 209  23   4 215
 20  88  58  97 222  27  17  28  50  15 156  22  83  24 242  34
254  68 207 178 195 181 122 145  36   8 232 168  96 252 105  80
170 208 160 125 161 137  98 151  84  91  30 149 224 255 100 210
 16 196   0  72 163 247 117 219 138   3 230 218   9  63 221 148
135  92 131   2 205  74 144  51 115 103 246 243 157 127 191 226
 82 155 216  38 200  55 198  59 129 150 111  75  19 190  99  46
233 121 167 140 159 110 188 142  41 245 249 182  47 253 180  89
120 152   6 106 231  70 113 186 212  37 171  66 136 162 141 250
114   7 185  85 248 238 172  10  54  73  42 104  60  56 241 164
 64  40 211 123 187 201  67 193  21 227 173 244 119 199 128 158
`)

/** Sigma1 to Sigma6 of §2.2, cut from the square roots of the first six primes. */
const SIGMA: readonly Pair[] = [
  [0xa09e667f, 0x3bcc908b],
  [0xb67ae858, 0x4caa73b2],
  [0xc6ef372f, 0xe94f82be],
  [0x54ff53a5, 0xf1d36f1c],
  [0x10e527fa, 0xde682d1d],
  [0xb05688c2, 0xb3e6c1fd],
]

/** §2.2 for a 128-bit key. k9 and k10 are the odd ones out, halves of two different values. */
const SHORT: Schedule = {
  kw: [
    ['KL', 0, 0],
    ['KL', 0, 1],
    ['KA', 111, 0],
    ['KA', 111, 1],
  ],
  k: [
    ['KA', 0, 0],
    ['KA', 0, 1],
    ['KL', 15, 0],
    ['KL', 15, 1],
    ['KA', 15, 0],
    ['KA', 15, 1],
    ['KL', 45, 0],
    ['KL', 45, 1],
    ['KA', 45, 0],
    ['KL', 60, 1],
    ['KA', 60, 0],
    ['KA', 60, 1],
    ['KL', 94, 0],
    ['KL', 94, 1],
    ['KA', 94, 0],
    ['KA', 94, 1],
    ['KL', 111, 0],
    ['KL', 111, 1],
  ],
  ke: [
    ['KA', 30, 0],
    ['KA', 30, 1],
    ['KL', 77, 0],
    ['KL', 77, 1],
  ],
}

/** §2.2 for a 192 or 256-bit key. */
const LONG: Schedule = {
  kw: [
    ['KL', 0, 0],
    ['KL', 0, 1],
    ['KB', 111, 0],
    ['KB', 111, 1],
  ],
  k: [
    ['KB', 0, 0],
    ['KB', 0, 1],
    ['KR', 15, 0],
    ['KR', 15, 1],
    ['KA', 15, 0],
    ['KA', 15, 1],
    ['KB', 30, 0],
    ['KB', 30, 1],
    ['KL', 45, 0],
    ['KL', 45, 1],
    ['KA', 45, 0],
    ['KA', 45, 1],
    ['KR', 60, 0],
    ['KR', 60, 1],
    ['KB', 60, 0],
    ['KB', 60, 1],
    ['KL', 77, 0],
    ['KL', 77, 1],
    ['KR', 94, 0],
    ['KR', 94, 1],
    ['KA', 94, 0],
    ['KA', 94, 1],
    ['KL', 111, 0],
    ['KL', 111, 1],
  ],
  ke: [
    ['KR', 30, 0],
    ['KR', 30, 1],
    ['KL', 60, 0],
    ['KL', 60, 1],
    ['KA', 77, 0],
    ['KA', 77, 1],
  ],
}

/**
 * Rotate one byte left.
 *
 * @param x - A byte.
 * @param n - Bits to rotate by, 1 to 7.
 * @returns {number} The rotated byte.
 */
function rotl8(x: number, n: number): number {
  return ((x << n) | (x >>> (8 - n))) & 0xff
}

/**
 * Rotate a 32-bit word left by one bit, the only rotation FL and FLINV need.
 *
 * @param x - A word.
 * @returns {number} The rotated word.
 */
function rotl1(x: number): number {
  return ((x << 1) | (x >>> 31)) >>> 0
}

/**
 * XOR two 64-bit values.
 *
 * @param a - One value.
 * @param b - The other.
 * @returns {Pair} `a ^ b`.
 */
function xor(a: Pair, b: Pair): Pair {
  return [(a[0] ^ b[0]) >>> 0, (a[1] ^ b[1]) >>> 0]
}

/**
 * Read big-endian 32-bit words.
 *
 * @param data - The bytes.
 * @param offset - Where the first word starts.
 * @param count - How many words.
 * @returns {number[]} The words.
 */
function readWords(data: Bytes, offset: number, count: number): number[] {
  return Array.from(
    { length: count },
    (_, i) =>
      ((data[offset + 4 * i]! << 24) |
        (data[offset + 4 * i + 1]! << 16) |
        (data[offset + 4 * i + 2]! << 8) |
        data[offset + 4 * i + 3]!) >>>
      0,
  )
}

/**
 * The F-function of §2.4.1. SBOX2 to SBOX4 are rotations of SBOX1, the only table stored.
 *
 * @param x - The 64-bit input.
 * @param k - The 64-bit subkey.
 * @returns {Pair} The 64-bit output.
 */
function f(x: Pair, k: Pair): Pair {
  const [hi, lo] = xor(x, k)
  const t1 = SBOX1[hi >>> 24]!
  const t2 = rotl8(SBOX1[(hi >>> 16) & 0xff]!, 1)
  const t3 = rotl8(SBOX1[(hi >>> 8) & 0xff]!, 7)
  const t4 = SBOX1[rotl8(hi & 0xff, 1)]!
  const t5 = rotl8(SBOX1[lo >>> 24]!, 1)
  const t6 = rotl8(SBOX1[(lo >>> 16) & 0xff]!, 7)
  const t7 = SBOX1[rotl8((lo >>> 8) & 0xff, 1)]!
  const t8 = SBOX1[lo & 0xff]!
  const y1 = t1 ^ t3 ^ t4 ^ t6 ^ t7 ^ t8
  const y2 = t1 ^ t2 ^ t4 ^ t5 ^ t7 ^ t8
  const y3 = t1 ^ t2 ^ t3 ^ t5 ^ t6 ^ t8
  const y4 = t2 ^ t3 ^ t4 ^ t5 ^ t6 ^ t7
  const y5 = t1 ^ t2 ^ t6 ^ t7 ^ t8
  const y6 = t2 ^ t3 ^ t5 ^ t7 ^ t8
  const y7 = t3 ^ t4 ^ t5 ^ t6 ^ t8
  const y8 = t1 ^ t4 ^ t5 ^ t6 ^ t7
  return [
    ((y1 << 24) | (y2 << 16) | (y3 << 8) | y4) >>> 0,
    ((y5 << 24) | (y6 << 16) | (y7 << 8) | y8) >>> 0,
  ]
}

/**
 * FL of §2.4.2, which the left half goes through every six rounds.
 *
 * @param x - The 64-bit input.
 * @param k - The 64-bit subkey.
 * @returns {Pair} The 64-bit output.
 */
function fl(x: Pair, k: Pair): Pair {
  const [x1, x2] = x
  const [k1, k2] = k
  const y2 = (x2 ^ rotl1(x1 & k1)) >>> 0
  return [(x1 ^ (y2 | k2)) >>> 0, y2]
}

/**
 * FLINV of §2.4.2, the inverse of FL, which the right half goes through at the same time.
 *
 * @param y - The 64-bit input.
 * @param k - The 64-bit subkey.
 * @returns {Pair} The 64-bit output.
 */
function flInverse(y: Pair, k: Pair): Pair {
  const [y1, y2] = y
  const [k1, k2] = k
  const x1 = (y1 ^ (y2 | k2)) >>> 0
  return [x1, (y2 ^ rotl1(x1 & k1)) >>> 0]
}

/**
 * Rotate a 128-bit value left and keep one 64-bit half of it.
 *
 * @param value - Four 32-bit words, the most significant first.
 * @param rotation - Bits to rotate by, 0 to 127.
 * @param half - 0 for the left half, 1 for the right.
 * @returns {Pair} That half.
 */
function cut(value: readonly number[], rotation: number, half: 0 | 1): Pair {
  const words = rotation >>> 5
  const bits = rotation & 31
  const [high, low] = [0, 1].map((i) => {
    const at = 2 * half + i + words
    const word = value[at % 4]!
    return bits === 0 ? word : ((word << bits) | (value[(at + 1) % 4]! >>> (32 - bits))) >>> 0
  })
  return [high!, low!]
}

/**
 * KL and KR as §2.2 lays them out. A 192-bit key pads KR with the complement of its last 64 bits.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @returns {[number[], number[]]} KL and KR, four words each.
 */
function splitKey(key: Bytes): [number[], number[]] {
  const left = readWords(key, 0, 4)
  if (key.length === 16) return [left, [0, 0, 0, 0]]
  const right = readWords(key, 16, (key.length - 16) / 4)
  if (key.length === 24) right.push(~right[0]! >>> 0, ~right[1]! >>> 0)
  return [left, right]
}

/**
 * Two Feistel rounds of the key schedule over a 128-bit value, Sigma constants as the round keys.
 *
 * @param d - The 128-bit value as two 64-bit halves.
 * @param first - Index of the first Sigma.
 * @returns {[Pair, Pair]} The two halves after both rounds.
 */
function sigmaRounds(d: readonly [Pair, Pair], first: number): [Pair, Pair] {
  const [d1, d2] = d
  const right = xor(d2, f(d1, SIGMA[first]!))
  return [xor(d1, f(right, SIGMA[first + 1]!)), right]
}

/**
 * KL, KR, KA and KB, everything the subkeys are cut from.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @returns {Record<Source, number[]>} The four 128-bit values, four words each.
 */
function keyValues(key: Bytes): Record<Source, number[]> {
  const [kl, kr] = splitKey(key)
  const halves = (value: readonly number[]): [Pair, Pair] => [
    [value[0]!, value[1]!],
    [value[2]!, value[3]!],
  ]
  const [klHigh, klLow] = halves(kl)
  const [krHigh, krLow] = halves(kr)
  let d = sigmaRounds([xor(klHigh, krHigh), xor(klLow, krLow)], 0)
  d = sigmaRounds([xor(d[0], klHigh), xor(d[1], klLow)], 2)
  const ka = [...d[0], ...d[1]]
  const [kaHigh, kaLow] = halves(ka)
  const kb = sigmaRounds([xor(kaHigh, krHigh), xor(kaLow, krLow)], 4).flat()
  return { KL: kl, KR: kr, KA: ka, KB: kb }
}

/**
 * Cut the subkeys, then put them in decryption order when asked, as §2.3.3 swaps them.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {Subkeys} The subkeys in the order the rounds use them.
 */
function subkeys(key: Bytes, operation: 'encrypt' | 'decrypt'): Subkeys {
  const values = keyValues(key)
  const schedule = key.length === 16 ? SHORT : LONG
  const pick = (cuts: readonly Cut[]): Pair[] =>
    cuts.map(([source, rotation, half]) => cut(values[source], rotation, half))
  const [kw, k, ke] = [pick(schedule.kw), pick(schedule.k), pick(schedule.ke)]
  if (operation === 'encrypt') return { kw, k, ke }
  return { kw: [...kw.slice(2), ...kw.slice(0, 2)], k: k.toReversed(), ke: ke.toReversed() }
}

/**
 * Camellia on one block, 18 rounds for a 128-bit key and 24 for a longer one.
 *
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {(block: Bytes) => Bytes} One 16-byte block in, one out.
 */
export function camelliaBlock(
  key: Bytes,
  operation: 'encrypt' | 'decrypt',
): (block: Bytes) => Bytes {
  const keys = subkeys(key, operation)
  return (block) => {
    const m = readWords(block, 0, 4)
    let d1 = xor([m[0]!, m[1]!], keys.kw[0]!)
    let d2 = xor([m[2]!, m[3]!], keys.kw[1]!)
    for (const [round, k] of keys.k.entries()) {
      if (round > 0 && round % 6 === 0) {
        d1 = fl(d1, keys.ke[round / 3 - 2]!)
        d2 = flInverse(d2, keys.ke[round / 3 - 1]!)
      }
      if (round % 2 === 0) d2 = xor(d2, f(d1, k))
      else d1 = xor(d1, f(d2, k))
    }
    return [...xor(d2, keys.kw[2]!), ...xor(d1, keys.kw[3]!)].flatMap((word) => [
      word >>> 24,
      (word >>> 16) & 0xff,
      (word >>> 8) & 0xff,
      word & 0xff,
    ])
  }
}

/**
 * Run each 16-byte block through Camellia on its own, the way ECB does.
 *
 * @param data - Whole blocks to transform.
 * @param key - 16, 24 or 32 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {number[]} The transformed blocks.
 */
export function camelliaEcb(data: Bytes, key: Bytes, operation: 'encrypt' | 'decrypt'): number[] {
  const block = camelliaBlock(key, operation)
  const result: number[] = []
  for (let offset = 0; offset < data.length; offset += BLOCK_SIZE) {
    result.push(...block(data.slice(offset, offset + BLOCK_SIZE)))
  }
  return result
}

const CAMELLIA: BlockMode = {
  name: 'camellia',
  label: 'Camellia ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32, 48, 64],
  keyError: 'must be 32, 48 or 64 hex digits (a 128, 192 or 256-bit Camellia key)',
  run: camelliaEcb,
}

export class Camellia extends BlockCipher {
  name(): string {
    return 'camellia'
  }

  info(): CipherInfo {
    return {
      name: 'camellia',
      label: 'Camellia (ECB)',
      description:
        "Camellia from RFC 3713, NTT and Mitsubishi Electric's cipher from 2000, in ECB mode: 18 Feistel rounds over 16-byte blocks for a 128-bit key and 24 for a 192 or 256-bit one, with an FL and FLINV layer every six rounds. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'feistel',
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
    return CAMELLIA
  }
}
