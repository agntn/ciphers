import oxlint from '@agntn/ox/oxlint'
import oxfmt from '@agntn/ox/oxfmt'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    ...oxlint,
    rules: { ...oxlint.rules },
    ignorePatterns: ['dist', 'coverage'],
  },
  fmt: {
    ...oxfmt,
    ignorePatterns: ['dist', 'coverage'],
    semi: false,
    singleQuote: true,
  },
})
