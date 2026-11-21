// The editor of the scenes of a cartoon. The user picks a background and adds
// actors from the library, moves to a time on the timeline and starts an
// action for the selected actor there. The action goes on until the next
// action of the same actor.
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  type Cartoon,
  CONTENT_LIMITS,
  type SavedContent,
} from '@toonhouse/api';
import type {
  Action,
  Actor,
  Bubble,
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
  FPS,
  isMoving,
  restClip,
  sceneFrame,
  sceneLength,
} from '@toonhouse/renderer';
import { usePlayback } from '@toonhouse/stage';
import { type ReactNode, useEffect, useEffectEvent, useState } from 'react';

import { contentQuery } from '../api.ts';
import { Dialog } from '../components/Dialog.tsx';
import { IconButton } from '../components/IconButton.tsx';
import {
  BackgroundIcon,
  BackIcon,
  BubbleIcon,
  CharacterIcon,
  PlayIcon,
  PropertiesIcon,
  PropIcon,
  RedoIcon,
  SoundIcon,
  UndoIcon,
} from '../components/icons.tsx';
import { useI18n } from '../i18n/index.tsx';
import {
  type BackgroundAsset,
  backgroundAsset,
  kindOf,
  LIBRARY,
  type RigAsset,
} from '../library/index.ts';
import { ActionBar, BubbleBar, WalkBar } from './ActionBar.tsx';
import { addBubble, newBubble, removeBubble, updateBubble } from './bubbles.ts';
import { CartoonTitle } from './CartoonTitle.tsx';
import { EditorStage, type WalkEdit } from './EditorStage.tsx';
import type { EditRun } from './history.ts';
import { clearKeptContent, keptContent } from './keptContent.ts';
import { editorCommand, isTyping } from './keys.ts';
import { LibraryPanel, type LibraryTab } from './LibraryPanel.tsx';
import { PreviewButton } from './PreviewButton.tsx';
import { PropertiesPane } from './PropertiesPane.tsx';
import { SaveProblem } from './SaveProblem.tsx';
import { type SaverStart, startFrom } from './saver.ts';
import {
  actionsOf,
  addPoint,
  moveActor,
  moveBlock,
  moveStart,
  newId,
  newScene,
  removeAction,
  removeActor,
  removeScene,
  savedTime,
  setLength,
  startAction,
  stepSize,
  updateAction,
  updateActions,
  updateActor,
  updateScene,
} from './sceneEdit.ts';
import { Timeline, type TimelineSelection } from './Timeline.tsx';
import { timelineLength } from './timelineMath.ts';
import { useCartoonContent } from './useCartoonContent.ts';

const PANE_KEY = 'toonhouse-properties-open';
const ATTACH_KEY = 'toonhouse-properties-attached';

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

export function Editor(props: { cartoon: Cartoon; initial: SavedContent }) {
  const { cartoon } = props;
  const { tr } = useI18n();
  const queryClient = useQueryClient();
  // The edits kept over a login go on from where they were.
  const [start] = useState((): SaverStart => {
    const { dropKept, ...start } = startFrom(
      props.initial,
      keptContent(cartoon.id),
    );
    if (dropKept) clearKeptContent(cartoon.id);
    return { ...start, content: withScene(start.content) };
  });
  const doc = useCartoonContent(cartoon.id, start);
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
  // A selected bubble takes the place of the selected actor or action.
  const [bubbleId, setBubbleId] = useState<string | null>(null);
  const [bubbleTool, setBubbleTool] = useState(false);
  const [textFocus, setTextFocus] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [paneOpen, setPaneOpenState] = useState(
    () => localStorage.getItem(PANE_KEY) !== 'false',
  );
  const setPaneOpen = (open: boolean) => {
    localStorage.setItem(PANE_KEY, String(open));
    setPaneOpenState(open);
  };
  // An attached pane takes its own column beside the stage, instead of
  // floating over it.
  const [attached, setAttachedState] = useState(
    () => localStorage.getItem(ATTACH_KEY) === 'true',
  );
  const setAttached = (on: boolean) => {
    localStorage.setItem(ATTACH_KEY, String(on));
    setAttachedState(on);
  };
  // The walk point that the user works on in the properties pane.
  const [focusPoint, setFocusPoint] = useState<number | null>(null);

  const lengthOf = (s: Scene) =>
    sceneLength(s, bg?.background ?? null, (a) => kindOf(a.asset));
  const duration = lengthOf(scene);
  const playback = usePlayback({
    duration,
    fps: FPS,
    loop: false,
    speed: 1,
    autoplay: false,
    seekLimit: timelineLength(duration),
  });
  const t = playback.t;

  // An undo can take away the selected actor or action. An actor whose
  // character or prop isn't in the library can't be selected.
  const found =
    selected?.actorId == null
      ? undefined
      : scene.actors.find((a) => a.id === selected.actorId);
  const selectedKind = found ? kindOf(found.asset) : null;
  const selectedActor = found && selectedKind ? found : null;
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
  const selectedBubble =
    (bubbleId !== null && scene.bubbles?.find((b) => b.id === bubbleId)) ||
    null;
  const walk =
    walking &&
    actionsOf(scene, walking.actorId).some((a) => a.id === walking.actionId)
      ? walking
      : null;

  const editScene = (fn: (s: Scene) => Scene, run?: EditRun) =>
    doc.edit((c) => updateScene(c, scene.id, fn), run);
  const editBubble = (id: string, fn: (b: Bubble) => Bubble, run?: EditRun) =>
    editScene((s) => updateBubble(s, id, fn), run);
  /** Selects an actor or an action, or nothing with null. */
  const select = (sel: TimelineSelection | null) => {
    setSelected(sel);
    setBubbleId(null);
  };
  const selectBubble = (id: string) => {
    setBubbleId(id);
    setSelected(null);
    setWalking(null);
  };
  /** Selects a bubble and puts the focus in its text field. */
  const editBubbleText = (id: string) => {
    selectBubble(id);
    setPaneOpen(true);
    setTextFocus((n) => n + 1);
  };
  /** The current time, on a whole frame. */
  const now = () => Math.round(t * FPS) / FPS;

  /** Opens scene `i` of `list`, which is the scenes after the edit, if any. */
  const openScene = (i: number, list: readonly Scene[] = scenes) => {
    setSceneIndex(i);
    select(null);
    setBubbleTool(false);
    setWalking(null);
    playback.seek(0);
    setLibrary(list[i]?.background ? null : 'background');
  };
  const addScene = () => {
    doc.edit((c) => ({ ...c, scenes: [...c.scenes, newScene()] }));
    openScene(scenes.length);
    setLibrary('background');
  };
  /** Removes the open scene and opens the scene before it. */
  const removeOpenScene = () => {
    const next = removeScene(doc.content, scene.id);
    doc.edit(() => next);
    openScene(Math.max(index - 1, 0), next.scenes);
    setRemoving(false);
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
    select({ actorId: actor.id, actionId: null });
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
    // The playhead can go a few seconds past the end of a scene, and so past
    // the latest time that the server saves.
    const at = Math.min(now(), CONTENT_LIMITS.time);
    playback.seek(at);
    const moves = selectedKind !== null && isMoving(selectedKind, clip);
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

  const editWalk = (fn: (path: Pt[]) => Pt[], run?: EditRun) => {
    if (!walk) return;
    editScene(
      (s) =>
        updateActions(s, walk.actorId, (actions) =>
          updateAction(actions, walk.actionId, (a) => ({
            ...a,
            path: fn(a.path ?? []),
          })),
        ),
      run,
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
    select(sel);
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

  const play = (on: boolean) => {
    if (on) {
      setWalking(null);
      setBubbleTool(false);
    }
    playback.setPlaying(on);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (removing || isTyping(e.target)) return;
    const command = editorCommand(e);
    if (!command) return;
    // Also keeps the keys from pressing the focused button or scrolling.
    e.preventDefault();
    // Holding an arrow key down steps on, one frame at a time.
    if (command === 'play') {
      if (!e.repeat) play(!playback.playing);
    } else if (command === 'back') playback.step(-1);
    else if (command === 'forward') playback.step(1);
    else if (command === 'start') playback.seek(0);
    else if (command === 'end') playback.seek(duration);
    else if (command === 'undo') doc.undo();
    else doc.redo();
  });
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  let toolbar: ReactNode = null;
  if (bg && walk) {
    toolbar = <WalkBar onDone={walkDone} />;
  } else if (bg && selectedBubble) {
    const id = selectedBubble.id;
    toolbar = (
      <BubbleBar
        onEditText={() => editBubbleText(id)}
        onRemove={() => {
          editScene((s) => removeBubble(s, id));
          setBubbleId(null);
        }}
      />
    );
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
    if (selectedActor && selectedKind) {
      const kind = selectedKind;
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
          current={state.action?.clip ?? restClip(kind).id}
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

  // While the cartoon doesn't play, a bubble shows at its full size also at
  // its first and last moments, so that the user can work on it.
  const frame =
    bg &&
    sceneFrame(scene, bg.background, LIBRARY, t, { pop: playback.playing });

  const pane = (
    <PropertiesPane
      scene={scene}
      bg={bg ?? null}
      selection={selection}
      bubble={selectedBubble}
      anchors={frame?.bubbleContext.anchors ?? new Map()}
      textFocus={textFocus}
      onEditBubble={(fn, run) =>
        selectedBubble && editBubble(selectedBubble.id, fn, run)
      }
      duration={duration}
      fps={FPS}
      onEdit={(fn) => editScene(fn)}
      onSeek={playback.seek}
      onClipChanged={(actorId, action) => {
        setWalking(
          actorId !== null &&
            selectedKind &&
            isMoving(selectedKind, action.clip)
            ? { actorId, actionId: action.id }
            : null,
        );
      }}
      onFocusPoint={setFocusPoint}
      attached={attached}
      onAttach={setAttached}
      onClose={() => setPaneOpen(false)}
    />
  );

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
        <PreviewButton cartoonId={cartoon.id} frame={bg && { scene, bg, t }} />
        <IconButton
          label="editor.undo"
          onClick={doc.canUndo ? doc.undo : undefined}
        >
          <UndoIcon />
        </IconButton>
        <IconButton
          label="editor.redo"
          onClick={doc.canRedo ? doc.redo : undefined}
        >
          <RedoIcon />
        </IconButton>
        <div className="divider" />
        <Link
          to="/cartoons/$cartoonId"
          params={{ cartoonId: cartoon.id }}
          className="button primary small"
          // The player shows the edits that are not saved yet. Leaving the
          // editor saves them.
          onClick={() =>
            queryClient.setQueryData(
              contentQuery(cartoon.id).queryKey,
              (old) => old && { ...old, content: doc.content },
            )
          }
        >
          <PlayIcon size={16} />
          {tr('editor.watch')}
        </Link>
      </header>

      <div className="editor-body">
        <nav className="tool-rail" aria-label={tr('editor.library')}>
          <IconButton
            label="editor.characters"
            pressed={library === 'character'}
            onClick={bg ? () => toggleLibrary('character') : undefined}
          >
            <CharacterIcon />
          </IconButton>
          <IconButton
            label="editor.props"
            pressed={library === 'prop'}
            onClick={bg ? () => toggleLibrary('prop') : undefined}
          >
            <PropIcon />
          </IconButton>
          <IconButton
            label="editor.backgrounds"
            pressed={library === 'background'}
            onClick={() => toggleLibrary('background')}
          >
            <BackgroundIcon />
          </IconButton>
          <IconButton
            label="editor.speechBubble"
            pressed={bubbleTool}
            onClick={
              bg
                ? () => {
                    // The next tap adds a bubble, not a point of a walk.
                    if (!bubbleTool) walkDone();
                    setBubbleTool(!bubbleTool);
                    setLibrary(null);
                  }
                : undefined
            }
          >
            <BubbleIcon />
          </IconButton>
          <IconButton label="editor.sounds">
            <SoundIcon />
          </IconButton>
        </nav>
        <div className="stage-area">
          {bg && frame ? (
            <EditorStage
              scene={scene}
              bg={bg}
              selectedActor={selection?.actorId ?? null}
              selectedBubble={selectedBubble?.id ?? null}
              bubbleTool={bubbleTool}
              frame={frame}
              walk={walk}
              focusPoint={focusPoint}
              onSelect={(actorId) => {
                select(actorId ? { actorId, actionId: null } : null);
                setWalking(null);
              }}
              onSelectBubble={selectBubble}
              onEditBubbleText={editBubbleText}
              onAddBubble={(place) => {
                const bubble: Bubble = newBubble(
                  newId(),
                  now(),
                  place.at,
                  place.attach,
                );
                editScene((s) => addBubble(s, bubble));
                setBubbleTool(false);
                editBubbleText(bubble.id);
              }}
              onMoveBubble={(id, at, run) =>
                editBubble(id, (b) => ({ ...b, at }), run)
              }
              onMoveTail={(id, tailTip, run) =>
                editBubble(id, (b) => ({ ...b, tailTip }), run)
              }
              onMoveActor={(id, d, run) =>
                editScene(
                  (s) => updateActor(s, id, (a) => moveActor(a, d)),
                  run,
                )
              }
              onAddPoint={(at) => editWalk((path) => addPoint(path, at))}
              onMovePoint={(i, at, run) =>
                editWalk((path) => path.map((p, j) => (j === i ? at : p)), run)
              }
              onRevert={doc.revert}
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
          {paneOpen && !attached
            ? pane
            : !paneOpen && (
                <div className="pane-toggle">
                  <IconButton
                    label="properties.show"
                    onClick={() => setPaneOpen(true)}
                  >
                    <PropertiesIcon />
                  </IconButton>
                </div>
              )}
        </div>
        {paneOpen && attached && pane}
      </div>

      <Timeline
        scene={scene}
        background={bg?.background ?? null}
        sceneNumber={index}
        sceneCount={scenes.length}
        onScene={openScene}
        onAddScene={addScene}
        onRemoveScene={() => setRemoving(true)}
        duration={duration}
        t={t}
        fps={FPS}
        playing={playback.playing}
        onPlay={play}
        onSeek={playback.seek}
        onStep={playback.step}
        selection={selection}
        onSelect={selectOnTimeline}
        onMoveBlock={(actorId, actionId, at, run) => {
          // Each move of a drag starts from the scene before the drag.
          editScene(
            (s) => moveBlock(s, actorId, actionId, at, lengthOf(s)).scene,
            run,
          );
          playback.seek(moveBlock(scene, actorId, actionId, at, duration).t);
        }}
        onMoveStart={(actorId, actionId, at, run) => {
          editScene(
            (s) => updateActions(s, actorId, (a) => moveStart(a, actionId, at)),
            run,
          );
          const moved = moveStart(actionsOf(scene, actorId), actionId, at);
          playback.seek(moved.find((a) => a.id === actionId)?.t ?? at);
        }}
        onLength={(v, run) => editScene((s) => setLength(s, v), run)}
        selectedBubble={selectedBubble?.id ?? null}
        onSelectBubble={selectBubble}
        onMoveBubble={(id, at, run) => {
          editBubble(id, (b) => ({ ...b, t: savedTime(at) }), run);
          playback.seek(at);
        }}
        onBubbleLength={(id, v, run) =>
          editBubble(id, (b) => ({ ...b, length: savedTime(v) }), run)
        }
        onRevert={doc.revert}
      />
      <SaveProblem
        cartoonId={cartoon.id}
        state={doc.saveState}
        onKeepMine={doc.keepMine}
        onLoadSaved={doc.loadSaved}
        onRetry={doc.retry}
      />
      {removing && (
        <Dialog
          title={tr('editor.removeSceneTitle', { n: index + 1 })}
          onClose={() => setRemoving(false)}
        >
          <p className="muted">{tr('editor.removeSceneInfo')}</p>
          <div className="row end">
            <button
              type="button"
              className="button"
              onClick={() => setRemoving(false)}
            >
              {tr('cancel')}
            </button>
            <button
              type="button"
              className="button danger"
              onClick={removeOpenScene}
            >
              {tr('editor.removeSceneConfirm')}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
