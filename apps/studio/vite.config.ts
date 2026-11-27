import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { saveRigPlugin } from './server/saveRig.ts';

const port = Number(process.env.STUDIO_PORT ?? 10711);
// The studio writes files in the repo, so it listens only on this computer
// unless STUDIO_HOST asks for more, such as `0.0.0.0` for another device.
const host = process.env.STUDIO_HOST ?? 'localhost';

// The studio only runs on the dev server. It has no production build. It
// serves the favicons of the web app.
export default defineConfig({
  publicDir: resolve(import.meta.dirname, '../web/public'),
  plugins: [react(), saveRigPlugin(resolve(import.meta.dirname, '../..'))],
  server: { port, strictPort: true, host },
});
