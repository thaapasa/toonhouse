// The timeline of a scene: a row for the camera, one for the time of day, one
// for the weather and one for each actor, with the actions as blocks from
// their start until the next action. An actor with speech bubbles has a bubble
// lane under its row, and the free bubbles have a row of their own at the
// end. Tap or drag the ruler to move the playhead, and tap a row to move it there. Tap an
// action to select it, and drag it to move it. The time marks on each row
// move the playhead and change where actions start and the scene ends.
//
// The wheel scrolls the rows, and Shift + wheel or a sideways swipe scrolls in
// time. `useTimelineZoom` has the zoom. The timeline goes on a bit past the end
// of the scene, so that the end shows and the user can start new actions
// after it.
import type { Background, Bubble, CastMember } from '@toonhouse/model';
import {
  type CastScene,
  clamp,
  sortedActions,
  walkTime,
} from '@toonhouse/renderer';
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { IconButton } from '../components/IconButton.tsx';
import {
  BubbleIcon,
  CameraIcon,
  CloudIcon,
  DeleteIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StepBackIcon,
  StepForwardIcon,
  SunIcon,
  ZoomFitIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../components/icons.tsx';
import { useI18n } from '../i18n/index.tsx';
import { kindOf } from '../library/index.ts';
import { ActionBlocks } from './ActionBlocks.tsx';
import type { BlockDrag } from './blockEdit.ts';
import { BUBBLE_LINE, BubbleLane, bubbleLines } from './BubbleLane.tsx';
import type { CameraDrag } from './cameraEdit.ts';
import { CameraLane } from './CameraLane.tsx';
import { ChangeLane } from './ChangeLane.tsx';
import type { EditRun } from './history.ts';
import { useNames } from './names.ts';
import { changesOf, type SkyRow } from './skyEdit.ts';
import {
  formatTime,
  midPoints,
  rulerTicks,
  timelineLength,
  type TimelineRow,
} from './timelineMath.ts';
import { TimeMarks } from './TimeMarks.tsx';
import { useLaneDrag } from './useLaneDrag.ts';
import { useSize } from './useSize.ts';
import { useTimelineZoom } from './useTimelineZoom.ts';

/** The width of the names of the rows, in CSS pixels. */
const LABEL_WIDTH = 132;
/**
 * The room before time 0, in CSS pixels, so that the knob of the playhead and
 * the time marks at the start show whole. The lanes have it as a margin.
 */
const LANE_PAD = 12;
/** Where time 0 is, from the left edge of the tracks. */
const LANE_START = LABEL_WIDTH + LANE_PAD;
/** At the deepest zoom, a frame is this wide in CSS pixels. */
const MAX_FRAME_WIDTH = 24;

/** An actor on the timeline, and one of its actions. */
export interface TimelineSelection {
  actorId: string;
  actionId: string | null;
}

interface Props {
  scene: CastScene;
  /** The cast of the cartoon, for the names of the actors. */
  cast: readonly CastMember[];
  background: Background | null;
  sceneNumber: number;
  sceneCount: number;
  onScene(index: number): void;
  onAddScene(): void;
  /** Removes the open scene. */
  onRemoveScene(): void;
  duration: number;
  t: number;
  fps: number;
  playing: boolean;
  onPlay(playing: boolean): void;
  onSeek(t: number): void;
  onStep(frames: number): void;
  selection: TimelineSelection | null;
  onSelect(selection: TimelineSelection): void;
  /** Moves a whole action, its start and its end, to start at `t`. */
  onMoveBlock(actorId: string, actionId: string, t: number, run: EditRun): void;
  /** Moves only the start of an action, which is the end of the one before. */
  onMoveStart(actorId: string, actionId: string, t: number, run: EditRun): void;
  /** Sets the length of the scene. */
  onLength(length: number, run: EditRun): void;
  /** The selected speech bubble, if any. */
  selectedBubble: string | null;
  onSelectBubble(id: string): void;
  /** Moves a bubble to start at `t`, and keeps its length. */
  onMoveBubble(id: string, t: number, run: EditRun): void;
  onBubbleLength(id: string, length: number, run: EditRun): void;
  /** Takes away the step of a drag that a pinch cancelled. */
  onRevert(run: EditRun): void;
  cameraSelected: boolean;
  /** Selects the camera, and moves the playhead to `t` if given. */
  onSelectCamera(t?: number): void;
  onCameraDrag(id: string, part: CameraDrag, t: number, run: EditRun): void;
  /** The selected row of the time of day or the weather, if any. */
  skyRow: SkyRow | null;
  /** Selects the row of the time of day or the weather, and moves the playhead to `t` if given. */
  onSelectSkyRow(row: SkyRow, t?: number): void;
  onChangeDrag(
    row: SkyRow,
    id: string,
    part: BlockDrag,
    t: number,
    run: EditRun,
  ): void;
}

export function Timeline(props: Props) {
  const { scene, duration, t } = props;
  const { tr } = useI18n();
  const names = useNames();
  const [ref, size] = useSize<HTMLDivElement>();
  // While the user drags an action, a time mark or the end of the scene, the
  // scale of the timeline stays as it was, so that the dragged thing stays
  // under the finger when the scene gets longer or shorter.
  const [frozen, setFrozen] = useState<{ fit: number; length: number } | null>(
    null,
  );
  const unfreeze = () => setFrozen(null);
  // Where the playhead was when the latest drag started, as the drags of
  // actions and bubbles move it.
  const dragStart = useRef<{ run: EditRun; t: number } | null>(null);
  /** Each move of a drag calls this first. */
  const dragMove = (run: EditRun) => {
    setFrozen((f) => f ?? { fit, length });
    if (dragStart.current?.run !== run) dragStart.current = { run, t };
  };
  /** A pinch cancelled the drag, so its edit and its seeks go away. */
  const revert = (run: EditRun) => {
    props.onRevert(run);
    unfreeze();
    if (dragStart.current?.run === run) props.onSeek(dragStart.current.t);
    dragStart.current = null;
  };

  // Two fingers zoom, in `useTimelineZoom`. So a second finger cancels what
  // the first one did, and it doesn't start anything itself.
  const touches = useRef(new Set<number>());
  const pinches = useRef(0);
  const touchDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    touches.current.add(e.pointerId);
    if (touches.current.size < 2) return;
    pinches.current++;
    e.stopPropagation();
  };
  useEffect(() => {
    // On the window, as a finger can lift outside the timeline.
    const lift = (e: globalThis.PointerEvent) =>
      touches.current.delete(e.pointerId);
    window.addEventListener('pointerup', lift, true);
    window.addEventListener('pointercancel', lift, true);
    return () => {
      window.removeEventListener('pointerup', lift, true);
      window.removeEventListener('pointercancel', lift, true);
    };
  }, []);

  const length = Math.max(frozen?.length ?? 0, timelineLength(duration));
  // At zoom 1, the whole timeline fits the width.
  const fit =
    frozen?.fit ?? Math.max(size.width - LANE_START - 16, 100) / length;
  const zoom = useTimelineZoom({
    ref,
    laneStart: LANE_START,
    fit,
    maxZoom: Math.max(1, (props.fps * MAX_FRAME_WIDTH) / fit),
    t,
  });
  const { pps } = zoom;
  const width = length * pps;

  const timeAt = (e: { clientX: number }, lane: Element) => {
    const r = lane.getBoundingClientRect();
    const v = (e.clientX - r.left) / pps;
    return clamp(Math.round(v * props.fps) / props.fps, 0, length);
  };

  // The ruler drag moves the playhead from the first touch, and a pinch puts
  // the playhead back to `from`, where it was before.
  const ruler = useLaneDrag<number>({
    pinches,
    moveOnDown: true,
    onMove: (_from, _dx, _run, e) => props.onSeek(timeAt(e, e.currentTarget)),
    onCancel: (from) => props.onSeek(from),
  });

  const rows: (TimelineRow & { actorId: string; label: ReactNode })[] = [];
  const actorNames = names.actors(scene, props.cast);
  for (const actor of scene.actors) {
    const kind = kindOf(actor.asset);
    if (!kind) continue;
    rows.push({
      actorId: actor.id,
      kind,
      label: <span>{actorNames.get(actor.id)}</span>,
      actions: actor.actions,
      walkTimes: new Map(
        actor.actions.flatMap((a) => {
          const w =
            props.background && walkTime(actor, kind, props.background, a);
          return w == null ? [] : [[a.id, w] as const];
        }),
      ),
    });
  }

  // The end of the scene snaps to the middle points of the last actions, which
  // end with the scene. Their loops go on past the end, so that the scene can
  // get longer up to the next loop.
  const endTargets = rows.flatMap((row) => {
    const last = sortedActions(row.actions).at(-1);
    return last ? midPoints(last, row, length, pps) : [];
  });

  const bubbles = scene.bubbles ?? [];
  const actorIds = new Set(rows.map((r) => r.actorId));
  const bubblesOf = (actorId: string | null) =>
    bubbles.filter((b) =>
      actorId === null
        ? b.actorId === undefined || !actorIds.has(b.actorId)
        : b.actorId === actorId,
    );
  /** The lane of the bubbles of an actor, or of the free bubbles. */
  const bubbleTrack = (
    list: readonly Bubble[],
    key: string,
    label: ReactNode,
  ) => {
    if (list.length === 0) return null;
    const count = Math.max(...bubbleLines(list).values()) + 1;
    return (
      <div key={key} className="track bubble-track">
        <div className="track-label">{label}</div>
        <div
          className="lane bubble-lane"
          style={{ width, height: count * BUBBLE_LINE }}
          onClick={(e) => props.onSeek(timeAt(e, e.currentTarget))}
        >
          <BubbleLane
            bubbles={list}
            length={length}
            pps={pps}
            fps={props.fps}
            selected={props.selectedBubble}
            onSelect={(id, at) => {
              props.onSelectBubble(id);
              props.onSeek(at);
            }}
            onSeek={props.onSeek}
            onMove={(id, at, run) => {
              dragMove(run);
              props.onMoveBubble(id, at, run);
            }}
            onLength={(id, v, run) => {
              dragMove(run);
              props.onBubbleLength(id, v, run);
            }}
            onDragDone={unfreeze}
            pinches={pinches}
            onCancel={revert}
          />
        </div>
      </div>
    );
  };

  return (
    <section className="timeline" aria-label={tr('editor.timeline')}>
      <div className="transport">
        <IconButton
          small
          label="editor.stepBack"
          shortcut="editor.keyLeft"
          onClick={() => props.onStep(-1)}
        >
          <StepBackIcon />
        </IconButton>
        {props.playing ? (
          <IconButton
            small
            label="editor.pause"
            shortcut="editor.keySpace"
            onClick={() => props.onPlay(false)}
          >
            <PauseIcon />
          </IconButton>
        ) : (
          <IconButton
            small
            label="editor.playFromHere"
            shortcut="editor.keySpace"
            onClick={() => props.onPlay(true)}
          >
            <PlayIcon />
          </IconButton>
        )}
        <IconButton
          small
          label="editor.stepForward"
          shortcut="editor.keyRight"
          onClick={() => props.onStep(1)}
        >
          <StepForwardIcon />
        </IconButton>
        <div className="time">
          <strong>{formatTime(t)}</strong>
          <span className="muted"> / {formatTime(duration)}</span>
        </div>
        <div className="spacer" />
        <div
          className="scene-tabs"
          role="group"
          aria-label={tr('editor.scenes')}
        >
          {Array.from({ length: props.sceneCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className="scene-tab"
              aria-pressed={i === props.sceneNumber}
              aria-label={tr('editor.scene', { n: i + 1 })}
              title={tr('editor.scene', { n: i + 1 })}
              onClick={() => props.onScene(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className="scene-tab"
            aria-label={tr('editor.addScene')}
            title={tr('editor.addScene')}
            onClick={props.onAddScene}
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            className="scene-tab"
            aria-label={tr('editor.removeScene')}
            title={tr('editor.removeScene')}
            onClick={props.onRemoveScene}
          >
            <DeleteIcon />
          </button>
        </div>
        <div className="divider" />
        <IconButton small label="editor.zoomOut" onClick={zoom.zoomOut}>
          <ZoomOutIcon />
        </IconButton>
        <IconButton small label="editor.zoomIn" onClick={zoom.zoomIn}>
          <ZoomInIcon />
        </IconButton>
        <IconButton small label="editor.zoomFit" onClick={zoom.zoomFit}>
          <ZoomFitIcon />
        </IconButton>
      </div>

      <div className="tracks" ref={ref} onPointerDownCapture={touchDown}>
        <div
          className="tracks-inner"
          style={{ width: LANE_START + width + 16 }}
        >
          <div className="track ruler-track">
            <div className="track-label" />
            <div className="ruler" style={{ width }} {...ruler.handlers(t)}>
              {rulerTicks(length, pps).map((tick) => (
                <span
                  key={tick.t}
                  className="tick"
                  style={{ left: tick.t * pps }}
                >
                  {tick.label}
                </span>
              ))}
              <span
                className="scene-tail"
                style={{ left: duration * pps, right: 0 }}
              />
              <span className="playhead" style={{ left: t * pps }}>
                <span className="playhead-knob" />
              </span>
            </div>
          </div>
          {scene.background && (
            <div className="track" aria-selected={props.cameraSelected}>
              <button
                type="button"
                className="track-label"
                onClick={() => props.onSelectCamera()}
              >
                <CameraIcon />
                <span>{tr('editor.camera')}</span>
              </button>
              <div
                className="lane"
                style={{ width }}
                onClick={(e) => props.onSeek(timeAt(e, e.currentTarget))}
              >
                <CameraLane
                  scene={scene}
                  pps={pps}
                  fps={props.fps}
                  t={t}
                  selected={props.cameraSelected}
                  onSelect={props.onSelectCamera}
                  onDrag={(id, part, at, run) => {
                    dragMove(run);
                    props.onCameraDrag(id, part, at, run);
                  }}
                  onDragDone={unfreeze}
                  pinches={pinches}
                  onCancel={revert}
                />
              </div>
            </div>
          )}
          {scene.background &&
            (['time', 'weather'] as const).map((row) => (
              <div
                key={row}
                className="track"
                aria-selected={props.skyRow === row}
              >
                <button
                  type="button"
                  className="track-label"
                  onClick={() => props.onSelectSkyRow(row)}
                >
                  {row === 'time' ? <SunIcon /> : <CloudIcon />}
                  <span>
                    {tr(row === 'time' ? 'editor.timeOfDay' : 'editor.weather')}
                  </span>
                </button>
                <div
                  className="lane"
                  style={{ width }}
                  onClick={(e) => props.onSeek(timeAt(e, e.currentTarget))}
                >
                  <ChangeLane
                    row={row}
                    changes={changesOf(scene, row)}
                    pps={pps}
                    fps={props.fps}
                    t={t}
                    selected={props.skyRow === row}
                    onSelect={(at) => props.onSelectSkyRow(row, at)}
                    onDrag={(id, part, at, run) => {
                      dragMove(run);
                      props.onChangeDrag(row, id, part, at, run);
                    }}
                    onDragDone={unfreeze}
                    pinches={pinches}
                    onCancel={revert}
                  />
                </div>
              </div>
            ))}
          {rows.length === 0 && bubbles.length === 0 && (
            <p className="muted tracks-empty">{tr('editor.emptyTimeline')}</p>
          )}
          {rows.map((row) => {
            const rowSelected =
              props.selection !== null &&
              props.selection.actorId === row.actorId;
            return [
              <div
                key={row.actorId}
                className="track"
                aria-selected={rowSelected}
              >
                <button
                  type="button"
                  className="track-label"
                  onClick={() =>
                    props.onSelect({ actorId: row.actorId, actionId: null })
                  }
                >
                  {row.label}
                </button>
                <div
                  className="lane"
                  style={{ width }}
                  onClick={(e) => props.onSeek(timeAt(e, e.currentTarget))}
                >
                  <ActionBlocks
                    row={row}
                    duration={duration}
                    length={length}
                    pps={pps}
                    selected={rowSelected ? props.selection!.actionId : null}
                    onSelect={(actionId, at) => {
                      props.onSelect({ actorId: row.actorId, actionId });
                      props.onSeek(at);
                    }}
                    onMove={(actionId, at, run) => {
                      dragMove(run);
                      props.onMoveBlock(row.actorId, actionId, at, run);
                    }}
                    onMoveDone={unfreeze}
                    pinches={pinches}
                    onCancel={revert}
                  />
                  <TimeMarks
                    row={row}
                    endTargets={endTargets}
                    duration={duration}
                    fps={props.fps}
                    pps={pps}
                    onSeek={props.onSeek}
                    onLength={(v, run) => {
                      dragMove(run);
                      props.onLength(v, run);
                    }}
                    onMoveStart={(actionId, at, run) => {
                      dragMove(run);
                      props.onMoveStart(row.actorId, actionId, at, run);
                    }}
                    onDragDone={unfreeze}
                    pinches={pinches}
                    onCancel={revert}
                  />
                </div>
              </div>,
              bubbleTrack(
                bubblesOf(row.actorId),
                `bubbles-${row.actorId}`,
                <BubbleIcon size={16} />,
              ),
            ];
          })}
          {bubbleTrack(
            bubblesOf(null),
            'bubbles-free',
            <>
              <BubbleIcon size={16} />
              <span>{tr('bubble.freeRow')}</span>
            </>,
          )}
          <div className="track tracks-fill" aria-hidden>
            <div className="track-label" />
          </div>
          <div
            className="scene-tail"
            style={{
              left: LANE_START + duration * pps,
              width: (length - duration) * pps,
            }}
            aria-hidden
          />
          <div
            className="playhead"
            style={{ left: LANE_START + t * pps }}
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
