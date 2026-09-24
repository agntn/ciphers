import { mkdtemp, rm } from 'node:fs/promises'
import { readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { builtins } from '../../src/ciphers/index.ts'
import { builtinCiphers } from '../../src/core/ciphers.ts'
import { ciphers, create } from '../../src/core/registry.ts'

const cipherDirectory = fileURLToPath(new URL('../../src/ciphers/', import.meta.url))

/**
 * Modules across the category folders and their subfolders, without the `index.ts` lists.
 *
 * @returns {string[]} Absolute paths, cipher files and shared primitives such as `aes/block.ts`.
 */
function moduleFiles(): string[] {
  return readdirSync(cipherDirectory, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.ts') && path.basename(name) !== 'index.ts')
    .map((name) => path.join(cipherDirectory, name))
}

/**
 * The modules that define a cipher class, each with the name the class reports. A list, not a
 * map, so two modules claiming one name both show up.
 *
 * @returns {Array<{ name: string; file: string }>} One entry per cipher module.
 */
function cipherFiles(): Array<{ name: string; file: string }> {
  const files: Array<{ name: string; file: string }> = []
  for (const file of moduleFiles()) {
    const source = readFileSync(file, 'utf8')
    if (!/\bextends Cipher\b/.test(source)) continue
    const name = /\bname\(\): string \{\s*return '([^']+)'/.exec(source)?.[1]
    if (name === undefined) throw new Error(`${file} extends Cipher but its name() was not found`)
    files.push({ name, file })
  }
  return files
}

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
    expect(
      cipherFiles()
        .map(({ name }) => name)
        .sort(),
    ).toEqual([...ciphers()].sort())
  })

  it('keeps each cipher in the folder named after its category', () => {
    const files = cipherFiles()
    for (const name of ciphers()) {
      const { category } = create(name).info()
      const file = files.find((entry) => entry.name === name)?.file ?? ''
      expect(path.relative(cipherDirectory, file), name).toMatch(
        new RegExp(`^${category}/(?:${name}|[a-z0-9-]+/[a-z0-9-]+)\\.ts$`),
      )
    }
  })

  it('declares only the CLI as a side effect', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { sideEffects: unknown }
    expect(manifest.sideEffects).toEqual(['./dist/cli.mjs'])
  })

  it('does not register a cipher from its own module', () => {
    for (const file of moduleFiles()) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\bregister\s*\(/)
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
