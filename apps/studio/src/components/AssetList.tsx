import { clipById, drawCharacter } from '@toonhouse/renderer';
import { Drawing, PartSymbols } from '@toonhouse/stage';

import type { Character } from '../characters.ts';
import { isTextKey, useI18n } from '../i18n/index.tsx';

interface Props {
  characters: readonly Character[];
  selected: string;
  /** The characters with rig changes that are not saved. */
  unsaved: readonly string[];
  onSelect(id: string): void;
}

export function AssetList(props: Props) {
  const { characters, selected, unsaved, onSelect } = props;
  const { tr } = useI18n();
  return (
    <aside className="assets" aria-label={tr('characters')}>
      <div className="section-title">{tr('characters')}</div>
      {characters.map((c) => {
        const key = `character.${c.id}`;
        return (
          <button
            key={c.id}
            type="button"
            className="asset"
            aria-pressed={c.id === selected}
            onClick={() => onSelect(c.id)}
          >
            <Thumbnail character={c} />
            <span className="asset-name">
              {isTextKey(key) ? tr(key) : c.id}
            </span>
            {unsaved.includes(c.id) && (
              <span
                className="unsaved-dot"
                role="img"
                aria-label={tr('unsaved')}
                title={tr('unsaved')}
              />
            )}
          </button>
        );
      })}
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
    clipById(character.rig.kind, 'idle').frameAt(0),
    { facing: 1 },
  );
  const neck = skeleton.joints.find((j) => j.name === 'neck')?.at ?? {
    x: 0,
    y: -THUMB_SIZE,
  };
  const half = THUMB_SIZE / 2;
  const viewBox = `${-half} ${neck.y - THUMB_ABOVE_NECK - half} ${THUMB_SIZE} ${THUMB_SIZE}`;
  return (
    <span className="thumb">
      <svg viewBox={viewBox} aria-hidden="true">
        <PartSymbols prefix={prefix} sources={character.parts} />
        <Drawing node={node} prefix={prefix} />
      </svg>
    </span>
  );
}
