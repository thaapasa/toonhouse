// Loads the SVG files of the library on demand. Each asset loads all its
// files at once, so a drawing shows an asset whole or not at all. The texts
// stay in memory for the rest of the visit, and the browser caches the files,
// which have a content hash in their names.
import type { PartSources } from '@toonhouse/stage';
import { useEffect, useSyncExternalStore } from 'react';

/** The URL of the SVG of each layer of an asset, by `layerKey`. */
export type PartFiles = Readonly<Record<string, string>>;

/** How long a failed asset waits before a drawing tries to load it again. */
const RETRY_MS = 10_000;

const texts = new Map<string, Promise<string>>();
const loaded = new WeakMap<PartFiles, PartSources>();
const loading = new WeakMap<PartFiles, Promise<void>>();
const failedAt = new WeakMap<PartFiles, number>();

let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version++;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => version;

function svgText(url: string): Promise<string> {
  let text = texts.get(url);
  if (!text) {
    text = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.text();
    });
    texts.set(url, text);
    text.catch(() => texts.delete(url));
  }
  return text;
}

/** The SVG texts of an asset, if they have loaded. */
export const loadedSources = (files: PartFiles): PartSources | undefined =>
  loaded.get(files);

/**
 * Loads the SVG texts of an asset. The promise resolves when the load ends,
 * also when it fails, and then the asset stays missing from the drawings.
 */
export function loadSources(files: PartFiles): Promise<void> {
  let done = loading.get(files);
  if (!done) {
    done = Promise.all(
      Object.entries(files).map(
        async ([key, url]) => [key, await svgText(url)] as const,
      ),
    ).then(
      (entries) => {
        loaded.set(files, Object.fromEntries(entries));
        failedAt.delete(files);
        changed();
      },
      (e: unknown) => {
        console.error(e);
        loading.delete(files);
        failedAt.set(files, Date.now());
        changed();
      },
    );
    loading.set(files, done);
  }
  return done;
}

/** Loads the SVG texts of all the assets. */
export const loadAllSources = (list: readonly PartFiles[]) =>
  Promise.all(list.map(loadSources)).then(() => undefined);

const settled = (files: PartFiles) => loaded.has(files) || failedAt.has(files);

/**
 * Loads the SVG texts of the assets, and renders again when one of them has
 * loaded. Read them with `loadedSources`. Returns whether every load has
 * ended, with or without the texts.
 */
export function useSources(list: readonly PartFiles[]): boolean {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    const now = Date.now();
    for (const files of list) {
      const failed = failedAt.get(files);
      if (
        !loaded.has(files) &&
        (failed === undefined || now - failed > RETRY_MS)
      )
        void loadSources(files);
    }
  });
  return list.every(settled);
}
