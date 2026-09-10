import { mkdtemp, rm } from 'node:fs/promises'
import { readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { builtins } from '../../src/ciphers/index'
import { builtinCiphers } from '../../src/core/ciphers'
import { ciphers } from '../../src/core/registry'

function rolldownEntry(): string {
  const pnpm = fileURLToPath(new URL('../../node_modules/.pnpm', import.meta.url))
  const latest = readdirSync(pnpm)
    .filter((name) => name.startsWith('rolldown@'))
    .sort()
    .at(-1)
  if (latest === undefined) throw new Error('rolldown is not installed')
  return path.join(pnpm, latest, 'node_modules/rolldown/dist/index.mjs')
}

describe('registry without import side effects', () => {
  it('lists every built-in without a side-effect import', () => {
    expect(ciphers()).toEqual([...builtinCiphers])
    expect(builtins.map((CipherClass) => new CipherClass().name())).toEqual([...builtinCiphers])
  })

  it('lists every cipher file in the registry', () => {
    const files = readdirSync(new URL('../../src/ciphers/', import.meta.url)).filter(
      (name) => name.endsWith('.ts') && name !== 'index.ts',
    )
    expect(ciphers()).toHaveLength(files.length)
  })

  it('declares only the CLI as a side effect', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { sideEffects: unknown }
    expect(manifest.sideEffects).toEqual(['./dist/cli.mjs'])
  })

  it('does not register a cipher from its own module', () => {
    const directory = fileURLToPath(new URL('../../src/ciphers/', import.meta.url))
    for (const name of readdirSync(directory)) {
      if (!name.endsWith('.ts') || name === 'index.ts') continue
      const source = readFileSync(path.join(directory, name), 'utf8')
      expect(source, name).not.toMatch(/\bregister\s*\(/)
    }
  })

  it('keeps the registry when a bundler assumes no import side effects', async () => {
    const { rolldown } = (await import(pathToFileURL(rolldownEntry()).href)) as {
      rolldown: (
        options: Readonly<{ input: string; treeshake: Readonly<{ moduleSideEffects: false }> }>,
      ) => Promise<{
        write: (options: Readonly<{ file: string; format: 'esm' }>) => Promise<unknown>
        close: () => Promise<void>
      }>
    }
    const directory = await mkdtemp(path.join(tmpdir(), 'ciphers-side-effects-'))
    const outfile = path.join(directory, 'out.mjs')
    const build = await rolldown({
      input: fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
      treeshake: { moduleSideEffects: false },
    })
    try {
      await build.write({ file: outfile, format: 'esm' })
    } finally {
      await build.close()
    }
    try {
      const bundled = (await import(pathToFileURL(outfile).href)) as {
        ciphers: () => string[]
      }
      expect(bundled.ciphers()).toEqual([...builtinCiphers])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
