import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const port = Number(process.env.WEB_PORT ?? 10710);
const serverPort = Number(process.env.SERVER_PORT ?? 10700);

// The web app compares this to version.json to see that a new version is deployed.
const buildId = String(Date.now());

function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  server: {
    port,
    strictPort: true,
    host: true,
    // The trailing slash keeps the proxy off the module /src/api.ts.
    proxy: { '/api/': `http://localhost:${serverPort}` },
  },
});
