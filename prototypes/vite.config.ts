import { resolve } from 'node:path';

import { defineConfig } from 'vite';

const port = Number(process.env.PROTOTYPES_PORT ?? 10790);

export default defineConfig({
  server: { port, strictPort: true, host: true },
  preview: { port, strictPort: true, host: true },
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        '2d': resolve(import.meta.dirname, '2d.html'),
        '3d': resolve(import.meta.dirname, '3d.html'),
      },
    },
  },
});
