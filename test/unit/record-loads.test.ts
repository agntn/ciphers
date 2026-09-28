import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const hookPath = fileURLToPath(new URL('../record-loads.ts', import.meta.url))

describe('record-loads', () => {
  it('keeps a report longer than a pipe takes at exit', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'ciphers-loads-'))
    try {
      /** 600 modules of about 430 bytes after the script reads `process.stderr`: a 260 KB report, where a piped stderr kept 64 KB. */
      const modules = Array.from(
        { length: 600 },
        (_, index) => `data:text/javascript,export default ${index};//${'x'.repeat(400)}`,
      )
      const script = path.join(directory, 'load-many.mjs')
      writeFileSync(
        script,
        ['process.stderr;', ...modules.map((url) => `await import(${JSON.stringify(url)});`)]
          .map((line) => `${line}\n`)
          .join(''),
      )
      const report = path.join(directory, 'loaded.json')
      const result = spawnSync(process.execPath, ['--import', hookPath, script], {
        encoding: 'utf8',
        env: { ...process.env, CIPHERS_RECORD_LOADS: report },
        timeout: 20_000,
      })

      expect(result.status, result.stderr).toBe(0)
      const loaded: unknown = JSON.parse(readFileSync(report, 'utf8'))
      expect(loaded).toEqual([expect.stringMatching(/\/load-many\.mjs$/u), ...modules])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
