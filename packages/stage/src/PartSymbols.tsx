import type { RoleColors } from '@toonhouse/model';
import { useMemo } from 'react';

/** The SVG text of each layer of the rig parts, by `layerKey`. */
export type PartSources = Record<string, string>;

interface ParsedPart {
  id: string;
  viewBox: string;
  content: string;
}

const ROLE_CLASS = /^c-(.+)$/;

/**
 * Paints each path that has the class of a role in `colors`. A path has a
 * fill or a stroke, and the color goes to the one that it has.
 */
function recolor(svg: Element, colors: RoleColors) {
  for (const el of svg.querySelectorAll('[class]')) {
    const role = [...el.classList]
      .map((c) => ROLE_CLASS.exec(c)?.[1])
      .find((r) => r !== undefined && colors[r] !== undefined);
    if (role === undefined) continue;
    const color = colors[role]!;
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none') el.setAttribute('stroke', color);
    if (el.getAttribute('fill') !== 'none') el.setAttribute('fill', color);
  }
}

function parse(
  prefix: string,
  sources: PartSources,
  colors: RoleColors | undefined,
): ParsedPart[] {
  const parser = new DOMParser();
  return Object.entries(sources).map(([key, text]) => {
    const svg = parser.parseFromString(text, 'image/svg+xml').documentElement;
    if (colors) recolor(svg, colors);
    return {
      id: `${prefix}-${key}`,
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
}

/** Defines the rig parts as `<symbol>`s, for use inside an `<svg>`. */
export function PartSymbols({ prefix, sources, colors }: PartSymbolsProps) {
  const parts = useMemo(
    () => parse(prefix, sources, colors),
    [prefix, sources, colors],
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
