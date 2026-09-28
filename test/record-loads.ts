import { writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'

/**
 * Every module URL Node loaded after this file, written at exit as one JSON array to the file
 * named by `CIPHERS_RECORD_LOADS`. Not stderr: once anything reads `process.stderr`, libuv makes a
 * piped fd 2 non-blocking, and one `writeSync` stops where the pipe is full, 64 KB on some runs,
 * short of the `mcp` report, which carries the checkout path in every URL.
 */
const loaded: string[] = []
const report = process.env.CIPHERS_RECORD_LOADS
if (!report) throw new Error('CIPHERS_RECORD_LOADS must name the file for the load report')

registerHooks({
  load(url, context, nextLoad) {
    loaded.push(url)
    return nextLoad(url, context)
  },
})

process.on('exit', () => {
  writeFileSync(report, JSON.stringify(loaded))
})
