import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const port = Number(process.env.STUDIO_PORT ?? 10711);

// The studio only runs on the dev server. It has no production build.
export default defineConfig({
  plugins: [react()],
  server: { port, strictPort: true, host: true },
});
