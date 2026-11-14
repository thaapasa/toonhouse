import type { PartId, Pt, Rig } from '@toonhouse/model';
import { type CharacterDrawing, partBounds } from '@toonhouse/renderer';
import {
  Drawing,
  partId,
  type PartSources,
  PartSymbols,
} from '@toonhouse/stage';

import { useI18n } from '../i18n/index.tsx';
import {
  type AngleField,
  angleOf,
  attachmentAt,
  attachments,
  pieceLayers,
  pieceOf,
} from '../rigEdit.ts';
import { useRigNames } from '../rigNames.ts';
import { DragHandles } from './DragHandles.tsx';
import { BackIcon, MinusIcon, PlusIcon } from './icons.tsx';
import { useSize, ZOOMS } from './Viewport.tsx';

/** The share of the viewport that the piece fills at 100 %. */
const FILL = 0.8;
/** The box around the character in the preview, in sheet pixels. */
const PREVIEW_BOX = '-450 -940 900 1000';

const RAD = Math.PI / 180;
const unit = (deg: number): Pt => ({
  x: Math.cos(deg * RAD),
  y: Math.sin(deg * RAD),
});

interface Props {
  prefix: string;
  parts: PartSources;
  rig: Rig;
  part: PartId;
  /** The rest angles of the piece. */
  angles: readonly AngleField[];
  /** The pivot, or the angle that the view edits. */
  mode: AngleField | null;
  onMode(mode: AngleField | null): void;
  /** The whole character, for the preview. */
  drawing: CharacterDrawing;
  zoom: number;
  onZoom(zoom: number): void;
  onBack(): void;
  onPivot(p: Pt): void;
  onAngle(field: AngleField, deg: number): void;
}

/**
 * One piece of the rig alone, with its layers, in its own pixels. It edits the pivot of the
 * piece, or the rest angle of a piece that has one. The attachment points on
 * the piece show where the other pieces join it.
 */
export function PieceView(props: Props) {
  const { prefix, parts, rig, part, zoom, mode } = props;
  const { tr } = useI18n();
  const names = useRigNames();
  const [ref, { width, height }] = useSize();
  const piece = pieceOf(rig, part);
  const { pivot } = piece;
  const zoomIndex = ZOOMS.indexOf(zoom as (typeof ZOOMS)[number]);

  // To edit an angle, the view turns around the pivot, so it fits the circle
  // that the piece can turn in.
  const radius = Math.max(
    ...[0, piece.width].flatMap((x) =>
      [0, piece.height].map((y) => Math.hypot(x - pivot.x, y - pivot.y)),
    ),
  );
  const fitW = mode ? 2 * radius : piece.width;
  const fitH = mode ? 2 * radius : piece.height;
  const scale =
    zoom * Math.min((width * FILL) / fitW, (height * FILL) / fitH) || 1;
  const px = 1 / scale;
  const middle = mode ? pivot : { x: piece.width / 2, y: piece.height / 2 };
  const box = {
    x: middle.x - width / scale / 2,
    y: middle.y - height / scale / 2,
    width: width / scale,
    height: height / scale,
  };
  const points = attachments(rig).filter((a) => a.piece === part);
  // A prop can be any size, so the preview fits around it.
  const bounds = rig.kind === 'prop' ? partBounds(props.drawing.node) : null;
  const previewBox = bounds
    ? `${bounds.x - 20} ${bounds.y - 20} ${bounds.width + 40} ${bounds.height + 40}`
    : PREVIEW_BOX;

  const pieceNodes = (
    <>
      <rect
        className="piece-bounds"
        width={piece.width}
        height={piece.height}
        strokeWidth={px}
        strokeDasharray={`${4 * px} ${4 * px}`}
      />
      {pieceLayers(rig, part).map((layer) => (
        <use
          key={layer ?? ''}
          href={`#${partId(prefix, part, layer)}`}
          width={piece.width}
          height={piece.height}
        />
      ))}
    </>
  );

  let content;
  if (!mode) {
    content = (
      <>
        {pieceNodes}
        {points.map((a) => {
          const p = attachmentAt(rig, a);
          return (
            <g key={a.joint} className="attach-point">
              <circle cx={p.x} cy={p.y} r={5 * px} strokeWidth={1.5 * px} />
              <text
                x={p.x + 9 * px}
                y={p.y + 4 * px}
                fontSize={11 * px}
                strokeWidth={3 * px}
              >
                {names.joint(a.joint)}
              </text>
            </g>
          );
        })}
        <DragHandles
          handles={[{ id: part, at: pivot, label: tr('pivot') }]}
          selected={part}
          px={px}
          box={box}
          onSelect={() => {}}
          onDragStart={() => {
            const start = pivot;
            return (d) => props.onPivot({ x: start.x + d.x, y: start.y + d.y });
          }}
        />
      </>
    );
  } else {
    // The reference is fixed, and the piece turns by its angle against it,
    // as the renderer does.
    const angle = angleOf(rig, mode);
    const turn = mode.viewTurn + angle;
    const knob = {
      x: pivot.x + 0.75 * radius * unit(turn).x,
      y: pivot.y + 0.75 * radius * unit(turn).y,
    };
    const toward = unit(mode.reference === 'arm' ? mode.viewTurn : -90);
    // The arm comes in to the pivot, and the up direction goes out from it.
    const sign = mode.reference === 'arm' ? -1 : 1;
    const refEnd = {
      x: pivot.x + sign * radius * toward.x,
      y: pivot.y + sign * radius * toward.y,
    };
    content = (
      <>
        <g transform={`rotate(${turn} ${pivot.x} ${pivot.y})`}>{pieceNodes}</g>
        <g className={`reference reference-${mode.reference}`}>
          <line
            x1={refEnd.x}
            y1={refEnd.y}
            x2={pivot.x}
            y2={pivot.y}
            strokeWidth={(mode.reference === 'arm' ? 16 : 2) * px}
            strokeDasharray={
              mode.reference === 'arm' ? undefined : `${6 * px} ${5 * px}`
            }
          />
          <text
            x={refEnd.x + 10 * px}
            y={refEnd.y + 4 * px}
            fontSize={12 * px}
            strokeWidth={3 * px}
          >
            {tr(mode.reference === 'arm' ? 'referenceArm' : 'referenceBody')}
          </text>
        </g>
        <circle
          className="turn-ring"
          cx={pivot.x}
          cy={pivot.y}
          r={0.75 * radius}
          strokeWidth={px}
          strokeDasharray={`${4 * px} ${4 * px}`}
        />
        <circle className="pivot-mark" cx={pivot.x} cy={pivot.y} r={4 * px} />
        <DragHandles
          handles={[{ id: 'turn', at: knob, label: `${angle}°` }]}
          selected="turn"
          px={px}
          box={box}
          onSelect={() => {}}
          onDragStart={(_, start) => {
            const from = Math.atan2(start.y - pivot.y, start.x - pivot.x);
            const field = mode;
            return (d) => {
              const to = Math.atan2(
                start.y + d.y - pivot.y,
                start.x + d.x - pivot.x,
              );
              props.onAngle(field, angle + (to - from) / RAD);
            };
          }}
        />
      </>
    );
  }

  return (
    <div className="viewport" ref={ref}>
      <div className="toolbar toolbar-left">
        <button
          type="button"
          title={tr(rig.kind === 'prop' ? 'backPropHint' : 'backHint')}
          onClick={props.onBack}
        >
          <BackIcon />
          {tr(rig.kind === 'prop' ? 'backProp' : 'back')}
        </button>
        <span className="toolbar-title">{names.part(part)}</span>
        {props.angles.length > 0 && (
          <div className="segmented" role="group" aria-label={tr('editWhat')}>
            <button
              type="button"
              aria-pressed={!mode}
              onClick={() => props.onMode(null)}
            >
              {tr('pivot')}
            </button>
            {props.angles.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={mode?.id === f.id}
                onClick={() => props.onMode(f)}
              >
                {tr(f.label)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="toolbar toolbar-right">
        <button
          type="button"
          className="icon"
          aria-label={tr('zoomOut')}
          title={tr('zoomOut')}
          disabled={zoomIndex <= 0}
          onClick={() => props.onZoom(ZOOMS[zoomIndex - 1]!)}
        >
          <MinusIcon />
        </button>
        <span className="zoom">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="icon"
          aria-label={tr('zoomIn')}
          title={tr('zoomIn')}
          disabled={zoomIndex >= ZOOMS.length - 1}
          onClick={() => props.onZoom(ZOOMS[zoomIndex + 1]!)}
        >
          <PlusIcon />
        </button>
      </div>

      {width > 0 && (
        <svg
          className="stage editing"
          viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          aria-hidden="true"
        >
          <PartSymbols prefix={prefix} sources={parts} />
          {content}
        </svg>
      )}

      <div className="preview" aria-label={tr('preview')}>
        <svg viewBox={previewBox} aria-hidden="true">
          <PartSymbols prefix={`${prefix}-preview`} sources={parts} />
          <Drawing node={props.drawing.node} prefix={`${prefix}-preview`} />
        </svg>
      </div>
    </div>
  );
}
