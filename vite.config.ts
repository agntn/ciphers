import oxlint from '@agntn/ox/oxlint'
import oxfmt from '@agntn/ox/oxfmt'
import { defineConfig } from 'vite-plus'

const readonlyParams = oxlint.rules?.['typescript/prefer-readonly-parameter-types']
if (!Array.isArray(readonlyParams)) {
  throw new TypeError('@agntn/ox no longer configures typescript/prefer-readonly-parameter-types')
}
const [severity, options] = readonlyParams

export default defineConfig({
  lint: {
    ...oxlint,
    rules: {
      ...oxlint.rules,
      /** TypedArrays have no readonly form in the TS lib, and `aesEcb` takes and returns bytes. */
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
