import { defineBuildConfig } from 'obuild/config'

export default defineBuildConfig({
  entries: [
    {
      type: 'bundle',
      input: [
        './src/index.ts',
        './src/aes.ts',
        './src/chacha.ts',
        './src/salsa.ts',
        './src/cli.ts',
        './src/mcp.ts',
        './src/tools.ts',
      ],
    },
  ],
})
