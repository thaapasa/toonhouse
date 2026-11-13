// The characters in assets/characters/, one folder each, with a rig.json and
// the SVG parts that it names.
import type { PartId, Rig } from '@toonhouse/model';
import type { PartSources } from '@toonhouse/stage';

const rigs = import.meta.glob<Rig>('../../../assets/characters/*/rig.json', {
  eager: true,
  import: 'default',
});
const svgs = import.meta.glob<string>('../../../assets/characters/*/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export interface Character {
  id: string;
  /** The rig file, relative to the repo root. */
  file: string;
  rig: Rig;
  parts: PartSources;
}

function load(path: string, rig: Rig): Character {
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const id = dir.split('/').at(-2)!;
  const parts: PartSources = {};
  for (const [part, { svg }] of Object.entries(rig.parts)) {
    const text = svgs[dir + svg];
    if (text === undefined) throw new Error(`Missing ${dir}${svg}`);
    parts[part as PartId] = text;
  }
  return { id, file: path.replace(/^(\.\.\/)+/, ''), rig, parts };
}

export const CHARACTERS: readonly Character[] = Object.entries(rigs)
  .map(([path, rig]) => load(path, rig))
  .sort((a, b) => a.id.localeCompare(b.id));
