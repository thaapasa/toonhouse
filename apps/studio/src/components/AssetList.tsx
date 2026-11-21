import {
  clipOf,
  drawCharacter,
  drawScene,
  partBounds,
  wholeBackground,
} from '@toonhouse/renderer';
import { Drawing, PartSymbols } from '@toonhouse/stage';
import type { ReactNode } from 'react';

import type { BackgroundAsset } from '../backgrounds.ts';
import type { Character } from '../characters.ts';
import { isTextKey, type TextKey, useI18n } from '../i18n/index.tsx';

/** What the studio shows: a character or a prop, or a background. */
export type Selection =
  { type: 'rig'; id: string } | { type: 'background'; id: string };

interface Props {
  characters: readonly Character[];
  props: readonly Character[];
  backgrounds: readonly BackgroundAsset[];
  selected: Selection;
  /** The characters and props with rig changes that are not saved. */
  unsaved: readonly string[];
  onSelect(selection: Selection): void;
}

export function AssetList(props: Props) {
  const { selected, unsaved, onSelect } = props;
  const { tr } = useI18n();
  const name = (key: string, id: string) => (isTextKey(key) ? tr(key) : id);

  const item = (selection: Selection, label: string, thumb: ReactNode) => (
    <button
      key={`${selection.type}-${selection.id}`}
      type="button"
      className="asset"
      aria-pressed={
        selection.type === selected.type && selection.id === selected.id
      }
      onClick={() => onSelect(selection)}
    >
      {thumb}
      <span className="asset-name">{label}</span>
      {selection.type === 'rig' && unsaved.includes(selection.id) && (
        <span
          className="unsaved-dot"
          role="img"
          aria-label={tr('unsaved')}
          title={tr('unsaved')}
        />
      )}
    </button>
  );
  const section = (title: TextKey, items: ReactNode[]) =>
    items.length > 0 && (
      <>
        <div className="section-title">{tr(title)}</div>
        {items}
      </>
    );

  return (
    <aside className="assets" aria-label={tr('assets')}>
      {section(
        'characters',
        props.characters.map((c) =>
          item(
            { type: 'rig', id: c.id },
            name(`character.${c.id}`, c.id),
            <Thumbnail character={c} />,
          ),
        ),
      )}
      {section(
        'props',
        props.props.map((c) =>
          item(
            { type: 'rig', id: c.id },
            name(`prop.${c.id}`, c.id),
            <Thumbnail character={c} />,
          ),
        ),
      )}
      {section(
        'backgrounds',
        props.backgrounds.map((b) =>
          item(
            { type: 'background', id: b.id },
            name(`background.${b.id}`, b.id),
            <BackgroundThumbnail asset={b} />,
          ),
        ),
      )}
    </aside>
  );
}

/** The thumbnail shows the head: a square of this size around a point above the neck. */
const THUMB_SIZE = 460;
const THUMB_ABOVE_NECK = 120;

function Thumbnail({ character }: { character: Character }) {
  const prefix = `thumb-${character.id}`;
  const { node, skeleton } = drawCharacter(
    character.rig,
    clipOf(character.rig.kind, 'idle').frameAt(0),
    { facing: 1 },
  );
  let viewBox;
  const bounds = character.rig.kind === 'prop' ? partBounds(node) : null;
  if (bounds) {
    // A prop has no head, so the thumbnail shows all of it.
    const b = bounds;
    const size = Math.max(b.width, b.height) * 1.05;
    viewBox = `${b.x + b.width / 2 - size / 2} ${b.y + b.height / 2 - size / 2} ${size} ${size}`;
  } else {
    const neck = skeleton.joints.find((j) => j.name === 'neck')?.at ?? {
      x: 0,
      y: -THUMB_SIZE,
    };
    const half = THUMB_SIZE / 2;
    viewBox = `${-half} ${neck.y - THUMB_ABOVE_NECK - half} ${THUMB_SIZE} ${THUMB_SIZE}`;
  }
  return (
    <span className="thumb">
      <svg viewBox={viewBox} aria-hidden="true">
        <PartSymbols prefix={prefix} sources={character.parts} />
        <Drawing node={node} prefix={prefix} />
      </svg>
    </span>
  );
}

function BackgroundThumbnail({ asset }: { asset: BackgroundAsset }) {
  const prefix = `thumb-bg-${asset.id}`;
  const bg = asset.background;
  const node = drawScene(
    bg,
    clipOf('background', 'idle').frameAt(0),
    wholeBackground(bg),
  );
  return (
    <span className="thumb">
      <svg
        viewBox={`0 0 ${bg.width} ${bg.height}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <PartSymbols prefix={prefix} sources={asset.sources} />
        <Drawing node={node} prefix={prefix} />
      </svg>
    </span>
  );
}
