import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./smoke-tests/setup.ts'],
    include: ['smoke-tests/**/*.spec.ts?(x)'],
    globals: true,
    css: true,
    pool: 'forks',
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
