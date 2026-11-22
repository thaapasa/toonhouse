import type { Matrix, PartId } from '@toonhouse/model';
import type {
  ClipShape,
  DrawNode,
  VerticalGradient,
} from '@toonhouse/renderer';
import type { ReactNode } from 'react';

const matrix = (m: Matrix | undefined) =>
  m
    ? `matrix(${m.map((v) => Math.round(v * 10000) / 10000).join(' ')})`
    : undefined;

/**
 * The key of a layer in `PartSources`: the part id for the main layer, and
 * `part.layer` for the other layers.
 */
export const layerKey = (part: PartId, layer?: string) =>
  layer === undefined ? part : `${part}.${layer}`;

/** The id of the `<symbol>` of a layer of a rig part, made by `PartSymbols`. */
export const partId = (prefix: string, part: PartId, layer?: string) =>
  `${prefix}-${layerKey(part, layer)}`;

/**
 * The prefix of the part symbols of an actor in a drawing of several actors,
 * such as a scene. See the `actor` of a group node.
 */
export const actorPrefix = (prefix: string, actor: string) =>
  `${prefix}-${actor}`;

// The renderer wraps the lines with the widths of single letters, so kerning
// and ligatures are off. The contextual alternates stay on, since a font
// whose letters join needs them for the joins.
const TEXT_STYLE = {
  fontKerning: 'none',
  fontVariantLigatures: 'no-common-ligatures no-discretionary-ligatures',
  whiteSpace: 'pre',
} as const;

function clipShape(shape: ClipShape) {
  return shape.type === 'ellipse' ? (
    <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
  ) : (
    <path d={shape.d} />
  );
}

const hex = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16) / 255;

/**
 * The matrix of an SVG filter that multiplies each color by `tint`, a CSS hex
 * color. The filter works in sRGB, so that it multiplies the colors as they
 * are written.
 */
const tintMatrix = (tint: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => hex(tint, i).toFixed(4));
  return `${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`;
};

function gradient(id: string, fill: VerticalGradient) {
  return (
    <linearGradient id={id} x1={0} y1={0} x2={0} y2={1}>
      {fill.stops.map((s, i) => (
        <stop
          key={i}
          offset={s.at}
          stopColor={s.color}
          stopOpacity={s.opacity}
        />
      ))}
    </linearGradient>
  );
}

function render(node: DrawNode, prefix: string, key: string): ReactNode {
  switch (node.type) {
    case 'group': {
      const clipId = node.clip ? `${prefix}-clip-${key}` : undefined;
      const inner =
        node.actor === undefined ? prefix : actorPrefix(prefix, node.actor);
      const tintId = node.tint ? `${prefix}-tint-${key}` : undefined;
      const children = node.children.map((c, i) =>
        render(c, inner, `${key}-${i}`),
      );
      const clipped = clipId ? (
        <g clipPath={`url(#${clipId})`}>{children}</g>
      ) : (
        children
      );
      return (
        <g
          key={key}
          data-actor={node.actor}
          transform={matrix(node.transform)}
          opacity={node.opacity}
          style={
            node.shade === undefined
              ? undefined
              : { filter: `brightness(${node.shade})` }
          }
        >
          {node.clip && <clipPath id={clipId}>{clipShape(node.clip)}</clipPath>}
          {node.tint && (
            <filter id={tintId} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={tintMatrix(node.tint)} />
            </filter>
          )}
          {/* The tint has a group of its own, so that it doesn't replace the shade. */}
          {tintId ? <g filter={`url(#${tintId})`}>{clipped}</g> : clipped}
        </g>
      );
    }
    case 'part':
      return (
        <use
          key={key}
          href={`#${partId(prefix, node.part, node.layer)}`}
          width={node.width}
          height={node.height}
          transform={matrix(node.transform)}
        />
      );
    case 'path':
      return (
        <path
          key={key}
          d={node.d}
          fill={node.fill ?? 'none'}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
          strokeLinecap={node.lineCap}
          strokeLinejoin={node.lineJoin}
          pathLength={node.dash ? 1 : undefined}
          strokeDasharray={node.dash?.join(' ')}
        />
      );
    case 'ellipse':
      return (
        <ellipse
          key={key}
          cx={node.cx}
          cy={node.cy}
          rx={node.rx}
          ry={node.ry}
          fill={node.fill}
          opacity={node.opacity}
        />
      );
    case 'text':
      return (
        <text
          key={key}
          x={node.x}
          y={node.y}
          fontFamily={node.font}
          fontSize={node.size}
          fontWeight={node.bold ? 'bold' : undefined}
          fontStyle={node.italic ? 'italic' : undefined}
          fill={node.fill}
          textAnchor={node.anchor}
          style={TEXT_STYLE}
        >
          {node.text}
        </text>
      );
    case 'rect': {
      if (typeof node.fill === 'string') {
        return (
          <rect
            key={key}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            fill={node.fill}
          />
        );
      }
      const id = `${prefix}-fill-${key}`;
      return (
        <g key={key}>
          {gradient(id, node.fill)}
          <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            fill={`url(#${id})`}
          />
        </g>
      );
    }
  }
}

export interface DrawingProps {
  node: DrawNode;
  /**
   * The prefix of the part symbols, as given to `PartSymbols`. It also keeps
   * the clip path ids apart when a page has several drawings. The parts of
   * an actor in the drawing use `actorPrefix`.
   */
  prefix: string;
}

/** Draws renderer output as SVG elements, for use inside an `<svg>`. */
export function Drawing({ node, prefix }: DrawingProps) {
  return <>{render(node, prefix, 'n')}</>;
}
