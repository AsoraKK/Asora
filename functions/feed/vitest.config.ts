import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['feed/tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov', 'json-summary'],
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['feed/pipeline/**/*.ts', 'feed/pipeline/adapters/**/*.ts'],
      exclude: [
        'feed/pipeline/**/*.d.ts',
        'feed/pipeline/**/index.d.ts',
        'feed/pipeline/adapters/hive.ts',
        'feed/tests/**',
        '**/*.test.ts',
      ],
      thresholds: {
        lines: 96,
        branches: 92,
        functions: 95,
        statements: 96,
      },
    },
  },
});
