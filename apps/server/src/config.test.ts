import { afterEach, describe, expect, it, vi } from 'vitest';

async function readPublicOrigin(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  const { publicOrigin } = await import('./config.ts');
  return publicOrigin();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('publicOrigin', () => {
  it('keeps only the origin of PUBLIC_URL', async () => {
    expect(
      await readPublicOrigin({ PUBLIC_URL: 'https://example.com/app/' }),
    ).toBe('https://example.com');
  });

  it('falls back to the request URL in development', async () => {
    expect(
      await readPublicOrigin({ PUBLIC_URL: '', NODE_ENV: 'development' }),
    ).toBeUndefined();
  });

  it('requires PUBLIC_URL in production', async () => {
    await expect(
      readPublicOrigin({ PUBLIC_URL: '', NODE_ENV: 'production' }),
    ).rejects.toThrow('PUBLIC_URL is not set');
  });

  it('refuses an address that is not http or https', async () => {
    await expect(
      readPublicOrigin({ PUBLIC_URL: 'ftp://example.com' }),
    ).rejects.toThrow('http or https');
  });
});
