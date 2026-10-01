import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { Text } from '@earendil-works/pi-tui'
import { sanitizeLine } from '@agntn/tools'
import { registerPiTools, type PiRenderers } from '@agntn/tools/pi'
import type * as CiphersTools from '../../../dist/tools.d.mts'
import { PREVIEWED_TOOLS, renderToolResult } from '../../shared/tui.ts'

const sourceModuleUrl = new URL('../../../src/tools.ts', import.meta.url)
const distributionModuleUrl = new URL('../../../dist/tools.mjs', import.meta.url)

/**
 * Narrows the call arguments Pi hands a renderer, which it types as `unknown`.
 *
 * @param value - The arguments.
 * @returns {value is Readonly<Record<string, unknown>>} Whether they are an object.
 */
function isArguments(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null
}

/**
 * Registers the cipher tools from the source in a checkout, from the build in the package.
 *
 * @param pi - Pi extension API.
 */
export default async function ciphersExtension(pi: ExtensionAPI): Promise<void> {
  const { ciphersTools, callSummaries } = (await import(
    existsSync(fileURLToPath(sourceModuleUrl)) ? sourceModuleUrl.href : distributionModuleUrl.href
  )) as typeof CiphersTools
  const renderers = Object.fromEntries(
    ciphersTools.map((tool): [string, PiRenderers] => [
      tool.name,
      {
        renderCall(args) {
          const summary = isArguments(args) ? callSummaries[tool.name]?.(args) : undefined
          return new Text(sanitizeLine(summary ? `${tool.title}: ${summary}` : tool.title), 0, 0)
        },
        ...(PREVIEWED_TOOLS.has(tool.name)
          ? {
              renderResult: (result, options, theme) =>
                new Text(renderToolResult(result, options, theme), 0, 0),
            }
          : {}),
      },
    ]),
  )
  registerPiTools(pi, ciphersTools, { renderers })
}
