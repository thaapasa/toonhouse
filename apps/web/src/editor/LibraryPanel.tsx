// The library: the characters, the props or the backgrounds, with a picture
// of each, or the cast of the cartoon. A tap adds a character, a prop or a
// cast member to the scene, or sets the background. Each picture shows once
// the SVG files of its asset have loaded.
import type { CastMember } from '@toonhouse/model';
import { drawScene, wholeBackground } from '@toonhouse/renderer';
import { Drawing, PartSymbols } from '@toonhouse/stage';
import { memo, useState } from 'react';

import { IconButton } from '../components/IconButton.tsx';
import {
  BackIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
} from '../components/icons.tsx';
import { useI18n } from '../i18n/index.tsx';
import {
  type BackgroundAsset,
  BACKGROUNDS,
  CHARACTERS,
  PROPS,
  type RigAsset,
  rigAsset,
} from '../library/index.ts';
import { loadedSources, useSources } from '../library/sources.ts';
import { useNames } from './names.ts';
import { RigPicture } from './RigPicture.tsx';

export type LibraryTab = 'cast' | 'character' | 'prop' | 'background';

interface Props {
  tab: LibraryTab;
  /** The background of the scene, which shows as picked. */
  background: string | null;
  cast: readonly CastMember[];
  onAdd(asset: RigAsset | CastMember): void;
  onBackground(id: string): void;
  /** Makes a cast member from a character or a prop. */
  onNewMember(asset: RigAsset): void;
  onEditMember(id: string): void;
  onClose(): void;
}

const TITLES = {
  cast: 'editor.cast',
  character: 'editor.characters',
  prop: 'editor.props',
  background: 'editor.backgrounds',
} as const;

export function LibraryPanel(props: Props) {
  if (props.tab === 'cast') return <CastPanel {...props} />;
  return <AssetPanel {...props} />;
}

function PanelHead(props: {
  title: string;
  onClose(): void;
  onBack?: () => void;
}) {
  return (
    <div className="library-head">
      {props.onBack && (
        <IconButton label="cast.back" small onClick={props.onBack}>
          <BackIcon />
        </IconButton>
      )}
      <h2>{props.title}</h2>
      <IconButton label="close" small onClick={props.onClose}>
        <CloseIcon />
      </IconButton>
    </div>
  );
}

/** The library assets of one kind. */
function AssetPanel(props: Props) {
  const { tr } = useI18n();
  const names = useNames();
  return (
    <section className="library-panel" aria-label={tr('editor.library')}>
      <PanelHead title={tr(TITLES[props.tab])} onClose={props.onClose} />
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
                <RigPicture asset={r} prefix={`lib-${r.kind}-${r.id}`} />
                {names.asset(r)}
              </button>
            ))}
      </div>
      <p className="muted small">{tr('editor.libraryHint')}</p>
    </section>
  );
}

/**
 * The cast of the cartoon. A tap adds a cast member to the scene. The user
 * makes a new cast member by picking a character or a prop of the library.
 */
function CastPanel(props: Props) {
  const { tr } = useI18n();
  const names = useNames();
  const [picking, setPicking] = useState(false);
  if (picking)
    return (
      <section className="library-panel" aria-label={tr('editor.cast')}>
        <PanelHead
          title={tr('cast.new')}
          onClose={props.onClose}
          onBack={() => setPicking(false)}
        />
        <p className="muted small">{tr('cast.newHint')}</p>
        {(
          [
            { title: 'editor.characters', list: CHARACTERS },
            { title: 'editor.props', list: PROPS },
          ] as const
        ).map(({ title, list }) => (
          <div key={title} className="library-group">
            <h3>{tr(title)}</h3>
            <div className="library-grid">
              {list.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="library-item"
                  onClick={() => {
                    setPicking(false);
                    props.onNewMember(r);
                  }}
                >
                  <RigPicture asset={r} prefix={`new-${r.kind}-${r.id}`} />
                  {names.asset(r)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    );
  return (
    <section className="library-panel" aria-label={tr('editor.cast')}>
      <PanelHead title={tr('editor.cast')} onClose={props.onClose} />
      {props.cast.length === 0 && (
        <p className="muted small">{tr('cast.empty')}</p>
      )}
      <div className="library-grid">
        {props.cast.map((m) => {
          const asset = rigAsset(m.asset);
          const name = names.member(m);
          return (
            <div key={m.id} className="cast-item">
              <button
                type="button"
                className="library-item"
                // A cast member whose asset is gone has nothing to draw.
                disabled={!asset}
                onClick={() => props.onAdd(m)}
              >
                {asset && (
                  <RigPicture
                    asset={asset}
                    colors={m.settings.colors}
                    prefix={`cast-${m.id}`}
                  />
                )}
                <span className="cast-name">{name}</span>
              </button>
              <IconButton
                label="cast.edit"
                vars={{ name }}
                small
                className="cast-edit"
                onClick={() => props.onEditMember(m.id)}
              >
                <EditIcon size={18} />
              </IconButton>
            </div>
          );
        })}
        <button
          type="button"
          className="library-item new-member"
          onClick={() => setPicking(true)}
        >
          <PlusIcon size={28} />
          {tr('cast.new')}
        </button>
      </div>
      {props.cast.length > 0 && (
        <p className="muted small">{tr('editor.libraryHint')}</p>
      )}
    </section>
  );
}

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
  useSources([asset.files]);
  const sources = loadedSources(asset.files);
  return (
    <svg
      className="library-picture background"
      viewBox={`0 0 ${bg.width} ${bg.height}`}
      aria-hidden
    >
      {sources && (
        <>
          <PartSymbols prefix={prefix} sources={sources} />
          <Drawing node={node} prefix={prefix} />
        </>
      )}
    </svg>
  );
});
