import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@taiyaar/shared': path.resolve(import.meta.dirname, '../shared/src/index.ts') },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
