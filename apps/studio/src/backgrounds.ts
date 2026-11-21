// The backgrounds of the asset packs in assets/packs/, one folder each, with a
// background.json and the SVG files of its layers and parts. The parts can
// come from the shared/ folder of the pack.
import type { Background } from '@toonhouse/model';
import {
  assetFolder,
  backgroundSources,
  type PartSources,
} from '@toonhouse/stage';

import { repoPath } from './characters.ts';

const files = import.meta.glob<Background>(
  '../../../assets/packs/*/backgrounds/*/background.json',
  { eager: true, import: 'default' },
);
const svgs = import.meta.glob<string>(
  [
    '../../../assets/packs/*/backgrounds/*/*.svg',
    '../../../assets/packs/*/shared/*.svg',
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

function load(path: string, background: Background): BackgroundAsset {
  const { dir, id } = assetFolder(path);
  const sources = backgroundSources(background, dir, svgs);
  return { id, file: repoPath(path), background, sources };
}

export const BACKGROUNDS: readonly BackgroundAsset[] = Object.entries(files)
  .map(([path, bg]) => load(path, bg))
  .sort((a, b) => a.id.localeCompare(b.id));
