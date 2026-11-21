import type {
  BackgroundFrame,
  Pt,
  RoleColors,
  RolePatterns,
} from '@toonhouse/model';
import {
  type Camera,
  clamp,
  clampCamera,
  drawScene,
  groundDepth,
  layerTransform,
  MAX_ZOOM,
  type SceneActor,
  wholeBackground,
} from '@toonhouse/renderer';
import {
  actorPrefix,
  Drawing,
  type PartSources,
  PartSymbols,
} from '@toonhouse/stage';
import {
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
} from 'react';

import type { BackgroundAsset } from '../backgrounds.ts';
import { useI18n } from '../i18n/index.tsx';
import { GroundIcon, MinusIcon, PlusIcon } from './icons.tsx';
import { useSize } from './Viewport.tsx';

/** A zoom button zooms by this factor. */
const ZOOM_STEP = Math.SQRT2;

/** An actor to put on the background, with the SVG text of its parts. */
export interface Guest {
  actor: SceneActor;
  parts: PartSources;
  colors: RoleColors;
  patterns: RolePatterns;
}

/** A character or a prop that the developer can put on the background. */
export interface GuestOption {
  id: string;
  label: string;
}

interface Props {
  asset: BackgroundAsset;
  frame: BackgroundFrame;
  camera: Camera;
  onCamera(camera: Camera): void;
  horizon: boolean;
  onHorizon(on: boolean): void;
  guests: readonly GuestOption[];
  guest: Guest | null;
  onGuest(id: string | null): void;
  /** Moves the ground point of the guest, in the pixels of the background. */
  onGuestMove(at: Pt): void;
}

interface Pointer {
  x: number;
  y: number;
}

/**
 * The background as the camera sees it, filling the stage. Drag to pan and
 * pinch to zoom, or use the buttons and the slider. Drag the guest to move
 * it on the ground layer.
 */
export function BackgroundView(props: Props) {
  const { asset, frame, horizon, guest } = props;
  const bg = asset.background;
  const { tr } = useI18n();
  const [ref, { width, height }] = useSize();
  const svgRef = useRef<SVGSVGElement>(null);
  const camera = clampCamera(bg, props.camera);
  // The camera of the latest move, which can come before the next render.
  const cameraRef = useRef(camera);
  useLayoutEffect(() => {
    cameraRef.current = camera;
  });
  const pointers = useRef(new Map<number, Pointer>());
  // The pointer that drags the guest, and where the guest is now, which can
  // be ahead of the latest render.
  const dragging = useRef<{ pointer: number; at: Pt } | null>(null);

  // Screen pixels for one pixel of the picture, which has the frame size.
  const k = Math.min(width / bg.width, height / bg.height) || 1;
  const prefix = `bg-${asset.id}`;
  const node = drawScene(bg, frame, camera, guest ? [guest.actor] : []);

  const set = (c: Camera) => {
    const next = clampCamera(bg, c);
    cameraRef.current = next;
    props.onCamera(next);
  };
  /**
   * Zooms to `zoom` so that the point of the ground layer under `at`, a
   * point on the screen relative to the picture, stays under it, or goes to
   * `to` if that is given.
   */
  const zoomAround = (zoom: number, at: Pointer, to: Pointer = at) => {
    const c = cameraRef.current;
    const z = clamp(zoom, 1, MAX_ZOOM);
    const left = c.x - bg.width / c.zoom / 2;
    const top = c.y - bg.height / c.zoom / 2;
    const fx = left + at.x / (k * c.zoom);
    const fy = top + at.y / (k * c.zoom);
    set({
      x: fx - to.x / (k * z) + bg.width / z / 2,
      y: fy - to.y / (k * z) + bg.height / z / 2,
      zoom: z,
    });
  };
  /** A point of the pointer relative to the top left of the picture. */
  const local = (e: { clientX: number; clientY: number }): Pointer => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: e.clientX - r.left - (r.width - k * bg.width) / 2,
      y: e.clientY - r.top - (r.height - k * bg.height) / 2,
    };
  };
  const middle = { x: (k * bg.width) / 2, y: (k * bg.height) / 2 };

  const down = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const onGuest =
      e.target instanceof Element && e.target.closest('[data-actor]');
    if (guest && onGuest && pointers.current.size === 0 && !dragging.current) {
      dragging.current = {
        pointer: e.pointerId,
        at: { x: guest.actor.x, y: guest.actor.y },
      };
    }
    pointers.current.set(e.pointerId, local(e));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const map = pointers.current;
    const drag = dragging.current;
    if (drag?.pointer === e.pointerId) {
      const before = map.get(e.pointerId);
      if (!before) return;
      const now = local(e);
      // Screen pixels for one pixel of the ground layer.
      const s = k * layerTransform(bg, cameraRef.current, groundDepth(bg))[0];
      drag.at = {
        x: drag.at.x + (now.x - before.x) / s,
        y: drag.at.y + (now.y - before.y) / s,
      };
      props.onGuestMove(drag.at);
      map.set(e.pointerId, now);
      return;
    }
    if (drag) return;
    const before = map.get(e.pointerId);
    if (!before) return;
    const now = local(e);
    if (map.size === 1) {
      const c = cameraRef.current;
      set({
        ...c,
        x: c.x - (now.x - before.x) / (k * c.zoom),
        y: c.y - (now.y - before.y) / (k * c.zoom),
      });
    } else {
      // Pinch with the first two fingers: the zoom follows the distance
      // between them, and the point between them stays under the fingers.
      const [a, b] = [...map.entries()];
      const other = a![0] === e.pointerId ? b![1] : a![1];
      const mid = (p: Pointer, q: Pointer) => ({
        x: (p.x + q.x) / 2,
        y: (p.y + q.y) / 2,
      });
      const dist = (p: Pointer, q: Pointer) =>
        Math.hypot(p.x - q.x, p.y - q.y) || 1;
      zoomAround(
        (cameraRef.current.zoom * dist(now, other)) / dist(before, other),
        mid(before, other),
        mid(now, other),
      );
    }
    map.set(e.pointerId, now);
  };
  const up = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (dragging.current?.pointer === e.pointerId) dragging.current = null;
  };

  // A wheel or a trackpad pinch zooms around the pointer. React adds wheel
  // listeners as passive, so they can't stop the page from zooming.
  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault();
    const at = local(e);
    zoomAround(cameraRef.current.zoom * Math.exp(-e.deltaY * 0.002), at);
  });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [width]);

  // The horizon of the perspective as it shows on the ground layer.
  const { perspective } = bg.ground;
  const g = layerTransform(bg, camera, groundDepth(bg));
  const lineY = perspective ? g[3] * perspective.horizon + g[5] : 0;
  const px = 1 / k;

  return (
    <div className="viewport background-viewport" ref={ref}>
      <div
        className="toolbar toolbar-left"
        role="toolbar"
        aria-label={tr('viewport')}
      >
        {perspective && (
          <button
            type="button"
            aria-pressed={horizon}
            title={tr('horizonHint')}
            onClick={() => props.onHorizon(!horizon)}
          >
            <GroundIcon />
            {tr('horizon')}
          </button>
        )}
        <label className="toolbar-select" title={tr('guestHint')}>
          <span>{tr('guest')}</span>
          <select
            value={guest?.actor.id ?? ''}
            onChange={(e) => props.onGuest(e.target.value || null)}
          >
            <option value="">{tr('guestNone')}</option>
            {props.guests.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="toolbar toolbar-right camera-bar"
        role="toolbar"
        aria-label={tr('camera')}
      >
        <button
          type="button"
          className="icon"
          aria-label={tr('zoomOut')}
          title={tr('zoomOut')}
          disabled={camera.zoom <= 1}
          onClick={() => zoomAround(camera.zoom / ZOOM_STEP, middle)}
        >
          <MinusIcon />
        </button>
        <input
          className="zoom-slider"
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={camera.zoom}
          aria-label={tr('zoom')}
          onChange={(e) => zoomAround(Number(e.target.value), middle)}
        />
        <button
          type="button"
          className="icon"
          aria-label={tr('zoomIn')}
          title={tr('zoomIn')}
          disabled={camera.zoom >= MAX_ZOOM}
          onClick={() => zoomAround(camera.zoom * ZOOM_STEP, middle)}
        >
          <PlusIcon />
        </button>
        <span className="zoom">{Math.round(camera.zoom * 100)}%</span>
        <button
          type="button"
          title={tr('wholeBackgroundHint')}
          disabled={camera.zoom === 1}
          onClick={() => set(wholeBackground(bg))}
        >
          {tr('wholeBackground')}
        </button>
      </div>

      {width > 0 && (
        <svg
          ref={svgRef}
          className="stage background-stage"
          viewBox={`0 0 ${bg.width} ${bg.height}`}
          aria-label={tr('cameraHint')}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <PartSymbols prefix={prefix} sources={asset.sources} />
          {guest && (
            <PartSymbols
              prefix={actorPrefix(prefix, guest.actor.id)}
              sources={guest.parts}
              colors={guest.colors}
              patterns={guest.patterns}
            />
          )}
          <clipPath id={`${prefix}-frame`}>
            <rect width={bg.width} height={bg.height} />
          </clipPath>
          <g clipPath={`url(#${prefix}-frame)`}>
            <Drawing node={node} prefix={prefix} />
            {perspective && horizon && (
              <line
                className="background-horizon"
                x1={0}
                x2={bg.width}
                y1={lineY}
                y2={lineY}
                strokeWidth={2 * px}
                strokeDasharray={`${8 * px} ${6 * px}`}
              />
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
