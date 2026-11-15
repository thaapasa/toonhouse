// The scene at time `t`, as the camera of the whole background sees it. It
// goes inside an `<svg>` with the viewBox of the background frame.
import type { Scene } from '@toonhouse/model';
import { drawScene, wholeBackground } from '@toonhouse/renderer';
import { actorPrefix, Drawing, PartSymbols } from '@toonhouse/stage';

import type { BackgroundAsset } from '../editor/library.ts';
import { backgroundFrame, type PlacedActor } from '../editor/placement.ts';

export function SceneDrawing(props: {
  scene: Scene;
  bg: BackgroundAsset;
  t: number;
  /** The actors at time `t`, from `placeActors`. */
  placed: readonly PlacedActor[];
  /** Makes the ids of the symbols unique on the page. */
  prefix: string;
}) {
  const { bg: asset, prefix } = props;
  const bg = asset.background;
  const node = drawScene(
    bg,
    backgroundFrame(props.scene, props.t),
    wholeBackground(bg),
    props.placed.map((p) => p.drawing),
  );
  return (
    <>
      <PartSymbols prefix={prefix} sources={asset.sources} />
      {props.placed.map((p) => (
        <PartSymbols
          key={p.actor.id}
          prefix={actorPrefix(prefix, p.actor.id)}
          sources={p.asset.parts}
        />
      ))}
      <clipPath id={`${prefix}-frame`}>
        <rect width={bg.width} height={bg.height} />
      </clipPath>
      <g clipPath={`url(#${prefix}-frame)`}>
        <Drawing node={node} prefix={prefix} />
      </g>
    </>
  );
}
