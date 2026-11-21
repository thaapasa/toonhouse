// The library: the asset packs in assets/packs/, each with a folder for each
// of its characters, props and backgrounds. The JSON files load with the web app,
// so the editor and the player know the rigs and the backgrounds at once.
// The SVG files are separate files of the build, and `sources.ts` loads them
// when a drawing needs them, so the web app doesn't grow with the library.
import type {
  ActorAsset,
  Background,
  BubbleFontId,
  CartoonContent,
  ClipKind,
  Rig,
  Scene,
} from '@toonhouse/model';
import {
  actorKind,
  DEFAULT_BUBBLE_FONT,
  fontByFamily,
  type Library,
} from '@toonhouse/renderer';
import {
  assetFolder,
  backgroundSources,
  packOf,
  rigSources,
} from '@toonhouse/stage';

import type { PartFiles } from './sources.ts';

const characterRigs = import.meta.glob<Rig>(
  '../../../../assets/packs/*/characters/*/rig.json',
  { eager: true, import: 'default' },
);
const propRigs = import.meta.glob<Rig>(
  '../../../../assets/packs/*/props/*/rig.json',
  { eager: true, import: 'default' },
);
const backgroundFiles = import.meta.glob<Background>(
  '../../../../assets/packs/*/backgrounds/*/background.json',
  { eager: true, import: 'default' },
);
// `no-inline` keeps the small files out of the bundle as data URLs, which the
// Content-Security-Policy wouldn't let the web app fetch.
const svgUrls = import.meta.glob<string>(
  [
    '../../../../assets/packs/*/characters/*/*.svg',
    '../../../../assets/packs/*/props/*/*.svg',
    '../../../../assets/packs/*/backgrounds/*/*.svg',
    '../../../../assets/packs/*/shared/*.svg',
  ],
  { eager: true, query: '?url&no-inline', import: 'default' },
);

export interface RigAsset {
  kind: ActorAsset['kind'];
  id: string;
  rig: Rig;
  /** The URL of the SVG of each layer of the parts. */
  files: PartFiles;
}

export interface BackgroundAsset {
  id: string;
  background: Background;
  /** The URL of the SVG of each layer and part, by its id. */
  files: PartFiles;
}

function loadRigs(
  kind: ActorAsset['kind'],
  rigs: Record<string, Rig>,
): RigAsset[] {
  return Object.entries(rigs)
    .map(([path, rig]) => {
      const { dir, id } = assetFolder(path);
      return { kind, id, rig, files: rigSources(rig, dir, svgUrls) };
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
    const { dir, id } = assetFolder(path);
    return {
      id,
      background,
      files: backgroundSources(background, dir, svgUrls),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

/**
 * The pack.json of an asset pack in assets/packs/: the assets of one art
 * style. The name of the folder is the id of the pack, and its assets are in
 * the folders under it.
 */
interface Pack {
  /** The family of the default font of the bubbles. */
  bubbleFont: string;
}

const packs = new Map(
  Object.entries(
    import.meta.glob<Pack>('../../../../assets/packs/*/pack.json', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, pack]) => [path.split('/').at(-2)!, pack]),
);

/** The default font of the bubbles of the pack of an asset. */
const packFont = (id: string): BubbleFontId => {
  const pack = packs.get(packOf(id));
  return (pack && fontByFamily(pack.bubbleFont)) ?? DEFAULT_BUBBLE_FONT;
};

const rigsById = {
  character: new Map(CHARACTERS.map((r) => [r.id, r])),
  prop: new Map(PROPS.map((r) => [r.id, r])),
};
const backgroundsById = new Map(BACKGROUNDS.map((b) => [b.id, b]));

/** The library character or prop of an actor, if the library has it. */
export const rigAsset = (asset: ActorAsset): RigAsset | undefined =>
  rigsById[asset.kind].get(asset.id);

export const backgroundAsset = (
  id: string | null,
): BackgroundAsset | undefined =>
  id === null ? undefined : backgroundsById.get(id);

/** The library as the renderer sees it. */
export const LIBRARY: Library = {
  rig: (asset) => rigAsset(asset)?.rig,
  background: (id) => backgroundAsset(id)?.background,
  actorFont: (asset) => packFont(asset.id),
  backgroundFont: (id) => (id === null ? DEFAULT_BUBBLE_FONT : packFont(id)),
};

/** The rig kind of an actor, or null if the library doesn't have its asset. */
export const kindOf = (asset: ActorAsset): ClipKind | null =>
  actorKind(LIBRARY, asset);

/** The SVG files of the background and the actors of a scene. */
export function sceneFiles(scene: Scene): PartFiles[] {
  const bg = backgroundAsset(scene.background);
  return [
    ...(bg ? [bg.files] : []),
    ...scene.actors.flatMap((a) => {
      const asset = rigAsset(a.asset);
      return asset ? [asset.files] : [];
    }),
  ];
}

/** The SVG files of every scene of a cartoon, each asset once. */
export const cartoonFiles = (content: CartoonContent): PartFiles[] => [
  ...new Set(content.scenes.flatMap(sceneFiles)),
];
