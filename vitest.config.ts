import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@compiler': resolve(__dirname, 'src/compiler'),
      '@runtime': resolve(__dirname, 'src/runtime'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@data': resolve(__dirname, 'src/data'),
      '@editor': resolve(__dirname, 'src/editor'),
    },
  },
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
