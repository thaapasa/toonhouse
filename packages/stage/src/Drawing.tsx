import type { Matrix, PartId } from '@toonhouse/model';
import type { ClipShape, DrawNode } from '@toonhouse/renderer';
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

function clipShape(shape: ClipShape) {
  return shape.type === 'ellipse' ? (
    <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
  ) : (
    <path d={shape.d} />
  );
}

function render(node: DrawNode, prefix: string, key: string): ReactNode {
  switch (node.type) {
    case 'group': {
      const clipId = node.clip ? `${prefix}-clip-${key}` : undefined;
      const children = node.children.map((c, i) =>
        render(c, prefix, `${key}-${i}`),
      );
      return (
        <g
          key={key}
          transform={matrix(node.transform)}
          style={
            node.shade === undefined
              ? undefined
              : { filter: `brightness(${node.shade})` }
          }
        >
          {node.clip && <clipPath id={clipId}>{clipShape(node.clip)}</clipPath>}
          {clipId ? <g clipPath={`url(#${clipId})`}>{children}</g> : children}
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
    case 'rect':
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
}

export interface DrawingProps {
  node: DrawNode;
  /**
   * The prefix of the part symbols, as given to `PartSymbols`. It also keeps
   * the clip path ids apart when a page has several drawings.
   */
  prefix: string;
}

/** Draws renderer output as SVG elements, for use inside an `<svg>`. */
export function Drawing({ node, prefix }: DrawingProps) {
  return <>{render(node, prefix, 'n')}</>;
}
