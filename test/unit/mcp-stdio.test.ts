import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { describe, expect, it } from 'vite-plus/test'

const bin = fileURLToPath(new URL('../../dist/cli.mjs', import.meta.url))
const built = existsSync(bin)

/** The SDK client defaults to legacy, so 2026 takes a pin. */
type Era = 'legacy' | Readonly<{ pin: string }>

/** Every way `ciphers mcp` starts; both bins want `pnpm build` first. */
const entries = [
  {
    from: 'src/cli.ts',
    entry: fileURLToPath(new URL('../../src/cli.ts', import.meta.url)),
    env: {},
  },
  { from: 'the checkout bin', entry: bin, env: {} },
  { from: 'the bundle', entry: bin, env: { CIPHERS_DIST: '1' } },
] as const

/** What one connection saw before it closed. */
interface Session {
  readonly version: string | undefined
  readonly names: readonly string[]
}

/**
 * Opens one client on `ciphers mcp`, lists the tools and hangs up.
 *
 * @param mode - Legacy handshake or a pinned 2026 version.
 * @param build - Which entry to start and its extra env.
 * @returns {Promise<Session>} The negotiated version and the tool names.
 */
async function session(mode: Era, build: (typeof entries)[number]): Promise<Session> {
  const client = new Client(
    { name: 'ciphers-test', version: '1.0.0' },
    { versionNegotiation: { mode } },
  )
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [build.entry, 'mcp'],
      env: { ...process.env, ...build.env } as Record<string, string>,
      stderr: 'ignore',
    }),
  )
  try {
    if (mode !== 'legacy') await (await client.listen({ toolsListChanged: true })).close()
    const { tools } = await client.listTools()
    return { version: client.getNegotiatedProtocolVersion(), names: tools.map((tool) => tool.name) }
  } finally {
    await client.close()
  }
}

describe('ciphers mcp over stdio', () => {
  it.each(entries.filter((build) => built || build.entry !== bin))(
    'answers 2026 and 2025 clients alike, from $from',
    async (build) => {
      const legacy = await session('legacy', build)
      const pinned = await session({ pin: '2026-07-28' }, build)

      expect(legacy.version).toMatch(/^2025-/u)
      expect(legacy.names).toContain('ciphers_encode')
      expect(pinned.version).toBe('2026-07-28')
      expect(pinned.names).toEqual(legacy.names)
    },
  )
})
