import type { CharacterDrawing } from '@toonhouse/renderer';
import { Drawing, type PartSources, PartSymbols } from '@toonhouse/stage';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '../i18n/index.tsx';
import {
  BonesIcon,
  FlipIcon,
  GroundIcon,
  MinusIcon,
  PlusIcon,
} from './icons.tsx';

export const ZOOMS = [0.5, 0.75, 1, 1.5, 2] as const;

/** Sheet pixels from the ground to the top of the hair, about. */
const CHARACTER_HEIGHT = 860;
/** Where the middle of the character is, from the top of the viewport. */
const MIDDLE_AT = 0.45;
/** Ground marks. A walk clip moves a whole number of these per loop. */
const MARK_SPACING = 81;

export interface ViewOptions {
  bones: boolean;
  ground: boolean;
  facing: 1 | -1;
  zoom: number;
}

interface Props {
  prefix: string;
  parts: PartSources;
  drawing: CharacterDrawing;
  /** How far the character has walked, to move the ground. */
  travel: number;
  view: ViewOptions;
  onView(view: ViewOptions): void;
}

function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

export function Viewport({
  prefix,
  parts,
  drawing,
  travel,
  view,
  onView,
}: Props) {
  const { tr } = useI18n();
  const [ref, { width, height }] = useSize();
  // Fit the character into 70 % of the height at 100 %.
  const scale = (view.zoom * height * 0.7) / CHARACTER_HEIGHT || 1;
  const vw = width / scale;
  const vh = height / scale;
  // Zoom around the middle of the character.
  const viewBox = `${-vw / 2} ${-CHARACTER_HEIGHT / 2 - vh * MIDDLE_AT} ${vw} ${vh}`;
  // The ground moves back under the feet as fast as the character walks.
  const shift =
    (((-travel * view.facing) % MARK_SPACING) + MARK_SPACING) % MARK_SPACING;
  const marks: number[] = [];
  const reach = vw / 2 + MARK_SPACING;
  for (
    let x = -Math.ceil(reach / MARK_SPACING) * MARK_SPACING;
    x <= reach;
    x += MARK_SPACING
  ) {
    marks.push(x + shift);
  }
  const zoomIndex = ZOOMS.indexOf(view.zoom as (typeof ZOOMS)[number]);
  const px = 1 / scale;

  return (
    <div className="viewport" ref={ref}>
      <div
        className="toolbar toolbar-left"
        role="toolbar"
        aria-label={tr('viewport')}
      >
        <button
          type="button"
          aria-pressed={view.bones}
          title={tr('bonesHint')}
          onClick={() => onView({ ...view, bones: !view.bones })}
        >
          <BonesIcon />
          {tr('bones')}
        </button>
        <button
          type="button"
          aria-pressed={view.ground}
          title={tr('groundHint')}
          onClick={() => onView({ ...view, ground: !view.ground })}
        >
          <GroundIcon />
          {tr('ground')}
        </button>
        <button
          type="button"
          aria-pressed={view.facing === -1}
          title={tr('flipHint')}
          onClick={() =>
            onView({ ...view, facing: view.facing === 1 ? -1 : 1 })
          }
        >
          <FlipIcon />
          {tr('flip')}
        </button>
      </div>
      <div className="toolbar toolbar-right">
        <button
          type="button"
          className="icon"
          aria-label={tr('zoomOut')}
          title={tr('zoomOut')}
          disabled={zoomIndex <= 0}
          onClick={() => onView({ ...view, zoom: ZOOMS[zoomIndex - 1]! })}
        >
          <MinusIcon />
        </button>
        <span className="zoom">{Math.round(view.zoom * 100)}%</span>
        <button
          type="button"
          className="icon"
          aria-label={tr('zoomIn')}
          title={tr('zoomIn')}
          disabled={zoomIndex >= ZOOMS.length - 1}
          onClick={() => onView({ ...view, zoom: ZOOMS[zoomIndex + 1]! })}
        >
          <PlusIcon />
        </button>
      </div>

      {width > 0 && (
        <svg className="stage" viewBox={viewBox} aria-hidden="true">
          <PartSymbols prefix={prefix} sources={parts} />
          <line
            className="ground-line"
            x1={-vw}
            x2={vw}
            y1={0}
            y2={0}
            strokeWidth={px}
            strokeDasharray={`${4 * px} ${4 * px}`}
          />
          {view.ground &&
            marks.map((x) => (
              <line
                key={x - shift}
                className="ground-mark"
                x1={x}
                x2={x - 10}
                y1={2}
                y2={22}
                strokeWidth={2 * px}
              />
            ))}
          <Drawing node={drawing.node} prefix={prefix} />
          {view.bones && (
            <g className="bones">
              {drawing.skeleton.bones.map((chain, i) => (
                <polyline
                  key={i}
                  points={chain.map((p) => `${p.x},${p.y}`).join(' ')}
                  strokeWidth={2 * px}
                />
              ))}
              {drawing.skeleton.joints.map((j) => (
                <circle
                  key={j.name}
                  cx={j.at.x}
                  cy={j.at.y}
                  r={3.5 * px}
                  strokeWidth={1.6 * px}
                >
                  <title>{j.name}</title>
                </circle>
              ))}
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
