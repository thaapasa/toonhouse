// The frame of a scene, as its camera sees it. It goes inside an `<svg>` with
// the viewBox of the background frame.
//
// In the editor, the drawing stays on the ground layer instead: the actors and
// the ground layer keep their places, and the far layers move with the camera.
// The viewBox can be larger than the view of the camera, and then what is
// outside it shows dimmer.
//
// Each asset shows once its SVG files have loaded. Until then, the drawing
// leaves it out, so that the user doesn't see the limbs of a character
// without its body.
import type { Scene } from '@toonhouse/model';
import {
  type Bounds,
  cameraBounds,
  type DrawNode,
  groundDepth,
  layerTransform,
  pictureToGround,
  type SceneFrame,
} from '@toonhouse/renderer';
import {
  actorPrefix,
  Drawing,
  type PartSources,
  PartSymbols,
} from '@toonhouse/stage';

import { backgroundAsset, rigAsset, sceneFiles } from '../library/index.ts';
import { loadedSources, useSources } from '../library/sources.ts';

/** How much of what is outside the frame shows through the mask. */
const OFFSTAGE_SHADE = '#666';

/** The drawing without the groups of the actors in `ids`. */
function leaveOut(node: DrawNode, ids: ReadonlySet<string>): DrawNode {
  if (node.type !== 'group' || ids.size === 0) return node;
  return {
    ...node,
    children: node.children
      .filter((c) => !(c.type === 'group' && c.actor && ids.has(c.actor)))
      .map((c) => leaveOut(c, ids)),
  };
}

export function SceneDrawing(props: {
  scene: Scene;
  /** The frame to draw, from `sceneFrame`. */
  frame: SceneFrame;
  /** Makes the ids of the symbols unique on the page. */
  prefix: string;
  /**
   * Draws the scene on the ground layer, with what is outside the view of the
   * camera too, dimmer, as far as these bounds go. So the user can place
   * actors there before they come in. The player leaves it out.
   */
  offstage?: Bounds;
}) {
  const { frame, prefix } = props;
  const bg = frame.background;
  useSources(sceneFiles(props.scene));
  const bgAsset = backgroundAsset(props.scene.background);
  const bgSources = bgAsset && loadedSources(bgAsset.files);
  const actors: { id: string; sources: PartSources }[] = [];
  const waiting = new Set<string>();
  for (const { actor } of frame.actors) {
    const asset = rigAsset(actor.asset);
    const sources = asset && loadedSources(asset.files);
    if (sources) actors.push({ id: actor.id, sources });
    else waiting.add(actor.id);
  }
  const { camera } = frame;
  const node = leaveOut(frame.node, waiting);
  const scene: DrawNode = props.offstage
    ? {
        type: 'group',
        transform: pictureToGround(bg, camera),
        children: [node],
      }
    : node;
  const bubbles: DrawNode = props.offstage
    ? frame.bubbleNode
    : {
        type: 'group',
        transform: layerTransform(bg, camera, groundDepth(bg)),
        children: [frame.bubbleNode],
      };
  const view = props.offstage
    ? cameraBounds(bg, camera)
    : { x: 0, y: 0, width: bg.width, height: bg.height };
  return (
    <>
      {bgSources && <PartSymbols prefix={prefix} sources={bgSources} />}
      {actors.map(({ id, sources }) => (
        <PartSymbols
          key={id}
          prefix={actorPrefix(prefix, id)}
          sources={sources}
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
          <rect {...view} fill="white" />
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
        <Drawing node={scene} prefix={prefix} />
      </g>
      <Drawing node={bubbles} prefix={prefix} />
    </>
  );
}
