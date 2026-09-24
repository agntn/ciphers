import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { Cipher, create, register, type CipherInfo, type CipherResult } from '../../src'
import { builtinCiphers } from '../../src/core/ciphers'
import { createMcpServer } from '../../src/mcp'
import { BRUTE_PREVIEW_LENGTH, OPTION_DESCRIPTIONS } from '../../src/tool-operations'

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
      'cipher_encode',
      'cipher_decode',
      'cipher_brute_caesar',
      'cipher_frequency',
      'cipher_info',
    ])
    const encodeTool = response.tools.find((tool) => tool.name === 'cipher_encode')
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
      const [requiredClause = '', optionalClause = ''] = OPTION_DESCRIPTIONS[option].split(';')
      const named = (clause: string) => builtinCiphers.filter((name) => clause.includes(name))
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

  it('executes encode and decode through the protocol', async () => {
    const client = await connectTestClient()

    const encoded = await client.callTool({
      name: 'cipher_encode',
      arguments: { cipher: 'caesar', text: 'abc', shift: 1, preserveCase: false },
    })
    expect(encoded).toMatchObject({
      content: [{ type: 'text', text: 'BCD' }],
    })
    expect(encoded.isError).not.toBe(true)

    const decoded = await client.callTool({
      name: 'cipher_decode',
      arguments: { cipher: 'caesar', text: 'BCD', shift: 1, preserveCase: false },
    })
    expect(decoded).toMatchObject({
      content: [{ type: 'text', text: 'ABC' }],
    })
    expect(decoded.isError).not.toBe(true)
  })

  it('discovers and executes Beaufort through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'beaufort' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('key (string, required)')
    for (const [name, text, expected] of [
      ['cipher_encode', 'DCODE', 'HCKHA'],
      ['cipher_decode', 'HCKHA', 'DCODE'],
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
    const info = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'adfgvx' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('transposition (string, default=')
    for (const [name, text, expected] of [
      ['cipher_encode', 'attack at 1200am', 'DXXVGDADDAAXDVDXVFGVGFADDVVD'],
      ['cipher_decode', 'DXXVGDADDAAXDVDXVFGVGFADDVVD', 'ATTACKAT1200AM'],
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
    const info = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'aes' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(aes) — block, substitution-permutation')
    expect(onlyText(info.content)).toContain('key (string, required)')
    const key = '2B7E 1516 28AE D2A6 ABF7 1588 09CF 4F3C'
    for (const [name, text, expected] of [
      ['cipher_encode', 'ATTACK AT DAWN', 'bef12e48d0f1739d732326cbecbef389'],
      ['cipher_decode', 'bef12e48d0f1739d732326cbecbef389', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'aes', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }

    const wrongKey = await client.callTool({
      name: 'cipher_decode',
      arguments: { cipher: 'aes', text: 'bef12e48d0f1739d732326cbecbef389', key: '00'.repeat(16) },
    })
    expect(wrongKey.isError).toBe(true)
    expect(onlyText(wrongKey.content)).toBe(
      'cipher_decode failed: [aes] Decrypted blocks do not end in PKCS#7 padding: wrong key, or not AES-ECB ciphertext',
    )
  })

  it('discovers and executes Triple DES through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({
      name: 'cipher_info',
      arguments: { cipher: 'triple-des' },
    })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('(triple-des) — block, feistel')
    const key = '0123 4567 89AB CDEF 2345 6789 ABCD EF01 4567 89AB CDEF 0123'
    for (const [name, text, expected] of [
      ['cipher_encode', 'ATTACK AT DAWN', 'a1a3679052607883b30ef4b95156ff29'],
      ['cipher_decode', 'a1a3679052607883b30ef4b95156ff29', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({ name, arguments: { cipher: 'triple-des', text, key } })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
  })

  it('discovers and executes AES-LRW with a tweak through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'aes-lrw' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('tweak (string, default=1)')
    const key = '4562ac25f828176d4c268414b5680185258e2a05e73e9d03ee5a830ccc094c87'
    for (const [name, text, expected] of [
      ['cipher_encode', 'ATTACK AT DAWN', 'f319a072c39498a1e0c6c8213de2facc'],
      ['cipher_decode', 'f319a072c39498a1e0c6c8213de2facc', 'ATTACK AT DAWN'],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { cipher: 'aes-lrw', text, key, tweak: '200000000' },
      })
      expect(result.isError).not.toBe(true)
      expect(onlyText(result.content)).toBe(expected)
    }
    const badTweak = await client.callTool({
      name: 'cipher_encode',
      arguments: { cipher: 'aes-lrw', text: 'abc', key, tweak: 'xyz' },
    })
    expect(badTweak.isError).toBe(true)
    expect(onlyText(badTweak.content)).toContain('tweak')
  })

  it('discovers and executes the 24-letter Bacon table through the protocol', async () => {
    const client = await connectTestClient()
    const info = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'bacon' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('letters (number, default=26)')
    for (const [name, text, expected] of [
      ['cipher_encode', 'KNIGHT', 'ABAABABBAAABAAAAABBAAABBBBAABA'],
      ['cipher_decode', 'ABAABABBAAABAAAAABBAAABBBBAABA', 'KNIGHT'],
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
    const info = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'autokey' } })
    expect(info.isError).not.toBe(true)
    expect(onlyText(info.content)).toContain('key (string, required)')
    for (const [name, text, expected] of [
      ['cipher_encode', 'ATTACKATDAWN', 'QNXEPVYTWTWP'],
      ['cipher_decode', 'QNXEPVYTWTWP', 'ATTACKATDAWN'],
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
        name: 'cipher_encode',
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
      ['key', { cipher: 'aes', text: 'abc' }],
      ['key', { cipher: 'aes', text: 'abc', key: 'YELLOW SUBMARINE' }],
      ['key', { cipher: 'aes', text: 'abc', key: '00'.repeat(20) }],
      ['key', { cipher: 'aes-lrw', text: 'abc' }],
      ['key', { cipher: 'aes-lrw', text: 'abc', key: '00'.repeat(16) }],
      ['key', { cipher: 'triple-des', text: 'abc' }],
      ['key', { cipher: 'triple-des', text: 'abc', key: '00'.repeat(32) }],
    ] as const) {
      const response = await client.callTool({
        name: 'cipher_encode',
        arguments: arguments_,
      })

      expect(response.isError).toBe(true)
      expect(onlyText(response.content)).toContain(`Invalid arguments at /${field}`)
    }

    const unrelatedSchema = await client.callTool({
      name: 'cipher_frequency',
      arguments: { cipher: 'vigenere' },
    })
    expect(unrelatedSchema.isError).toBe(true)
    expect(onlyText(unrelatedSchema.content)).toContain('required properties text')
    expect(onlyText(unrelatedSchema.content)).not.toContain('/key')
  })

  it('describes ciphers for discovery', async () => {
    const client = await connectTestClient()

    const list = await client.callTool({ name: 'cipher_info', arguments: {} })
    expect(list.isError).not.toBe(true)
    const [listEntry] = list.content as [{ type: string; text: string }]
    expect(listEntry.text).toMatch(/^classical:\n {2}caesar \[substitution-shift\]/)
    expect(listEntry.text).toContain('  enigma [rotor]')
    expect(listEntry.text).toContain('\nblock:\n  aes [substitution-permutation]')

    const filtered = await client.callTool({
      name: 'cipher_info',
      arguments: { category: 'classical' },
    })
    expect(filtered.isError).not.toBe(true)
    expect(onlyText(filtered.content)).toContain('  enigma [rotor]')
    expect(onlyText(filtered.content)).not.toMatch(/\baes\b/)

    const block = await client.callTool({ name: 'cipher_info', arguments: { category: 'block' } })
    expect(block.isError).not.toBe(true)
    expect(onlyText(block.content)).toMatch(
      /^block:\n {2}aes \[substitution-permutation\].*\n {2}aes-lrw \[substitution-permutation\].*\n {2}triple-des \[feistel\]/,
    )

    const unknownCategory = await client.callTool({
      name: 'cipher_info',
      arguments: { category: 'stream' },
    })
    expect(unknownCategory.isError).toBe(true)
    expect(onlyText(unknownCategory.content)).toContain('Invalid arguments at /category')

    const detail = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'playfair' } })
    expect(detail.isError).not.toBe(true)
    const [detailEntry] = detail.content as [{ type: string; text: string }]
    expect(detailEntry.text).toContain('(playfair) — classical, digraph')
    expect(detailEntry.text).toContain('key (string, required)')

    const unknown = await client.callTool({ name: 'cipher_info', arguments: { cipher: 'missing' } })
    expect(unknown.isError).toBe(true)
    expect(unknown.content).toEqual([
      {
        type: 'text',
        text: `cipher_info failed: Unknown cipher: "missing". Registered ciphers: ${builtinCiphers.join(', ')}`,
      },
    ])

    const oversized = await client.callTool({
      name: 'cipher_info',
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

    const list = await client.callTool({ name: 'cipher_info', arguments: {} })
    const [listEntry] = list.content as [{ type: string; text: string }]
    expect(listEntry.text).toContain('custom-test [transposition]')

    const detail = await client.callTool({
      name: 'cipher_info',
      arguments: { cipher: 'custom-test' },
    })
    expect(detail.isError).not.toBe(true)
    const [detailEntry] = detail.content as [{ type: string; text: string }]
    expect(detailEntry.text).toContain('Custom Test (custom-test)')
  })

  it('reports the index of coincidence over the protocol', async () => {
    const client = await connectTestClient()

    const frequency = await client.callTool({
      name: 'cipher_frequency',
      arguments: { text: 'AAAA' },
    })
    expect(frequency.isError).not.toBe(true)
    const [entry] = frequency.content as [{ type: string; text: string }]
    expect(entry.text).toContain('Index of coincidence: 1.0000 (en plaintext ~0.065')

    const polish = await client.callTool({
      name: 'cipher_frequency',
      arguments: { text: 'AAAA', lang: 'pl' },
    })
    const [polishEntry] = polish.content as [{ type: string; text: string }]
    expect(polishEntry.text).toContain('(pl plaintext ~0.057, uniform random ~0.038)')
  })

  it('puts the best-fitting Caesar shift first', async () => {
    const client = await connectTestClient()
    const lines = async (args: Readonly<Record<string, unknown>>) => {
      const result = await client.callTool({ name: 'cipher_brute_caesar', arguments: args })
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
    expect((await lines({ text: japanese }))[0]).not.toContain('KIMIGAYO')

    const noLetters = await lines({ text: '1234' })
    expect(noLetters[0]).toBe('shift= 1 -> 1234')
    expect(noLetters[24]).toBe('shift=25 -> 1234')
  })

  it('keeps the top Caesar shift whole and cuts the rest to a preview', async () => {
    const client = await connectTestClient()
    const brute = async (text: string) => {
      const result = await client.callTool({ name: 'cipher_brute_caesar', arguments: { text } })
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
        name: 'cipher_decode',
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
      content: [{ type: 'text', text: 'Unknown cipher tool: "toString"' }],
    })

    const forged = await client.callTool({ name: 'x\nFAKE: ok', arguments: {} })
    expect(onlyText(forged.content)).toBe('Unknown cipher tool: "x\\nFAKE: ok"')

    const forgedCipher = await client.callTool({
      name: 'cipher_info',
      arguments: { cipher: 'x\nFAKE: ok' },
    })
    expect(onlyText(forgedCipher.content)).not.toContain('\n')

    const unknownCipher = await client.callTool({
      name: 'cipher_encode',
      arguments: { cipher: 'missing', text: 'abc' },
    })
    expect(unknownCipher.isError).toBe(true)
    expect(onlyText(unknownCipher.content)).toBe(
      `Invalid arguments at /cipher: must be one of ${builtinCiphers.join(', ')}`,
    )

    const badLetters = await client.callTool({
      name: 'cipher_encode',
      arguments: { cipher: 'bacon', text: 'abc', letters: 25 },
    })
    expect(onlyText(badLetters.content)).toBe(
      'Invalid arguments at /letters: must be one of 24, 26',
    )
  })
})
