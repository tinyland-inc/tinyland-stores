/**
 * Vitest Configuration for @tummycrypt/tinyland-stores (Svelte variant)
 *
 * Works in three modes:
 *   1. Standalone:  cd packages/tinyland-stores && pnpm test
 *   2. Workspace:   vitest run --project=tinyland-stores (from root)
 *   3. Bazel:       bazel test //packages/tinyland-stores:test
 *
 * Uses jsdom environment since stores depend on browser APIs
 * (localStorage, document, window).
 */

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
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
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
