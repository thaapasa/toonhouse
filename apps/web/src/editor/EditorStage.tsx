// The scene at the current time, where the user edits it. Tap an actor to select it and drag it to move it. While the user picks
// the points of a walk, a tap adds a point and a drag moves the box of one.
import type { Pt, Scene } from '@toonhouse/model';
import { actorStateAt } from '@toonhouse/renderer';
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useRef,
} from 'react';

import { SceneDrawing } from '../components/SceneDrawing.tsx';
import { useI18n } from '../i18n/index.tsx';
import type { BackgroundAsset } from './library.ts';
import { placeActors } from './placement.ts';
import { released } from './pointer.ts';
import { roundPoint } from './sceneEdit.ts';
import type { EditMode } from './useCartoonContent.ts';
import { useSize } from './useSize.ts';

const PREFIX = 'stage';
/** The size of the box of a walk point on the screen, in CSS pixels. */
const POINT_BOX = 26;
/** A pointer that moves less than this, in CSS pixels, taps. */
const TAP_SLOP = 8;
/**
 * How far the stage shows past each edge of the frame, as parts of the width
 * and the height of the frame.
 */
const OFFSTAGE = { x: 0.12, y: 0.08 };

/** The walk whose points the user is picking. */
export interface WalkEdit {
  actorId: string;
  actionId: string;
}

interface Props {
  scene: Scene;
  bg: BackgroundAsset;
  t: number;
  /** The selected actor, if any. */
  selectedActor: string | null;
  walk: WalkEdit | null;
  /** Selects an actor, or clears the selection with null. */
  onSelect(actorId: string | null): void;
  /** Moves an actor by `d` from where it was when the drag started. */
  onMoveActor(actorId: string, d: Pt, mode: EditMode): void;
  onAddPoint(at: Pt): void;
  onMovePoint(index: number, at: Pt, mode: EditMode): void;
  /** The user touched the stage, so playback should stop. */
  onTouch(): void;
  /** The toolbar of the selection, placed next to the selected actor. */
  toolbar: ReactNode;
}

type Gesture =
  | { type: 'actor'; id: string; start: Pt; from: Pt; moved: boolean }
  | { type: 'point'; index: number; start: Pt; moved: boolean }
  | { type: 'tap'; start: Pt; onTap: (at: Pt) => void };

export function EditorStage(props: Props) {
  const { scene, bg: asset, t, walk } = props;
  const bg = asset.background;
  const { tr } = useI18n();
  const [ref, size] = useSize<HTMLDivElement>();
  const [barRef, bar] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<{ pointer: number; g: Gesture } | null>(null);

  const placed = placeActors(scene, bg, t);
  // The part of the frame coordinates that the stage shows.
  const view = {
    x: -bg.width * OFFSTAGE.x,
    y: -bg.height * OFFSTAGE.y,
    width: bg.width * (1 + 2 * OFFSTAGE.x),
    height: bg.height * (1 + 2 * OFFSTAGE.y),
  };
  // Frame pixels for one CSS pixel.
  const unit = size.width > 0 ? view.width / size.width : 1;
  const selected = placed.find((p) => p.actor.id === props.selectedActor);

  // The walk being picked starts where the actor is when the walk starts.
  const walkActor = walk && placed.find((p) => p.actor.id === walk.actorId);
  const walkAction = walkActor?.actor.actions.find(
    (a) => a.id === walk?.actionId,
  );
  const walkStart =
    walkActor &&
    walkAction &&
    actorStateAt(walkActor.actor, walkActor.kind, bg, walkAction.t).at;
  const walkPoints = walkStart ? [walkStart, ...(walkAction.path ?? [])] : [];

  /** The point of the background frame under the pointer. */
  const toFrame = (e: { clientX: number; clientY: number }): Pt => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return roundPoint(p);
  };
  const client = (e: PointerEvent): Pt => ({ x: e.clientX, y: e.clientY });
  const far = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) > TAP_SLOP;

  const down = (e: PointerEvent<SVGSVGElement>) => {
    // One finger at a time. A second finger does nothing.
    if (gesture.current) return;
    props.onTouch();
    e.currentTarget.setPointerCapture(e.pointerId);
    const target = e.target instanceof Element ? e.target : null;
    const point = target?.closest('[data-point]');
    const actor = target?.closest('[data-actor]');
    let g: Gesture;
    if (walk && point) {
      g = {
        type: 'point',
        index: Number(point.getAttribute('data-point')),
        start: client(e),
        moved: false,
      };
    } else if (walk) {
      g = { type: 'tap', start: client(e), onTap: props.onAddPoint };
    } else if (actor) {
      const id = actor.getAttribute('data-actor')!;
      props.onSelect(id);
      g = {
        type: 'actor',
        id,
        start: client(e),
        from: toFrame(e),
        moved: false,
      };
    } else {
      g = { type: 'tap', start: client(e), onTap: () => props.onSelect(null) };
    }
    gesture.current = { pointer: e.pointerId, g };
  };

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current;
    if (current?.pointer !== e.pointerId) return;
    if (released(e)) return up(e);
    const g = current.g;
    if (g.type === 'tap') return;
    if (!g.moved && !far(g.start, client(e))) return;
    const at = toFrame(e);
    const mode = g.moved ? 'replace' : 'push';
    g.moved = true;
    if (g.type === 'actor') {
      // From where the drag started, as each move redoes the whole drag.
      props.onMoveActor(g.id, { x: at.x - g.from.x, y: at.y - g.from.y }, mode);
    } else {
      props.onMovePoint(g.index, at, mode);
    }
  };

  const up = (e: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current;
    if (current?.pointer !== e.pointerId) return;
    gesture.current = null;
    const g = current.g;
    if (g.type === 'tap' && e.type === 'pointerup' && !far(g.start, client(e)))
      g.onTap(toFrame(e));
  };

  // The toolbar goes above the selected actor, or below it if there is no
  // room above, and stays inside the stage.
  const k = size.width / view.width;
  const box = selected?.box;
  let barStyle: { left: number; top: number } | null = null;
  if (box && bar.width > 0) {
    const gap = 10;
    const left = Math.min(
      Math.max((box.x - view.x + box.width / 2) * k - bar.width / 2, 8),
      size.width - bar.width - 8,
    );
    const above = (box.y - view.y) * k - bar.height - gap;
    const below = (box.y - view.y + box.height) * k + gap;
    const top =
      above >= 8 ? above : below + bar.height <= size.height - 8 ? below : 8;
    barStyle = { left, top };
  }

  return (
    <div
      className="stage offstage"
      ref={ref}
      aria-label={tr('editor.stage')}
      style={{ '--aspect': view.width / view.height } as CSSProperties}
    >
      {size.width > 0 && (
        <svg
          ref={svgRef}
          className="stage-svg"
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onLostPointerCapture={up}
        >
          <SceneDrawing
            scene={scene}
            bg={asset}
            t={t}
            placed={placed}
            prefix={PREFIX}
            offstage
          />
          <rect
            className="frame-edge"
            width={bg.width}
            height={bg.height}
            strokeWidth={1.5 * unit}
          />
          {box && (
            <rect
              className="selection-box"
              x={box.x - 6 * unit}
              y={box.y - 6 * unit}
              width={box.width + 12 * unit}
              height={box.height + 12 * unit}
              rx={6 * unit}
              strokeWidth={2 * unit}
              strokeDasharray={`${6 * unit} ${5 * unit}`}
            />
          )}
          {walkPoints.length > 0 && (
            <g className="walk-path">
              <polyline
                points={walkPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                strokeWidth={3 * unit}
                strokeDasharray={`${8 * unit} ${7 * unit}`}
              />
              {walkPoints.slice(1).map((p, i) => (
                <rect
                  key={i}
                  data-point={i}
                  className="walk-point"
                  x={p.x - (POINT_BOX / 2) * unit}
                  y={p.y - (POINT_BOX / 2) * unit}
                  width={POINT_BOX * unit}
                  height={POINT_BOX * unit}
                  rx={4 * unit}
                  strokeWidth={2 * unit}
                />
              ))}
            </g>
          )}
        </svg>
      )}
      {/* Always there, so that its size is measured when it gets content. */}
      <div
        ref={barRef}
        className="stage-toolbar"
        hidden={!props.toolbar}
        style={
          barStyle ?? { left: '50%', top: 8, transform: 'translateX(-50%)' }
        }
      >
        {props.toolbar}
      </div>
    </div>
  );
}
