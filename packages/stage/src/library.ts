// The pure parts of loading the library, which the web app and the studio
// share. Each app finds the files with its own `import.meta.glob`, and gives
// them here as a record by path. The value of a file can be its SVG text or
// what loads it.
import type { Background, Rig } from '@toonhouse/model';

import { layerKey } from './Drawing.tsx';

/**
 * The folder of a file in `packs/<pack>/<kind>/<name>/`, with the slash at the
 * end, and the id of the asset, `<pack>/<name>`. The pack is part of the id so
 * that each pack can name its assets without looking at the other packs.
 */
export function assetFolder(path: string): { dir: string; id: string } {
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const parts = dir.split('/');
  return { dir, id: `${parts.at(-4)!}/${parts.at(-2)!}` };
}

/** The asset pack of an asset id. */
export const packOf = (id: string): string => id.slice(0, id.indexOf('/'));

/** `file` relative to the folder `dir`, with `.` and `..` resolved. */
export function resolve(dir: string, file: string): string {
  const out = dir.split('/').slice(0, -1);
  for (const s of file.split('/')) {
    if (s === '..' && out.length > 0 && out.at(-1) !== '..') out.pop();
    else if (s !== '.') out.push(s);
  }
  return out.join('/');
}

function fileAt<T>(
  files: Readonly<Record<string, T>>,
  dir: string,
  file: string,
): T {
  const path = resolve(dir, file);
  const value = files[path];
  if (value === undefined) throw new Error(`Missing ${path}`);
  return value;
}

/**
 * The SVG files of the layers of the parts of a rig in the folder `dir`, by
 * `layerKey`. Throws if a file is missing.
 */
export function rigSources<T>(
  rig: Rig,
  dir: string,
  files: Readonly<Record<string, T>>,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [part, p] of Object.entries(rig.parts)) {
    out[part] = fileAt(files, dir, p.svg);
    for (const l of p.layers ?? [])
      out[layerKey(part, l.id)] = fileAt(files, dir, l.svg);
  }
  return out;
}

/**
 * The SVG files of the layers and the parts of a background in the folder
 * `dir`, by their ids. Throws if a file is missing.
 */
export function backgroundSources<T>(
  bg: Background,
  dir: string,
  files: Readonly<Record<string, T>>,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const l of bg.layers) out[l.id] = fileAt(files, dir, l.svg);
  for (const [id, p] of Object.entries(bg.parts ?? {}))
    out[id] = fileAt(files, dir, p.svg);
  return out;
}
