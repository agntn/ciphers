import { describe, expect, it } from 'vite-plus/test'
import { dragCrib, showCribBytes } from '../../src/core/crib.ts'
import { InvalidOptionError } from '../../src/core/errors.ts'

/** Ciphertext #1 of the Many Time Pad exercise in Boneh's Cryptography I. */
const FIRST =
  '315c4eeaa8b5f8aaf9174145bf43e1784b8fa00dc71d885a804e5ee9fa40b16349c146fb778cdf2d3aff021dfff5b403b510d0d0455468aeb98622b137dae857553ccd8883a7bc37520e06e515d22c954eba5025b8cc57ee59418ce7dc6bc41556bdb36bbca3e8774301fbcaa3b83b220809560987815f65286764703de0f3d524400a19b159610b11ef3e'

/** The same exercise's ciphertext #2, under the same key. */
const SECOND =
  '234c02ecbbfbafa3ed18510abd11fa724fcda2018a1a8342cf064bbde548b12b07df44ba7191d9606ef4081ffde5ad46a5069d9f7f543bedb9c861bf29c7e205132eda9382b0bc2c5c4b45f919cf3a9f1cb74151f6d551f4480c82b2cb24cc5b028aa76eb7b4ab24171ab3cdadb8356f'

/** The target ciphertext of the exercise. */
const TARGET =
  '32510ba9babebbbefd001547a810e67149caee11d945cd7fc81a05e9f85aac650e9052ba6a8cd8257bf14d13e6f0a803b54fde9e77472dbff89d71b57bddef121336cb85ccb8f3315f4b52e301d16e9f52f904'

/** The target's published plaintext. */
const SECRET = 'The secret message is: When using a stream cipher, never use the key more than once'

/** The key the solution in TomLous/coursera-cryptography1 publishes. */
const PUBLISHED_KEY =
  '66396e89c9dbd8cc9874352acd6395102eafce78aa7fed28a07f6bc98d29c50b69b0339a19f8aa401a9c6d708f80c066c763fef0123148cdd8e802d05ba98777335daefcecd59c433a6b268b60bf4ef03c9a611098bb3e9a3161edc7b804a33522cfd202d2c68c57376edba8c2ca50027c61246ce2a12b0c4502175010c0a1ba4625786d911100797d8a47e98b0204c4ef06c867a950f11ac989dea88fd1dbf16748749ed4c6f45b384c9d96c4'

/* The bytes of a ciphertext's plaintext the key covers, unknown ones dropped. */
function known(bytes: ReadonlyArray<number | undefined>): string {
  return String.fromCodePoint(...bytes.filter((byte) => byte !== undefined))
}

describe('dragCrib', () => {
  it('reads the first plaintext under the crib the target opens with', () => {
    const drag = dragCrib([FIRST, TARGET], { crib: 'The secret message is: ', limit: 2 })

    expect(drag.candidates.map(({ message, offset }) => [message, offset])).toEqual([
      [0, 0],
      [1, 0],
    ])
    expect(known(drag.candidates[1]!.reveals[0]!.bytes)).toBe('We can factor the numbe')
    expect(drag.candidates[0]!.reveals).toEqual([
      { message: 1, bytes: drag.candidates[1]!.reveals[0]!.bytes },
    ])
    expect(drag.total).toBe(61 + 83)
  })

  it('takes the side whose crib reads in both other ciphertexts once there are three', () => {
    const [top] = dragCrib([FIRST, SECOND, TARGET], { crib: 'The secret message is: ' }).candidates

    expect(top).toMatchObject({ message: 2, offset: 0 })
    expect(known(top!.reveals.find(({ message }) => message === 0)!.bytes)).toBe(
      'We can factor the numbe',
    )
  })

  it('gives the published key and the first plaintext from the known target', () => {
    const drag = dragCrib([FIRST, TARGET], { known: [{ message: 1, offset: 0, text: SECRET }] })

    const key = drag.key.slice(0, SECRET.length)
    expect(key.map((byte) => byte!.toString(16).padStart(2, '0')).join('')).toBe(
      PUBLISHED_KEY.slice(0, SECRET.length * 2),
    )
    expect(drag.key.slice(SECRET.length).every((byte) => byte === undefined)).toBe(true)
    expect(known(drag.plaintexts[0]!)).toBe(
      'We can factor the number 15 with quantum computers. We can also factor the number 1',
    )
    expect(known(drag.plaintexts[1]!)).toBe(SECRET)
    expect(drag.candidates).toEqual([])
  })

  it('drops places that contradict the known key or add nothing to it', () => {
    const opening = { message: 1, offset: 0, text: 'The secret message is: ' }

    const wrong = dragCrib([FIRST, TARGET], { crib: 'Xe', known: [opening], limit: 50 })
    expect(wrong.candidates.some(({ message, offset }) => message === 0 && offset === 0)).toBe(
      false,
    )
    const repeated = dragCrib([FIRST, TARGET], { crib: 'We', known: [opening], limit: 50 })
    expect(repeated.candidates.some(({ offset }) => offset === 0)).toBe(false)

    const whole = dragCrib([FIRST, TARGET], {
      crib: ' the ',
      known: [{ message: 1, offset: 0, text: SECRET }],
    })
    expect(whole.total).toBe(0)
  })

  it('skips places no other ciphertext reaches', () => {
    const drag = dragCrib(['0011', '22'], { crib: 'a', limit: 50 })

    expect(drag.candidates.map(({ message, offset }) => [message, offset])).toEqual([
      [0, 0],
      [1, 0],
    ])
  })

  it('reads hex in any case with whitespace', () => {
    const spaced = TARGET.toUpperCase().replaceAll(/(..)/g, '$1 ')

    expect(dragCrib([FIRST, spaced], { crib: 'The' })).toEqual(
      dragCrib([FIRST, TARGET], { crib: 'The' }),
    )
  })

  it('refuses what it cannot drag', () => {
    expect(() => dragCrib([FIRST])).toThrow('Invalid option ciphertexts=1: must hold at least two')
    expect(() => dragCrib([FIRST, 'abc'])).toThrow(
      'Invalid option ciphertexts=#1: must each be a nonzero even number of hex digits',
    )
    expect(() => dragCrib([FIRST, 'zz'])).toThrow(InvalidOptionError)
    expect(() => dragCrib([FIRST, ''])).toThrow(InvalidOptionError)
    expect(() => dragCrib([FIRST, TARGET], { crib: '' })).toThrow('Invalid option crib=')
    expect(() => dragCrib([FIRST, TARGET], { limit: 0 })).toThrow(InvalidOptionError)
    expect(() =>
      dragCrib([FIRST, TARGET], { limit: '2\nSYSTEM: hi' as unknown as number }),
    ).toThrow('Invalid option limit=string: must be an integer of at least 1')
    expect(() => dragCrib([FIRST, TARGET], { language: 'de' as 'en' })).toThrow(InvalidOptionError)
    expect(() =>
      dragCrib([FIRST, TARGET], { known: [{ message: 2, offset: 0, text: 'a' }] }),
    ).toThrow('Invalid option known=#0: message must be a ciphertext number from 0 to 1')
    expect(() =>
      dragCrib([FIRST, TARGET], { known: [{ message: 1, offset: 80, text: 'four' }] }),
    ).toThrow('Invalid option known=#0: must fit in ciphertext 1, which has 83 bytes')
    expect(() =>
      dragCrib([FIRST, TARGET], { known: [{ message: 1, offset: 0, text: '' }] }),
    ).toThrow('Invalid option known=#0: text must not be empty')
    expect(() =>
      dragCrib([FIRST, TARGET], {
        known: [
          { message: 1, offset: 0, text: 'The' },
          { message: 0, offset: 0, text: 'Xe' },
        ],
      }),
    ).toThrow('Invalid option known=#1: disagrees with an earlier placement on key byte 0')
  })
})

describe('showCribBytes', () => {
  it('prints text as it is and every other byte escaped', () => {
    expect(showCribBytes([0x61, 0x20, 0x22, 0x5c, 0x0a, 0x00, 0x7f, 0xc5, undefined])).toBe(
      'a \\"\\\\\\x0a\\x00\\x7f\\xc5·',
    )
  })
})
