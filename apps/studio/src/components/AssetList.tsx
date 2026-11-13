import { clipById, drawCharacter } from '@toonhouse/renderer';
import { Drawing, PartSymbols } from '@toonhouse/stage';

import type { Character } from '../characters.ts';
import { isTextKey, useI18n } from '../i18n/index.tsx';

interface Props {
  characters: readonly Character[];
  selected: string;
  onSelect(id: string): void;
}

export function AssetList({ characters, selected, onSelect }: Props) {
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
          </button>
        );
      })}
    </aside>
  );
}

function Thumbnail({ character }: { character: Character }) {
  const prefix = `thumb-${character.id}`;
  const { node } = drawCharacter(character.rig, clipById('idle').frameAt(0), {
    facing: 1,
  });
  return (
    <span className="thumb">
      <svg viewBox="-230 -880 460 460" aria-hidden="true">
        <PartSymbols prefix={prefix} sources={character.parts} />
        <Drawing node={node} prefix={prefix} />
      </svg>
    </span>
  );
}
