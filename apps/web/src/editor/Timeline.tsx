// The timeline of a scene: a row for the background and one for each actor,
// with the actions as blocks from their start until the next action. Tap or
// drag the ruler to move the playhead, and tap a row to move it there. Tap an
// action to select it, and drag it to move it. The time marks on each row
// move the playhead and change where actions start and the scene ends.
//
// The wheel scrolls the rows, and Shift + wheel or a sideways swipe scrolls in
// time. `useTimelineZoom` has the zoom. The timeline goes on a bit past the end
// of the scene, so that the end shows and the user can start new actions
// after it.
import type { Background, Scene } from '@toonhouse/model';
import { sortedActions, walkTime } from '@toonhouse/renderer';
import { type PointerEvent, type ReactNode, useRef, useState } from 'react';

import {
  BackgroundIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StepBackIcon,
  StepForwardIcon,
  ZoomFitIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../components/icons.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import { ActionBlocks } from './ActionBlocks.tsx';
import { kindOf } from './library.ts';
import { useNames } from './names.ts';
import {
  formatTime,
  midPoints,
  rulerTicks,
  timelineLength,
  type TimelineRow,
} from './timelineMath.ts';
import { TimeMarks } from './TimeMarks.tsx';
import type { EditMode } from './useCartoonContent.ts';
import { useSize } from './useSize.ts';
import { useTimelineZoom } from './useTimelineZoom.ts';

/** The width of the names of the rows, in CSS pixels. */
const LABEL_WIDTH = 132;
/** At the deepest zoom, a frame is this wide in CSS pixels. */
const MAX_FRAME_WIDTH = 24;

/** An actor on the timeline, or the background with `actorId` null. */
export interface TimelineSelection {
  actorId: string | null;
  actionId: string | null;
}

interface Props {
  scene: Scene;
  background: Background | null;
  sceneNumber: number;
  sceneCount: number;
  onScene(index: number): void;
  onAddScene(): void;
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
  onMoveBlock(
    actorId: string | null,
    actionId: string,
    t: number,
    mode: EditMode,
  ): void;
  /** Moves only the start of an action, which is the end of the one before. */
  onMoveStart(
    actorId: string | null,
    actionId: string,
    t: number,
    mode: EditMode,
  ): void;
  /** Sets the length of the scene. */
  onLength(length: number, mode: EditMode): void;
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
  const freeze = (mode: EditMode) => {
    if (mode === 'push') setFrozen({ fit, length });
  };
  const unfreeze = () => setFrozen(null);

  const length = Math.max(frozen?.length ?? 0, timelineLength(duration));
  // At zoom 1, the whole timeline fits the width.
  const fit =
    frozen?.fit ?? Math.max(size.width - LABEL_WIDTH - 16, 100) / length;
  const zoom = useTimelineZoom({
    ref,
    labelWidth: LABEL_WIDTH,
    fit,
    maxZoom: Math.max(1, (props.fps * MAX_FRAME_WIDTH) / fit),
    t,
  });
  const { pps } = zoom;
  const width = length * pps;

  const timeAt = (e: { clientX: number }, lane: Element) => {
    const r = lane.getBoundingClientRect();
    const v = (e.clientX - r.left) / pps;
    return Math.min(Math.max(Math.round(v * props.fps) / props.fps, 0), length);
  };

  const scrub = useRef<number | null>(null);
  const rulerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrub.current = e.pointerId;
    props.onSeek(timeAt(e, e.currentTarget));
  };
  const rulerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (scrub.current === e.pointerId) props.onSeek(timeAt(e, e.currentTarget));
  };
  const rulerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (scrub.current === e.pointerId) scrub.current = null;
  };

  const rows: (TimelineRow & { actorId: string | null; label: ReactNode })[] =
    [];
  if (scene.background) {
    rows.push({
      actorId: null,
      kind: 'background',
      label: (
        <>
          <BackgroundIcon />
          <span>{tr('editor.background')}</span>
        </>
      ),
      actions: scene.backgroundActions,
      walkTimes: new Map(),
    });
  }
  const actorNames = names.actors(scene);
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

  return (
    <section className="timeline" aria-label={tr('editor.timeline')}>
      <div className="transport">
        <TransportButton
          label="editor.stepBack"
          onClick={() => props.onStep(-1)}
        >
          <StepBackIcon />
        </TransportButton>
        {props.playing ? (
          <TransportButton
            label="editor.pause"
            onClick={() => props.onPlay(false)}
          >
            <PauseIcon />
          </TransportButton>
        ) : (
          <TransportButton
            label="editor.playFromHere"
            onClick={() => props.onPlay(true)}
          >
            <PlayIcon />
          </TransportButton>
        )}
        <TransportButton
          label="editor.stepForward"
          onClick={() => props.onStep(1)}
        >
          <StepForwardIcon />
        </TransportButton>
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
        </div>
        <div className="divider" />
        <TransportButton label="editor.zoomOut" onClick={zoom.zoomOut}>
          <ZoomOutIcon />
        </TransportButton>
        <TransportButton label="editor.zoomIn" onClick={zoom.zoomIn}>
          <ZoomInIcon />
        </TransportButton>
        <TransportButton label="editor.zoomFit" onClick={zoom.zoomFit}>
          <ZoomFitIcon />
        </TransportButton>
      </div>

      <div className="tracks" ref={ref}>
        <div
          className="tracks-inner"
          style={{ width: LABEL_WIDTH + width + 16 }}
        >
          <div className="track ruler-track">
            <div className="track-label" />
            <div
              className="ruler"
              style={{ width }}
              onPointerDown={rulerDown}
              onPointerMove={rulerMove}
              onPointerUp={rulerUp}
              onPointerCancel={rulerUp}
            >
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
          {rows.length === 0 && (
            <p className="muted tracks-empty">{tr('editor.emptyTimeline')}</p>
          )}
          {rows.map((row) => {
            const rowSelected =
              props.selection !== null &&
              props.selection.actorId === row.actorId;
            return (
              <div
                key={row.actorId ?? 'background'}
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
                    onMove={(actionId, at, mode) => {
                      freeze(mode);
                      props.onMoveBlock(row.actorId, actionId, at, mode);
                    }}
                    onMoveDone={unfreeze}
                  />
                  <TimeMarks
                    row={row}
                    endTargets={endTargets}
                    duration={duration}
                    fps={props.fps}
                    pps={pps}
                    onSeek={props.onSeek}
                    onLength={(v, mode) => {
                      freeze(mode);
                      props.onLength(v, mode);
                    }}
                    onMoveStart={(actionId, at, mode) => {
                      freeze(mode);
                      props.onMoveStart(row.actorId, actionId, at, mode);
                    }}
                    onDragDone={unfreeze}
                  />
                </div>
              </div>
            );
          })}
          <div
            className="scene-tail"
            style={{
              left: LABEL_WIDTH + duration * pps,
              width: (length - duration) * pps,
            }}
            aria-hidden
          />
          <div
            className="playhead"
            style={{ left: LABEL_WIDTH + t * pps }}
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

function TransportButton(props: {
  label: TextKey;
  onClick?: (() => void) | undefined;
  children: ReactNode;
}) {
  const { tr } = useI18n();
  return (
    <button
      type="button"
      className="icon-button small"
      aria-label={tr(props.label)}
      title={tr(props.label)}
      disabled={!props.onClick}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
