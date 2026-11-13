import type { PartId } from '@toonhouse/model';
import { useMemo } from 'react';

import { partId } from './Drawing.tsx';

export type PartSources = Partial<Record<PartId, string>>;

interface ParsedPart {
  id: string;
  viewBox: string;
  content: string;
}

function parse(prefix: string, sources: PartSources): ParsedPart[] {
  const parser = new DOMParser();
  return Object.entries(sources).map(([part, text]) => {
    const svg = parser.parseFromString(text, 'image/svg+xml').documentElement;
    return {
      id: partId(prefix, part as PartId),
      viewBox: svg.getAttribute('viewBox') ?? '',
      content: svg.innerHTML,
    };
  });
}

export interface PartSymbolsProps {
  prefix: string;
  /** The SVG text of each part. The files come from the repo, not from users. */
  sources: PartSources;
}

/** Defines the rig parts as `<symbol>`s, for use inside an `<svg>`. */
export function PartSymbols({ prefix, sources }: PartSymbolsProps) {
  const parts = useMemo(() => parse(prefix, sources), [prefix, sources]);
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
