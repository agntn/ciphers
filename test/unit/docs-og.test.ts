import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vite-plus/test'

describe('landing SEO description', () => {
  /** A plain YAML line, since a ` #` there starts a comment and cuts the description short. */
  it('keeps the SEO description a plain line', () => {
    const page = readFileSync(new URL('../../docs/content/index.md', import.meta.url), 'utf8')
    const description = /^ {2}description: (.*)$/mu.exec(page)?.[1] ?? ''
    expect(description).toMatch(/^[^\s"'>|]/u)
    expect(description).not.toMatch(/ #/u)
  })
})
