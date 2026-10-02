import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { Cipher, create, register, type CipherInfo, type CipherResult } from '../../src/index.ts'
import { builtinCiphers } from '../../src/core/ciphers.ts'
import { createMcpServer } from '../../src/mcp.ts'
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
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    })
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
      ['width', { cipher: 'route', text: 'abc' }],
      ['width', { cipher: 'route', text: 'abc', width: 1 }],
      ['corner', { cipher: 'route', text: 'abc', width: 2, corner: 'middle' }],
      ['path', { cipher: 'route', text: 'abc', width: 2, path: 'diagonal' }],
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

    const polish = await client.callTool({
      name: 'ciphers_frequency',
      arguments: { text: 'AAAA', lang: 'pl' },
    })
    const [polishEntry] = polish.content as [{ type: string; text: string }]
    expect(polishEntry.text).toContain('(pl plaintext ~0.057, uniform random ~0.038)')
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
    ).toContain('Next: ciphers_period_estimate gives the key length and a Vigenère key.')
    expect(await guess({ text: '69c4e0d86a7b0430d8cdb78070b4c55a' })).toContain(
      'Next: ciphers_decode with cipher aes, which needs key.',
    )
    expect(await guess({ text: 'hi', lang: 'pl' })).toBe(
      'No family fits (2 characters, 2 A-Z letters): no layout this package knows, and too few letters for statistics.',
    )

    for (const args of [{ text: 'ABC', lang: 'de' }, { text: 'X'.repeat(100_001) }]) {
      const refused = await client.callTool({ name: 'ciphers_family_guess', arguments: args })
      expect(refused.isError).toBe(true)
      expect(onlyText(refused.content)).toContain('Invalid arguments at /')
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
  })
})
