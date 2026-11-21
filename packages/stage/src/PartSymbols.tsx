import type { RoleColors, RolePatterns } from '@toonhouse/model';
import { useMemo } from 'react';

import { patternTile } from './patterns.ts';

/** The SVG text of each layer of the rig parts, by `layerKey`. */
export type PartSources = Record<string, string>;

interface ParsedPart {
  id: string;
  viewBox: string;
  content: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ROLE_CLASS = /^c-(.+)$/;

const roleOf = (el: Element, has: (role: string) => boolean) =>
  [...el.classList]
    .map((c) => ROLE_CLASS.exec(c)?.[1])
    .find((r) => r !== undefined && has(r));

/**
 * Paints each path that has the class of a role in `colors`. A path has a
 * fill or a stroke, and the color goes to the one that it has.
 */
function recolor(svg: Element, colors: RoleColors) {
  for (const el of svg.querySelectorAll('[class]')) {
    const role = roleOf(el, (r) => colors[r] !== undefined);
    if (role === undefined) continue;
    const color = colors[role]!;
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none') el.setAttribute('stroke', color);
    if (el.getAttribute('fill') !== 'none') el.setAttribute('fill', color);
  }
}

/**
 * Draws a pattern over each filled path of a role in `patterns`: a copy of
 * the path, filled with a `<pattern>` in the pixels of the part, right after
 * the path, so that the lines drawn after it stay on top. `id` keeps the
 * pattern ids of the layers apart.
 */
function addPatterns(svg: Element, patterns: RolePatterns, id: string) {
  const doc = svg.ownerDocument;
  const made = new Set<string>();
  for (const el of [...svg.querySelectorAll('[class]')]) {
    const role = roleOf(el, (r) => patterns[r] !== undefined);
    if (role === undefined || el.getAttribute('fill') === 'none') continue;
    const pattern = patterns[role]!;
    const patternId = `${id}-pattern-${role}`;
    if (!made.has(role)) {
      made.add(role);
      const tile = patternTile(pattern.kind);
      const p = doc.createElementNS(SVG_NS, 'pattern');
      p.setAttribute('id', patternId);
      p.setAttribute('patternUnits', 'userSpaceOnUse');
      p.setAttribute('width', String(tile.size));
      p.setAttribute('height', String(tile.size));
      p.setAttribute(
        'patternTransform',
        `rotate(${tile.turn}) scale(${pattern.scale ?? 1})`,
      );
      const layers = [
        { d: tile.d, fill: pattern.color },
        ...(tile.accent
          ? [{ d: tile.accent, fill: pattern.accent ?? pattern.color }]
          : []),
      ];
      for (const layer of layers) {
        const shapes = doc.createElementNS(SVG_NS, 'path');
        shapes.setAttribute('d', layer.d);
        shapes.setAttribute('fill', layer.fill);
        p.append(shapes);
      }
      svg.prepend(p);
    }
    const over = el.cloneNode() as Element;
    over.removeAttribute('class');
    over.setAttribute('fill', `url(#${patternId})`);
    el.after(over);
  }
}

function parse(
  prefix: string,
  sources: PartSources,
  colors: RoleColors | undefined,
  patterns: RolePatterns | undefined,
): ParsedPart[] {
  const parser = new DOMParser();
  return Object.entries(sources).map(([key, text]) => {
    const svg = parser.parseFromString(text, 'image/svg+xml').documentElement;
    const id = `${prefix}-${key}`;
    if (colors) recolor(svg, colors);
    if (patterns) addPatterns(svg, patterns, id);
    return {
      id,
      viewBox: svg.getAttribute('viewBox') ?? '',
      content: svg.innerHTML,
    };
  });
}

export interface PartSymbolsProps {
  prefix: string;
  /** The SVG text of each layer. The files come from the repo, not from users. */
  sources: PartSources;
  /** The colors of the color roles, if not the colors of the drawings. */
  colors?: RoleColors;
  /** Patterns to draw over the color roles, such as stars on a robe. */
  patterns?: RolePatterns;
}

/** Defines the rig parts as `<symbol>`s, for use inside an `<svg>`. */
export function PartSymbols({
  prefix,
  sources,
  colors,
  patterns,
}: PartSymbolsProps) {
  const parts = useMemo(
    () => parse(prefix, sources, colors, patterns),
    [prefix, sources, colors, patterns],
  );
  return (
    <defs>
      {parts.map((p) => (
        <symbol
          key={p.id}
          id={p.id}
          viewBox={p.viewBox}
          dangerouslySetInnerHTML={{ __html: p.content }}
        />
      ))}
    </defs>
  );
}
