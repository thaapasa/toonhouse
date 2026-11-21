// Loads the SVG files of the library on demand. Each asset loads all its
// files at once, so a drawing shows an asset whole or not at all. The texts
// stay in memory for the rest of the visit, and the browser caches the files,
// which have a content hash in their names.
import type { PartSources } from '@toonhouse/stage';
import { useEffect, useSyncExternalStore } from 'react';

/** The URL of the SVG of each layer of an asset, by `layerKey`. */
export type PartFiles = Readonly<Record<string, string>>;

/** How long a failed asset waits before it loads again. */
const RETRY_MS = 10_000;

/** The loading state of one asset. */
interface Entry {
  sources?: PartSources;
  /** The load in progress. It resolves also when the load fails. */
  loading?: Promise<void>;
  /**
   * The latest load failed. The asset stays missing from the drawings until
   * a new load succeeds.
   */
  failed: boolean;
  /** A failed load waits for its retry timer. */
  waiting: boolean;
  /** The drawings that show the asset, to render again when it loads. */
  listeners: Set<() => void>;
}

const entries = new WeakMap<PartFiles, Entry>();
// Several assets can share an SVG file, so the texts are kept by URL.
const texts = new Map<string, Promise<string>>();

function entryOf(files: PartFiles): Entry {
  let e = entries.get(files);
  if (!e) {
    e = { failed: false, waiting: false, listeners: new Set() };
    entries.set(files, e);
  }
  return e;
}

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
  entries.get(files)?.sources;

/**
 * Loads the SVG texts of an asset. The promise resolves when the load ends,
 * also when it fails, and then the asset stays missing from the drawings.
 */
export function loadSources(files: PartFiles): Promise<void> {
  const e = entryOf(files);
  if (e.sources) return Promise.resolve();
  e.loading ??= Promise.all(
    Object.entries(files).map(
      async ([key, url]) => [key, await svgText(url)] as const,
    ),
  )
    .then(
      (list) => {
        e.sources = Object.fromEntries(list);
        e.failed = false;
      },
      (err: unknown) => {
        console.error(err);
        e.failed = true;
        e.waiting = true;
        // A drawing that still shows the asset tries again, also when
        // nothing else makes it render, such as in a paused player.
        setTimeout(() => {
          e.waiting = false;
          if (e.listeners.size > 0) void loadSources(files);
        }, RETRY_MS);
      },
    )
    .finally(() => {
      delete e.loading;
      for (const l of e.listeners) l();
    });
  return e.loading;
}

/** Loads the SVG texts of all the assets. */
export const loadAllSources = (list: readonly PartFiles[]) =>
  Promise.all(list.map(loadSources)).then(() => undefined);

/**
 * Calls `listener` when the load of one of the assets ends. While an asset has
 * a listener, a failed load tries again after a while. Returns the function
 * that stops the calls.
 */
export function watchSources(
  list: readonly PartFiles[],
  listener: () => void,
): () => void {
  const watched = list.map(entryOf);
  for (const e of watched) e.listeners.add(listener);
  return () => {
    for (const e of watched) e.listeners.delete(listener);
  };
}

/** Whether the load of an asset has ended, with or without the texts. */
const settled = (files: PartFiles) => {
  const e = entries.get(files);
  return !!e && (!!e.sources || e.failed);
};

/**
 * Loads the SVG texts of the assets, and renders again when one of them has
 * loaded or failed. Read them with `loadedSources`. Returns whether every
 * load has ended, with or without the texts.
 */
export function useSources(list: readonly PartFiles[]): boolean {
  // Only the users of an asset render again when it loads.
  const subscribe = (l: () => void) => watchSources(list, l);
  // A string, so that the same state gives an equal snapshot.
  const snapshot = () =>
    list
      .map((files) => {
        const e = entries.get(files);
        return e?.sources ? 'l' : e?.failed ? 'f' : '-';
      })
      .join('');
  useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    for (const files of list) {
      const e = entryOf(files);
      if (!e.sources && !e.waiting) void loadSources(files);
    }
  });
  return list.every(settled);
}
