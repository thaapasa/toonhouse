import type { Pt } from '@toonhouse/model';
import { type PointerEvent, useRef } from 'react';

export interface Handle {
  id: string;
  at: Pt;
  label: string;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  handles: readonly Handle[];
  selected: string | null;
  /** The size of one screen pixel in the units of the SVG. */
  px: number;
  /** The visible area. Dragging anywhere in it moves the selected handle. */
  box: Box;
  onSelect(id: string): void;
  /**
   * Starts a drag of a handle from the point `start`. The function it returns
   * gets the move from the start, in the units of the SVG.
   */
  onDragStart(id: string, start: Pt): (d: Pt) => void;
}

interface Drag {
  pointerId: number;
  start: Pt;
  move: (d: Pt) => void;
}

function toSvg(e: PointerEvent<SVGElement>): Pt | null {
  const svg = e.currentTarget.ownerSVGElement;
  const m = svg?.getScreenCTM()?.inverse();
  if (!m) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
  return { x: p.x, y: p.y };
}

/**
 * Points that the user can drag, drawn inside an SVG. Dragging moves a point
 * by the distance that the finger moves, so the finger can be anywhere and
 * doesn't have to cover the point.
 */
export function DragHandles(props: Props) {
  const { handles, selected, px, box } = props;
  const drag = useRef<Drag | null>(null);

  const begin = (e: PointerEvent<SVGElement>, id: string) => {
    const start = toSvg(e);
    if (!start) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      start,
      move: props.onDragStart(id, start),
    };
  };
  const move = (e: PointerEvent<SVGElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = toSvg(e);
    if (p) d.move({ x: p.x - d.start.x, y: p.y - d.start.y });
  };
  const end = (e: PointerEvent<SVGElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
  };
  const events = {
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
  };

  const current = handles.find((h) => h.id === selected);

  return (
    <g className="handles">
      <rect
        className="drag-area"
        {...box}
        onPointerDown={(e) => {
          if (selected !== null) begin(e, selected);
        }}
        {...events}
      />
      {current && (
        <g className="crosshair" strokeWidth={px}>
          <line
            x1={box.x}
            x2={box.x + box.width}
            y1={current.at.y}
            y2={current.at.y}
          />
          <line
            x1={current.at.x}
            x2={current.at.x}
            y1={box.y}
            y2={box.y + box.height}
          />
        </g>
      )}
      {handles.map((h) => (
        // The order stays the same when the selection changes. Moving an
        // element in the DOM would lose the pointer capture of a drag.
        <g
          key={h.id}
          className="handle"
          onPointerDown={(e) => {
            props.onSelect(h.id);
            begin(e, h.id);
          }}
          {...events}
        >
          <circle className="hit" cx={h.at.x} cy={h.at.y} r={14 * px} />
          <circle
            className="dot"
            cx={h.at.x}
            cy={h.at.y}
            r={6 * px}
            strokeWidth={2 * px}
          />
          <title>{h.label}</title>
        </g>
      ))}
      {current && (
        // The selected handle again, on top of the others where they overlap.
        <g
          className="handle selected"
          onPointerDown={(e) => begin(e, current.id)}
          {...events}
        >
          <circle
            className="hit"
            cx={current.at.x}
            cy={current.at.y}
            r={22 * px}
          />
          <circle
            className="dot"
            cx={current.at.x}
            cy={current.at.y}
            r={8 * px}
            strokeWidth={2 * px}
          />
        </g>
      )}
      {current && (
        <text
          className="handle-label"
          x={current.at.x + 14 * px}
          y={current.at.y - 12 * px}
          fontSize={12 * px}
          strokeWidth={3 * px}
        >
          {current.label}
        </text>
      )}
    </g>
  );
}
