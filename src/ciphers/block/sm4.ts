import type { CipherInfo } from '../../core/types.ts'
import {
  BYTES_OPTION,
  type BlockMode,
  type Bytes,
  BlockCipher,
  blockEcb,
} from '../../core/block-mode.ts'

const BLOCK_SIZE = 16
const ROUNDS = 32

/**
 * Reads hex as GB/T 32907-2016 prints it, with whitespace between the bytes.
 *
 * @param digits - Pairs of hex digits.
 * @returns {number[]} One byte per pair.
 */
/* @__NO_SIDE_EFFECTS__ */ function hexBytes(digits: string): number[] {
  return (digits.replaceAll(/\s/g, '').match(/../g) ?? []).map((pair) => Number.parseInt(pair, 16))
}

/** The S-box of §6.2.3 in draft-ribose-cfrg-sm4, row by row. */
const SBOX = hexBytes(`
d6 90 e9 fe cc e1 3d b7 16 b6 14 c2 28 fb 2c 05
2b 67 9a 76 2a be 04 c3 aa 44 13 26 49 86 06 99
9c 42 50 f4 91 ef 98 7a 33 54 0b 43 ed cf ac 62
e4 b3 1c a9 c9 08 e8 95 80 df 94 fa 75 8f 3f a6
47 07 a7 fc f3 73 17 ba 83 59 3c 19 e6 85 4f a8
68 6b 81 b2 71 64 da 8b f8 eb 0f 4b 70 56 9d 35
1e 24 0e 5e 63 58 d1 a2 25 22 7c 3b 01 21 78 87
d4 00 46 57 9f d3 27 52 4c 36 02 e7 a0 c4 c8 9e
ea bf 8a d2 40 c7 38 b5 a3 f7 f2 ce f9 61 15 a1
e0 ae 5d a4 9b 34 1a 55 ad 93 32 30 f5 8c b1 e3
1d f6 e2 2e 82 66 ca 60 c0 29 23 ab 0d 53 4e 6f
d5 db 37 45 de fd 8e 2f 03 ff 6a 72 6d 6c 5b 51
8d 1b af 92 bb dd bc 7f 11 d9 5c 41 1f 10 5a d8
0a c1 31 88 a5 cd 7b bd 2d 74 d0 12 b8 e5 b4 b0
89 69 97 4a 0c 96 77 7e 65 b9 f1 09 c5 6e c6 84
18 f0 7d ec 3a dc 4d 20 79 ee 5f 3e d7 cb 39 48
`)

/** The family key FK of §7.3.1, XORed into the key words before the schedule starts. */
const FK = [0xa3b1bac6, 0x56aa3350, 0x677d9197, 0xb27022dc] as const

/**
 * Rotate a 32-bit word left.
 *
 * @param x - A word.
 * @param n - Bits to rotate by, 1 to 31.
 * @returns {number} The rotated word.
 */
function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

/**
 * Tau, the four S-boxes side by side over the bytes of one word.
 *
 * @param x - A word.
 * @returns {number} Each byte replaced through the S-box.
 */
function tau(x: number): number {
  return (
    ((SBOX[x >>> 24]! << 24) |
      (SBOX[(x >>> 16) & 0xff]! << 16) |
      (SBOX[(x >>> 8) & 0xff]! << 8) |
      SBOX[x & 0xff]!) >>>
    0
  )
}

/**
 * T of §6.2, tau and then the linear transform L that the rounds use.
 *
 * @param x - A word.
 * @returns {number} `L(tau(x))`.
 */
function roundT(x: number): number {
  const b = tau(x)
  return (b ^ rotl(b, 2) ^ rotl(b, 10) ^ rotl(b, 18) ^ rotl(b, 24)) >>> 0
}

/**
 * T' of §7.3, the same tau with the lighter L' the key schedule gets.
 *
 * @param x - A word.
 * @returns {number} `L'(tau(x))`.
 */
function keyT(x: number): number {
  const b = tau(x)
  return (b ^ rotl(b, 13) ^ rotl(b, 23)) >>> 0
}

/**
 * CK_i of §7.3.2. Byte j is `(4i + j) * 7` mod 256, so it is cheaper to compute than to store.
 *
 * @param i - Round, 0 to 31.
 * @returns {number} The constant word for that round.
 */
function ck(i: number): number {
  let word = 0
  for (let j = 0; j < 4; j++) word = (word << 8) | (((4 * i + j) * 7) & 0xff)
  return word >>> 0
}

/**
 * Read big-endian 32-bit words.
 *
 * @param data - The bytes.
 * @returns {number[]} One word per four bytes.
 */
function readWords(data: Bytes): number[] {
  return Array.from(
    { length: data.length / 4 },
    (_, i) =>
      ((data[4 * i]! << 24) |
        (data[4 * i + 1]! << 16) |
        (data[4 * i + 2]! << 8) |
        data[4 * i + 3]!) >>>
      0,
  )
}

/**
 * The 32 round keys of §7.3, each one fed by the three before it.
 *
 * @param key - 16 key bytes.
 * @returns {number[]} rk_0 to rk_31.
 */
function roundKeys(key: Bytes): number[] {
  const k = readWords(key).map((word, i) => (word ^ FK[i]!) >>> 0)
  for (let i = 0; i < ROUNDS; i++) {
    k.push((k[i]! ^ keyT(k[i + 1]! ^ k[i + 2]! ^ k[i + 3]! ^ ck(i))) >>> 0)
  }
  return k.slice(4)
}

/**
 * SM4 on one block, 32 rounds. Decryption is the same rounds with the round keys reversed.
 *
 * @param key - 16 key bytes.
 * @param operation - Encrypt or decrypt.
 * @returns {(block: Bytes) => Bytes} One 16-byte block in, one out.
 */
export function sm4Block(key: Bytes, operation: 'encrypt' | 'decrypt'): (block: Bytes) => Bytes {
  const forward = roundKeys(key)
  const keys = operation === 'encrypt' ? forward : forward.toReversed()
  return (block) => {
    const x = readWords(block)
    for (let i = 0; i < ROUNDS; i++) {
      x.push((x[i]! ^ roundT(x[i + 1]! ^ x[i + 2]! ^ x[i + 3]! ^ keys[i]!)) >>> 0)
    }
    return x
      .slice(ROUNDS)
      .toReversed()
      .flatMap((word) => [word >>> 24, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff])
  }
}

/** SM4 on each 16-byte block alone, the way ECB does. */
export const sm4Ecb = blockEcb(sm4Block, BLOCK_SIZE)

const SM4: BlockMode = {
  name: 'sm4',
  label: 'SM4 ECB',
  mode: 'ecb',
  blockSize: BLOCK_SIZE,
  keyDigits: [32],
  keyError: 'must be 32 hex digits (a 128-bit SM4 key)',
  run: sm4Ecb,
}

export class Sm4 extends BlockCipher {
  name(): string {
    return 'sm4'
  }

  info(): CipherInfo {
    return {
      name: 'sm4',
      label: 'SM4 (ECB)',
      description:
        "SM4 from GB/T 32907-2016, China's standard block cipher, in ECB mode: 32 rounds of an unbalanced Feistel network over four 32-bit words, a 128-bit key and 16-byte blocks. UTF-8 text with PKCS#7 padding in, hex out",
      category: 'block',
      family: 'feistel',
      selfInverse: false,
      worksOn: 'UTF-8 or hex, hex out',
      options: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: '32 hex digits, a 128-bit key',
        },
        BYTES_OPTION,
      ],
      keyspace: '2^128 keys',
    }
  }

  protected mode(): BlockMode {
    return SM4
  }
}
