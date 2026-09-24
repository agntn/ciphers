#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runMain, defineCommand, type ArgsDef, type CommandDef } from 'citty'
import type McpCommand from './commands/mcp.ts'
import { normalizeMainArgs } from './cli-args.ts'
import { CipherError } from './core/errors.ts'
import { version } from './version.ts'

async function loadCommand<T extends ArgsDef>(
  loader: () => Promise<{ readonly default: CommandDef<T> }>,
): Promise<CommandDef<T>> {
  const command = (await loader()).default
  const run = command.run
  if (!run) return command

  return {
    ...command,
    async run(context) {
      try {
        const result: unknown = await run(context)
        return result
      } catch (error) {
        if (!(error instanceof CipherError)) throw error
        process.stderr.write(`${error.message}\n`)
        process.exitCode = 1
      }
    },
  }
}

/** The same file from `src/cli.ts` and `dist/cli.mjs`; the npm package ships no `src/commands`. */
const sourceMcpCommand = new URL('../src/commands/mcp.ts', import.meta.url)

/**
 * Narrows the module a runtime URL import returned, which TypeScript types as `any`.
 *
 * @param value - The imported module namespace.
 * @returns {boolean} Whether it exports a default command.
 */
function isMcpModule(value: unknown): value is { readonly default: typeof McpCommand } {
  return typeof value === 'object' && value !== null && 'default' in value
}

/**
 * Whether the source can run. The server imports `typebox`, a devDependency the bundle inlines, so a
 * checkout installed with production dependencies only has to keep the bundle.
 *
 * @returns {boolean} Whether `typebox` resolves from this package.
 */
function hasSourceDependencies(): boolean {
  try {
    import.meta.resolve('typebox')
    return true
  } catch {
    return false
  }
}

/**
 * Loads the MCP command. A built bin inside a checkout runs the live source, as the Pi and OMP
 * extensions do, so a local server needs a restart after a change instead of `pnpm build`. Node
 * refuses to strip types under `node_modules`, so a copy there keeps the bundle, and so does the npm
 * package, which ships no `src/commands`. `CIPHERS_DIST=1` keeps it everywhere, for tests of the build.
 *
 * @returns {Promise<{ readonly default: typeof McpCommand }>} The module holding the command.
 */
async function loadMcpCommand(): Promise<{ readonly default: typeof McpCommand }> {
  const sourcePath = fileURLToPath(sourceMcpCommand)
  const fromSource =
    !import.meta.url.endsWith('.ts') &&
    process.env['CIPHERS_DIST'] !== '1' &&
    !sourcePath.includes(`${sep}node_modules${sep}`) &&
    existsSync(sourcePath) &&
    hasSourceDependencies()
  if (!fromSource) return import('./commands/mcp.ts')
  const module: unknown = await import(sourceMcpCommand.href)
  if (!isMcpModule(module)) throw new TypeError(`${sourcePath} has no default command`)
  return module
}

/**
 * Ends the process once the reader of stdout or stderr is gone, as after `| head -1` or a pager that
 * quits early. Node ignores SIGPIPE, so without a listener the next write throws `EPIPE` with a stack
 * trace. The exit code stays whatever the command set.
 *
 * @param error - The error the stream emitted.
 */
function exitOnClosedPipe(error: Readonly<NodeJS.ErrnoException>): void {
  if (error.code !== 'EPIPE') throw error
  process.exit()
}

process.stdout.on('error', exitOnClosedPipe)
process.stderr.on('error', exitOnClosedPipe)

const main = defineCommand({
  meta: {
    name: 'ciphers',
    version,
    description: 'ciphers: educational and puzzle cipher encode/decode/analyze CLI',
  },
  subCommands: {
    encode: () => loadCommand(() => import('./commands/encode.ts')),
    decode: () => loadCommand(() => import('./commands/decode.ts')),
    ciphers: () => loadCommand(() => import('./commands/ciphers.ts')),
    info: () => loadCommand(() => import('./commands/info.ts')),
    brute: () => loadCommand(() => import('./commands/brute.ts')),
    mcp: () => loadCommand(loadMcpCommand),
    frequency: () => loadCommand(() => import('./commands/frequency.ts')),
  },
})

await runMain(main, { rawArgs: normalizeMainArgs(process.argv.slice(2)) })
