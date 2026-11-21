// The scene at the current time, where the user edits it. Tap an actor or a
// bubble to select it and drag it to move it. While the user picks the points
// of a walk, a tap adds a point and a drag moves the box of one. With the
// bubble tool, a tap on an actor adds a bubble attached to it, and a tap
// elsewhere adds a free bubble.
//
// The user zooms and pans the stage with the mouse wheel, the wheel button, a
// trackpad or two fingers. See `stageView.ts`.
//
// The stage shows the view of the camera at the current time as a box. When
// the camera is selected, a drag on the background inside the box pans the
// camera, and a drag on a corner zooms it. The opposite corner stays in place,
// or the middle with Alt. Actors and bubbles inside the box still take taps
// and drags. While a camera move plays, the camera has no view of its own, so
// the box can't be changed.
import type { CameraView, Pt, Scene } from '@toonhouse/model';
import {
  actorStateAt,
  type Bounds,
  type BubbleAnchor,
  bubbleOffset,
  bubblePoint,
  cameraBounds,
  clamp,
  type SceneFrame,
} from '@toonhouse/renderer';
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { IconButton } from '../components/IconButton.tsx';
import { CameraFitIcon, ZoomFitIcon } from '../components/icons.tsx';
import { SceneDrawing } from '../components/SceneDrawing.tsx';
import { useI18n } from '../i18n/index.tsx';
import { type BackgroundAsset, CHARACTERS, PROPS } from '../library/index.ts';
import { type Corner, cornersOf, panCamera, zoomCamera } from './cameraEdit.ts';
import type { EditRun } from './history.ts';
import { released, TAP_SLOP } from './pointer.ts';
import { savedPoint } from './sceneEdit.ts';
import {
  bandSize,
  clampView,
  fitView,
  homeView,
  insideStage,
  moveView,
  stageArea,
  type StageView,
  viewRect,
  wheelAction,
} from './stageView.ts';
import { useSize } from './useSize.ts';

const PREFIX = 'stage';
/** The size of the box of a walk point on the screen, in CSS pixels. */
const POINT_BOX = 26;
/** Two taps on a bubble closer than this in milliseconds open its text. */
const DOUBLE_TAP = 400;
/** The radius of the handle of the tip of a tail, in CSS pixels. */
const TIP_HANDLE = 14;
/** How much a pixel of mouse wheel zooms. */
const WHEEL_ZOOM = 0.002;
/** How much a pixel of a pinch on a trackpad zooms. */
const PINCH_ZOOM = 0.01;
/** The size of a corner handle of the camera on the screen, in CSS pixels. */
const CORNER_BOX = 18;
/** How far from a corner of the camera a finger still grabs it, in CSS pixels. */
const CORNER_REACH = 24;

/** Where a new bubble goes: on an actor, or free at a point. */
export interface BubblePlace {
  at: Pt;
  /** The actor under the tap, with where it is and the top of its box. */
  attach: { actorId: string; anchor: BubbleAnchor; top: number } | null;
}

/** The walk whose points the user is picking. */
export interface WalkEdit {
  actorId: string;
  actionId: string;
}

interface Props {
  scene: Scene;
  bg: BackgroundAsset;
  /** The selected actor, if any. */
  selectedActor: string | null;
  /** The selected bubble, if any. */
  selectedBubble: string | null;
  /** The scene at `t`, which the editor computes once for each render. */
  frame: SceneFrame;
  /** Whether a tap adds a bubble. */
  bubbleTool: boolean;
  walk: WalkEdit | null;
  /** The walk point to show as picked, such as while the user edits it in the properties pane. */
  focusPoint: number | null;
  /** Selects an actor, or clears the selection with null. */
  onSelect(actorId: string | null): void;
  onSelectBubble(id: string): void;
  /** The user tapped a bubble twice, to change its text. */
  onEditBubbleText(id: string): void;
  onAddBubble(place: BubblePlace): void;
  /** Moves a bubble to `at`, an offset or a point as `Bubble.at` is given. */
  onMoveBubble(id: string, at: Pt, run: EditRun): void;
  /** Moves the tip of the tail of a bubble, given as `Bubble.tailTip`. */
  onMoveTail(id: string, tip: Pt, run: EditRun): void;
  /** Moves an actor by `d` from where it was when the drag started. */
  onMoveActor(actorId: string, d: Pt, run: EditRun): void;
  onAddPoint(at: Pt): void;
  onMovePoint(index: number, at: Pt, run: EditRun): void;
  /** Takes away the step of a drag that a pinch cancelled. */
  onRevert(run: EditRun): void;
  /** Whether the camera is selected, so that the user can change its view. */
  cameraSelected: boolean;
  /**
   * Whether a camera move plays at the current time. The camera then holds no
   * view of its own that the user could change.
   */
  cameraMoving: boolean;
  /**
   * The camera move or jump whose view the camera holds at the current time,
   * or null for the start view.
   */
  cameraEntry: string | null;
  onSelectCamera(): void;
  /** Changes the view of a camera move or jump, or the start view with null. */
  onCameraView(entry: string | null, view: CameraView, run: EditRun): void;
  /** The user touched the stage, so playback should stop. */
  onTouch(): void;
  /** The toolbar of the selection, placed next to the selected actor. */
  toolbar: ReactNode;
}

type Gesture =
  | {
      type: 'actor';
      id: string;
      start: Pt;
      from: Pt;
      /** Where the actor stood when the drag started. */
      ground: Pt;
      moved: boolean;
    }
  | { type: 'point'; index: number; start: Pt; moved: boolean }
  | {
      type: 'bubble';
      id: string;
      start: Pt;
      from: Pt;
      /** Where the bubble was in frame pixels when the drag started. */
      origin: Pt;
      anchor: BubbleAnchor | null;
      moved: boolean;
    }
  | {
      type: 'tail';
      id: string;
      start: Pt;
      anchor: BubbleAnchor | null;
      moved: boolean;
    }
  | {
      type: 'camera';
      start: Pt;
      from: Pt;
      /** The entry whose view the drag changes, from when the drag started. */
      entry: string | null;
      view: CameraView;
      moved: boolean;
    }
  | {
      type: 'corner';
      corner: Corner;
      start: Pt;
      entry: string | null;
      view: CameraView;
      moved: boolean;
    }
  | { type: 'tap'; start: Pt; onTap: (at: Pt) => void }
  /** A drag with the wheel button pans the view. */
  | { type: 'pan'; start: Pt; view: StageView };

/** Two fingers that zoom and pan the view. */
interface Pinch {
  ids: [number, number];
  /** The middle point of the fingers and how far apart they were at first. */
  mid: Pt;
  span: number;
  view: StageView;
}

const insideBox = (b: Bounds, p: Pt) =>
  p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;

const middle = (a: Pt, b: Pt): Pt => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export function EditorStage(props: Props) {
  const { scene, bg: asset, walk } = props;
  const bg = asset.background;
  const { tr } = useI18n();
  const [ref, size] = useSize<HTMLDivElement>();
  const [barRef, bar] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<{ pointer: number; g: Gesture } | null>(null);
  const lastTap = useRef<{ id: string; time: number } | null>(null);
  // The touches on the stage, in client pixels, for a pinch.
  const touches = useRef(new Map<number, Pt>());
  const pinch = useRef<Pinch | null>(null);

  const band = useMemo(() => bandSize(bg, [...CHARACTERS, ...PROPS]), [bg]);
  const area = stageArea(bg, band);
  // The view goes back home when another scene opens.
  const [saved, setSaved] = useState<{
    sceneId: string;
    view: StageView;
  } | null>(null);
  const stageView = clampView(
    area,
    saved?.sceneId === scene.id ? saved.view : homeView(area),
  );
  // Many wheel and pointer events can come before the next render, so the
  // view that they lead to is kept here until then.
  const liveView = useRef(stageView);
  useLayoutEffect(() => {
    liveView.current = stageView;
  });
  const changeView = (fn: (v: StageView) => StageView) => {
    const next = clampView(area, fn(liveView.current));
    liveView.current = next;
    setSaved({ sceneId: scene.id, view: next });
  };
  const home = homeView(area);
  const atHome =
    Math.abs(stageView.zoom - 1) < 1e-6 &&
    Math.abs(stageView.x - home.x) < 1e-3 &&
    Math.abs(stageView.y - home.y) < 1e-3;

  const { frame } = props;
  const { actors: placed, bubbles, camera } = frame;
  const cameraBox = cameraBounds(bg, camera);
  const cameraEditable = props.cameraSelected && !walk && !props.cameraMoving;
  const cameraHome = fitView(area, cameraBox);
  const atCamera =
    Math.abs(stageView.zoom - cameraHome.zoom) < 1e-6 &&
    Math.abs(stageView.x - cameraHome.x) < 1e-3 &&
    Math.abs(stageView.y - cameraHome.y) < 1e-3;
  const anchorOf = (actorId: string | undefined) =>
    actorId === undefined
      ? null
      : (frame.bubbleContext.anchors.get(actorId) ?? null);
  // The part of the frame coordinates that the stage shows.
  const view = viewRect(area, stageView);
  const { stage } = area;
  // Frame pixels for one CSS pixel.
  const unit = size.width > 0 ? view.width / size.width : 1;
  const selected = placed.find((p) => p.actor.id === props.selectedActor);
  const selectedBubble = bubbles.find(
    (b) => b.bubble.id === props.selectedBubble,
  );

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

  /** The point of the background frame under the pointer, not rounded. */
  const exactFrame = (e: { clientX: number; clientY: number }): Pt => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };
  /** The point of the background frame under the pointer. */
  const toFrame = (e: { clientX: number; clientY: number }): Pt =>
    savedPoint(exactFrame(e));
  const client = (e: { clientX: number; clientY: number }): Pt => ({
    x: e.clientX,
    y: e.clientY,
  });
  /** A point in client pixels, from the top left corner of the stage. */
  const local = (p: Pt): Pt => {
    const r = svgRef.current?.getBoundingClientRect();
    return r ? { x: p.x - r.left, y: p.y - r.top } : p;
  };
  const far = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) > TAP_SLOP;

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      touches.current.set(e.pointerId, client(e));
      // A second finger ends what the first one did and starts a pinch.
      if (touches.current.size === 2 && !pinch.current) {
        const [a, b] = [...touches.current.entries()];
        e.currentTarget.setPointerCapture(e.pointerId);
        // A move that the first finger made leaves no undo step.
        const first = gesture.current?.g;
        if (first && 'moved' in first && first.moved) props.onRevert(first);
        gesture.current = null;
        pinch.current = {
          ids: [a![0], b![0]],
          mid: middle(a![1], b![1]),
          span: Math.hypot(a![1].x - b![1].x, a![1].y - b![1].y),
          view: liveView.current,
        };
        return;
      }
    }
    // One finger at a time, and a third finger does nothing.
    if (gesture.current || pinch.current) return;
    props.onTouch();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.pointerType === 'mouse' && e.button === 1) {
      // The wheel button pans, and doesn't start the scrolling of the browser.
      e.preventDefault();
      gesture.current = {
        pointer: e.pointerId,
        g: { type: 'pan', start: client(e), view: liveView.current },
      };
      return;
    }
    const target = e.target instanceof Element ? e.target : null;
    const point = target?.closest('[data-point]');
    const actor = target?.closest('[data-actor]');
    const bubbleEl = target?.closest('[data-bubble]');
    const tailEl = target?.closest('[data-tail]');
    const cornerEl = target?.closest('[data-camera-corner]');
    const cameraTab = target?.closest('[data-camera-tab]');
    const bubble =
      bubbleEl &&
      bubbles.find((b) => b.bubble.id === bubbleEl.getAttribute('data-bubble'));
    let g: Gesture;
    if (props.bubbleTool) {
      const id = actor?.getAttribute('data-actor');
      const p = id ? placed.find((a) => a.actor.id === id) : undefined;
      const anchor = id ? anchorOf(id) : null;
      g = {
        type: 'tap',
        start: client(e),
        onTap: (at) =>
          props.onAddBubble({
            at,
            attach:
              p && anchor
                ? {
                    actorId: p.actor.id,
                    anchor,
                    top: p.box?.y ?? anchor.head.y,
                  }
                : null,
          }),
      };
    } else if (cameraEditable && cornerEl) {
      g = {
        type: 'corner',
        corner: Number(cornerEl.getAttribute('data-camera-corner')) as Corner,
        start: client(e),
        entry: props.cameraEntry,
        view: camera,
        moved: false,
      };
    } else if (!walk && cameraTab) {
      g = { type: 'tap', start: client(e), onTap: props.onSelectCamera };
    } else if (!walk && tailEl && selectedBubble) {
      g = {
        type: 'tail',
        id: selectedBubble.bubble.id,
        start: client(e),
        anchor: anchorOf(selectedBubble.bubble.actorId),
        moved: false,
      };
    } else if (!walk && bubble) {
      const { id } = bubble.bubble;
      const now = e.timeStamp;
      if (
        lastTap.current?.id === id &&
        now - lastTap.current.time < DOUBLE_TAP
      ) {
        lastTap.current = null;
        props.onEditBubbleText(id);
      } else {
        lastTap.current = { id, time: now };
        props.onSelectBubble(id);
      }
      const anchor = anchorOf(bubble.bubble.actorId);
      g = {
        type: 'bubble',
        id,
        start: client(e),
        from: toFrame(e),
        origin: bubblePoint(bubble.bubble.at, anchor),
        anchor,
        moved: false,
      };
    } else if (walk && point) {
      g = {
        type: 'point',
        index: Number(point.getAttribute('data-point')),
        start: client(e),
        moved: false,
      };
    } else if (walk) {
      g = {
        type: 'tap',
        start: client(e),
        onTap: (at) => props.onAddPoint(insideStage(stage, at)),
      };
    } else if (actor) {
      const id = actor.getAttribute('data-actor')!;
      props.onSelect(id);
      g = {
        type: 'actor',
        id,
        start: client(e),
        from: toFrame(e),
        ground: placed.find((p) => p.actor.id === id)?.state.at ?? {
          x: 0,
          y: 0,
        },
        moved: false,
      };
    } else if (cameraEditable && insideBox(cameraBox, exactFrame(e))) {
      // Actors and bubbles take the pointer first, so that a tap can select
      // them. A tap on the background clears the selection in `up`.
      g = {
        type: 'camera',
        start: client(e),
        from: exactFrame(e),
        entry: props.cameraEntry,
        view: camera,
        moved: false,
      };
    } else {
      g = { type: 'tap', start: client(e), onTap: () => props.onSelect(null) };
    }
    gesture.current = { pointer: e.pointerId, g };
  };

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (touches.current.has(e.pointerId))
      touches.current.set(e.pointerId, client(e));
    const p = pinch.current;
    if (p?.ids.includes(e.pointerId)) {
      const a = touches.current.get(p.ids[0]);
      const b = touches.current.get(p.ids[1]);
      if (!a || !b) return;
      const span = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = p.span > 0 ? span / p.span : 1;
      changeView(() =>
        moveView(
          area,
          p.view,
          local(p.mid),
          local(middle(a, b)),
          ratio,
          size.width,
        ),
      );
      return;
    }
    const current = gesture.current;
    if (current?.pointer !== e.pointerId) return;
    if (released(e)) return up(e);
    const g = current.g;
    if (g.type === 'tap') return;
    if (g.type === 'pan') {
      const view = g.view;
      changeView(() => moveView(area, view, g.start, client(e), 1, size.width));
      return;
    }
    if (!g.moved && !far(g.start, client(e))) return;
    const at = toFrame(e);
    g.moved = true;
    if (g.type === 'camera') {
      const p = exactFrame(e);
      props.onCameraView(
        g.entry,
        panCamera(bg, g.view, { x: p.x - g.from.x, y: p.y - g.from.y }),
        g,
      );
    } else if (g.type === 'corner') {
      props.onCameraView(
        g.entry,
        zoomCamera(bg, g.view, g.corner, exactFrame(e), e.altKey),
        g,
      );
    } else if (g.type === 'actor') {
      // From where the drag started, as each move redoes the whole drag. The
      // actor stays on the stage, so that the user can find it again.
      const to = insideStage(
        stage,
        { x: g.ground.x + at.x - g.from.x, y: g.ground.y + at.y - g.from.y },
        g.ground,
      );
      props.onMoveActor(
        g.id,
        { x: to.x - g.ground.x, y: to.y - g.ground.y },
        g,
      );
    } else if (g.type === 'bubble') {
      const p = {
        x: g.origin.x + at.x - g.from.x,
        y: g.origin.y + at.y - g.from.y,
      };
      props.onMoveBubble(g.id, savedPoint(bubbleOffset(p, g.anchor)), g);
    } else if (g.type === 'tail') {
      props.onMoveTail(g.id, savedPoint(bubbleOffset(at, g.anchor)), g);
    } else {
      props.onMovePoint(g.index, insideStage(stage, at), g);
    }
  };

  const up = (e: PointerEvent<SVGSVGElement>) => {
    touches.current.delete(e.pointerId);
    // The finger that stays after a pinch does nothing until it lifts.
    if (pinch.current?.ids.includes(e.pointerId)) pinch.current = null;
    const current = gesture.current;
    if (current?.pointer !== e.pointerId) return;
    gesture.current = null;
    const g = current.g;
    if (e.type !== 'pointerup' || far(g.start, client(e))) return;
    if (g.type === 'tap') g.onTap(toFrame(e));
    else if (g.type === 'camera' && !g.moved) props.onSelect(null);
  };

  const onWheel = useEffectEvent((e: WheelEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const action = wheelAction({
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      deltaMode: e.deltaMode,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      // Not in the standard, but all browsers but Firefox have it.
      wheelDeltaY: (e as { wheelDeltaY?: number }).wheelDeltaY,
    });
    if (action === 'pan') {
      const d = { x: -e.deltaX * unit, y: -e.deltaY * unit };
      changeView((v) => moveView(area, v, { x: 0, y: 0 }, d, 1, r.width));
    } else {
      const p = local(client(e));
      const d = clamp(e.deltaY * unit, -100, 100);
      const ratio = Math.exp(
        -d * (action === 'pinch' ? PINCH_ZOOM : WHEEL_ZOOM),
      );
      changeView((v) => moveView(area, v, p, p, ratio, r.width));
    }
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // React adds wheel listeners as passive, and a passive listener can't stop
    // the page from scrolling or zooming.
    const wheel = (e: WheelEvent) => onWheel(e);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [ref]);

  // The toolbar goes above the selected actor, or below it if there is no
  // room above, and stays inside the stage.
  const k = size.width / view.width;
  const box = selectedBubble?.box ?? selected?.box;
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
      style={
        { '--aspect': area.home.width / area.home.height } as CSSProperties
      }
    >
      {size.width > 0 && (
        <svg
          ref={svgRef}
          className={
            props.bubbleTool
              ? 'stage-svg adding'
              : cameraEditable
                ? 'stage-svg panning'
                : 'stage-svg'
          }
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
          onPointerDown={down}
          onMouseDown={(e) => {
            // Stops the scrolling that the wheel button starts in the browser.
            if (e.button === 1) e.preventDefault();
          }}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onLostPointerCapture={up}
        >
          <rect
            className="stage-band"
            x={stage.x}
            y={stage.y}
            width={stage.width}
            height={stage.height}
          />
          <SceneDrawing
            scene={scene}
            frame={frame}
            prefix={PREFIX}
            offstage={stage}
          />
          {bubbles.map((b) => (
            <rect
              key={b.bubble.id}
              data-bubble={b.bubble.id}
              className="bubble-hit"
              x={b.box.x}
              y={b.box.y}
              width={b.box.width}
              height={b.box.height}
            />
          ))}
          <rect
            className="frame-edge"
            width={bg.width}
            height={bg.height}
            strokeWidth={1.5 * unit}
          />
          <rect
            className={
              props.cameraSelected ? 'camera-edge selected' : 'camera-edge'
            }
            {...cameraBox}
            strokeWidth={(props.cameraSelected ? 3 : 2) * unit}
            strokeDasharray={
              props.cameraSelected && !cameraEditable
                ? `${10 * unit} ${8 * unit}`
                : undefined
            }
          />
          {!walk && (
            <g
              data-camera-tab
              className={
                props.cameraSelected ? 'camera-tab selected' : 'camera-tab'
              }
              transform={`translate(${cameraBox.x} ${cameraBox.y}) scale(${unit})`}
            >
              <title>{tr('editor.camera')}</title>
              <rect x={0} y={-30} width={40} height={30} rx={6} />
              <path
                d="M10 -20h14a2 2 0 0 1 2 2v2l5-3v12l-5-3v2a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2z"
                strokeWidth={1.8}
              />
            </g>
          )}
          {cameraEditable &&
            cornersOf(cameraBox).map((p, i) => (
              <g
                key={i}
                data-camera-corner={i}
                className="camera-corner"
                style={{ cursor: i % 2 ? 'nesw-resize' : 'nwse-resize' }}
              >
                <circle cx={p.x} cy={p.y} r={CORNER_REACH * unit} />
                <rect
                  x={p.x - (CORNER_BOX / 2) * unit}
                  y={p.y - (CORNER_BOX / 2) * unit}
                  width={CORNER_BOX * unit}
                  height={CORNER_BOX * unit}
                  rx={3 * unit}
                  strokeWidth={2 * unit}
                />
              </g>
            ))}
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
          {selectedBubble?.tip && (
            <circle
              data-tail
              className="tail-handle"
              cx={selectedBubble.tip.x}
              cy={selectedBubble.tip.y}
              r={TIP_HANDLE * unit}
              strokeWidth={2 * unit}
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
                  className={
                    i === props.focusPoint ? 'walk-point focused' : 'walk-point'
                  }
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
      <div className="stage-home">
        {!atHome && (
          <IconButton
            label="editor.stageHome"
            onClick={() => changeView(() => home)}
          >
            <ZoomFitIcon />
          </IconButton>
        )}
        {camera.zoom > 1 && !atCamera && (
          <IconButton
            label="editor.stageCamera"
            onClick={() => changeView(() => cameraHome)}
          >
            <CameraFitIcon />
          </IconButton>
        )}
      </div>
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
