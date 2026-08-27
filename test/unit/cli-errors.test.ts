import { describe, it, expect } from 'vite-plus/test'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const CLI_PATH = join(__dirname, '../../dist/cli.mjs')

describe('CLI error formatting', () => {
  it('exits with status 1 and prints clean error without stack trace for unknown cipher', () => {
    try {
      execFileSync(process.execPath, [CLI_PATH, 'encode', 'unknown', 'foo'], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      expect.unreachable('Should have thrown')
    } catch (error: any) {
      expect(error.status).toBe(1)
      const stderr = error.stderr as string
      expect(stderr).toContain('Unknown cipher: unknown')
      expect(stderr).not.toContain('UnknownCipherError:')
      expect(stderr).not.toContain('    at ')
    }
  })

  it('exits with status 1 and prints clean error for invalid tap code coordinate', () => {
    try {
      execFileSync(process.execPath, [CLI_PATH, 'decode', 'tap-code', '2 3 0 1 5'], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      expect.unreachable('Should have thrown')
    } catch (error: any) {
      expect(error.status).toBe(1)
      const stderr = error.stderr as string
      expect(stderr).toContain('Invalid tap code coordinate: 0')
      expect(stderr).not.toContain('    at ')
    }
  })
})
