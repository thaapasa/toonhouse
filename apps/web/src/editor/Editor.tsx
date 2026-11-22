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
  CastMember,
  ClipId,
  Pt,
  Scene,
} from '@toonhouse/model';
import {
  actorStateAt,
  cameraHolder,
  castScene,
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
  CastIcon,
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
import {
  ActionBar,
  BubbleBar,
  CameraBar,
  ChangeBar,
  WalkBar,
} from './ActionBar.tsx';
import { addBubble, newBubble, removeBubble, updateBubble } from './bubbles.ts';
import {
  addCameraEntry,
  canAddCameraEntry,
  dragCameraEntry,
  newCameraEntry,
  removeCameraEntry,
  resetStartView,
  setCameraView,
  withBackground,
} from './cameraEdit.ts';
import { CartoonTitle } from './CartoonTitle.tsx';
import { CastMemberDialog, FromActorDialog } from './CastDialogs.tsx';
import {
  addCastMember,
  castFromActor,
  newCastMember,
  overrideScale,
  removeCastMember,
} from './castEdit.ts';
import { EditorStage, type WalkEdit } from './EditorStage.tsx';
import type { EditRun } from './history.ts';
import { clearKeptContent, keptContent } from './keptContent.ts';
import { editorCommand, isTyping } from './keys.ts';
import { LibraryPanel, type LibraryTab } from './LibraryPanel.tsx';
import { useNames } from './names.ts';
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
import {
  addChange,
  canAddChange,
  changeHolder,
  changesOf,
  dragChange,
  newTimeChange,
  newWeatherChange,
  nextScene,
  removeChange,
  type SkyRow,
} from './skyEdit.ts';
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
  const names = useNames();
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
  const cast = doc.content.cast ?? [];
  const [sceneIndex, setSceneIndex] = useState(0);
  const index = Math.min(sceneIndex, scenes.length - 1);
  // The edits change the scene as it is saved, and the rest of the editor
  // sees the settings of each actor worked out from the cast.
  const scene = castScene(scenes[index]!, cast);
  const bg = backgroundAsset(scene.background);
  const [library, setLibrary] = useState<LibraryTab | null>(
    scene.background ? null : 'background',
  );
  const [selected, setSelected] = useState<TimelineSelection | null>(null);
  const [walking, setWalking] = useState<WalkEdit | null>(null);
  // A selected bubble takes the place of the selected actor or action.
  const [bubbleId, setBubbleId] = useState<string | null>(null);
  const [bubbleTool, setBubbleTool] = useState(false);
  // A selected camera takes the place of the other selections.
  const [cameraSelected, setCameraSelected] = useState(false);
  // So does a selected row of the time of day or the weather.
  const [skyRow, setSkyRow] = useState<SkyRow | null>(null);
  const [textFocus, setTextFocus] = useState(0);
  const [removing, setRemoving] = useState(false);
  // The cast member whose dialog is open, or the actor to make one from.
  const [castDialog, setCastDialog] = useState<
    | { type: 'member'; id: string }
    | { type: 'fromActor'; actorId: string }
    | null
  >(null);
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
    sceneLength(castScene(s, cast), bg?.background ?? null, (a) =>
      kindOf(a.asset),
    );
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
  const found = selected && scene.actors.find((a) => a.id === selected.actorId);
  const selectedKind = found ? kindOf(found.asset) : null;
  const selectedActor = found && selectedKind ? found : null;
  const selection: TimelineSelection | null =
    !selected || !bg || !selectedActor
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
    setCameraSelected(false);
    setSkyRow(null);
  };
  const selectBubble = (id: string) => {
    setBubbleId(id);
    setSelected(null);
    setWalking(null);
    setCameraSelected(false);
    setSkyRow(null);
  };
  const selectCamera = () => {
    setCameraSelected(true);
    setSkyRow(null);
    setSelected(null);
    setBubbleId(null);
    walkDone();
    setBubbleTool(false);
  };
  const selectSkyRow = (row: SkyRow) => {
    setSkyRow(row);
    setCameraSelected(false);
    setSelected(null);
    setBubbleId(null);
    walkDone();
    setBubbleTool(false);
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
    // The new scene goes on from the sky and the weather at the end of the
    // last scene.
    const last = scenes.at(-1);
    const end =
      last &&
      sceneLength(
        castScene(last, cast),
        backgroundAsset(last.background)?.background ?? null,
        (a) => kindOf(a.asset),
      );
    const next = nextScene(last, end ?? 0);
    doc.edit((c) => ({ ...c, scenes: [...c.scenes, next] }));
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

  /** Adds a library character or prop, or a cast member, to the scene. */
  const addActor = (asset: RigAsset | CastMember) => {
    if (!bg) return;
    const member = 'name' in asset ? asset : null;
    const from = 'name' in asset ? asset.asset : asset;
    const actor: Actor = {
      id: newId(),
      asset: { kind: from.kind, id: from.id },
      ...(member && { cast: member.id }),
      at: freeSpot(bg, scene.actors),
      facing: 1,
      actions: [],
    };
    editScene((s) => ({ ...s, actors: [...s.actors, actor] }));
    select({ actorId: actor.id, actionId: null });
    setWalking(null);
    setLibrary(null);
  };
  /** Makes a cast member from a library asset and opens its dialog. */
  const newMember = (asset: RigAsset) => {
    const member = newCastMember(asset, names.asset(asset));
    doc.edit((c) => addCastMember(c, member));
    setCastDialog({ type: 'member', id: member.id });
  };
  const makeFromActor = (actorId: string, name: string) => {
    doc.edit((c) => castFromActor(c, scene.id, actorId, name).content);
    setCastDialog(null);
  };

  const setBackground = (id: string) => {
    editScene((s) => withBackground(s, id));
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
    setWalking(moves ? { actorId, actionId: action.id } : null);
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
    if (removing || castDialog || isTyping(e.target)) return;
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

  /** Adds a camera move or jump at the current time and selects it. */
  const addCamera = (jump: boolean) => {
    if (!bg) return;
    const at = now();
    const entry = newCameraEntry(scene, bg.background, newId(), at, jump);
    if (!entry) return;
    editScene((s) => addCameraEntry(s, entry));
    // The stage shows the view that the user sets next: the end of a move.
    playback.seek(entry.t + (entry.length ?? 0));
  };

  /** Adds a change of the time of day or the weather at the current time. */
  const addSkyChange = (row: SkyRow) => {
    const at = Math.min(now(), CONTENT_LIMITS.time);
    const change =
      row === 'time'
        ? newTimeChange(scene, newId(), at)
        : newWeatherChange(scene, newId(), at);
    if (!change) return;
    editScene((s) => addChange(s, row, change));
    // The pane shows the change at its end, where the user sets its target.
    playback.seek(change.t + change.length);
  };

  const holder = cameraHolder(scene, t);
  let toolbar: ReactNode = null;
  if (bg && skyRow) {
    const row = skyRow;
    const { change, moving } = changeHolder(changesOf(scene, row), t);
    toolbar = (
      <ChangeBar
        row={row}
        onAdd={
          canAddChange(scene, row, now()) ? () => addSkyChange(row) : undefined
        }
        onRemove={
          change
            ? () => {
                editScene((s) => removeChange(s, row, change.id));
                if (moving) playback.seek(change.t);
              }
            : undefined
        }
      />
    );
  } else if (bg && cameraSelected) {
    const at = now();
    const { entry, moving } = holder;
    toolbar = (
      <CameraBar
        onMove={
          canAddCameraEntry(scene, at, false)
            ? () => addCamera(false)
            : undefined
        }
        onJump={
          canAddCameraEntry(scene, at, true) ? () => addCamera(true) : undefined
        }
        removeLabel={
          entry
            ? entry.length
              ? 'camera.removeMove'
              : 'camera.removeJump'
            : 'camera.resetStart'
        }
        onRemove={
          entry
            ? () => {
                editScene((s) => removeCameraEntry(s, entry.id));
                if (moving) playback.seek(entry.t);
              }
            : scene.camera?.start
              ? () => editScene(resetStartView)
              : undefined
        }
      />
    );
  } else if (bg && walk) {
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
      // A new size from the size buttons is an override of this actor.
      const { scale } = selectedActor.settings;
      const resize = (step: 1 | -1) => {
        const next = stepSize(scale, step);
        return next === scale
          ? undefined
          : () =>
              editScene((s) =>
                updateActor(s, id, (a) => overrideScale(a, next)),
              );
      };
      toolbar = (
        <ActionBar
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
    }
  }

  // While the cartoon doesn't play, a bubble shows at its full size also at
  // its first and last moments, so that the user can work on it.
  const frame =
    bg &&
    sceneFrame(scene, bg.background, LIBRARY, t, {
      pop: playback.playing,
      ground: true,
    });

  const pane = (
    <PropertiesPane
      scene={scene}
      bg={bg ?? null}
      selection={selection}
      bubble={selectedBubble}
      anchors={frame?.bubbleContext.anchors ?? new Map()}
      textFocus={textFocus}
      cameraSelected={cameraSelected}
      skyRow={skyRow}
      t={t}
      onEditBubble={(fn, run) =>
        selectedBubble && editBubble(selectedBubble.id, fn, run)
      }
      duration={duration}
      fps={FPS}
      onEdit={(fn, run) => editScene(fn, run)}
      onSeek={playback.seek}
      onClipChanged={(actorId, action) => {
        setWalking(
          selectedKind && isMoving(selectedKind, action.clip)
            ? { actorId, actionId: action.id }
            : null,
        );
      }}
      onFocusPoint={setFocusPoint}
      cast={cast}
      onEditMember={(id) => setCastDialog({ type: 'member', id })}
      onCastFromActor={(actorId) =>
        setCastDialog({ type: 'fromActor', actorId })
      }
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
            label="editor.cast"
            pressed={library === 'cast'}
            onClick={bg ? () => toggleLibrary('cast') : undefined}
          >
            <CastIcon />
          </IconButton>
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
              cameraSelected={cameraSelected}
              cameraMoving={holder.moving}
              cameraEntry={holder.entry?.id ?? null}
              onSelectCamera={selectCamera}
              onCameraView={(entry, view, run) =>
                editScene(
                  (s) => setCameraView(s, bg.background, entry, view),
                  run,
                )
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
              cast={cast}
              onAdd={addActor}
              onNewMember={newMember}
              onEditMember={(id) => setCastDialog({ type: 'member', id })}
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
        cast={cast}
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
        cameraSelected={cameraSelected}
        onSelectCamera={(at) => {
          selectCamera();
          if (at !== undefined) playback.seek(at);
        }}
        skyRow={skyRow}
        onSelectSkyRow={(row, at) => {
          selectSkyRow(row);
          if (at !== undefined) playback.seek(at);
        }}
        onChangeDrag={(row, id, part, at, run) => {
          editScene((s) => dragChange(s, row, id, part, at), run);
          const moved = changesOf(
            dragChange(scene, row, id, part, at),
            row,
          ).find((c) => c.id === id);
          if (moved)
            playback.seek(part === 'start' ? moved.t : moved.t + moved.length);
        }}
        onCameraDrag={(id, part, at, run) => {
          editScene((s) => dragCameraEntry(s, id, part, at), run);
          const moved = dragCameraEntry(
            scene,
            id,
            part,
            at,
          ).camera?.entries.find((m) => m.id === id);
          // The playhead goes to the view that the user is likely to check.
          if (moved)
            playback.seek(
              part === 'start' ? moved.t : moved.t + (moved.length ?? 0),
            );
        }}
      />
      <SaveProblem
        cartoonId={cartoon.id}
        state={doc.saveState}
        onKeepMine={doc.keepMine}
        onLoadSaved={doc.loadSaved}
        onRetry={doc.retry}
      />
      {castDialog?.type === 'member' &&
        (() => {
          const member = cast.find((m) => m.id === castDialog.id);
          // An undo can take the cast member away.
          if (!member) return null;
          return (
            <CastMemberDialog
              member={member}
              content={doc.content}
              onEdit={doc.edit}
              onRemove={() => {
                doc.edit((c) => removeCastMember(c, member.id));
                setCastDialog(null);
              }}
              onClose={() => setCastDialog(null)}
            />
          );
        })()}
      {castDialog?.type === 'fromActor' &&
        (() => {
          const actor = scene.actors.find((a) => a.id === castDialog.actorId);
          if (!actor) return null;
          return (
            <FromActorDialog
              initialName={names.asset(actor.asset)}
              onCreate={(name) => makeFromActor(actor.id, name)}
              onClose={() => setCastDialog(null)}
            />
          );
        })()}
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
