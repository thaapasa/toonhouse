import { defineConfig } from 'vitest/config';

import { devDatabaseUrl } from './src/config.ts';

// The tests use a separate database next to the development database.
const testUrl = new URL(process.env.DATABASE_URL ?? devDatabaseUrl);
testUrl.pathname = `${testUrl.pathname}_test`;

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: { DATABASE_URL: testUrl.href },
    globalSetup: ['src/test/global-setup.ts'],
    // The test files share one database.
    fileParallelism: false,
  },
});
