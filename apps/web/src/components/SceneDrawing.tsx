// The scene at time `t`, as the camera of the whole background sees it. It
// goes inside an `<svg>` with the viewBox of the background frame. In the
// editor, the viewBox can be larger than the frame, and then what is outside
// the frame shows dimmer.
import type { Scene } from '@toonhouse/model';
import {
  type Bounds,
  drawBubbles,
  drawScene,
  type PlacedBubble,
  wholeBackground,
} from '@toonhouse/renderer';
import { actorPrefix, Drawing, PartSymbols } from '@toonhouse/stage';

import { placeSceneBubbles } from '../editor/bubbles.ts';
import type { BackgroundAsset } from '../editor/library.ts';
import { backgroundFrame, type PlacedActor } from '../editor/placement.ts';

/** How much of what is outside the frame shows through the mask. */
const OFFSTAGE_SHADE = '#666';

export function SceneDrawing(props: {
  scene: Scene;
  bg: BackgroundAsset;
  t: number;
  /** The actors at time `t`, from `placeActors`. */
  placed: readonly PlacedActor[];
  /** The bubbles at time `t`, if already placed, such as by the editor. */
  bubbles?: readonly PlacedBubble[];
  /** Makes the ids of the symbols unique on the page. */
  prefix: string;
  /**
   * Draws what is outside the frame too, dimmer, as far as these bounds go,
   * so that the user can place actors there before they come in. The player
   * leaves it out.
   */
  offstage?: Bounds;
}) {
  const { bg: asset, prefix } = props;
  const bg = asset.background;
  const node = drawScene(
    bg,
    backgroundFrame(props.scene, props.t),
    wholeBackground(bg),
    props.placed.map((p) => p.drawing),
  );
  const bubbles = drawBubbles(
    props.bubbles ?? placeSceneBubbles(props.scene, bg, props.placed, props.t),
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
      {props.offstage ? (
        // A mask, unlike a clip path, keeps the dim actors selectable.
        <mask
          id={`${prefix}-frame`}
          maskUnits="userSpaceOnUse"
          {...props.offstage}
        >
          <rect {...props.offstage} fill={OFFSTAGE_SHADE} />
          <rect width={bg.width} height={bg.height} fill="white" />
        </mask>
      ) : (
        <clipPath id={`${prefix}-frame`}>
          <rect width={bg.width} height={bg.height} />
        </clipPath>
      )}
      <g
        clipPath={props.offstage ? undefined : `url(#${prefix}-frame)`}
        mask={props.offstage ? `url(#${prefix}-frame)` : undefined}
      >
        <Drawing node={node} prefix={prefix} />
      </g>
      <Drawing node={bubbles} prefix={prefix} />
    </>
  );
}
