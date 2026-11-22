// A character or a prop standing still, in the colors that the user picked.
// The picture shows once the SVG files of its asset have loaded.
import type { ColorChoice } from '@toonhouse/model';
import {
  colorRig,
  drawRig,
  partBounds,
  presetColors,
  presetPatterns,
  restClip,
} from '@toonhouse/renderer';
import { Drawing, PartSymbols } from '@toonhouse/stage';
import { memo, useMemo } from 'react';

import type { RigAsset } from '../library/index.ts';
import { loadedSources, useSources } from '../library/sources.ts';

const NO_COLORS: ColorChoice = {};

export const RigPicture = memo(function RigPicture(props: {
  asset: RigAsset;
  colors?: ColorChoice | undefined;
  /** Makes the ids of the symbols unique on the page. */
  prefix: string;
  className?: string;
}) {
  const { asset } = props;
  const choice = props.colors ?? NO_COLORS;
  const { rig } = asset;
  const colors = useMemo(() => presetColors(rig, choice), [rig, choice]);
  const patterns = useMemo(() => presetPatterns(rig, choice), [rig, choice]);
  const frame = restClip(rig.kind).frameAt(0);
  const node = drawRig(colorRig(rig, colors), frame, { facing: 1 }).node;
  const b = partBounds(node) ?? { x: 0, y: 0, width: 1, height: 1 };
  useSources([asset.files]);
  const sources = loadedSources(asset.files);
  return (
    <svg
      className={props.className ?? 'library-picture'}
      viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
      aria-hidden
    >
      {sources && (
        <>
          <PartSymbols
            prefix={props.prefix}
            sources={sources}
            colors={colors}
            patterns={patterns}
          />
          <Drawing node={node} prefix={props.prefix} />
        </>
      )}
    </svg>
  );
});
