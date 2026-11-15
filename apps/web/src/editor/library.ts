// The library: the characters in assets/characters/, the props in
// assets/props/ and the backgrounds in assets/backgrounds/, one folder each.
// The build bundles them, so they load with the web app.
import type { ActorAsset, Background, ClipKind, Rig } from '@toonhouse/model';
import { layerKey, type PartSources } from '@toonhouse/stage';

const characterRigs = import.meta.glob<Rig>(
  '../../../../assets/characters/*/rig.json',
  { eager: true, import: 'default' },
);
const propRigs = import.meta.glob<Rig>('../../../../assets/props/*/rig.json', {
  eager: true,
  import: 'default',
});
const backgroundFiles = import.meta.glob<Background>(
  '../../../../assets/backgrounds/*/background.json',
  { eager: true, import: 'default' },
);
const svgs = import.meta.glob<string>(
  [
    '../../../../assets/characters/*/*.svg',
    '../../../../assets/props/*/*.svg',
    '../../../../assets/backgrounds/*/*.svg',
  ],
  { eager: true, query: '?raw', import: 'default' },
);

export interface RigAsset {
  kind: ActorAsset['kind'];
  id: string;
  rig: Rig;
  /** The SVG text of each layer of the parts. */
  parts: PartSources;
}

export interface BackgroundAsset {
  id: string;
  background: Background;
  /** The SVG text of each layer and part, by its id. */
  sources: PartSources;
}

/** The folder of a file, with the slash at the end, and its name. */
const folder = (path: string) => {
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  return { dir, id: dir.split('/').at(-2)! };
};

/** `file` relative to the folder `dir`, with `..` resolved. */
function resolve(dir: string, file: string): string {
  const out = dir.split('/').slice(0, -1);
  for (const s of file.split('/')) {
    if (s === '..' && out.length > 0 && out.at(-1) !== '..') out.pop();
    else if (s !== '.') out.push(s);
  }
  return out.join('/');
}

function svgAt(dir: string, file: string): string {
  const path = resolve(dir, file);
  const text = svgs[path];
  if (text === undefined) throw new Error(`Missing ${path}`);
  return text;
}

function loadRigs(
  kind: ActorAsset['kind'],
  files: Record<string, Rig>,
): RigAsset[] {
  return Object.entries(files)
    .map(([path, rig]) => {
      const { dir, id } = folder(path);
      const parts: PartSources = {};
      for (const [part, p] of Object.entries(rig.parts)) {
        parts[part] = svgAt(dir, p.svg);
        for (const l of p.layers ?? [])
          parts[layerKey(part, l.id)] = svgAt(dir, l.svg);
      }
      return { kind, id, rig, parts };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const CHARACTERS: readonly RigAsset[] = loadRigs(
  'character',
  characterRigs,
);
export const PROPS: readonly RigAsset[] = loadRigs('prop', propRigs);

export const BACKGROUNDS: readonly BackgroundAsset[] = Object.entries(
  backgroundFiles,
)
  .map(([path, background]) => {
    const { dir, id } = folder(path);
    const sources: PartSources = {};
    for (const l of background.layers) sources[l.id] = svgAt(dir, l.svg);
    for (const [part, p] of Object.entries(background.parts ?? {}))
      sources[part] = svgAt(dir, p.svg);
    return { id, background, sources };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

/** The library character or prop of an actor, if the library has it. */
export const rigAsset = (asset: ActorAsset): RigAsset | undefined =>
  (asset.kind === 'character' ? CHARACTERS : PROPS).find(
    (r) => r.id === asset.id,
  );

export const backgroundAsset = (
  id: string | null,
): BackgroundAsset | undefined => BACKGROUNDS.find((b) => b.id === id);

/** The rig kind of an actor, which sets its clips. */
export const kindOf = (asset: ActorAsset): ClipKind | null =>
  rigAsset(asset)?.rig.kind ?? null;
