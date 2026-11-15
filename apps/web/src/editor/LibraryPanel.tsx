// The library: the characters, the props or the backgrounds, with a picture
// of each. A tap adds a character or a prop to the scene, or sets the
// background.
import {
  clipsFor,
  drawCharacter,
  drawScene,
  partBounds,
  wholeBackground,
} from '@toonhouse/renderer';
import { Drawing, PartSymbols } from '@toonhouse/stage';
import { memo } from 'react';

import { CloseIcon } from '../components/icons.tsx';
import { useI18n } from '../i18n/index.tsx';
import {
  type BackgroundAsset,
  BACKGROUNDS,
  CHARACTERS,
  PROPS,
  type RigAsset,
} from './library.ts';
import { useNames } from './names.ts';

export type LibraryTab = 'character' | 'prop' | 'background';

interface Props {
  tab: LibraryTab;
  /** The background of the scene, which shows as picked. */
  background: string | null;
  onAdd(asset: RigAsset): void;
  onBackground(id: string): void;
  onClose(): void;
}

const TITLES = {
  character: 'editor.characters',
  prop: 'editor.props',
  background: 'editor.backgrounds',
} as const;

export function LibraryPanel(props: Props) {
  const { tr } = useI18n();
  const names = useNames();
  return (
    <section className="library-panel" aria-label={tr('editor.library')}>
      <div className="library-head">
        <h2>{tr(TITLES[props.tab])}</h2>
        <button
          type="button"
          className="icon-button small"
          aria-label={tr('close')}
          title={tr('close')}
          onClick={props.onClose}
        >
          <CloseIcon />
        </button>
      </div>
      <div
        className={
          props.tab === 'background' ? 'library-grid wide' : 'library-grid'
        }
      >
        {props.tab === 'background'
          ? BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                className="library-item"
                aria-pressed={props.background === b.id}
                onClick={() => props.onBackground(b.id)}
              >
                <BackgroundPicture asset={b} />
                {names.background(b.id)}
              </button>
            ))
          : (props.tab === 'character' ? CHARACTERS : PROPS).map((r) => (
              <button
                key={r.id}
                type="button"
                className="library-item"
                onClick={() => props.onAdd(r)}
              >
                <RigPicture asset={r} />
                {names.asset(r)}
              </button>
            ))}
      </div>
      <p className="muted small">{tr('editor.libraryHint')}</p>
    </section>
  );
}

/** A character or a prop standing still. */
const RigPicture = memo(function RigPicture({ asset }: { asset: RigAsset }) {
  const clip = clipsFor(asset.rig.kind)[0]!;
  const node = drawCharacter(asset.rig, clip.frameAt(0), { facing: 1 }).node;
  const b = partBounds(node) ?? { x: 0, y: 0, width: 1, height: 1 };
  const prefix = `lib-${asset.kind}-${asset.id}`;
  return (
    <svg
      className="library-picture"
      viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
      aria-hidden
    >
      <PartSymbols prefix={prefix} sources={asset.parts} />
      <Drawing node={node} prefix={prefix} />
    </svg>
  );
});

const BackgroundPicture = memo(function BackgroundPicture({
  asset,
}: {
  asset: BackgroundAsset;
}) {
  const bg = asset.background;
  const node = drawScene(
    bg,
    { kind: 'background', arc: null, drift: null },
    wholeBackground(bg),
  );
  const prefix = `lib-background-${asset.id}`;
  return (
    <svg
      className="library-picture background"
      viewBox={`0 0 ${bg.width} ${bg.height}`}
      aria-hidden
    >
      <PartSymbols prefix={prefix} sources={asset.sources} />
      <Drawing node={node} prefix={prefix} />
    </svg>
  );
});
