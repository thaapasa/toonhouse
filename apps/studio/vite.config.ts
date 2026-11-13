import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { saveRigPlugin } from './server/saveRig.ts';

const port = Number(process.env.STUDIO_PORT ?? 10711);

// The studio only runs on the dev server. It has no production build.
export default defineConfig({
  plugins: [react(), saveRigPlugin(resolve(import.meta.dirname, '../..'))],
  server: { port, strictPort: true, host: true },
});
