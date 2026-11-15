// The timeline of a scene: a row for the background and one for each actor,
// with the actions as blocks from their start until the next action. Tap or
// drag the ruler to move in time, tap a row to move there, tap an action to
// select it and drag it to change when it starts.
import type { Action, Background, ClipKind, Scene } from '@toonhouse/model';
import { sortedActions, walkTime } from '@toonhouse/renderer';
import { type PointerEvent, type ReactNode, useRef, useState } from 'react';

import {
  BackgroundIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StepBackIcon,
  StepForwardIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../components/icons.tsx';
import { type TextKey, useI18n } from '../i18n/index.tsx';
import { CLIP_COLORS } from './clipIcons.tsx';
import { kindOf } from './library.ts';
import { useNames } from './names.ts';
import type { EditMode } from './useCartoonContent.ts';
import { useSize } from './useSize.ts';

/** The width of the names of the rows, in CSS pixels. */
const LABEL_WIDTH = 132;
const MAX_ZOOM = 8;
/** An action moves in steps of a tenth of a second. */
const snap = (t: number) => Math.round(t * 10) / 10;
/** A pointer that moves less than this, in CSS pixels, taps. */
const TAP_SLOP = 6;

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
  onMoveAction(
    actorId: string | null,
    actionId: string,
    t: number,
    mode: EditMode,
  ): void;
}

/** A time as m:ss.s. */
function formatTime(t: number) {
  const tenths = Math.floor(t * 10 + 1e-6);
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths % 10}`;
}

export function Timeline(props: Props) {
  const { scene, duration, t } = props;
  const { tr } = useI18n();
  const names = useNames();
  const [ref, size] = useSize<HTMLDivElement>();
  const [zoom, setZoom] = useState(1);

  // At zoom 1, the whole scene fits the width.
  const fit = Math.max(size.width - LABEL_WIDTH - 16, 100) / duration;
  const pps = fit * zoom;
  const width = duration * pps;
  const tick = pps >= 40 ? 1 : pps >= 16 ? 2 : 5;
  const ticks: number[] = [];
  for (let s = 0; s <= duration; s += tick) ticks.push(s);

  const timeAt = (e: { clientX: number }, lane: Element) => {
    const r = lane.getBoundingClientRect();
    const v = (e.clientX - r.left) / pps;
    return Math.min(
      Math.max(Math.round(v * props.fps) / props.fps, 0),
      duration,
    );
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

  const rows: (Row & { actorId: string | null; label: ReactNode })[] = [];
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
        <TransportButton
          label="editor.zoomOut"
          onClick={
            zoom > 1 ? () => setZoom((z) => Math.max(1, z / 1.5)) : undefined
          }
        >
          <ZoomOutIcon />
        </TransportButton>
        <TransportButton
          label="editor.zoomIn"
          onClick={
            zoom < MAX_ZOOM
              ? () => setZoom((z) => Math.min(MAX_ZOOM, z * 1.5))
              : undefined
          }
        >
          <ZoomInIcon />
        </TransportButton>
      </div>

      <div className="tracks" ref={ref}>
        <div
          className="tracks-inner"
          style={{ width: LABEL_WIDTH + width + 16 }}
        >
          <div className="track">
            <div className="track-label" />
            <div
              className="ruler"
              style={{ width }}
              onPointerDown={rulerDown}
              onPointerMove={rulerMove}
              onPointerUp={rulerUp}
              onPointerCancel={rulerUp}
            >
              {ticks.map((s) => (
                <span key={s} className="tick" style={{ left: s * pps }}>
                  {`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}
                </span>
              ))}
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
                    pps={pps}
                    selected={rowSelected ? props.selection!.actionId : null}
                    onSelect={(actionId, at) => {
                      props.onSelect({ actorId: row.actorId, actionId });
                      props.onSeek(at);
                    }}
                    onMove={(actionId, at, mode) =>
                      props.onMoveAction(row.actorId, actionId, at, mode)
                    }
                  />
                </div>
              </div>
            );
          })}
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

interface Row {
  kind: ClipKind;
  actions: Action[];
  /** How long each walk walks before it gets to its last point. */
  walkTimes: Map<string, number>;
}

function ActionBlocks(props: {
  row: Row;
  duration: number;
  pps: number;
  selected: string | null;
  onSelect(actionId: string, t: number): void;
  onMove(actionId: string, t: number, mode: EditMode): void;
}) {
  const names = useNames();
  const drag = useRef<{
    pointer: number;
    id: string;
    x: number;
    t: number;
    moved: boolean;
  } | null>(null);
  const actions = sortedActions(props.row.actions);

  const down = (e: PointerEvent<HTMLButtonElement>, a: Action) => {
    e.stopPropagation();
    if (drag.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointer: e.pointerId,
      id: a.id,
      x: e.clientX,
      t: a.t,
      moved: false,
    };
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < TAP_SLOP) return;
    const t = snap(d.t + dx / props.pps);
    props.onMove(
      d.id,
      Math.min(Math.max(t, 0), props.duration),
      d.moved ? 'replace' : 'push',
    );
    d.moved = true;
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (d?.pointer !== e.pointerId) return;
    drag.current = null;
    if (!d.moved && e.type === 'pointerup') props.onSelect(d.id, d.t);
  };

  return actions.map((a, i) => {
    const end = Math.min(actions[i + 1]?.t ?? props.duration, props.duration);
    const color = CLIP_COLORS[a.clip];
    // A walk that gets to its last point stands still for the rest of the
    // block, which shows paler.
    const walk = props.row.walkTimes.get(a.id);
    const background =
      walk !== undefined && a.t + walk < end
        ? `linear-gradient(to right, ${color} ${walk * props.pps}px, ` +
          `color-mix(in srgb, ${color} 40%, var(--panel)) 0)`
        : color;
    return (
      <button
        key={a.id}
        type="button"
        className="action-block"
        aria-pressed={props.selected === a.id}
        style={{
          left: a.t * props.pps,
          width: Math.max((end - a.t) * props.pps - 2, 6),
          background,
          color: a.clip === 'idle' ? 'var(--text)' : 'var(--on-accent)',
        }}
        onPointerDown={(e) => down(e, a)}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={(e) => e.stopPropagation()}
      >
        {names.clip(props.row.kind, a.clip)}
      </button>
    );
  });
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
