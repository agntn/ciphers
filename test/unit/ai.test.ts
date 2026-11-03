import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { generateText, isStepCount } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { describe, expect, it } from 'vite-plus/test'
import { ciphersAiTools } from '../../src/ai.ts'
import { createMcpServer } from '../../src/mcp.ts'
import { ciphersTools } from '../../src/tools.ts'

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}

/* A model that makes one tool call with the given input, then says it's done. */
function scriptedModel(toolName: string, input: object): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: [
      {
        content: [
          { type: 'tool-call', toolCallId: 'call-0', toolName, input: JSON.stringify(input) },
        ],
        finishReason: { unified: 'tool-calls', raw: undefined },
        usage,
        warnings: [],
      },
      {
        content: [{ type: 'text', text: 'done' }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        warnings: [],
      },
    ],
  })
}

/* Runs one scripted tool call through generateText and hands back the tool's part of the step. */
async function callThroughModel(toolName: string, input: object): Promise<unknown> {
  const result = await generateText({
    model: scriptedModel(toolName, input),
    tools: ciphersAiTools,
    stopWhen: isStepCount(2),
    prompt: 'crack the puzzle',
  })
  return result.steps[0]?.content[1]
}

/* The text `ciphers mcp` answers the same call with. */
async function mcpText(name: string, args: Readonly<Record<string, unknown>>): Promise<string> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createMcpServer()
  const client = new Client({ name: 'ciphers-ai-test', version: '1.0.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  try {
    const result = await client.callTool({ name, arguments: { ...args } })
    const [block] = result.content as ReadonlyArray<{ type: string; text?: string }>
    return block?.text ?? ''
  } finally {
    await Promise.all([client.close(), server.close()])
  }
}

describe('@agntn/ciphers/ai', () => {
  it('offers every tool MCP, Pi and OMP list, under the same name and in the same order', () => {
    expect(Object.keys(ciphersAiTools)).toEqual(ciphersTools.map((tool) => tool.name))
  })

  it('hands the model the MCP text and the app the options the cipher used', async () => {
    const input = { cipher: 'vigenere', text: 'ATTACKATDAWN', key: 'LEMON' }

    const toolResult = await callThroughModel('ciphers_encode', input)

    expect(toolResult).toMatchObject({
      type: 'tool-result',
      toolName: 'ciphers_encode',
      output: {
        text: 'LXFOPVEFRNHR',
        cipher: 'vigenere',
        operation: 'encode',
        options: { key: 'LEMON' },
      },
    })
    expect(await mcpText('ciphers_encode', input)).toBe('LXFOPVEFRNHR')
  })

  it('gives the model the same brute force table an MCP client reads', async () => {
    const input = { text: 'WKH TXLFN EURZQ IRA' }

    const toolResult = await callThroughModel('ciphers_caesar_brute', input)

    const output = (toolResult as { output: { text: string } }).output
    expect(output.text).toBe(await mcpText('ciphers_caesar_brute', input))
    expect(output.text.split('\n')[0]).toContain('THE QUICK BROWN FOX')
  })

  it('turns away input the schema rejects before a cipher sees it', async () => {
    const toolError = await callThroughModel('ciphers_encode', {
      cipher: 'caesar',
      text: 'abc',
      shfit: 3,
    })

    expect(toolError).toMatchObject({ type: 'tool-error', toolName: 'ciphers_encode' })
    expect(String((toolError as { error: unknown }).error)).toContain('shfit')
  })

  it("reports a cipher's own refusal as a tool error with the reason in it", async () => {
    const toolError = await callThroughModel('ciphers_encode', {
      cipher: 'vigenere',
      text: 'abc',
    })

    expect(toolError).toMatchObject({ type: 'tool-error', toolName: 'ciphers_encode' })
    expect(String((toolError as { error: unknown }).error)).toContain('required for vigenere')
  })
})
