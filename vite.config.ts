import oxlint from '@agntn/ox/oxlint'
import oxfmt from '@agntn/ox/oxfmt'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    ...oxlint,
    rules: { ...oxlint.rules },
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
