#!/usr/bin/env node
// Packed-package smoke test for the published CLI and the Pi and OMP extensions.
//
// Unit tests import the library from src/, so none of them touch the tarball npm
// installs. `bin` points at dist/cli.mjs, and that file only works as a command
// when the build keeps its shebang and its executable bit. Drop either one and
// the kernel refuses the file, the shell fallback reads a JavaScript bundle as a
// shell script, and `ciphers --help` never reaches Node. The extensions ship as
// TypeScript source that the host loads from the install, so a file they import
// that `files` leaves out breaks them while every other check stays green.
//
// POSIX only. Windows installs the bin as a generated .cmd shim, so neither the
// shebang nor the execute bit decides anything there.
//
// Run: pnpm test:packed

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Type as OmpType } from '@oh-my-pi/omptype/typebox'
import { register } from 'tsx/esm/api'

if (process.platform === 'win32') {
  console.log('Skipped on Windows, where npm installs the bin as a .cmd shim')
  process.exit(0)
}

const root = path.resolve(import.meta.dirname, '..')

/**
 * Run a command from the repository root.
 *
 * @param {string} command - Executable path or name.
 * @param {readonly string[]} args - Command arguments.
 * @returns {string} Captured standard output.
 */
function run(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
  })
}

// Unpacking inside the checkout lets the packed CLI resolve citty and consola
// from the repository's node_modules, so the test needs no registry install.
const temporaryRoot = await mkdtemp(path.join(root, '.ciphers-packed-test-'))
try {
  // pnpm pack runs prepack, so the tarball always carries a fresh build.
  const tarball = path.join(temporaryRoot, 'ciphers.tgz')
  run('pnpm', ['pack', '--out', tarball])
  run('tar', ['-xzf', tarball, '-C', temporaryRoot])

  const packageRoot = path.join(temporaryRoot, 'package')
  /** @type {unknown} */
  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'))
  assert.ok(
    typeof manifest === 'object' && manifest !== null,
    'packed package.json is not an object',
  )
  assert.ok(
    'name' in manifest && typeof manifest.name === 'string',
    'packed package.json has no name',
  )
  assert.ok(
    'version' in manifest && typeof manifest.version === 'string',
    'packed package.json has no version',
  )
  assert.ok('bin' in manifest && typeof manifest.bin === 'object' && manifest.bin !== null)
  assert.ok(
    'ciphers' in manifest.bin && typeof manifest.bin.ciphers === 'string',
    'packed package.json declares no ciphers bin',
  )
  const binEntry = manifest.bin.ciphers
  const binPath = path.join(packageRoot, binEntry)

  // Both checks run before the CLI does. On a regression the executable would be
  // handed to /bin/sh, which reads every `import` line as ImageMagick's import
  // and grabs the mouse until the timeout kills it.
  const source = await readFile(binPath, 'utf8')
  assert.match(source, /^#!\/usr\/bin\/env node\n/, `${binEntry} lost its shebang`)
  const { mode } = await stat(binPath)
  assert.ok(mode & 0o111, `${binEntry} is not executable, mode ${(mode & 0o777).toString(8)}`)

  // Run the file itself, the way npm's bin symlink does, not through node.
  const encoded = run(binPath, ['encode', 'caesar', 'HELLO', '--shift', '3'])
  assert.equal(encoded.trim(), 'KHOOR')
  const decoded = run(binPath, ['decode', 'caesar', 'KHOOR', '--shift', '3'])
  assert.equal(decoded.trim(), 'HELLO')

  assert.equal(run(binPath, ['encode', 'beaufort', 'DCODE', '--key', 'KEY']).trim(), 'HCKHA')
  assert.equal(
    run(binPath, ['encode', 'autokey', 'ATTACKATDAWN', '--key', 'QUEENLY']).trim(),
    'QNXEPVYTWTWP',
  )
  assert.equal(
    run(binPath, ['decode', 'autokey', 'QNXEPVYTWTWP', '--key', 'QUEENLY']).trim(),
    'ATTACKATDAWN',
  )
  assert.equal(run(binPath, ['decode', 'beaufort', 'HCKHA', '--key', 'KEY']).trim(), 'DCODE')
  assert.equal(
    run(binPath, ['encode', 'bacon', 'KNIGHT', '--letters', '24']).trim(),
    'ABAABABBAAABAAAAABBAAABBBBAABA',
  )
  assert.equal(
    run(binPath, ['decode', 'bacon', 'ABAABABBAAABAAAAABBAAABBBBAABA', '--letters', '24']).trim(),
    'KNIGHT',
  )

  // `files` decides what ships. Docs, tests and repo config stay in the checkout.
  assert.deepEqual((await readdir(packageRoot)).sort(), [
    'LICENSE',
    'README.md',
    'dist',
    'package.json',
    'packages',
    'src',
  ])

  // tsx stands in for the host's loader. Its namespaced tsImport() fails on
  // node: builtins under Node 26, so the loader is registered for the two
  // imports and removed again. The tool call then resolves `@agntn/ciphers` to
  // this package's own dist.
  const unregister = register()
  /**
   * @param {string} host - Extension directory under packages/.
   * @returns {Promise<{ default: (api: object) => void }>} The extension module.
   */
  const extension = (host) =>
    import(pathToFileURL(path.join(packageRoot, `packages/${host}/extensions/ciphers.ts`)).href)
  const omp = await extension('omp')
  const pi = await extension('pi')
  await unregister()
  /** @type {[string, (api: object) => void, object][]} */
  const hosts = [
    ['omp', omp.default, { typebox: { Type: OmpType }, pi: { Text: class {} } }],
    ['pi', pi.default, {}],
  ]
  for (const [host, extensionEntry, api] of hosts) {
    /** @typedef {{ name: string, execute(id: string, params: object): Promise<{ content: { text: string }[] }> }} PackedTool */
    /** @type {Map<string, Readonly<PackedTool>>} */
    const tools = new Map()
    extensionEntry({
      ...api,
      /** @param {Readonly<PackedTool>} tool - Tool the extension registers. */
      registerTool: (tool) => {
        tools.set(tool.name, tool)
      },
    })
    const encode = tools.get('cipher_encode')
    assert.ok(encode, `${host} extension registered no cipher_encode`)
    const result = await encode.execute('packed', { cipher: 'caesar', text: 'HELLO', shift: 3 })
    assert.equal(result.content[0]?.text, 'KHOOR', `${host} extension`)
  }

  console.log(
    `Packed ${manifest.name}@${manifest.version} ran ${binEntry} as a command and loaded both extensions`,
  )
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}
