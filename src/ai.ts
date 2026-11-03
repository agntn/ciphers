/** Vercel AI SDK tools over the same definitions MCP, Pi, OMP and the CLI read. */

import { toAiTools } from '@agntn/tools/ai'
import type { Tool } from 'ai'
import { ciphersTools } from './tools.ts'

/** The name each cipher tool answers to, the same on every host. */
export type CiphersToolName =
  | 'ciphers_encode'
  | 'ciphers_decode'
  | 'ciphers_caesar_brute'
  | 'ciphers_frequency'
  | 'ciphers_period_estimate'
  | 'ciphers_family_guess'
  | 'ciphers_passphrase_probe'
  | 'ciphers_crib_drag'
  | 'ciphers_hidden_text_read'
  | 'ciphers_key_recover'
  | 'ciphers_info'

/** Every cipher tool for the AI SDK under its MCP name. The library loads on the first call. */
export const ciphersAiTools: Readonly<Record<CiphersToolName, Tool>> = toAiTools(
  ciphersTools,
) as Record<CiphersToolName, Tool>
