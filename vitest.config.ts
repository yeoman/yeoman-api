import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      lines: 80,
      branches: 80,
      statements: 80,
    },
  },
});
