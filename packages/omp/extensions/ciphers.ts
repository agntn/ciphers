import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { ExtensionAPI } from '@oh-my-pi/pi-coding-agent'
import { registerOmpTools, type OmpRenderers } from '@agntn/tools/omp'
import type * as CiphersTools from '../../../dist/tools.d.mts'
import { PREVIEWED_TOOLS, renderToolResult } from '../../shared/tui.ts'

const sourceModulePath = fileURLToPath(new URL('../../../src/tools.ts', import.meta.url))

/**
 * Both specifiers stay literal: compiled OMP resolves bare imports only where it sees them.
 *
 * @returns {Promise<typeof CiphersTools>} The tool definitions.
 */
function loadTools(): Promise<typeof CiphersTools> {
  return (
    existsSync(sourceModulePath)
      ? import('../../../src/tools.ts')
      : import('../../../dist/tools.mjs')
  ) as Promise<typeof CiphersTools>
}

/**
 * Registers the cipher tools; the library loads on the first call.
 *
 * @param omp - OMP extension API supplied by the host.
 */
export default async function ciphersExtension(omp: ExtensionAPI): Promise<void> {
  const { ciphersTools, callSummaries } = await loadTools()
  /** The host injects its own TUI exports, so the tools render with the running `Text`. */
  const { Text } = omp.pi
  const renderers = Object.fromEntries(
    ciphersTools.map((tool): [string, OmpRenderers] => [
      tool.name,
      {
        describeCall: callSummaries[tool.name],
        ...(PREVIEWED_TOOLS.has(tool.name)
          ? {
              renderResult: (result, options, theme) =>
                new Text(renderToolResult(result, options, theme), 0, 0),
            }
          : {}),
      },
    ]),
  )
  registerOmpTools(omp, ciphersTools, { Text, renderers })
}
