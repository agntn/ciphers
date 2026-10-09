import { fileURLToPath } from 'node:url'
import oxlint from '@agntn/ox/oxlint'
import oxfmt from '@agntn/ox/oxfmt'
import { defineConfig } from 'vite-plus'

const readonlyParams = oxlint.rules?.['typescript/prefer-readonly-parameter-types']
if (!Array.isArray(readonlyParams)) {
  throw new TypeError('@agntn/ox no longer configures typescript/prefer-readonly-parameter-types')
}
const [severity, options] = readonlyParams

/** Root tsconfig for oxc: docs/tsconfig.json needs `nuxt prepare` first. Vite's type omits it. */
const oxc: object = { tsconfig: fileURLToPath(new URL('tsconfig.json', import.meta.url)) }

export default defineConfig({
  oxc,
  lint: {
    ...oxlint,
    rules: {
      ...oxlint.rules,
      /** TypedArrays have no readonly form in the TS lib, and `src/aes.ts` works on bytes. */
      'typescript/prefer-readonly-parameter-types': [
        severity,
        { ...options, allow: [...(options?.allow ?? []), { from: 'lib', name: 'Uint8Array' }] },
      ],
    },
    ignorePatterns: ['dist', 'coverage', 'docs'],
  },
  fmt: {
    ...oxfmt,
    // changelogen writes it at release time, after check has run
    ignorePatterns: ['dist', 'coverage', 'docs', 'CHANGELOG.md'],
    semi: false,
    singleQuote: true,
  },
})
