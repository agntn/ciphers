import type { McpServerInfo } from '@agntn/tools/mcp'
import { version } from './version.ts'

/** How both MCP servers introduce themselves, so a connector card isn't just a name. */
export const serverInfo = {
  name: 'ciphers',
  version,
  description:
    'Encode, decode and crack ciphers from Caesar to ChaCha20, OpenPGP included. Brute force, letter counts and key recovery, so the model stops counting on its fingers.',
  icons: [
    { src: 'https://ciphers.agntn.dev/favicon.svg', mimeType: 'image/svg+xml', sizes: ['any'] },
    { src: 'https://ciphers.agntn.dev/icon-512.png', mimeType: 'image/png', sizes: ['512x512'] },
  ],
} satisfies McpServerInfo
