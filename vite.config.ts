import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.config';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'happy-dom',
  },
});
