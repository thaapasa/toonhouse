// The characters in assets/characters/ and the props in assets/props/, one
// folder each, with a rig.json and the SVG layers of the parts that it names.
import type { Rig } from '@toonhouse/model';
import { assetFolder, type PartSources, rigSources } from '@toonhouse/stage';

const characterRigs = import.meta.glob<Rig>(
  '../../../assets/characters/*/rig.json',
  { eager: true, import: 'default' },
);
const propRigs = import.meta.glob<Rig>('../../../assets/props/*/rig.json', {
  eager: true,
  import: 'default',
});
const svgs = import.meta.glob<string>(
  ['../../../assets/characters/*/*.svg', '../../../assets/props/*/*.svg'],
  { eager: true, query: '?raw', import: 'default' },
);

export interface Character {
  id: string;
  /** The rig file, relative to the repo root. */
  file: string;
  rig: Rig;
  parts: PartSources;
}

/** The path of a file in assets/, relative to the repo root. */
export const repoPath = (path: string) => path.replace(/^(\.\.\/)+/, '');

function load(path: string, rig: Rig): Character {
  const { dir, id } = assetFolder(path);
  return { id, file: repoPath(path), rig, parts: rigSources(rig, dir, svgs) };
}

const loadAll = (rigs: Record<string, Rig>) =>
  Object.entries(rigs)
    .map(([path, rig]) => load(path, rig))
    .sort((a, b) => a.id.localeCompare(b.id));

export const CHARACTERS: readonly Character[] = loadAll(characterRigs);
export const PROPS: readonly Character[] = loadAll(propRigs);
/** The characters and the props, which the studio edits in the same way. */
export const RIGS: readonly Character[] = [...CHARACTERS, ...PROPS];
