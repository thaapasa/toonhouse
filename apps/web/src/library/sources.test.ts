import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadedSources,
  loadSources,
  useSources,
  watchSources,
} from './sources.ts';

const respond = (ok: boolean) =>
  vi.fn((url: string) =>
    Promise.resolve(
      new Response(ok ? `<svg id="${url}"/>` : 'no', {
        status: ok ? 200 : 500,
      }),
    ),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('loadSources', () => {
  it('loads every file of an asset', async () => {
    vi.stubGlobal('fetch', respond(true));
    const files = { 'head.main': '/a.svg', 'head.hair': '/b.svg' };
    await loadSources(files);
    expect(loadedSources(files)).toEqual({
      'head.main': '<svg id="/a.svg"/>',
      'head.hair': '<svg id="/b.svg"/>',
    });
  });

  it('resolves also when a file fails, and the asset stays missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', respond(false));
    const files = { 'head.main': '/missing.svg' };
    await loadSources(files);
    expect(loadedSources(files)).toBeUndefined();
  });
});

describe('useSources', () => {
  it('loads a failed asset again after a while, without a new render', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', respond(false));
    const files = { 'head.main': '/flaky.svg' };
    await loadSources(files);
    // A drawing that shows the asset subscribes to it.
    const { promise, resolve } = Promise.withResolvers<void>();
    const unsubscribe = watchSources([files], resolve);
    vi.stubGlobal('fetch', respond(true));
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;
    expect(loadedSources(files)).toEqual({
      'head.main': '<svg id="/flaky.svg"/>',
    });
    unsubscribe();
  });

  it('draws the loaded texts in a static render', async () => {
    vi.stubGlobal('fetch', respond(true));
    const files = { 'body.main': '/static.svg' };
    await loadSources(files);
    const Drawing = () => {
      const done = useSources([files]);
      return createElement(
        'p',
        null,
        `${done} ${loadedSources(files)?.['body.main']}`,
      );
    };
    expect(renderToStaticMarkup(createElement(Drawing))).toBe(
      '<p>true &lt;svg id=&quot;/static.svg&quot;/&gt;</p>',
    );
  });
});
