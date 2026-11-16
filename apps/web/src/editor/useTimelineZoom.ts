// The zoom and the scroll of the timeline. Ctrl/Cmd + wheel, a pinch on a
// trackpad and two fingers on a touch screen zoom around the pointer, the zoom
// buttons zoom around the playhead, and the view follows the playhead when it
// goes out of sight.
import {
  type RefObject,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { anchoredScroll, zoomSteps } from './timelineMath.ts';

/** How much a pixel of wheel zooms. */
const WHEEL_ZOOM = 0.003;

interface Options {
  /** The element that scrolls, with the labels of the rows at its left. */
  ref: RefObject<HTMLElement | null>;
  /** The width of the labels, where the lanes start. */
  labelWidth: number;
  /** Pixels a second at zoom 1, where the whole timeline fits. */
  fit: number;
  maxZoom: number;
  /** The time of the playhead. */
  t: number;
}

export function useTimelineZoom({ ref, labelWidth, fit, maxZoom, t }: Options) {
  const [zoom, setZoom] = useState(1);
  const z = Math.min(zoom, maxZoom);
  const pps = fit * z;

  // Many wheel events can come before the next render, so the zoom and the
  // scroll that they lead to are kept here until then.
  const view = useRef({ zoom: z, scroll: null as number | null });
  // The zoom can also change without `zoomTo`, when a smaller `maxZoom` caps
  // it.
  useLayoutEffect(() => {
    view.current.zoom = z;
  }, [z]);

  /** Zooms to `next`, keeping the time `x` pixels into the lanes in place. */
  const zoomTo = (next: number, x?: number) => {
    const el = ref.current;
    if (!el) return;
    next = Math.min(Math.max(next, 1), maxZoom);
    const cur = view.current;
    if (Math.abs(next - cur.zoom) < 1e-9) return;
    const scroll = cur.scroll ?? el.scrollLeft;
    const visible = el.clientWidth - labelWidth;
    if (x === undefined) {
      // The playhead stays in place if it shows, or else the middle.
      const head = t * fit * cur.zoom - scroll;
      x = head >= 0 && head <= visible ? head : visible / 2;
    }
    x = Math.min(Math.max(x, 0), visible);
    cur.scroll = anchoredScroll(scroll, x, fit * cur.zoom, fit * next);
    cur.zoom = next;
    setZoom(next);
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || view.current.scroll === null) return;
    el.scrollLeft = view.current.scroll;
    view.current.scroll = null;
  }, [zoom, ref]);

  /** How far `clientX` is into the lanes. */
  const laneX = (clientX: number) =>
    clientX - (ref.current?.getBoundingClientRect().left ?? 0) - labelWidth;
  const pinch = useRef<{ d: number; zoom: number } | null>(null);
  const span = (e: TouchEvent) => {
    const [a, b] = [e.touches[0]!, e.touches[1]!];
    return {
      d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      x: (a.clientX + b.clientX) / 2,
    };
  };
  const onWheel = useEffectEvent((e: WheelEvent) => {
    // A pinch on a trackpad comes as a wheel with Ctrl.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const d = Math.min(Math.max(e.deltaY * unit, -100), 100);
    zoomTo(view.current.zoom * Math.exp(-d * WHEEL_ZOOM), laneX(e.clientX));
  });
  const onTouchStart = useEffectEvent((e: TouchEvent) => {
    pinch.current =
      e.touches.length === 2 ? { d: span(e).d, zoom: view.current.zoom } : null;
  });
  const onTouchMove = useEffectEvent((e: TouchEvent) => {
    const p = pinch.current;
    if (!p || e.touches.length !== 2) return;
    e.preventDefault();
    const s = span(e);
    if (p.d > 0) zoomTo((p.zoom * s.d) / p.d, laneX(s.x));
  });
  const onTouchEnd = useEffectEvent((e: TouchEvent) => {
    if (e.touches.length < 2) pinch.current = null;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // React adds wheel and touch listeners as passive, and a passive listener
    // can't stop the page from scrolling or zooming.
    const opts = { passive: false };
    const wheel = (e: WheelEvent) => onWheel(e);
    const start = (e: TouchEvent) => onTouchStart(e);
    const move = (e: TouchEvent) => onTouchMove(e);
    const end = (e: TouchEvent) => onTouchEnd(e);
    el.addEventListener('wheel', wheel, opts);
    el.addEventListener('touchstart', start, opts);
    el.addEventListener('touchmove', move, opts);
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [ref]);

  // When the playhead goes out of sight, such as while playing, the view
  // scrolls so that it is near the left edge.
  const follow = useEffectEvent(() => {
    const el = ref.current;
    if (!el || view.current.scroll !== null) return;
    const visible = el.clientWidth - labelWidth;
    const head = t * pps - el.scrollLeft;
    if (head < 0 || head > visible - 12)
      el.scrollLeft = Math.max(0, t * pps - visible * 0.1);
  });
  // Only a new time moves the view, not a new zoom.
  useLayoutEffect(() => follow(), [t]);

  const { in: zoomIn, out: zoomOut } = zoomSteps(z, maxZoom);
  return {
    pps,
    zoomIn: zoomIn === undefined ? undefined : () => zoomTo(zoomIn),
    zoomOut: zoomOut === undefined ? undefined : () => zoomTo(zoomOut),
    zoomFit: z > 1 + 1e-6 ? () => zoomTo(1) : undefined,
  };
}
