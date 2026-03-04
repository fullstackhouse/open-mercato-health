import { defineConfig } from 'tsup'

export default defineConfig([
  // Main library builds with types
  {
    entry: [
      'src/index.ts',
      'src/strategies/index.ts',
      'src/handlers/index.ts',
      'src/integrations/nextjs.ts',
    ],
    format: ['esm'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    external: [
      'next',
      '@mikro-orm/postgresql',
      '@open-mercato/cache',
      '@open-mercato/shared',
    ],
  },
  // Module files (Open Mercato integration)
  {
    entry: {
      'modules/health/index': 'src/modules/health/index.ts',
      'modules/health/api/get/live': 'src/modules/health/api/get/live.ts',
      'modules/health/api/get/ready': 'src/modules/health/api/get/ready.ts',
    },
    format: ['esm'],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    external: [
      'next',
      'next/server',
      '@mikro-orm/postgresql',
      '@open-mercato/cache',
      '@open-mercato/shared',
    ],
  },
])
