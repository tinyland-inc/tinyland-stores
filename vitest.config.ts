











import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  test: {
    name: 'tinyland-stores',
    root: __dirname,
    globals: true,
    environment: 'node',
    setupFiles: [resolve(__dirname, './tests/setup-dom.ts')],
    include: ['tests/**/*.test.ts'],
    pool: 'threads',
    deps: {
      interopDefault: true,
    },
    isolate: true,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.svelte'],
      thresholds: {
        statements: 60,
        branches: 55,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '$lib': resolve(__dirname, './src'),
    },
  },
});
