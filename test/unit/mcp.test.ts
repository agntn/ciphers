import { existsSync } from 'node:fs'
import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { Cipher, create, register, type CipherInfo, type CipherResult } from '../../src/index.ts'
import { builtinCiphers } from '../../src/core/ciphers.ts'
import { createMcpServer } from '../../src/mcp.ts'
import { serverInfo } from '../../src/server-info.ts'
import { BRUTE_PREVIEW_LENGTH, OPTION_DESCRIPTIONS } from '../../src/tool-operations.ts'

const openConnections: Array<{ close(): Promise<void> }> = []

function onlyText(content: unknown): string {
  if (!Array.isArray(content)) throw new TypeError('Expected content blocks')
  const parts: readonly unknown[] = content
  if (parts.length !== 1) throw new TypeError(`Expected one content block, got ${parts.length}`)
  const part: unknown = parts[0]
  if (
    typeof part !== 'object' ||
    part === null ||
    !('type' in part) ||
    part.type !== 'text' ||
    !('text' in part) ||
    typeof part.text !== 'string'
  ) {
    throw new TypeError('Expected one text content block')
  }
  return part.text
}

async function connectTestClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createMcpServer()
  const client = new Client({ name: 'ciphers-test', version: '1.0.0' })
  openConnections.push(client, server)
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

afterEach(async () => {
  await Promise.all(openConnections.splice(0).map((connection) => connection.close()))
})

describe('Ciphers MCP server', () => {
  it('discovers the complete cipher tool surface', async () => {
    const client = await connectTestClient()

    const response = await client.listTools()

    expect(response.tools.map((tool) => tool.name)).toEqual([
      'ciphers_encode',
      'ciphers_decode',
      'ciphers_caesar_brute',
      'ciphers_frequency',
      'ciphers_period_estimate',
      'ciphers_family_guess',
      'ciphers_passphrase_probe',
      'ciphers_crib_drag',
      'ciphers_hidden_text_read',
      'ciphers_characters_inspect',
      'ciphers_zero_width_read',
      'ciphers_zero_width_hide',
      'ciphers_texts_align',
      'ciphers_key_recover',
      'ciphers_info',
    ])
    const encodeTool = response.tools.find((tool) => tool.name === 'ciphers_encode')
    expect(encodeTool?.inputSchema).toMatchObject({
      type: 'object',
      required: ['cipher', 'text'],
      properties: {
        cipher: { enum: [...builtinCiphers] },
        a: { enum: [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25] },
        letters: { enum: [24, 26] },
        key: { description: OPTION_DESCRIPTIONS.key },
        transposition: { description: OPTION_DESCRIPTIONS.transposition },
        period: { description: OPTION_DESCRIPTIONS.period },
      },
    })
    expect(JSON.stringify(encodeTool?.inputSchema)).not.toContain('allOf')
    expect(encodeTool?.annotations).toEqual({
      title: 'Cipher Encode',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    })
  })

  it('introduces itself with a description and icons the site serves', async () => {
    const client = await connectTestClient()

    expect(client.getServerVersion()).toEqual(serverInfo)
    for (const icon of serverInfo.icons) {
      const file = new URL(`../../docs/public${new URL(icon.src).pathname}`, import.meta.url)
      expect(existsSync(file), icon.src).toBe(true)
    }
  })

  it('names the ciphers that read key and period as the registry declares them', () => {
    for (const option of ['key', 'period'] as const) {
      // The key lengths before `Required by` name the block ciphers too, and `des` sits inside
      // `desx` and `triple-des`, so each clause is read alone and names match whole.
      const requirements = OPTION_DESCRIPTIONS[option].split('Required by')[1] ?? ''
      const [requiredClause = '', optionalClause = ''] = requirements.split(';')
      const named = (clause: string) =>
        builtinCiphers.filter((name) =>
          new RegExp(String.raw`(?<![\w-])${name}(?![\w-])`).test(clause),
        )
      const declared = (required: boolean) =>
        builtinCiphers.filter((name) =>
          create(name)
            .info()
            .options.some((entry) => entry.name === option && entry.required === required),
        )
      expect(named(requiredClause)).toEqual(declared(true))
      expect(named(optionalClause)).toEqual(declared(false))
    }
  })

  it('gives every block cipher its hex key length', () => {
    const [lengths = ''] = OPTION_DESCRIPTIONS.key.split('. Required by')
    const named = (name: string) => new RegExp(String.raw`(?<![\w-])${name}(?![\w-])`).test(lengths)
    const block = builtinCiphers.filter((name) => create(name).info().category === 'block')
    expect(block.filter((name) => !named(name))).toEqual([])
  })

  it('executes encode and decode through the protocol', async () => {
    const client = await connectTestClient()

    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'caesar', text: 'abc', shift: 1, preserveCase: false },
    })
    // The agents guide promises the text alone over MCP, with no `details` to lean on.
    expect(encoded).toEqual({
      content: [{ type: 'text', text: 'BCD' }],
    })

    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'caesar', text: 'BCD', shift: 1, preserveCase: false },
    })
    expect(decoded).toMatchObject({
      content: [{ type: 'text', text: 'ABC' }],
    })
    expect(decoded.isError).not.toBe(true)
  })

  it('takes the second four-square keyword through the protocol', async () => {
    const client = await connectTestClient()
    const squares = { key: 'zgptfoihmuwdrcnykeqaxvsbl', secondKey: 'mfnbdcrhsaxyogvituewlqzkp' }
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'four-square', text: 'attack at dawn', ...squares },
    })
    expect(encoded).toEqual({ content: [{ type: 'text', text: 'TIYBFHTIZBSY' }] })

    const wikipedia = { key: 'EXAMPLE', secondKey: 'KEYWORD', text: 'help me obi wan kenobi' }
    const withoutQ = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'four-square', ...wikipedia, omit: 'q' },
    })
    expect(withoutQ).toEqual({ content: [{ type: 'text', text: 'FYGMKYHOBXMFKKKIMD' }] })
    const capital = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'four-square', ...wikipedia, omit: 'Q' },
    })
    expect(capital.isError).toBe(true)
    expect(onlyText(capital.content)).toContain('omit')

    const ignored = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'vigenere', text: 'abc', key: 'KEY', secondKey: '123' },
    })
    expect(ignored.isError).not.toBe(true)
  })

  it('sets the two-square squares side by side through the protocol', async () => {
    const client = await connectTestClient()
    const aca = { cipher: 'two-square', key: 'DIALOGUE', secondKey: 'BIOGRAPHY' }
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...aca, text: 'IRRTEHMKGIMEQGRUNMMZSV', orientation: 'horizontal' },
    })
    expect(decoded).toEqual({ content: [{ type: 'text', text: 'ANOTHERDIGRAPHICSETUPX' }] })

    const sideways = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...aca, text: 'IR', orientation: 'sideways' },
    })
    expect(sideways.isError).toBe(true)
    expect(onlyText(sideways.content)).toContain('orientation')

    const missing = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'two-square', key: 'DIALOGUE', secondKey: '1984', text: 'AN' },
    })
    expect(missing.isError).toBe(true)
    expect(onlyText(missing.content)).toContain('/secondKey')
  })

  it('refuses a running key shorter than the text through the protocol', async () => {
    const client = await connectTestClient()
    const arguments_ = { cipher: 'running-key', text: 'Flee at once', key: 'errors can' }

    const refused = await client.callTool({ name: 'ciphers_encode', arguments: arguments_ })
    expect(refused.isError).toBe(true)
    expect(onlyText(refused.content)).toContain(
      'Invalid option key=9 letters: the text has 10, and a running key never goes round again',
    )

    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...arguments_, key: 'errors can occur' },
    })
    expect(encoded).toEqual({ content: [{ type: 'text', text: 'Jcvs rl qnps' }] })
  })

  it('discovers and executes Beaufort through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'beaufort' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('key (string, required)')
    for (const [name, text, expected] of [
      ['ciphers_encode', 'DCODE', 'HCKHA'],
      ['ciphers_decode', 'HCKHA', 'DCODE'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'beaufort', text, key: 'KEY' },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes the ADFGVX transposition through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'adfgvx' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('transposition (string, default=')
    expect(onlyText(info.content)).toContain('Works on: A-Z and 0-9, the rest dropped')
    for (const [name, text, expected] of [
      ['ciphers_encode', 'attack at 1200am', 'DXXVGDADDAAXDVDXVFGVGFADDVVD'],
      ['ciphers_decode', 'DXXVGDADDAAXDVDXVFGVGFADDVVD', 'ATTACKAT1200AM'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'adfgvx', text, key: '147 regiment', transposition: 'privacy' },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes AES-ECB through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(aes) — block, substitution-permutation')
    expect(onlyText(info.content)).toContain('key (string, required)')
    const key = '2B7E 1516 28AE D2A6 ABF7 1588 09CF 4F3C'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', 'bef12e48d0f1739d732326cbecbef389'],
      ['ciphers_decode', 'bef12e48d0f1739d732326cbecbef389', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'aes', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }

    const wrongKey = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'aes', text: 'bef12e48d0f1739d732326cbecbef389', key: '00'.repeat(16) },
    })
    expect(wrongKey.isError).toBe(true)
    expect(onlyText(wrongKey.content)).toBe(
      'ciphers_decode failed: [aes] Decrypted blocks do not end in PKCS#7 padding: wrong key, or not AES-ECB ciphertext',
    )
  })

  it('discovers and executes DES through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'des' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(des) — block, feistel')
    const key = '0123 4567 89AB CDEF'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '66e43480bc9810be67812271f1ee04a0'],
      ['ciphers_decode', '66e43480bc9810be67812271f1ee04a0', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'des', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes DESX through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'desx' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(desx) — block, feistel')
    const key = '0123456789ABCDEF F0E1D2C3B4A59687 1122334455667788'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', 'e66c99d05c13ecf7cb70b505d3d77a8e'],
      ['ciphers_decode', 'e66c99d05c13ecf7cb70b505d3d77a8e', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'desx', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes Triple DES through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'triple-des' },
    })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(triple-des) — block, feistel')
    const key = '0123 4567 89AB CDEF 2345 6789 ABCD EF01 4567 89AB CDEF 0123'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', 'a1a3679052607883b30ef4b95156ff29'],
      ['ciphers_decode', 'a1a3679052607883b30ef4b95156ff29', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'triple-des', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes Blowfish through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'blowfish' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(blowfish) — block, feistel')
    const key = '0123 4567 89AB CDEF F0E1 D2C3 B4A5 9687'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '9e16058420b1546315051882f350a136'],
      ['ciphers_decode', '9e16058420b1546315051882f350a136', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'blowfish', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes IDEA through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'idea' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(idea) — block, lai-massey')
    const key = '0001 0002 0003 0004 0005 0006 0007 0008'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '1e79aa86c8a1f33bd0182e2668bd0bf6'],
      ['ciphers_decode', '1e79aa86c8a1f33bd0182e2668bd0bf6', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'idea', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes Lucifer through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'lucifer' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(lucifer) — block, feistel')
    const key = '01234567 89abcdef fedcba98 76543210'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '3511c560cf11d61ec299417602e29bc5'],
      ['ciphers_decode', '3511c560cf11d61ec299417602e29bc5', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'lucifer', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes MARS through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'mars' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(mars) — block, feistel')
    const key = '01234567 89abcdef fedcba98 76543210'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', 'de839bee915b8cd4fc0243d93c4cae4b'],
      ['ciphers_decode', 'de839bee915b8cd4fc0243d93c4cae4b', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'mars', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes Serpent through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'serpent' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(serpent) — block, substitution-permutation')
    const key = '01234567 89abcdef fedcba98 76543210'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '33bd9b4c6955d0e186249aeca8b19dbf'],
      ['ciphers_decode', '33bd9b4c6955d0e186249aeca8b19dbf', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'serpent', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  /** Expected values from `openssl enc -camellia-128-ecb`. */
  it('discovers and executes Camellia through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'camellia' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(camellia) — block, feistel')
    const key = '01234567 89abcdef fedcba98 76543210'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '4fd50f17717460459c4924d6c54d4881'],
      ['ciphers_decode', '4fd50f17717460459c4924d6c54d4881', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'camellia', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  /** Expected values from `openssl enc -aria-128-ecb`. */
  it('discovers and executes ARIA through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aria' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(aria) — block, substitution-permutation')
    const key = '01234567 89abcdef fedcba98 76543210'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', 'e372f8a14e6654bc1f325283f65fea91'],
      ['ciphers_decode', 'e372f8a14e6654bc1f325283f65fea91', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'aria', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  /** Expected values from `openssl enc -sm4-ecb`. */
  it('discovers and executes SM4 through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'sm4' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(sm4) — block, feistel')
    const key = '01234567 89abcdef fedcba98 76543210'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '47dea04afc3c7e332fcac11987a2ec6e'],
      ['ciphers_decode', '47dea04afc3c7e332fcac11987a2ec6e', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'sm4', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('opens the CryptoJS passphrase format through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'aes-passphrase' },
    })
    expect(onlyText(info.content)).toContain('keyLength (number, default=256)')
    const wide = { cipher: 'aes-passphrase', key: 'secret', keyLength: 1024, iterations: 10_000 }
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...wide, text: 'ATTACK AT DAWN', salt: '0123456789abcdef' },
    })
    expect(onlyText(encoded.content)).toBe('U2FsdGVkX18BI0VniavN7/GNI6WzbZKfYzF61Y37l9k=')
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...wide, text: 'U2FsdGVkX18BI0VniavN7/GNI6WzbZKfYzF61Y37l9k=' },
    })
    expect(onlyText(decoded.content)).toBe('ATTACK AT DAWN')
  })

  it('discovers and executes Rabbit with and without an IV through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'rabbit' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(rabbit) — stream, arx')
    expect(onlyText(info.content)).toContain('iv (string, default=none)')
    expect(onlyText(info.content)).toContain('endian (string, default=big)')
    for (const [args, expected] of [
      [
        { text: 'ATTACK AT DAWN', key: '91281329 2e3d36fe 3bfc62f1 dc51c3ac' },
        'b29c6ab764eac93e97a4c3a306d2',
      ],
      [
        {
          text: 'Rabbit stream cipher test',
          key: '23c2731e8b5469fd8dabb5bc592a0f3a',
          iv: '712906405ef03201',
          endian: 'little',
        },
        '1ae2d4edcf9b6063b00fd6fda0b223aded157e77031cf0440b',
      ],
    ] as const) {
      const encoded = await client.callTool({
        name: 'ciphers_encode',
        arguments: { cipher: 'rabbit', ...args },
      })
      expect(encoded.isError).not.toBe(true)
      expect(onlyText(encoded.content)).toBe(expected)
      const decoded = await client.callTool({
        name: 'ciphers_decode',
        arguments: { cipher: 'rabbit', ...args, text: expected },
      })
      expect(onlyText(decoded.content)).toBe(args.text)
    }
  })

  it('discovers and executes RC4 through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'rc4' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(rc4) — stream, permutation')
    const args = { cipher: 'rc4', key: '53 65 63 72 65 74' }
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...args, text: 'Attack at dawn' },
    })
    expect(encoded.isError).not.toBe(true)
    expect(onlyText(encoded.content)).toBe('45a01f645fc35b383552544b9bf5')
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...args, text: '45a01f645fc35b383552544b9bf5' },
    })
    expect(onlyText(decoded.content)).toBe('Attack at dawn')
  })

  it('discovers and executes repeating-key XOR in both byte forms through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'xor' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(xor) — stream, polyalphabetic')
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: {
        cipher: 'xor',
        key: '49 43 45',
        text: "Burning 'em, if you ain't quick and nimble",
      },
    })
    expect(encoded.isError).not.toBe(true)
    expect(onlyText(encoded.content)).toBe(
      '0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272a282b2f20',
    )
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'xor', key: 'ff', bytes: 'hex', text: '00ff80' },
    })
    expect(decoded.isError).not.toBe(true)
    expect(onlyText(decoded.content)).toBe('ff007f')
    const cbc = { key: '2b7e151628aed2a6abf7158809cf4f3c', iv: '00'.repeat(16) }
    const sealed = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'aes-cbc', ...cbc, bytes: 'hex', text: '00ff80aa' },
    })
    expect(sealed.isError).not.toBe(true)
    for (const [args, plain] of [
      [{ cipher: 'rc4', key: '0102030405', text: '00ff80aa' }, 'b2c6e3af'],
      [{ cipher: 'rabbit', key: '00'.repeat(16), text: '00ff80aa' }, '1cb577a8'],
      [{ cipher: 'aes-cbc', ...cbc, text: onlyText(sealed.content) }, '00ff80aa'],
    ] as const) {
      const opened = await client.callTool({
        name: 'ciphers_decode',
        arguments: { ...args, bytes: 'hex' },
      })
      expect(opened.isError).not.toBe(true)
      expect(onlyText(opened.content)).toBe(plain)
      const refused = await client.callTool({ name: 'ciphers_decode', arguments: args })
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain('pass bytes: hex to get them as hex')
    }
  })

  it('discovers and executes the straddling checkerboard with its blanks through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'straddling-checkerboard' },
    })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(straddling-checkerboard) — classical, fractionation')
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'straddling-checkerboard', text: 'ATTACK AT DAWN' },
    })
    expect(encoded.isError).not.toBe(true)
    expect(onlyText(encoded.content)).toBe('3113212731223655')
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: {
        cipher: 'straddling-checkerboard',
        key: 'FUBCDORA.LETHINGKYMVPS/JQZXW',
        blanks: '1 4',
        text: '15165943121972',
      },
    })
    expect(decoded.isError).not.toBe(true)
    expect(onlyText(decoded.content)).toBe('INCASEYOU')
  })

  it('carries the trifid symbol through the protocol', async () => {
    const client = await connectTestClient()
    const aca = { cipher: 'trifid', key: 'EXTRAORDINARY', period: 10, symbol: '#' }
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...aca, text: 'trifids are fractionated ciphers' },
    })
    expect(encoded.isError).not.toBe(true)
    expect(onlyText(encoded.content)).toBe('EYMXVUCRYYYYEAYVYOVVXITDPATHE')
    const hashed = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...aca, text: 'TRIFID#IS#FUN' },
    })
    expect(onlyText(hashed.content)).toHaveLength(13)
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...aca, text: onlyText(hashed.content) },
    })
    expect(decoded.isError).not.toBe(true)
    expect(onlyText(decoded.content)).toBe('TRIFID#IS#FUN')
  })

  it('carries a square alphabet through the protocol', async () => {
    const client = await connectTestClient()
    const six = { cipher: 'bifid', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', period: 5 }
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...six, text: 'Defend the east wall, 1941' },
    })
    expect(encoded.isError).not.toBe(true)
    expect(onlyText(encoded.content)).toBe('AAP3ZDGDH2DVABYH39741')
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'polybius', alphabet: six.alphabet, text: '11 42 54 55' },
    })
    expect(onlyText(decoded.content)).toBe('AT12')
    const lopsided = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'polybius', alphabet: 'ABCDE', text: 'BAD' },
    })
    expect(lopsided.isError).toBe(true)
    expect(onlyText(lopsided.content)).toContain('must hold a square number of symbols')
  })

  it('carries the hill alphabet through the protocol', async () => {
    const client = await connectTestClient()
    const nine = { cipher: 'hill', key: '2113', alphabet: '012345678' }
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...nine, text: '3141567' },
    })
    expect(encoded.isError).not.toBe(true)
    expect(onlyText(encoded.content)).toBe('76077544')
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...nine, text: '7607 7544' },
    })
    expect(onlyText(decoded.content)).toBe('31415678')
    const stranger = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...nine, text: '7609' },
    })
    expect(stranger.isError).toBe(true)
    expect(onlyText(stranger.content)).toContain('"9" (U+0039) at character 4')
  })

  it('discovers and executes A1Z26 in both forms through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'a1z26' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(a1z26) — classical, fractionation')
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'a1z26', text: '1.12.16.8.1.2.5.20', separator: '.' },
    })
    expect(decoded.isError).not.toBe(true)
    expect(onlyText(decoded.content)).toBe('ALPHABET')
    const digits = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'a1z26', text: 'bef', zero: 'o' },
    })
    expect(digits.isError).not.toBe(true)
    expect(onlyText(digits.content)).toBe('256')
    const outside = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'a1z26', text: '8-27' },
    })
    expect(outside.isError).toBe(true)
    expect(onlyText(outside.content)).toContain('Invalid A1Z26 number 27 at character 3')
  })

  it('discovers and executes the book cipher through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'book' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(book) — classical, homophonic')
    const book = 'one two three\n\nfour five\fsix seven\neight nine ten'
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'book', text: '2-2-3 1-2-1', book, address: 'page-line-word' },
    })
    expect(decoded.isError).not.toBe(true)
    expect(onlyText(decoded.content)).toBe('ten four')
    const letters = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'book', text: 'toe', book, pick: 'letter', start: 0 },
    })
    expect(letters.isError).not.toBe(true)
    expect(onlyText(letters.content)).toBe('1 0 7')
    const inside = await client.callTool({
      name: 'ciphers_decode',
      arguments: {
        cipher: 'book',
        text: '2-2-3-1 1-1-3-5',
        book,
        address: 'page-line-word-letter',
      },
    })
    expect(inside.isError).not.toBe(true)
    expect(onlyText(inside.content)).toBe('TE')
    const clash = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'book', text: 'toe', book, address: 'line-letter', pick: 'word' },
    })
    expect(clash.isError).toBe(true)
    expect(onlyText(clash.content)).toContain('pick=word: must be letter with address line-letter')
    const outside = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'book', text: '11', book },
    })
    expect(outside.isError).toBe(true)
    expect(onlyText(outside.content)).toContain('Word 11 is out of range: the book has 10 words')
  })

  it('discovers and executes the route transposition along its path through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'route' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(route) — classical, transposition')
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: {
        cipher: 'route',
        text: 'WRIORFEOE\nEESVELANJ\nADCEDETCX',
        width: 9,
        corner: 'top-right',
        path: 'spiral-clockwise',
      },
    })
    expect(decoded.isError).not.toBe(true)
    expect(onlyText(decoded.content)).toBe('EJXCTEDECDAEWRIORFEONALEVSE')
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'route', text: 'ABCDHLKJIEFG', width: 4 },
    })
    expect(encoded.isError).not.toBe(true)
    expect(onlyText(encoded.content)).toBe('ABCDEFGHIJKL')
  })

  /** The archive comes from encode itself; the cipher tests check what zip and 7-Zip write. */
  it('opens a ZipCrypto archive through the protocol and lists its entries on a miss', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'zipcrypto' } })
    expect(onlyText(info.content)).toContain('(zipcrypto) — stream, crc-lcg')
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'zipcrypto', key: 'causality', text: 'hi', entry: 'hi.txt' },
    })
    const archive = onlyText(encoded.content)
    expect(archive).toMatch(/^504b0304/)
    const back = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'zipcrypto', keys: '7067b779 926e6526 2b5a64b9', text: archive },
    })
    expect(onlyText(back.content)).toBe('hi')
    const missing = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'zipcrypto', text: archive },
    })
    expect(missing.isError).toBe(true)
    expect(onlyText(missing.content)).toContain('Encrypted entries: hi.txt (deflate, 2 bytes)')
    const wrong = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'zipcrypto', key: 'wrong83', text: archive },
    })
    expect(wrong.isError).toBe(true)
    expect(onlyText(wrong.content)).toContain('[zipcrypto] Wrong password: ')
  })

  /** RFC 2144 B.1 for CAST5, and the GnuPG 2.4 message from issue #165 for OpenPGP. */
  it('discovers and executes CAST5 and OpenPGP through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'openpgp' } })
    expect(onlyText(info.content)).toContain('(openpgp) — block, substitution-permutation')
    const decoded = await client.callTool({
      name: 'ciphers_decode',
      arguments: {
        cipher: 'openpgp',
        key: 'causality',
        text: `-----BEGIN PGP MESSAGE-----

jA0ECQMKHwVT8OzL5gn90lIBzGgrwInQTM+5oFODSD8QMJaarJsJ7kftcv4jWWpP
2I2U9qLHZ83SeQ1Ol/i2LutftOLxNYgigrj7idS03A5V1Psl+79RGbXLRDgSQKr7
Co2B
=XQvs
-----END PGP MESSAGE-----`,
      },
    })
    expect(decoded.isError).not.toBe(true)
    expect(onlyText(decoded.content)).toBe('follow the white rabbit\n')
    const encoded = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'openpgp', key: 'k', text: 'hi', algorithm: 'cast5', count: 1024 },
    })
    expect(onlyText(encoded.content)).toMatch(/^-----BEGIN PGP MESSAGE-----\n/)
    const back = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'openpgp', key: 'k', text: onlyText(encoded.content) },
    })
    expect(onlyText(back.content)).toBe('hi')
    const wrong = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'openpgp', key: 'wrong', text: onlyText(encoded.content) },
    })
    expect(wrong.isError).toBe(true)
    expect(onlyText(wrong.content)).toContain('Wrong passphrase')
    const cast5 = await client.callTool({
      name: 'ciphers_encode',
      arguments: {
        cipher: 'cast5',
        key: '01234567 12345678 23456789 3456789a',
        text: 'ATTACK AT DAWN',
      },
    })
    expect(onlyText(cast5.content)).toBe('585e13962a59ed5274e0ab1bdcde47a3')
  })

  it('discovers and executes Triple DES CBC with an IV through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'triple-des-cbc' },
    })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(triple-des-cbc) — block, feistel')
    expect(onlyText(info.content)).toContain('iv (string, required)')
    const key = '0123456789abcdef23456789abcdef01456789abcdef0123'
    const iv = '0001020304050607'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '00b5ad5bd633b1c564e7e3a858c7d8fb'],
      ['ciphers_decode', '00b5ad5bd633b1c564e7e3a858c7d8fb', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'triple-des-cbc', text, key, iv },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const aesSizedIv = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'triple-des-cbc', text: 'abc', key, iv: '00'.repeat(16) },
    })
    expect(aesSizedIv.isError).toBe(true)
    expect(onlyText(aesSizedIv.content)).toContain('16 hex digits')
  })

  it('discovers and executes Rijndael with a wider block through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'rijndael' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(rijndael) — block, substitution-permutation')
    expect(onlyText(info.content)).toContain('blockSize (number, default=128)')
    const key = '2b7e151628aed2a6abf7158809cf4f3c762e7160f38b4da56a784d9045190cfe'
    const ciphertext = '4e0085db1697ce5f34911401d53bc05637a158856ca148bb212050ebfd20d208'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', ciphertext],
      ['ciphers_decode', ciphertext, 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'rijndael', text, key, blockSize: 256 },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const oddBlock = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'rijndael', text: 'abc', key, blockSize: 512 },
    })
    expect(oddBlock.isError).toBe(true)
  })

  it('discovers and executes AES-CBC with an IV through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes-cbc' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('iv (string, required)')
    const key = '2b7e151628aed2a6abf7158809cf4f3c'
    const iv = '000102030405060708090a0b0c0d0e0f'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '9bae05a967f1cf1d7d3601f7ef8b4d79'],
      ['ciphers_decode', '9bae05a967f1cf1d7d3601f7ef8b4d79', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'aes-cbc', text, key, iv },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const badIv = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'aes-cbc', text: 'abc', key, iv: '00' },
    })
    expect(badIv.isError).toBe(true)
    expect(onlyText(badIv.content)).toContain('iv')
  })

  it('discovers and executes AES-CFB with a segment through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes-cfb' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('segment (number, default=128)')
    const key = '2b7e151628aed2a6abf7158809cf4f3c'
    const iv = '000102030405060708090a0b0c0d0e0f'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', '11585d087981d10c0863f5b2c8dd'],
      ['ciphers_decode', '11585d087981d10c0863f5b2c8dd', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'aes-cfb', text, key, iv, segment: 8 },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const badSegment = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'aes-cfb', text: 'abc', key, iv, segment: 64 },
    })
    expect(badSegment.isError).toBe(true)
    expect(onlyText(badSegment.content)).toContain('segment')
  })

  it('discovers and executes AES-OFB through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes-ofb' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('OFB mode')
    const key = '2b7e151628aed2a6abf7158809cf4f3c'
    const iv = 'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', 'add88b32db2b5cf1a6f25234bdd0'],
      ['ciphers_decode', 'add88b32db2b5cf1a6f25234bdd0', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'aes-ofb', text, key, iv },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes AES-CTR through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes-ctr' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('Initial counter block')
    const key = '2b7e151628aed2a6abf7158809cf4f3c'
    const iv = 'f'.repeat(32)
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', 'cba6d24001bca6b55d10385b6830'],
      ['ciphers_decode', 'cba6d24001bca6b55d10385b6830', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'aes-ctr', text, key, iv },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes AES-CCM through the protocol, and refuses a forged tag', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes-ccm' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('nonce (string, required)')
    expect(onlyText(info.content)).toContain('tagLength (number, default=128)')
    const args = {
      cipher: 'aes-ccm',
      key: '2b7e151628aed2a6abf7158809cf4f3c',
      nonce: '000102030405060708090a0b',
      aad: '46524f4d3a2048512e',
    }
    const ciphertext = '9038dc3aa03594330d2d4dca3cb9a5038633d04da4a01f58149f30e75d5b'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', ciphertext],
      ['ciphers_decode', ciphertext, 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { ...args, text } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const forged = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...args, text: ciphertext, aad: '' },
    })
    expect(forged.isError).toBe(true)
    expect(onlyText(forged.content)).toContain('Tag does not match')
    const badTag = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...args, text: 'abc', tagLength: 40 },
    })
    expect(badTag.isError).toBe(true)
    expect(onlyText(badTag.content)).toContain('tagLength')
  })

  it('discovers and executes AES-OCB through the protocol, and refuses a forged tag', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes-ocb' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('RFC 7253')
    expect(onlyText(info.content)).toContain('nonce (string, required)')
    const args = {
      cipher: 'aes-ocb',
      key: '2b7e151628aed2a6abf7158809cf4f3c',
      nonce: '000102030405060708090a0b',
      aad: '46524f4d3a2048512e',
    }
    const ciphertext = 'd5ae8f2ca0693c898f8e7466703c3540bc18319e6bafb89838f7fa34b4d6'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', ciphertext],
      ['ciphers_decode', ciphertext, 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { ...args, text } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const forged = await client.callTool({
      name: 'ciphers_decode',
      arguments: { ...args, text: ciphertext, aad: '' },
    })
    expect(forged.isError).toBe(true)
    expect(onlyText(forged.content)).toContain('Tag does not match')
    // 32 passes the shared schema for AES-CCM, and AES-OCB still names it.
    const badTag = await client.callTool({
      name: 'ciphers_encode',
      arguments: { ...args, text: 'abc', tagLength: 32 },
    })
    expect(badTag.isError).toBe(true)
    expect(onlyText(badTag.content)).toContain('must be 64, 96 or 128')
  })

  it('discovers and executes AES-LRW with a tweak through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes-lrw' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('tweak (string, default=1)')
    const key = '4562ac25f828176d4c268414b5680185258e2a05e73e9d03ee5a830ccc094c87'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', 'f319a072c39498a1e0c6c8213de2facc'],
      ['ciphers_decode', 'f319a072c39498a1e0c6c8213de2facc', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'aes-lrw', text, key, tweak: '200000000' },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const badTweak = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'aes-lrw', text: 'abc', key, tweak: 'xyz' },
    })
    expect(badTweak.isError).toBe(true)
    expect(onlyText(badTweak.content)).toContain('tweak')
  })

  it('discovers and executes AES-XTS with a data unit number through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'aes-xts' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('tweak (string, default=0)')
    const key = '2718281828459045235360287471352631415926535897932384626433832795'
    const ciphertext = '1595ed5d615365828e75081606ce0e5c05844b6b4656b7594ebd1f24e6'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN FROM THE NORTH', ciphertext],
      ['ciphers_decode', ciphertext, 'ATTACK AT DAWN FROM THE NORTH'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'aes-xts', text, key, tweak: '5' },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const short = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'aes-xts', text: 'ATTACK AT DAWN', key },
    })
    expect(short.isError).toBe(true)
    expect(onlyText(short.content)).toContain('at least one whole block, 16 bytes')
  })

  it('discovers and executes AES-CBC-MAC through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'aes-cbc-mac' },
    })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('ISO/IEC 9797-1 MAC Algorithm 1')
    const key = '2b7e151628aed2a6abf7158809cf4f3c'
    const signed = '41545441434b204154204441574e1efa905609cc69e415825c40f80501e8'
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACK AT DAWN', signed],
      ['ciphers_decode', signed, 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'aes-cbc-mac', text, key },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const forged = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'aes-cbc-mac', text: signed.replace('4441574e', '4455534b'), key },
    })
    expect(forged.isError).toBe(true)
    expect(onlyText(forged.content)).toContain('Tag does not match')
  })

  it('discovers and executes the 24-letter Bacon table through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'bacon' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('letters (number, default=26)')
    expect(onlyText(info.content)).toContain('lowercase (string, default=none)')
    for (const [name, text, expected] of [
      ['ciphers_encode', 'KNIGHT', 'ABAABABBAAABAAAAABBAAABBBBAABA'],
      ['ciphers_decode', 'ABAABABBAAABAAAAABBAAABBBBAABA', 'KNIGHT'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'bacon', text, letters: 24 },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const carried = await client.callTool({
      name: 'ciphers_decode',
      arguments: { cipher: 'bacon', text: 'heLLO, wOrld!', lowercase: 'A' },
    })
    expect(carried.isError).not.toBe(true)
    expect(onlyText(carried.content)).toBe('HI')
  })

  it('discovers and executes Autokey through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'ciphers_info', arguments: { cipher: 'autokey' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('key (string, required)')
    for (const [name, text, expected] of [
      ['ciphers_encode', 'ATTACKATDAWN', 'QNXEPVYTWTWP'],
      ['ciphers_decode', 'QNXEPVYTWTWP', 'ATTACKATDAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'autokey', text, key: 'QUEENLY' },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('validates arguments before execution', async () => {
    const client = await connectTestClient()

    for (const [field, arguments_] of [
      ['shift', { cipher: 'caesar', text: 'abc', shift: 26 }],
      ['rails', { cipher: 'rail-fence', text: 'abc', rails: 10_001 }],
      ['a', { cipher: 'affine', text: 'abc', a: 2 }],
      ['period', { cipher: 'bifid', text: 'abc', period: 10_001 }],
      ['letters', { cipher: 'bacon', text: 'abc', letters: 25 }],
    ] as const) {
      const response = await client.callTool({
        name: 'ciphers_encode',
        arguments: arguments_,
      })

      expect(response.isError).toBe(true)
      expect(onlyText(response.content)).toContain(`Invalid arguments at /${field}`)
    }

    for (const [field, arguments_] of [
      ['key', { cipher: 'vigenere', text: 'abc' }],
      ['key', { cipher: 'beaufort', text: 'abc' }],
      ['key', { cipher: 'autokey', text: 'abc' }],
      ['key', { cipher: 'autokey', text: 'abc', key: '123' }],
      ['key', { cipher: 'beaufort', text: 'abc', key: '123' }],
      ['key', { cipher: 'alberti', text: 'abc', period: 5 }],
      ['period', { cipher: 'alberti', text: 'abc', key: 'KEY' }],
      ['key', { cipher: 'alberti', text: 'abc', key: '123', period: 5 }],
      ['key', { cipher: 'vigenere', text: 'abc', key: '123' }],
      ['key', { cipher: 'playfair', text: 'abc' }],
      ['key', { cipher: 'playfair', text: 'abc', key: '123' }],
      ['key', { cipher: 'substitution', text: 'abc' }],
      ['key', { cipher: 'substitution', text: 'abc', key: '123' }],
      ['key', { cipher: 'four-square', text: 'abc', secondKey: 'KEY' }],
      ['secondKey', { cipher: 'four-square', text: 'abc', key: 'KEY' }],
      ['key', { cipher: 'four-square', text: 'abc', key: '123', secondKey: 'KEY' }],
      ['secondKey', { cipher: 'four-square', text: 'abc', key: 'KEY', secondKey: '123' }],
      ['key', { cipher: 'hill', text: 'abc' }],
      ['key', { cipher: 'hill', text: 'abc', key: 'DDCFX' }],
      ['key', { cipher: 'nihilist', text: '37', square: 'ZEBRAS' }],
      ['key', { cipher: 'nihilist', text: '37', key: '123' }],
      ['key', { cipher: 'porta', text: 'abc' }],
      ['key', { cipher: 'gronsfeld', text: 'abc' }],
      ['key', { cipher: 'gronsfeld', text: 'abc', key: '12a' }],
      ['key', { cipher: 'running-key', text: 'abc' }],
      ['key', { cipher: 'running-key', text: 'abc', key: '123' }],
      ['key', { cipher: 'porta', text: 'abc', key: '123' }],
      ['key', { cipher: 'quagmire-1', text: 'abc', indicator: 'FLOWER' }],
      ['indicator', { cipher: 'quagmire-2', text: 'abc', key: 'SPRING' }],
      ['indicator', { cipher: 'quagmire-3', text: 'abc', key: 'SPRING', indicator: '123' }],
      ['secondKey', { cipher: 'quagmire-4', text: 'abc', key: 'SENSORY', indicator: 'EXTRA' }],
      [
        'secondKey',
        { cipher: 'quagmire-4', text: 'abc', key: 'SENSORY', secondKey: '1', indicator: 'EXTRA' },
      ],
      ['secondKey', { cipher: 'chaocipher', text: 'abc', key: 'CHAOS' }],
      ['key', { cipher: 'chaocipher', text: 'abc', key: '1', secondKey: 'BYRNE' }],
      ['key', { cipher: 'fractionated-morse', text: 'abc' }],
      ['key', { cipher: 'fractionated-morse', text: 'abc', key: '1' }],
      ['key', { cipher: 'tridigital', text: 'abc', secondKey: 'DRAGONFLY' }],
      ['secondKey', { cipher: 'tridigital', text: 'abc', key: 'NOVELCRAFT' }],
      ['key', { cipher: 'aes', text: 'abc' }],
      ['key', { cipher: 'aes', text: 'abc', key: 'YELLOW SUBMARINE' }],
      ['key', { cipher: 'aes', text: 'abc', key: '00'.repeat(20) }],
      ['key', { cipher: 'aes-cbc', text: 'abc', iv: '00'.repeat(16) }],
      ['iv', { cipher: 'aes-cbc', text: 'abc', key: '00'.repeat(16) }],
      ['iv', { cipher: 'aes-cbc', text: 'abc', key: '00'.repeat(16), iv: '' }],
      ['key', { cipher: 'aes-cfb', text: 'abc', iv: '00'.repeat(16) }],
      ['iv', { cipher: 'aes-cfb', text: 'abc', key: '00'.repeat(16) }],
      ['key', { cipher: 'aes-ofb', text: 'abc', iv: '00'.repeat(16) }],
      ['iv', { cipher: 'aes-ofb', text: 'abc', key: '00'.repeat(16) }],
      ['key', { cipher: 'aes-ctr', text: 'abc', iv: '00'.repeat(16) }],
      ['iv', { cipher: 'aes-ctr', text: 'abc', key: '00'.repeat(16) }],
      ['key', { cipher: 'aes-ccm', text: 'abc', nonce: '00'.repeat(12) }],
      ['nonce', { cipher: 'aes-ccm', text: 'abc', key: '00'.repeat(16) }],
      ['nonce', { cipher: 'aes-ccm', text: 'abc', key: '00'.repeat(16), nonce: '' }],
      ['key', { cipher: 'aes-ocb', text: 'abc', nonce: '00'.repeat(12) }],
      ['nonce', { cipher: 'aes-ocb', text: 'abc', key: '00'.repeat(16) }],
      ['nonce', { cipher: 'aes-ocb', text: 'abc', key: '00'.repeat(16), nonce: '' }],
      ['key', { cipher: 'aes-lrw', text: 'abc' }],
      ['key', { cipher: 'aes-lrw', text: 'abc', key: '00'.repeat(16) }],
      ['key', { cipher: 'aes-xts', text: 'abc' }],
      ['key', { cipher: 'aes-xts', text: 'abc', key: '00'.repeat(48) }],
      ['key', { cipher: 'aes-cbc-mac', text: 'abc' }],
      ['key', { cipher: 'aes-cbc-mac', text: 'abc', key: '00'.repeat(15) }],
      ['key', { cipher: 'rijndael', text: 'abc' }],
      ['key', { cipher: 'rijndael', text: 'abc', key: '00'.repeat(18) }],
      ['key', { cipher: 'des', text: 'abc' }],
      ['key', { cipher: 'des', text: 'abc', key: '00'.repeat(7) }],
      ['key', { cipher: 'des', text: 'abc', key: '00'.repeat(16) }],
      ['key', { cipher: 'desx', text: 'abc' }],
      ['key', { cipher: 'desx', text: 'abc', key: '00'.repeat(8) }],
      ['key', { cipher: 'desx', text: 'abc', key: '00'.repeat(16) }],
      ['key', { cipher: 'triple-des', text: 'abc' }],
      ['key', { cipher: 'triple-des', text: 'abc', key: '00'.repeat(32) }],
      ['key', { cipher: 'triple-des-cbc', text: 'abc', iv: '00'.repeat(8) }],
      ['key', { cipher: 'triple-des-cbc', text: 'abc', key: '00'.repeat(32), iv: '00'.repeat(8) }],
      ['iv', { cipher: 'triple-des-cbc', text: 'abc', key: '00'.repeat(16) }],
      ['iv', { cipher: 'triple-des-cbc', text: 'abc', key: '00'.repeat(16), iv: '' }],
      ['key', { cipher: 'blowfish', text: 'abc' }],
      ['key', { cipher: 'blowfish', text: 'abc', key: '00'.repeat(3) }],
      ['key', { cipher: 'blowfish', text: 'abc', key: '0'.repeat(9) }],
      ['key', { cipher: 'blowfish', text: 'abc', key: '00'.repeat(57) }],
      ['key', { cipher: 'idea', text: 'abc' }],
      ['key', { cipher: 'idea', text: 'abc', key: '00'.repeat(15) }],
      ['key', { cipher: 'idea', text: 'abc', key: '00'.repeat(17) }],
      ['key', { cipher: 'lucifer', text: 'abc' }],
      ['key', { cipher: 'lucifer', text: 'abc', key: '00'.repeat(15) }],
      ['key', { cipher: 'lucifer', text: 'abc', key: '00'.repeat(17) }],
      ['key', { cipher: 'mars', text: 'abc' }],
      ['key', { cipher: 'mars', text: 'abc', key: '00'.repeat(18) }],
      ['key', { cipher: 'mars', text: 'abc', key: '00'.repeat(60) }],
      ['key', { cipher: 'serpent', text: 'abc' }],
      ['key', { cipher: 'serpent', text: 'abc', key: '00'.repeat(20) }],
      ['key', { cipher: 'serpent', text: 'abc', key: '00'.repeat(33) }],
      ['key', { cipher: 'aes-passphrase', text: 'abc' }],
      ['keyLength', { cipher: 'aes-passphrase', text: 'abc', key: 'k', keyLength: 100 }],
      ['iterations', { cipher: 'aes-passphrase', text: 'abc', key: 'k', iterations: 100_001 }],
      ['digest', { cipher: 'aes-passphrase', text: 'abc', key: 'k', digest: 'sha512' }],
      ['key', { cipher: 'openpgp', text: 'abc' }],
      ['key', { cipher: 'cast5', text: 'abc', key: '00'.repeat(4) }],
      ['key', { cipher: 'camellia', text: 'abc' }],
      ['key', { cipher: 'camellia', text: 'abc', key: '00'.repeat(20) }],
      ['key', { cipher: 'camellia', text: 'abc', key: '00'.repeat(33) }],
      ['key', { cipher: 'aria', text: 'abc' }],
      ['key', { cipher: 'aria', text: 'abc', key: '00'.repeat(20) }],
      ['key', { cipher: 'aria', text: 'abc', key: '00'.repeat(33) }],
      ['key', { cipher: 'sm4', text: 'abc' }],
      ['key', { cipher: 'sm4', text: 'abc', key: '00'.repeat(24) }],
      ['algorithm', { cipher: 'openpgp', text: 'abc', key: 'k', algorithm: 'twofish' }],
      ['count', { cipher: 'openpgp', text: 'abc', key: 'k', count: 1023 }],
      ['key', { cipher: 'rabbit', text: 'abc' }],
      ['key', { cipher: 'rabbit', text: 'abc', key: '00'.repeat(15) }],
      ['key', { cipher: 'rabbit', text: 'abc', key: '00'.repeat(17) }],
      ['endian', { cipher: 'rabbit', text: 'abc', key: '00'.repeat(16), endian: 'middle' }],
      ['key', { cipher: 'rc4', text: 'abc' }],
      ['key', { cipher: 'rc4', text: 'abc', key: '0' }],
      ['key', { cipher: 'rc4', text: 'abc', key: '00'.repeat(257) }],
      ['key', { cipher: 'xor', text: 'abc' }],
      ['key', { cipher: 'xor', text: 'abc', key: '494' }],
      ['bytes', { cipher: 'xor', text: 'abc', key: '49', bytes: 'raw' }],
      ['blanks', { cipher: 'straddling-checkerboard', text: 'abc', blanks: '1' }],
      ['symbol', { cipher: 'trifid', text: 'abc', symbol: 'A' }],
      ['symbol', { cipher: 'trifid', text: 'abc', symbol: '..' }],
      ['alphabet', { cipher: 'hill', text: 'abc', key: 'BAAB', alphabet: 'A' }],
      ['alphabet', { cipher: 'hill', text: 'abc', key: 'BAAB', alphabet: 'A B' }],
      ['alphabet', { cipher: 'hill', text: 'abc', key: 'BAAB', alphabet: 'A'.repeat(1001) }],
      ['separator', { cipher: 'a1z26', text: 'abc', separator: '' }],
      ['separator', { cipher: 'a1z26', text: 'abc', separator: '-1-' }],
      ['separator', { cipher: 'a1z26', text: 'abc', separator: '-'.repeat(11) }],
      ['zero', { cipher: 'a1z26', text: 'abc', zero: 'a' }],
      ['zero', { cipher: 'a1z26', text: 'abc', zero: 'oo' }],
      ['book', { cipher: 'book', text: '1' }],
      ['book', { cipher: 'book', text: '1', book: '' }],
      ['address', { cipher: 'book', text: '1', book: 'a', address: 'chapter' }],
      ['pick', { cipher: 'book', text: '1', book: 'a', pick: 'line' }],
      ['start', { cipher: 'book', text: '1', book: 'a', start: 2 }],
      ['width', { cipher: 'route', text: 'abc' }],
      ['width', { cipher: 'route', text: 'abc', width: 1 }],
      ['corner', { cipher: 'route', text: 'abc', width: 2, corner: 'middle' }],
      ['path', { cipher: 'route', text: 'abc', width: 2, path: 'diagonal' }],
      ['keys', { cipher: 'zipcrypto', text: 'abc', keys: 'c4038591 d5ff449d' }],
      ['method', { cipher: 'zipcrypto', text: 'abc', key: 'k', method: 'bzip2' }],
    ] as const) {
      const response = await client.callTool({
        name: 'ciphers_encode',
        arguments: arguments_,
      })

      expect(response.isError).toBe(true)
      expect(onlyText(response.content)).toContain(`Invalid arguments at /${field}`)
    }

    const unrelatedSchema = await client.callTool({
      name: 'ciphers_frequency',
      arguments: { cipher: 'vigenere' },
    })
    expect(unrelatedSchema.isError).toBe(true)
    expect(onlyText(unrelatedSchema.content)).toContain('required properties text')
    expect(onlyText(unrelatedSchema.content)).not.toContain('/key')
  })

  it('refuses an argument the tool does not take and names every failure', async () => {
    const client = await connectTestClient()

    const response = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'caesar', text: 'abc', shift: 26, shfit: 1 },
    })

    expect(response.isError).toBe(true)
    expect(onlyText(response.content).split('\n')).toEqual([
      expect.stringMatching(
        /^Invalid arguments: unknown property "shfit"; takes cipher, text, shift, /,
      ),
      'Invalid arguments at /shift: must be <= 25',
    ])
  })

  it('describes ciphers for discovery', async () => {
    const client = await connectTestClient()

    const list = await client.callTool({ name: 'ciphers_info', arguments: {} })
    expect(list.isError).not.toBe(true)
    const [listEntry] = list.content as [{ type: string; text: string }]
    expect(listEntry.text).toMatch(/^classical:\n {2}caesar \[substitution-shift\]/)
    expect(listEntry.text).toContain('  enigma [rotor]')
    expect(listEntry.text).toContain('\nblock:\n  aes [substitution-permutation]')
    expect(listEntry.text).toContain('\nstream:\n  rabbit [arx]')

    const filtered = await client.callTool({
      name: 'ciphers_info',
      arguments: { category: 'classical' },
    })
    expect(filtered.isError).not.toBe(true)
    expect(onlyText(filtered.content)).toContain('  enigma [rotor]')
    expect(onlyText(filtered.content)).not.toMatch(/\baes\b/)

    const block = await client.callTool({ name: 'ciphers_info', arguments: { category: 'block' } })
    expect(block.isError).not.toBe(true)
    expect(onlyText(block.content)).toMatch(
      /^block:\n {2}aes \[substitution-permutation\].*\n {2}aes-cbc \[substitution-permutation\].*\n {2}aes-cfb \[substitution-permutation\].*\n {2}aes-ofb \[substitution-permutation\].*\n {2}aes-ctr \[substitution-permutation\].*\n {2}aes-ccm \[substitution-permutation\].*\n {2}aes-ocb \[substitution-permutation\].*\n {2}aes-lrw \[substitution-permutation\].*\n {2}aes-xts \[substitution-permutation\].*\n {2}aes-cbc-mac \[substitution-permutation\].*\n {2}aes-passphrase \[substitution-permutation\].*\n {2}rijndael \[substitution-permutation\].*\n {2}des \[feistel\].*\n {2}desx \[feistel\].*\n {2}triple-des \[feistel\].*\n {2}triple-des-cbc \[feistel\].*\n {2}blowfish \[feistel\].*\n {2}idea \[lai-massey\].*\n {2}lucifer \[feistel\].*\n {2}mars \[feistel\].*\n {2}serpent \[substitution-permutation\]/,
    )
    expect(onlyText(block.content)).not.toContain('rabbit')

    const stream = await client.callTool({
      name: 'ciphers_info',
      arguments: { category: 'stream' },
    })
    expect(stream.isError).not.toBe(true)
    expect(onlyText(stream.content)).toMatch(/^stream:\n {2}rabbit \[arx\] — Rabbit stream cipher/)
    expect(onlyText(stream.content)).toContain('\n  rc4 [permutation] — RC4 stream cipher')
    expect(onlyText(stream.content)).toContain('\n  xor [polyalphabetic] — Repeating-key XOR')

    const unknownCategory = await client.callTool({
      name: 'ciphers_info',
      arguments: { category: 'hash' },
    })
    expect(unknownCategory.isError).toBe(true)
    expect(onlyText(unknownCategory.content)).toContain('Invalid arguments at /category')

    const detail = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'playfair' },
    })
    expect(detail.isError).not.toBe(true)
    const [detailEntry] = detail.content as [{ type: string; text: string }]
    expect(detailEntry.text).toContain('(playfair) — classical, digraph')
    expect(detailEntry.text).toContain('key (string, required)')

    const unknown = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'missing' },
    })
    expect(unknown.isError).toBe(true)
    expect(unknown.content).toEqual([
      {
        type: 'text',
        text: `ciphers_info failed: Unknown cipher: "missing". Registered ciphers: ${builtinCiphers.join(', ')}`,
      },
    ])

    const oversized = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'x'.repeat(33) },
    })
    expect(oversized.isError).toBe(true)
    expect(onlyText(oversized.content)).toContain('Invalid arguments at /cipher')
  })

  it('serves ciphers registered beyond the built-ins', async () => {
    class CustomTest extends Cipher {
      name(): string {
        return 'custom-test'
      }

      info(): CipherInfo {
        return {
          name: 'custom-test',
          label: 'Custom Test',
          description: 'Registry round-trip probe',
          category: 'classical',
          family: 'transposition',
          selfInverse: true,
          worksOn: 'all characters, unchanged',
          options: [],
        }
      }

      encode(text: string): CipherResult {
        return { text, cipher: 'custom-test', operation: 'encode', options: {} }
      }

      decode(text: string): CipherResult {
        return { text, cipher: 'custom-test', operation: 'decode', options: {} }
      }
    }
    register('custom-test', CustomTest)
    const client = await connectTestClient()

    const list = await client.callTool({ name: 'ciphers_info', arguments: {} })
    const [listEntry] = list.content as [{ type: string; text: string }]
    expect(listEntry.text).toContain('custom-test [transposition]')

    const detail = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'custom-test' },
    })
    expect(detail.isError).not.toBe(true)
    const [detailEntry] = detail.content as [{ type: string; text: string }]
    expect(detailEntry.text).toContain('Custom Test (custom-test)')
  })

  it('reports the index of coincidence over the protocol', async () => {
    const client = await connectTestClient()

    const frequency = await client.callTool({
      name: 'ciphers_frequency',
      arguments: { text: 'AAAA' },
    })
    expect(frequency.isError).not.toBe(true)
    const [entry] = frequency.content as [{ type: string; text: string }]
    expect(entry.text).toContain('Index of coincidence: 1.0000 (en plaintext ~0.065')
    expect(entry.text).toContain(
      'Quadgram fit: -12.75 (en plaintext ~-9.44, random letters ~-13.95)',
    )

    const polish = await client.callTool({
      name: 'ciphers_frequency',
      arguments: { text: 'AAAA', lang: 'pl' },
    })
    const [polishEntry] = polish.content as [{ type: string; text: string }]
    expect(polishEntry.text).toContain('(pl plaintext ~0.057, uniform random ~0.038)')
    expect(polishEntry.text).not.toContain('Quadgram fit')
  })

  it('ranks Vigenère key lengths over the protocol', async () => {
    const client = await connectTestClient()
    const text =
      'CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBWRVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWIAKLXFPSKAUTEMNDCMGTSXMXBTUIADNGMGPSRELXNJELXVRVPRTULHDNQWTWDTYGBPHXTFALJHASVBFXNGLLCHRZBWELEKMSJIKNBHWRJGNMGJSGLXFEYPHAGNRBIEQJTAMRVLCRREMNDGLXRRIMGNSNRWCHRQHAEYEVTAQEBBIPEEWEVKAKOEWADREMXMTBHHCHRTKDNVRZCHRCLQOHPWQAIIWXNRMGWOIIFKEE'

    const result = await client.callTool({ name: 'ciphers_period_estimate', arguments: { text } })
    expect(result.isError).not.toBe(true)
    const lines = onlyText(result.content).split('\n')
    expect(lines[0]).toBe(
      'Key length estimate (313 letters, lang=en, lengths 2-20), most likely first:',
    )
    expect(lines.slice(2, 5)).toEqual([
      '  length  5  IoC 0.0666  key JANET',
      '  length 10  IoC 0.0663  key JANETJANET',
      expect.stringMatching(/^ {2}length 15 {2}IoC 0\.\d{4} {2}key [A-Z]{15}$/),
    ])
    expect(lines).toContain('  (9 more lengths ranked lower)')
    expect(lines).toContain(
      'Kasiski: 12 distances between repeated trigrams; factors dividing the most: 5 (10), 2 (4), 10 (4), 7 (3), 3 (2).',
    )

    const short = await client.callTool({
      name: 'ciphers_period_estimate',
      arguments: { text: 'abc', lang: 'pl' },
    })
    expect(onlyText(short.content)).toBe('Need at least 4 A-Z letters for a key length, got 3.')

    for (const maxPeriod of [1, 101, 2.5]) {
      const refused = await client.callTool({
        name: 'ciphers_period_estimate',
        arguments: { text, maxPeriod },
      })
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain('Invalid arguments at /maxPeriod')
    }
  })

  it('takes a substitution key with every cell unknown', async () => {
    const client = await connectTestClient()
    const response = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'substitution', text: 'Ab, c!', key: '?'.repeat(26) },
    })
    expect(response.isError).toBeFalsy()
    expect(onlyText(response.content)).toBe('??, ?!')
  })

  it('names the determinant of a Hill key nothing could decode', async () => {
    const client = await connectTestClient()
    const response = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'hill', text: 'HELP', key: 'ABCD' },
    })
    expect(response.isError).toBe(true)
    expect(onlyText(response.content)).toContain(
      'has determinant 24 mod 26, which shares a factor with 26',
    )
  })

  it('guesses the cipher family over the protocol', async () => {
    const client = await connectTestClient()
    const guess = async (args: Readonly<Record<string, unknown>>) =>
      onlyText((await client.callTool({ name: 'ciphers_family_guess', arguments: args })).content)

    const affine = (
      await guess({ text: 'FMXVEDKAPHFERBNDKRXRSREFMORUDSDKDVSHVUFEDKAPRKDLYEVLRHHRH' })
    ).split('\n')
    expect(affine[0]).toBe(
      'Family guess (57 characters, 57 A-Z letters, lang=en, IoC 0.0627 (en plaintext ~0.065, uniform random ~0.038)), most likely first:',
    )
    expect(affine.slice(2, 5)).toEqual([
      '1. substitution-multiplicative, substitution-shift, substitution-reflection (medium): affine, caesar, atbash',
      '   IoC 0.0627 is close to en plaintext, one alphabet throughout, and affine a=3 b=5 makes the letters fit en.',
      '   Next: ciphers_decode with cipher affine and a=3, b=5.',
    ])
    expect(affine.at(-1)).toBe('Candidates, not a verdict: only a decode that reads settles it.')

    expect(
      await guess({
        text: 'CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBWRVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWIAKLXFPSKAUTEMNDCMGTSXMXBTUIADNGMGPSRELXNJELXVRVPRTULHDNQWTWDTYGBPHXTFALJHASVBFXNGLLCHRZBWELEKMSJIKNBHWRJGNMGJSGLXFEYPHAGNRBIEQJTAMRVLCRREMNDGLXRRIMGNSNRWCHRQHAEYEVTAQEBBIPEEWEVKAKOEWADREMXMTBHHCHRTKDNVRZCHRCLQOHPWQAIIWXNRMGWOIIFKEE',
      }),
    ).toContain(
      'Next: ciphers_key_recover with cipher vigenere searches the key; ciphers_period_estimate shows the key lengths.',
    )
    const transposed = create('columnar').encode(
      'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex.',
      { key: 'BAKER' },
    ).text
    expect(await guess({ text: transposed })).toContain(
      'ciphers_key_recover with cipher columnar searches a columnar key.',
    )
    const mixed = create('substitution').encode(
      'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex.',
      { key: 'BAKER' },
    ).text
    expect(await guess({ text: mixed })).toContain(
      'Next: ciphers_key_recover with cipher substitution searches the mixed alphabet; ciphers_caesar_brute ranks all 25 shifts.',
    )
    expect(await guess({ text: '69c4e0d86a7b0430d8cdb78070b4c55a' })).toContain(
      'Next: ciphers_decode with cipher aes, which needs key.',
    )
    expect(await guess({ text: '23 42 45 11 41 42 22 15 12 15 41 42 33 16 42' })).toContain(
      'Next: ciphers_decode with cipher polybius, which needs alphabet.',
    )
    expect((await guess({ text: '72 69 76 76 79 32 87 79 82 76 68' })).split('\n')).toEqual([
      'Family guess (22 characters, 0 A-Z letters, lang=en), most likely first:',
      '',
      'Not a cipher by the look of it: decimal character codes that read "HELLO WORLD".',
      '   Every number is a printable ASCII code, and the letters they spell fit en.',
      '   Next: encodings_decode with encoding decimal, from @agntn/encodings.',
      '',
      '1. fractionation (low): nihilist',
      '   11 numbers from 22 to 110 and none ending in 1, as two square cells added together give.',
      '   Next: ciphers_decode with cipher nihilist, which needs key.',
      '2. fractionation (low): polybius',
      '   Digit pairs with a 9, so a 9×9 square. Polybius reads it with the alphabet that filled it. These numbers fit nihilist too.',
      '   Next: ciphers_decode with cipher polybius, which needs alphabet.',
      '',
      'Candidates, not a verdict: only a decode that reads settles it.',
    ])
    expect((await guess({ text: '072069076076079' })).split('\n')).toEqual([
      'Family guess (15 characters, 0 A-Z letters, lang=en), most likely first:',
      '',
      'Not a cipher by the look of it: decimal character codes that read "HELLO".',
      '   Every number is a printable ASCII code, and together they look like words.',
      '   Next: encodings_decode with encoding decimal, from @agntn/encodings.',
      '',
      'Candidates, not a verdict: only a decode that reads settles it.',
    ])
    const greeting = (await guess({ text: '48656c6c6f20776f726c6421' })).split('\n')
    expect(greeting.slice(2, 5)).toEqual([
      'Not a cipher by the look of it: hex that reads "Hello world!".',
      '   Every pair of hex digits is a printable ASCII code, and the letters they spell fit en.',
      '   Next: encodings_decode with encoding hex, from @agntn/encodings.',
    ])
    expect(greeting[6]).toMatch(/^1\. .+ \(low\): aes-ctr,/)
    expect((await guess({ text: 'aGVsbG8K' })).split('\n').slice(2, 5)).toEqual([
      'Not a cipher by the look of it: base64 that reads "hello\\n".',
      '   Every byte the base64 holds is a printable ASCII code or a line break, and together they look like words.',
      '   Next: encodings_decode with encoding base64, from @agntn/encodings.',
    ])
    const polish = '90 97 380 243 322 263 32 103 281 347 108 261 32 106 97 378 324'
    expect((await guess({ text: polish, lang: 'pl' })).split('\n').slice(2, 5)).toEqual([
      'Not a cipher by the look of it: decimal character codes that read "Za\u017C\u00F3\u0142\u0107 g\u0119\u015Bl\u0105 ja\u017A\u0144".',
      '   Every number, read as a code point, is a letter or a printable ASCII code, and the letters they spell fit pl.',
      '   Next: read each number as a Unicode code point. encodings_decode takes decimal as bytes.',
    ])
    const utf8 = '5a61c5bcc3b3c582c4872067c499c59b6cc485206a61c5bac584'
    expect((await guess({ text: utf8, lang: 'pl' })).split('\n').slice(2, 5)).toEqual([
      'Not a cipher by the look of it: hex that reads "Za\u017C\u00F3\u0142\u0107 g\u0119\u015Bl\u0105 ja\u017A\u0144".',
      '   Every character the hex spells in UTF-8 is a letter or a printable ASCII code, and the letters they spell fit pl.',
      '   Next: encodings_decode with encoding hex, from @agntn/encodings.',
    ])
    expect(await guess({ text: 'hi', lang: 'pl' })).toBe(
      'No family fits (2 characters, 2 A-Z letters): no layout this package knows, and too few letters for statistics.',
    )

    for (const args of [{ text: 'ABC', lang: 'de' }, { text: 'X'.repeat(100_001) }]) {
      const refused = await client.callTool({ name: 'ciphers_family_guess', arguments: args })
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain('Invalid arguments at /')
    }
  })

  it('probes a passphrase blob over the protocol', async () => {
    const client = await connectTestClient()
    const { tools } = await client.listTools()
    const properties = (name: string) =>
      JSON.stringify(tools.find((tool) => tool.name === name)?.inputSchema.properties)
    expect(properties('ciphers_passphrase_probe')).toContain(OPTION_DESCRIPTIONS.probeIterations)
    expect(properties('ciphers_encode')).toContain(OPTION_DESCRIPTIONS.iterations)
    expect(OPTION_DESCRIPTIONS.iterations).toMatch(/^AES-passphrase only/)

    const blob = 'U2FsdGVkX18HYWQDuJcJTh2NoqzqwZ9pWaEBkXGGu54='
    const result = await client.callTool({
      name: 'ciphers_passphrase_probe',
      arguments: { text: blob, key: 'secret', digests: ['sha1', 'sha256'], keyLengths: [256] },
    })
    expect(result.isError).not.toBe(true)
    expect(onlyText(result.content).split('\n').slice(0, 4)).toEqual([
      'Passphrase probe (salt 07616403b897094e, 1 block, 2 tries: digests sha1, sha256 × keyLength 256 × iterations 1):',
      'Padding held in 1 of 2 tries, about 0.0078 expected by chance. Most printable first:',
      '',
      '  digest sha256, keyLength 256, iterations 1: pad 2, 100% printable, "ATTACK AT DAWN"',
    ])

    for (const [args, error] of [
      [{ text: blob, key: 'secret', keyLengths: [100] }, 'Invalid arguments at /keyLengths/0'],
      [{ text: blob, key: 'secret', digest: 'md5' }, 'digest'],
      [{ text: blob }, 'Invalid arguments'],
      [
        { text: blob, key: 'secret', iterations: [100_000, 99_999, 99_998, 99_997] },
        'Invalid option iterations=100000,99999,99998,99997: must add up to at most 333333 with 3 digests',
      ],
      [{ text: 'AAAAAAAAAAAAAAAAAAAAAA==', key: 'secret' }, 'Salted__'],
    ] as const) {
      const refused = await client.callTool({ name: 'ciphers_passphrase_probe', arguments: args })
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain(error)
    }
  })

  it('recovers a key over the protocol', async () => {
    const client = await connectTestClient()
    const plain =
      'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler.'
    const recover = async (args: Readonly<Record<string, unknown>>) =>
      await client.callTool({ name: 'ciphers_key_recover', arguments: args })

    const found = await recover({
      text: create('vigenere').encode(plain, { key: 'BOHEMIA' }).text,
      cipher: 'vigenere',
      limit: 2,
    })
    expect(found.isError).not.toBe(true)
    const lines = onlyText(found.content).split('\n')
    expect(lines[0]).toMatch(
      /^Vigenère keys for 183 letters \(lang=en\), best fit first\. Fit is the mean log probability per quadgram: English plaintext scores about -9\.44, random letters -\d+\.\d\d\.$/,
    )
    expect(lines[2]).toMatch(/^1\. key BOHEMIA, fit -\d+\.\d\d: "To Sherlock .* Irene Adler\."$/)
    expect(lines[3]).toMatch(/^2\. key [A-Z]+, fit -\d+\.\d\d: ".{80}"…$/)
    expect(lines.at(-1)).toBe(
      'Only the top text is whole, the others stop at 80 characters. ciphers_decode with cipher vigenere and the key reads the text.',
    )

    expect(onlyText((await recover({ text: '', cipher: 'columnar' })).content)).toBe(
      'No Columnar key: 0 letters are too few to search.',
    )

    for (const [args, error] of [
      [
        { text: 'ABC', cipher: 'substitution', period: 3 },
        'Invalid option period=3: only vigenere, beaufort, variant-beaufort take it',
      ],
      [
        { text: 'ABC', cipher: 'columnar', lang: 'pl' },
        'Invalid option language=pl: must be en for columnar',
      ],
      [{ text: 'ABC', cipher: 'enigma' }, 'variant-beaufort'],
      [{ text: 'ABC', cipher: 'vigenere', keyLength: 3 }, 'only columnar takes it'],
      [{ text: 'X'.repeat(10_001), cipher: 'vigenere' }, 'Invalid arguments'],
    ] as const) {
      const refused = await recover(args)
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain(error)
    }
    expect((await recover({ text: 'ABC', cipher: 'vigenere', keyLength: 3 })).content).toEqual([
      { type: 'text', text: 'Invalid option keyLength=3: only columnar takes it' },
    ])
  })

  it('recovers a homophonic key over the protocol, quoting the symbols', async () => {
    const client = await connectTestClient()
    const plain = 'To Sherlock Holmes she is always the woman. I have seldom heard him mention her.'
    let turn = 0
    const symbols = Array.from(plain.toUpperCase().replaceAll(/[^A-Z]/g, ''), (letter) =>
      letter === 'E' ? ['\u202EE', 'E\u0007'][turn++ % 2]! : `${letter}${turn++ % 2}`,
    )
    const recover = async (args: Readonly<Record<string, unknown>>) =>
      await client.callTool({ name: 'ciphers_key_recover', arguments: args })

    const found = await recover({ text: symbols.join(' '), cipher: 'homophonic', limit: 2 })
    expect(found.isError).not.toBe(true)
    const text = onlyText(found.content)
    const lines = text.split('\n')
    expect(lines[0]).toMatch(
      /^Homophonic keys for 64 symbols \(lang=en\), best first, a key that piles symbols onto E, T and A below one with English letter counts\. Fit is the mean log probability per quadgram: English plaintext scores about -9\.44, the same symbols shuffled -\d+\.\d\d\.$/,
    )
    expect(lines[2]).toMatch(/^1\. key "[A-Z]=.+", fit -\d+\.\d\d: "[A-Z]{64}"$/)
    expect(lines.at(-1)).toBe(
      'Only the top key and text are whole, the others stop at 80 characters. The key lists each plaintext letter with the symbols that stand for it. The text above is already decoded, one letter per symbol: correct the odd symbol by hand.',
    )
    expect(text).toContain('\\u202eE')
    expect(text).toContain('E\\u0007')
    expect(text.includes('\u0007') || text.includes('\u202E')).toBe(false)

    for (const [args, error] of [
      [
        { text: '12 34 5', cipher: 'homophonic', symbolWidth: 2 },
        'Invalid option symbolWidth=2: leaves 1 of 5 characters over, so the symbols do not line up',
      ],
      [
        { text: 'ABC', cipher: 'vigenere', symbolWidth: 2 },
        'Invalid option symbolWidth=2: only homophonic takes it',
      ],
      [{ text: 'ABC', cipher: 'homophonic', symbolWidth: 9 }, 'Invalid arguments'],
      [
        { text: 'ABC', cipher: 'vigenere', starts: 2 },
        'Invalid option starts=2: only homophonic takes it',
      ],
      [
        { text: 'ABC', cipher: 'columnar', seed: 7 },
        'Invalid option seed=7: only homophonic takes it',
      ],
      [{ text: 'ABC', cipher: 'homophonic', starts: 33 }, 'Invalid arguments'],
      [{ text: 'ABC', cipher: 'homophonic', seed: -1 }, 'Invalid arguments'],
    ] as const) {
      const refused = await recover(args)
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain(error)
    }
    const keysOf = async (seed: number): Promise<string[]> => {
      const reply = await recover({
        text: symbols.join(' '),
        cipher: 'homophonic',
        starts: 3,
        seed,
      })
      expect(reply.isError).not.toBe(true)
      return onlyText(reply.content)
        .split('\n')
        .filter((line) => /^\d\. key /.test(line))
    }
    expect(await keysOf(7)).toHaveLength(3)
    expect(await keysOf(7)).toEqual(await keysOf(7))
    expect(await keysOf(7)).not.toEqual(await keysOf(8))
    expect(onlyText((await recover({ text: '12 34', cipher: 'homophonic' })).content)).toBe(
      'No Homophonic key: 2 symbols are too few to search.',
    )
  }, 20_000)

  it('drags a crib over the protocol', async () => {
    const client = await connectTestClient()
    const first =
      '315c4eeaa8b5f8aaf9174145bf43e1784b8fa00dc71d885a804e5ee9fa40b16349c146fb778cdf2d3aff021dfff5b403b510d0d0455468aeb98622b137dae857553ccd8883a7bc37520e06e515d22c954eba5025b8cc57ee59418ce7dc6bc41556bdb36bbca3e8774301fbcaa3b83b220809560987815f65286764703de0f3d524400a19b159610b11ef3e'
    const target =
      '32510ba9babebbbefd001547a810e67149caee11d945cd7fc81a05e9f85aac650e9052ba6a8cd8257bf14d13e6f0a803b54fde9e77472dbff89d71b57bddef121336cb85ccb8f3315f4b52e301d16e9f52f904'
    const drag = async (args: Readonly<Record<string, unknown>>) =>
      await client.callTool({ name: 'ciphers_crib_drag', arguments: args })

    const opened = await drag({
      ciphertexts: [first, target],
      crib: 'The secret message is: ',
      limit: 2,
    })
    expect(opened.isError).not.toBe(true)
    expect(onlyText(opened.content).split('\n')).toEqual([
      'Crib "The secret message is: " across 2 ciphertexts (lang=en), 144 places, most readable first:',
      '',
      '1. #0 at 0 (score -3.12): #1 "We can factor the numbe"',
      '2. #1 at 0 (score -3.12): #0 "We can factor the numbe"',
      '(142 more places ranked lower)',
      'With two ciphertexts a place shows up once per side with the same reading: the crib is in one of them, the reading in the other.',
      '',
      'Nothing known yet. To accept a place, add { message, offset, text } to known and call again.',
    ])

    const accepted = onlyText(
      (
        await drag({
          ciphertexts: [first, target],
          known: [{ message: 1, offset: 0, text: 'The secret' }],
        })
      ).content,
    ).split('\n')
    expect(accepted[0]).toBe(`Key (?? unknown): 66396e89c9dbd8cc9874${'??'.repeat(129)}`)
    expect(accepted.slice(1, 4)).toEqual([
      'Plaintexts (· unknown):',
      `#0 "We can fac${'·'.repeat(129)}"`,
      `#1 "The secret${'·'.repeat(73)}"`,
    ])

    const contradiction = await drag({
      ciphertexts: [first, target],
      known: [
        { message: 1, offset: 0, text: 'The' },
        { message: 0, offset: 0, text: 'Xe' },
      ],
    })
    expect(contradiction.isError).toBe(true)
    expect(onlyText(contradiction.content)).toContain(
      'Invalid option known=#1: disagrees with an earlier placement on key byte 0',
    )

    const emoji = await drag({
      ciphertexts: ['00'.repeat(300), '01'.repeat(300)],
      crib: '😀'.repeat(60),
    })
    expect(emoji.isError).not.toBe(true)

    const spaced = await drag({
      ciphertexts: ['00 '.repeat(2_048), '01 '.repeat(2_048)],
      crib: 'a',
    })
    expect(spaced.isError).not.toBe(true)
    const long = await drag({ ciphertexts: ['00'.repeat(2_049), '01'], crib: 'a' })
    expect(long.isError).toBe(true)
    expect(onlyText(long.content)).toContain(
      'Invalid option ciphertexts=one: must each be at most 4096 hex digits',
    )

    for (const args of [
      { ciphertexts: [first] },
      { ciphertexts: [first, target], crib: '' },
      { ciphertexts: [first, target], limit: 51 },
      { ciphertexts: [first, target], known: [{ message: 0, offset: 0, text: 'a', at: 1 }] },
      { ciphertexts: Array.from({ length: 17 }, () => '00') },
      { ciphertexts: [first, 'a'.repeat(8_193)] },
    ]) {
      const refused = await drag(args)
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain('Invalid arguments at /')
    }
  })

  it('aligns two texts and checks rows over the protocol', async () => {
    const client = await connectTestClient()
    const call = async (args: Readonly<Record<string, unknown>>) =>
      client.callTool({ name: 'ciphers_texts_align', arguments: args })
    const texts = {
      left: 'The fox, the fox!\nIt sleeps',
      right: 'the fox the dog it SLEEPS soundly',
    }

    expect(onlyText((await call({ ...texts, compare: 'caseless' })).content)).toBe(
      [
        '6 tokens against 7, cut as words and compared caseless: 5 equal, 1 replaced, 1 inserted, 0 deleted.',
        '',
        '  equal    left 0-1 [0,3)  right 0-1 [0,3)  "The" = "the"',
        '  equal    left 1-3 [4,12)  right 1-3 [4,11)  "fox, the"',
        '  replace  left 3-4 [13,16)  right 3-4 [12,15)  "fox" -> "dog"',
        '  equal    left 4-6 [18,27)  right 4-6 [16,25)  "It sleeps" = "it SLEEPS"',
        '  insert   left 6-6 [27,27)  right 6-7 [26,33)  + "soundly"',
        '',
        'Token ranges count from 0 and stop before the second number. [start,end) are UTF-16 offsets into each text.',
        'A row with = holds tokens that match only as compared (caseless).',
      ].join('\n'),
    )
    expect(onlyText((await call({ left: 'a b a', right: 'a' })).content)).toBe(
      [
        '3 tokens against 1, cut as words and compared exact: 1 equal, 0 replaced, 0 inserted, 2 deleted.',
        '',
        '  equal    left 0-1 [0,1)  right 0-1 [0,1)  "a"  (ambiguous)',
        '  delete   left 1-3 [2,5)  right 1-1 [1,1)  - "b a"',
        '',
        'Token ranges count from 0 and stop before the second number. [start,end) are UTF-16 offsets into each text.',
        'A row marked ambiguous has a repeated word: another alignment with as many equal tokens pairs it otherwise.',
      ].join('\n'),
    )
    expect(onlyText((await call({ left: 'Stop, thief!', right: 'Stop thief' })).content)).toContain(
      '\nEvery token matches, yet the texts differ: look at the whitespace and punctuation between them, which is never compared.',
    )
    expect(onlyText((await call({ left: 'a\u202Eb x', right: 'c' })).content)).toContain(
      '"a\\u202eb x" -> "c"',
    )

    const pair = { left: 'a b', right: 'a c' }
    const row = (operation: string, from: number, to: number) => ({
      operation,
      left: { from, to },
      right: { from, to },
    })
    expect(
      onlyText((await call({ ...pair, rows: [row('equal', 0, 1), row('replace', 1, 2)] })).content),
    ).toBe(
      'The rows hold: they cover all 2 left and 2 right tokens in order, and every equality checks out.',
    )
    const broken = await call({
      ...pair,
      rows: [row('equal', 0, 1), row('equal', 1, 2), row('insert', 2, 2)],
    })
    expect(broken.isError).toBeFalsy()
    expect(onlyText(broken.content)).toBe(
      [
        'The rows do not hold against 2 left and 2 right tokens, 2 problems:',
        '',
        '  /rows/1 equality: left token 1 does not equal its partner',
        '  /rows/2 operation: insert takes no token on the left and at least one on the right',
      ].join('\n'),
    )

    const long = Array.from({ length: 2_000 }, (_, index) => `w${index % 7}`).join(' ')
    const whole = {
      operation: 'replace',
      left: { from: 0, to: 2_000 },
      right: { from: 0, to: 2_000 },
    }
    expect(
      onlyText((await call({ left: long, right: long.toUpperCase(), rows: [whole] })).content),
    ).toBe(
      'The rows hold: they cover all 2000 left and 2000 right tokens in order, and every equality checks out.',
    )
    const refused = await call({ left: long, right: long })
    expect(refused.isError).toBe(true)
    expect(onlyText(refused.content)).toContain(
      'Too long to align: 2000 tokens against 2000 is 4004001 comparisons, over the 4000000 limit. Align one section at a time.',
    )
    const scattered = await call({
      left: Array.from({ length: 600 }, (_, index) => `same${index} left${index}`).join(' '),
      right: Array.from({ length: 600 }, (_, index) => `same${index} right${index}`).join(' '),
    })
    expect(scattered.isError).toBe(true)
    expect(onlyText(scattered.content)).toContain(
      'The texts differ in too many places to list: 1200 rows, over the 500 limit. Align one section at a time.',
    )
    expect(onlyText((await call({ ...pair, rows: 'none' })).content)).toContain(
      'Invalid arguments at /rows',
    )
  })

  it('inspects characters and carries zero-width messages over the protocol', async () => {
    const client = await connectTestClient()
    const call = async (name: string, args: Readonly<Record<string, unknown>>) =>
      client.callTool({ name: `ciphers_${name}`, arguments: args })
    const bitcoin = `Bitc${String.fromCodePoint(0x43e)}in`

    expect(onlyText((await call('characters_inspect', { text: bitcoin })).content)).toBe(
      [
        '1 of 7 characters are not what they seem, held against Latin:',
        '',
        '  U+043E CYRILLIC SMALL LETTER O (Cyrillic) looks like "o" at 5',
        '',
        'Words that mix scripts:',
        `  "${bitcoin}" at 1: Latin and Cyrillic, skeleton "Bitcoin"`,
        '',
        'In order: U+043E',
        'As the ASCII they pass for: "o"',
      ].join('\n'),
    )
    expect(onlyText((await call('characters_inspect', { text: 'Bitcoin' })).content)).toBe(
      'Nothing odd in 7 characters held against Latin: no invisible character, no lookalike, no other script.',
    )
    expect(
      onlyText((await call('characters_inspect', { text: 'abc', script: 'Cyrillic' })).content),
    ).toBe(
      [
        '3 of 3 characters are not what they seem, held against Cyrillic:',
        '',
        '  U+0061 Latin character at 1',
        '  U+0062 Latin character at 2',
        '  U+0063 Latin character at 3',
        '',
        'In order: U+0061 U+0062 U+0063',
      ].join('\n'),
    )

    for (const scheme of ['binary', '330k', 'zwsp-steg', 'zero-width-lib']) {
      const hidden = onlyText(
        (await call('zero_width_hide', { text: 'Hi there', cover: 'A cover.', scheme })).content,
      )
      expect(hidden.replaceAll(/\p{Cf}/gu, '')).toBe('A cover.')
      expect(onlyText((await call('zero_width_read', { text: hidden, scheme })).content)).toBe(
        'Hi there',
      )
      expect(onlyText((await call('zero_width_read', { text: hidden })).content)).toContain(
        `\n  scheme=${scheme} -> "Hi there"`,
      )
      expect(onlyText((await call('characters_inspect', { text: hidden })).content)).toContain(
        `\nThe invisible ones spell "Hi there" with scheme=${scheme}; ciphers_zero_width_read reads it whole.`,
      )
    }

    const full = await call('zero_width_hide', {
      text: 'x'.repeat(10_000),
      cover: 'c'.repeat(10_000),
      symbols: 'ab',
      digits: 9,
    })
    expect(onlyText(full.content)).toHaveLength(100_000)
    expect(
      onlyText(
        (
          await call('zero_width_read', {
            text: onlyText(full.content),
            symbols: 'ab',
            digits: 9,
          })
        ).content,
      ),
    ).toBe('x'.repeat(10_000))

    const swapped = { symbols: 'U+200C U+200B', digits: 8 }
    const own = onlyText((await call('zero_width_hide', { text: 'Hi', ...swapped })).content)
    expect(Array.from(own, (character) => character.codePointAt(0)?.toString(16))).toEqual(
      Array.from('0100100001101001', (bit) => (bit === '0' ? '200c' : '200b')),
    )
    expect(onlyText((await call('zero_width_read', { text: own })).content)).toBe(
      [
        'Zero-width readings (5 schemes tried, 1 read as text), printable ASCII first:',
        '',
        '  symbols="U+200C U+200B" digits=8 unit=byte -> "Hi"',
      ].join('\n'),
    )
    expect(
      onlyText((await call('zero_width_read', { text: own, ...swapped, unit: 'byte' })).content),
    ).toBe('Hi')
    expect(
      onlyText(
        (await call('zero_width_read', { text: ' \t \t\t\t\t\t', symbols: ' \t', digits: 8 }))
          .content,
      ),
    ).toBe('_')
    expect(onlyText((await call('zero_width_read', { text: 'plain' })).content)).toBe(
      'No invisible character in this text, so nothing to read.',
    )
    expect(onlyText((await call('zero_width_read', { text: own.slice(0, 3) })).content)).toBe(
      'None of the 5 built-in schemes reads the invisible characters here: U+200C ×2, U+200B ×1. Pass symbols in digit order, with digits or separator, for a scheme of your own.',
    )
    expect(
      onlyText((await call('zero_width_read', { text: 'plain', scheme: 'binary' })).content),
    ).toBe("None of the scheme's characters are in this text.")

    for (const [name, args, message] of [
      [
        'characters_inspect',
        { text: 'abc', script: 'Klingon' },
        'Invalid option script=Klingon: must be a Unicode script such as Latin, Cyrillic or Greek',
      ],
      ['zero_width_read', { text: 'abc', digits: 8 }, 'Missing required option: symbols'],
      [
        'zero_width_read',
        { text: 'abc', scheme: 'binary', digits: 8 },
        'Invalid option digits=8: describes a scheme of your own, so it does not apply with scheme',
      ],
      ['zero_width_read', { text: 'abc', symbols: 'ab' }, 'Missing required option: digits'],
      [
        'zero_width_read',
        { text: 'abc', symbols: 'U+200B U+ZZ', digits: 8 },
        'Invalid option symbols=U+ZZ: must be U+ and one to six hex digits',
      ],
      [
        'zero_width_read',
        { text: 'abc', symbols: 'aa', digits: 8 },
        'Invalid option symbols=U+0061 U+0061: must not repeat a character',
      ],
      [
        'zero_width_read',
        { text: 'abc', symbols: 'ab', separator: 'cd' },
        'Invalid option separator=cd: must be one character',
      ],
      [
        'zero_width_read',
        { text: own.slice(0, 3), scheme: 'binary' },
        '3 hidden characters are left over after 0 groups of 8; another scheme wrote this, or part of the text is missing',
      ],
      ['zero_width_read', { text: 'abc', scheme: 'rot13' }, 'Invalid arguments at /scheme'],
      [
        'zero_width_hide',
        { text: String.fromCodePoint(0x1f600), scheme: 'zwsp-steg' },
        'Invalid option message=U+1F600: does not fit 7 digits of base 5',
      ],
      [
        'zero_width_hide',
        { text: 'x', cover: own, scheme: 'binary' },
        'Invalid option cover=the cover text: already carries characters of the scheme, which would read as part of the message',
      ],
      ['zero_width_hide', { text: 'x', digits: 33, symbols: 'ab' }, 'Invalid arguments at /digits'],
      [
        'zero_width_hide',
        { text: 'x'.repeat(10_000), symbols: 'ab', digits: 32 },
        'Invalid option text=320000 characters with the cover: are more than the 100000 ciphers_zero_width_read takes; hide less, or use fewer digits',
      ],
      [
        'zero_width_hide',
        { text: String.fromCodePoint(0x4e16).repeat(4_166), cover: 'c'.repeat(1_000) },
        'Invalid option text=100984 characters with the cover: are more than the 100000 ciphers_zero_width_read takes; hide less, or use fewer digits',
      ],
    ] as const) {
      const refused = await call(name, args)
      expect(refused.isError, message).toBe(true)
      expect(onlyText(refused.content)).toContain(message)
    }
  })

  it('reads and ranks hidden text over the protocol', async () => {
    const client = await connectTestClient()
    const call = async (args: Readonly<Record<string, unknown>>) =>
      client.callTool({ name: 'ciphers_hidden_text_read', arguments: args })
    const telegram =
      "PRESIDENT'S EMBARGO RULING SHOULD HAVE IMMEDIATE NOTICE. GRAVE SITUATION AFFECTING INTERNATIONAL LAW. STATEMENT FORESHADOWS RUIN OF MANY NEUTRALS. YELLOW JOURNALS UNIFYING NATIONAL EXCITEMENT IMMENSELY."

    const ranked = onlyText((await call({ text: telegram })).content).split('\n')
    expect(ranked[0]).toBe(
      'Hidden text readings (68 tried, 57 with 5 or more A-Z letters, lang=en), most like the language first:',
    )
    expect(ranked[2]).toBe('   0.19  pick=word letter=1 -> PERSHINGSAILSFROMNYJUNEI')
    expect(ranked[12]).toBe('  (47 more readings ranked lower)')
    expect(onlyText((await call({ text: telegram, pick: 'word' })).content)).toBe(
      'PERSHINGSAILSFROMNYJUNEI',
    )
    expect(onlyText((await call({ text: 'ab cd' })).content)).toBe(
      'No reading has 5 or more A-Z letters.',
    )

    for (const [args, message] of [
      [{ text: 'abc', every: 2 }, 'Missing required option: pick'],
      [{ text: 'abc', pick: 'word', lang: 'pl' }, 'Invalid option lang=pl: ranks the readings'],
      [
        { text: 'abc', pick: 'word', every: 2 },
        'Invalid option every=2: does not apply to pick word',
      ],
      [{ text: 'abc', pick: 'every-word' }, 'Missing required option: every'],
      [{ text: 'abc', pick: 'column' }, 'Invalid arguments at /pick'],
    ] as const) {
      const refused = await call(args)
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain(message)
    }
  })

  it('puts the best-fitting Caesar shift first', async () => {
    const client = await connectTestClient()
    const lines = async (args: Readonly<Record<string, unknown>>) => {
      const result = await client.callTool({ name: 'ciphers_caesar_brute', arguments: args })
      expect(result.isError).not.toBe(true)
      return onlyText(result.content).split('\n')
    }

    const english = await lines({ text: 'DWWDFN DW GDZQ' })
    expect(english).toHaveLength(25)
    expect(english[0]).toBe('shift= 3 -> ATTACK AT DAWN')

    const polish = 'OLWZR RMFCBCQR PRMD WB MHVWHV MDN CGURZLH'
    expect((await lines({ text: polish, lang: 'pl' }))[0]).toBe(
      'shift= 3 -> LITWO OJCZYZNO MOJA TY JESTES JAK ZDROWIE',
    )
    expect((await lines({ text: polish }))[0]).not.toContain('LITWO')

    const japanese = 'NLPLJDBR ZD FKLBR QL BDFKLBR QL'
    expect((await lines({ text: japanese, lang: 'ja' }))[0]).toBe(
      'shift= 3 -> KIMIGAYO WA CHIYO NI YACHIYO NI',
    )

    const noLetters = await lines({ text: '1234' })
    expect(noLetters[0]).toBe('shift= 1 -> 1234')
    expect(noLetters[24]).toBe('shift=25 -> 1234')
  })

  it('puts short English text first by its letter pairs', async () => {
    const client = await connectTestClient()
    const caesar = create('caesar')
    for (const plaintext of [
      'HELLO WORLD',
      'THE QUICK BROWN FOX',
      'BUY GOLD NOW',
      'HAPPY BIRTHDAY TO YOU',
      'ALL WORK AND NO PLAY MAKES JACK A DULL BOY',
      'WORLD',
      'HELP',
    ]) {
      for (const shift of [3, 7, 13, 19]) {
        const text = caesar.encode(plaintext, { shift }).text
        const result = await client.callTool({ name: 'ciphers_caesar_brute', arguments: { text } })
        expect(onlyText(result.content).split('\n')[0]).toBe(
          `shift=${String(shift).padStart(2)} -> ${plaintext}`,
        )
      }
    }
  })

  it('keeps the top Caesar shift whole and cuts the rest to a preview', async () => {
    const client = await connectTestClient()
    const brute = async (text: string) => {
      const result = await client.callTool({ name: 'ciphers_caesar_brute', arguments: { text } })
      expect(result.isError).not.toBe(true)
      return onlyText(result.content).split('\n')
    }

    const plaintext = 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG '.repeat(3).trim()
    const ciphertext = 'WKH TXLFN EURZQ IRA MXPSV RYHU WKH ODCB GRJ '.repeat(3).trim()
    const lines = await brute(ciphertext)
    expect(lines).toHaveLength(25)
    expect(lines[0]).toBe(`shift= 3 -> ${plaintext}`)

    for (const line of lines.slice(1)) {
      const [, shift, preview] = /^shift=([ \d]{2}) -> (.*)…$/.exec(line)!
      expect(preview).toHaveLength(BRUTE_PREVIEW_LENGTH)
      const decoded = await client.callTool({
        name: 'ciphers_decode',
        arguments: { cipher: 'caesar', text: ciphertext, shift: Number(shift) },
      })
      expect(onlyText(decoded.content).startsWith(preview!)).toBe(true)
    }

    const astral = await brute(`${'1'.repeat(BRUTE_PREVIEW_LENGTH - 1)}😀${'B'.repeat(20)}`)
    for (const line of astral.slice(1)) {
      expect(line).not.toMatch(/\p{Cs}/u)
      expect(line.endsWith('1…')).toBe(true)
    }
  })

  it('reports unknown tools and cipher names as tool errors', async () => {
    const client = await connectTestClient()

    const unknownTool = await client.callTool({ name: 'toString', arguments: {} })
    expect(unknownTool).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: 'Unknown ciphers tool: "toString"' }],
    })

    const forged = await client.callTool({ name: 'x\nFAKE: ok', arguments: {} })
    expect(onlyText(forged.content)).toBe('Unknown ciphers tool: "x\\nFAKE: ok"')

    const forgedCipher = await client.callTool({
      name: 'ciphers_info',
      arguments: { cipher: 'x\nFAKE: ok' },
    })
    expect(onlyText(forgedCipher.content)).not.toContain('\n')

    const unknownCipher = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'missing', text: 'abc' },
    })
    expect(unknownCipher.isError).toBe(true)
    expect(onlyText(unknownCipher.content)).toBe(
      `Invalid arguments at /cipher: must be one of ${builtinCiphers.join(', ')}`,
    )

    const badLetters = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'bacon', text: 'abc', letters: 25 },
    })
    expect(onlyText(badLetters.content)).toBe(
      'Invalid arguments at /letters: must be one of 24, 26',
    )

    const encodedCase = await client.callTool({
      name: 'ciphers_encode',
      arguments: { cipher: 'bacon', text: 'HI', lowercase: 'A' },
    })
    expect(encodedCase.isError).toBe(true)
    expect(onlyText(encodedCase.content)).toContain(
      'Invalid option lowercase=A: only decodes, encoding has no text to carry the case',
    )
  })
})
