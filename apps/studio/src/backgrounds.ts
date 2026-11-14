// The backgrounds in assets/backgrounds/, one folder each, with a
// background.json and the SVG files of its layers and parts. The parts can
// come from assets/backgrounds/shared/. The test background in
// assets/fixtures/backgrounds/ comes along until the real ones exist.
import type { Background } from '@toonhouse/model';
import type { PartSources } from '@toonhouse/stage';

import { repoPath } from './characters.ts';

const files = import.meta.glob<Background>(
  [
    '../../../assets/backgrounds/*/background.json',
    '../../../assets/fixtures/backgrounds/*/background.json',
  ],
  { eager: true, import: 'default' },
);
const svgs = import.meta.glob<string>(
  [
    '../../../assets/backgrounds/*/*.svg',
    '../../../assets/fixtures/backgrounds/*/*.svg',
  ],
  { eager: true, query: '?raw', import: 'default' },
);

export interface BackgroundAsset {
  id: string;
  /** The background file, relative to the repo root. */
  file: string;
  background: Background;
  /** The SVG text of each layer and part, by its id. */
  sources: PartSources;
}

/** `file` relative to the folder `dir`, with `..` resolved. */
function resolve(dir: string, file: string): string {
  const out = dir.split('/').slice(0, -1);
  for (const s of file.split('/')) {
    if (s === '..' && out.length > 0 && out.at(-1) !== '..') out.pop();
    else if (s !== '.') out.push(s);
  }
  return out.join('/');
}

function load(path: string, background: Background): BackgroundAsset {
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const id = dir.split('/').at(-2)!;
  const sources: PartSources = {};
  const add = (key: string, svg: string) => {
    const file = resolve(dir, svg);
    const text = svgs[file];
    if (text === undefined) throw new Error(`Missing ${file}`);
    sources[key] = text;
  };
  for (const l of background.layers) add(l.id, l.svg);
  for (const [id, p] of Object.entries(background.parts ?? {})) add(id, p.svg);
  return { id, file: repoPath(path), background, sources };
}

export const BACKGROUNDS: readonly BackgroundAsset[] = Object.entries(files)
  .map(([path, bg]) => load(path, bg))
  .sort((a, b) => a.id.localeCompare(b.id));
