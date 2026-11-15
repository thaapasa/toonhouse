// The editor of the scenes of a cartoon. The user picks a background and adds
// actors from the library, moves to a time on the timeline and starts an
// action for the selected actor there. The action goes on until the next
// action of the same actor.
import { Link } from '@tanstack/react-router';
import type { Cartoon } from '@toonhouse/api';
import type {
  Action,
  Actor,
  CartoonContent,
  ClipId,
  Pt,
  Scene,
} from '@toonhouse/model';
import {
  actorStateAt,
  backgroundClips,
  backgroundStateAt,
  clipsFor,
  isMoving,
  sceneLength,
} from '@toonhouse/renderer';
import { usePlayback } from '@toonhouse/stage';
import { type ReactNode, useEffect, useEffectEvent, useState } from 'react';

import {
  BackgroundIcon,
  BackIcon,
  BubbleIcon,
  CharacterIcon,
  PlayIcon,
  PropIcon,
  RedoIcon,
  SoundIcon,
  UndoIcon,
} from '../components/icons.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import { ActionBar, WalkBar } from './ActionBar.tsx';
import { CartoonTitle } from './CartoonTitle.tsx';
import { EditorStage, type WalkEdit } from './EditorStage.tsx';
import {
  type BackgroundAsset,
  backgroundAsset,
  kindOf,
  type RigAsset,
} from './library.ts';
import { LibraryPanel, type LibraryTab } from './LibraryPanel.tsx';
import {
  actionsOf,
  moveAction,
  moveActor,
  newId,
  newScene,
  removeAction,
  removeActor,
  startAction,
  stepSize,
  updateAction,
  updateActions,
  updateActor,
  updateScene,
} from './sceneEdit.ts';
import { Timeline, type TimelineSelection } from './Timeline.tsx';
import { type EditMode, useCartoonContent } from './useCartoonContent.ts';

const FPS = 30;

/** A cartoon without scenes gets its first scene when it opens. */
const withScene = (c: CartoonContent): CartoonContent =>
  c.scenes.length > 0 ? c : { ...c, scenes: [newScene()] };

/**
 * A place for a new actor: the start point of the background, or the
 * nearest free place beside it.
 */
function freeSpot(bg: BackgroundAsset, actors: readonly Actor[]): Pt {
  const { start } = bg.background.ground;
  const step = bg.background.width * 0.08;
  for (let i = 0; i < 12; i++) {
    const x = start.x + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * step;
    if (x < 0 || x > bg.background.width) continue;
    const taken = actors.some(
      (a) => Math.hypot(a.at.x - x, a.at.y - start.y) < step / 2,
    );
    if (!taken) return { x, y: start.y };
  }
  return start;
}

export function Editor(props: { cartoon: Cartoon; initial: CartoonContent }) {
  const { cartoon } = props;
  const { tr } = useI18n();
  const [initial] = useState(() => withScene(props.initial));
  const doc = useCartoonContent(cartoon.id, initial);
  const scenes = doc.content.scenes;
  const [sceneIndex, setSceneIndex] = useState(0);
  const index = Math.min(sceneIndex, scenes.length - 1);
  const scene = scenes[index]!;
  const bg = backgroundAsset(scene.background);
  const [library, setLibrary] = useState<LibraryTab | null>(
    scene.background ? null : 'background',
  );
  const [selected, setSelected] = useState<TimelineSelection | null>(null);
  const [walking, setWalking] = useState<WalkEdit | null>(null);

  const duration = sceneLength(scene, bg?.background ?? null, (a) =>
    kindOf(a.asset),
  );
  const playback = usePlayback({
    duration,
    fps: FPS,
    loop: false,
    speed: 1,
    autoplay: false,
  });
  const t = playback.t;

  // An undo can take away the selected actor or action.
  const selectedActor =
    selected?.actorId == null
      ? null
      : (scene.actors.find((a) => a.id === selected.actorId) ?? null);
  const selection: TimelineSelection | null =
    !selected || !bg || (selected.actorId !== null && !selectedActor)
      ? null
      : {
          actorId: selected.actorId,
          actionId: actionsOf(scene, selected.actorId).some(
            (a) => a.id === selected.actionId,
          )
            ? selected.actionId
            : null,
        };
  const walk =
    walking &&
    actionsOf(scene, walking.actorId).some((a) => a.id === walking.actionId)
      ? walking
      : null;

  const editScene = (fn: (s: Scene) => Scene, mode: EditMode = 'push') =>
    doc.edit((c) => updateScene(c, scene.id, fn), mode);
  /** The current time, on a whole frame. */
  const now = () => Math.round(t * FPS) / FPS;

  const openScene = (i: number) => {
    setSceneIndex(i);
    setSelected(null);
    setWalking(null);
    playback.seek(0);
    setLibrary(scenes[i]?.background ? null : 'background');
  };
  const addScene = () => {
    doc.edit((c) => ({ ...c, scenes: [...c.scenes, newScene()] }));
    openScene(scenes.length);
    setLibrary('background');
  };

  const addActor = (asset: RigAsset) => {
    if (!bg) return;
    const actor: Actor = {
      id: newId(),
      asset: { kind: asset.kind, id: asset.id },
      at: freeSpot(bg, scene.actors),
      facing: 1,
      scale: 1,
      actions: [],
    };
    editScene((s) => ({ ...s, actors: [...s.actors, actor] }));
    setSelected({ actorId: actor.id, actionId: null });
    setWalking(null);
    setLibrary(null);
  };
  const setBackground = (id: string) => {
    editScene((s) => ({ ...s, background: id }));
    setLibrary(null);
  };

  /** Starts a clip for the selection at the current time. */
  const startClip = (clip: ClipId) => {
    if (!selection) return;
    const { actorId } = selection;
    const at = now();
    playback.seek(at);
    const kind = selectedActor && kindOf(selectedActor.asset);
    const moves = kind !== null && isMoving(kind, clip);
    const action: Action = {
      id: newId(),
      t: at,
      clip,
      ...(moves && { path: [] }),
    };
    editScene((s) => updateActions(s, actorId, (a) => startAction(a, action)));
    setSelected({ actorId, actionId: action.id });
    setWalking(
      actorId !== null && moves ? { actorId, actionId: action.id } : null,
    );
  };

  const editWalk = (fn: (path: Pt[]) => Pt[], mode: EditMode = 'push') => {
    if (!walk) return;
    editScene(
      (s) =>
        updateActions(s, walk.actorId, (actions) =>
          updateAction(actions, walk.actionId, (a) => ({
            ...a,
            path: fn(a.path ?? []),
          })),
        ),
      mode,
    );
  };
  const walkDone = () => {
    if (!walk) return;
    const action = actionsOf(scene, walk.actorId).find(
      (a) => a.id === walk.actionId,
    );
    // A walk without points would walk on the spot.
    if (action && !action.path?.length) {
      editScene((s) =>
        updateActions(s, walk.actorId, (a) => removeAction(a, walk.actionId)),
      );
      setSelected({ actorId: walk.actorId, actionId: null });
    }
    setWalking(null);
  };

  const selectOnTimeline = (sel: TimelineSelection) => {
    setSelected(sel);
    // Selecting a walk shows its points, so that the user can move them.
    const actor = scene.actors.find((a) => a.id === sel.actorId);
    const action = actor?.actions.find((a) => a.id === sel.actionId);
    const kind = actor && kindOf(actor.asset);
    setWalking(
      actor && action && kind && isMoving(kind, action.clip)
        ? { actorId: actor.id, actionId: action.id }
        : null,
    );
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) doc.redo();
      else doc.undo();
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  let toolbar: ReactNode = null;
  if (bg && walk) {
    toolbar = <WalkBar onDone={walkDone} />;
  } else if (bg && selection) {
    const { actorId, actionId } = selection;
    const onRemoveAction = actionId
      ? () => {
          editScene((s) =>
            updateActions(s, actorId, (a) => removeAction(a, actionId)),
          );
          setSelected({ actorId, actionId: null });
        }
      : undefined;
    if (selectedActor) {
      const kind = kindOf(selectedActor.asset)!;
      const state = actorStateAt(selectedActor, kind, bg.background, t);
      const id = selectedActor.id;
      const resize = (step: 1 | -1) => {
        const next = stepSize(selectedActor.scale, step);
        return next === selectedActor.scale
          ? undefined
          : () =>
              editScene((s) =>
                updateActor(s, id, (a) => ({ ...a, scale: next })),
              );
      };
      toolbar = (
        <ActionBar
          kind={kind}
          clips={clipsFor(kind)}
          current={state.action?.clip ?? clipsFor(kind)[0]!.id}
          onClip={startClip}
          onRemoveAction={onRemoveAction}
          actor={{
            onTurn: () =>
              editScene((s) =>
                updateActor(s, id, (a) => ({
                  ...a,
                  facing: a.facing === 1 ? -1 : 1,
                })),
              ),
            onSmaller: resize(-1),
            onBigger: resize(1),
            onRemove: () => {
              editScene((s) => removeActor(s, id));
              setSelected(null);
            },
          }}
        />
      );
    } else {
      const state = backgroundStateAt(scene.backgroundActions, t);
      toolbar = (
        <ActionBar
          kind="background"
          clips={backgroundClips(bg.background)}
          current={state.action?.clip ?? 'idle'}
          onClip={startClip}
          onRemoveAction={onRemoveAction}
        />
      );
    }
  }

  const toggleLibrary = (tab: LibraryTab) =>
    setLibrary((open) => (open === tab ? null : tab));

  return (
    <div className="editor">
      <header className="editor-header">
        <Link
          to="/"
          className="icon-button"
          aria-label={tr('editor.home')}
          title={tr('editor.home')}
        >
          <BackIcon />
        </Link>
        <CartoonTitle cartoon={cartoon} saveState={doc.saveState} />
        <div className="spacer" />
        <ToolButton
          label="editor.undo"
          onClick={doc.canUndo ? doc.undo : undefined}
        >
          <UndoIcon />
        </ToolButton>
        <ToolButton
          label="editor.redo"
          onClick={doc.canRedo ? doc.redo : undefined}
        >
          <RedoIcon />
        </ToolButton>
        <div className="divider" />
        <button type="button" className="button primary small" disabled>
          <PlayIcon size={16} />
          {tr('editor.watch')}
        </button>
      </header>

      <div className="editor-body">
        <nav className="tool-rail" aria-label={tr('editor.library')}>
          <ToolButton
            label="editor.characters"
            pressed={library === 'character'}
            onClick={bg ? () => toggleLibrary('character') : undefined}
          >
            <CharacterIcon />
          </ToolButton>
          <ToolButton
            label="editor.props"
            pressed={library === 'prop'}
            onClick={bg ? () => toggleLibrary('prop') : undefined}
          >
            <PropIcon />
          </ToolButton>
          <ToolButton
            label="editor.backgrounds"
            pressed={library === 'background'}
            onClick={() => toggleLibrary('background')}
          >
            <BackgroundIcon />
          </ToolButton>
          <ToolButton label="editor.speechBubble">
            <BubbleIcon />
          </ToolButton>
          <ToolButton label="editor.sounds">
            <SoundIcon />
          </ToolButton>
        </nav>
        <div className="stage-area">
          {bg ? (
            <EditorStage
              scene={scene}
              bg={bg}
              t={t}
              selectedActor={selection?.actorId ?? null}
              walk={walk}
              onSelect={(actorId) => {
                setSelected(actorId ? { actorId, actionId: null } : null);
                setWalking(null);
              }}
              onMoveActor={(id, d, mode) =>
                editScene(
                  (s) => updateActor(s, id, (a) => moveActor(a, d)),
                  mode,
                )
              }
              onAddPoint={(at) => editWalk((path) => [...path, at])}
              onMovePoint={(i, at, mode) =>
                editWalk((path) => path.map((p, j) => (j === i ? at : p)), mode)
              }
              onTouch={() => playback.setPlaying(false)}
              toolbar={toolbar}
            />
          ) : (
            <div className="stage" aria-label={tr('editor.stage')}>
              <span className="stage-ground" />
              <p className="stage-hint">{tr('editor.emptyScene')}</p>
            </div>
          )}
          {library && (
            <LibraryPanel
              tab={library}
              background={scene.background}
              onAdd={addActor}
              onBackground={setBackground}
              onClose={() => setLibrary(null)}
            />
          )}
        </div>
      </div>

      <Timeline
        scene={scene}
        background={bg?.background ?? null}
        sceneNumber={index}
        sceneCount={scenes.length}
        onScene={openScene}
        onAddScene={addScene}
        duration={duration}
        t={t}
        fps={FPS}
        playing={playback.playing}
        onPlay={(on) => {
          if (on) setWalking(null);
          playback.setPlaying(on);
        }}
        onSeek={playback.seek}
        onStep={playback.step}
        selection={selection}
        onSelect={selectOnTimeline}
        onMoveAction={(actorId, actionId, at, mode) => {
          editScene(
            (s) =>
              updateActions(s, actorId, (a) => moveAction(a, actionId, at)),
            mode,
          );
          playback.seek(at);
        }}
      />
    </div>
  );
}

function ToolButton(props: {
  label: TextKey;
  pressed?: boolean;
  onClick?: (() => void) | undefined;
  children: ReactNode;
}) {
  const { tr } = useI18n();
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={tr(props.label)}
      aria-pressed={props.pressed}
      title={tr(props.label)}
      disabled={!props.onClick}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
