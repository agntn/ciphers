#!/usr/bin/env node
// Packed-package smoke test for the published CLI.
//
// Unit tests import the library from src/, so none of them touch the tarball npm
// installs. `bin` points at dist/cli.mjs, and that file only works as a command
// when the build keeps its shebang and its executable bit. Drop either one and
// the kernel refuses the file, the shell fallback reads a JavaScript bundle as a
// shell script, and `ciphers --help` never reaches Node.
//
// POSIX only. Windows installs the bin as a generated .cmd shim, so neither the
// shebang nor the execute bit decides anything there.
//
// Run: pnpm test:packed

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'

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

  console.log(`Packed ${manifest.name}@${manifest.version} ran ${binEntry} as a command`)
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}
