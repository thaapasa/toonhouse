// The library: the characters in assets/characters/, the props in
// assets/props/ and the backgrounds in assets/backgrounds/, one folder each,
// and the asset packs in assets/packs/. The JSON files load with the web app,
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
import { assetFolder, backgroundSources, rigSources } from '@toonhouse/stage';

import type { PartFiles } from './sources.ts';

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
// `no-inline` keeps the small files out of the bundle as data URLs, which the
// Content-Security-Policy wouldn't let the web app fetch.
const svgUrls = import.meta.glob<string>(
  [
    '../../../../assets/characters/*/*.svg',
    '../../../../assets/props/*/*.svg',
    '../../../../assets/backgrounds/*/*.svg',
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

/** An asset pack in assets/packs/: the assets of one art style. */
interface Pack {
  id: string;
  /** The family of the default font of the bubbles. */
  bubbleFont: string;
  characters: string[];
  props: string[];
  backgrounds: string[];
}

const packs = Object.values(
  import.meta.glob<Pack>('../../../../assets/packs/*/pack.json', {
    eager: true,
    import: 'default',
  }),
);

const packFont = (pack: Pack | undefined): BubbleFontId =>
  (pack && fontByFamily(pack.bubbleFont)) ?? DEFAULT_BUBBLE_FONT;

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
  actorFont: (asset) =>
    packFont(
      packs.find((p) =>
        (asset.kind === 'character' ? p.characters : p.props).includes(
          asset.id,
        ),
      ),
    ),
  backgroundFont: (id) =>
    packFont(packs.find((p) => id !== null && p.backgrounds.includes(id))),
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
