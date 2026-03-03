import { defineConfig } from 'vite';
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
  server: {
    port: 3000,
    open: true,
  },
});
