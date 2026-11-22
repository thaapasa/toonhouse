// The frame of a scene, as its camera sees it. It goes inside an `<svg>` with
// the viewBox of the background frame.
//
// In the editor, the frame is drawn on the ground layer instead, from
// `sceneFrame` with the `ground` option. The viewBox can be larger than the
// view of the camera, and then what is outside it shows dimmer.
//
// Each asset shows once its SVG files have loaded. Until then, the drawing
// leaves it out, so that the user doesn't see the limbs of a character
// without its body.
import type { RoleColors, RolePatterns, Scene } from '@toonhouse/model';
import {
  type Bounds,
  cameraBounds,
  type DrawNode,
  type SceneFrame,
} from '@toonhouse/renderer';
import {
  actorPrefix,
  Drawing,
  type PartSources,
  PartSymbols,
} from '@toonhouse/stage';
import { useMemo } from 'react';

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
  /** The frame to draw, from `sceneFrame`. With `offstage`, it is on the ground layer. */
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
  const actors: { id: string; sources: PartSources; paint: string }[] = [];
  const waiting = new Set<string>();
  for (const { actor, colors, patterns } of frame.actors) {
    const asset = rigAsset(actor.asset);
    const sources = asset && loadedSources(asset.files);
    if (sources)
      actors.push({
        id: actor.id,
        sources,
        paint: JSON.stringify({ colors, patterns }),
      });
    else waiting.add(actor.id);
  }
  const node = leaveOut(frame.node, waiting);
  const view = props.offstage
    ? cameraBounds(bg, frame.camera)
    : { x: 0, y: 0, width: bg.width, height: bg.height };
  return (
    <>
      {bgSources && <PartSymbols prefix={prefix} sources={bgSources} />}
      {actors.map(({ id, sources, paint }) => (
        <ActorSymbols
          key={id}
          prefix={actorPrefix(prefix, id)}
          sources={sources}
          paint={paint}
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
        <Drawing node={node} prefix={prefix} />
      </g>
      <Drawing node={frame.bubbleNode} prefix={prefix} />
    </>
  );
}

/**
 * The parts of an actor in its colors. The frame gives new color objects in
 * every frame, so they come in as JSON text, and the parts are parsed again
 * only when the colors change.
 */
function ActorSymbols(props: {
  prefix: string;
  sources: PartSources;
  /** The colors and the patterns of the roles as JSON. */
  paint: string;
}) {
  const { colors, patterns } = useMemo(
    () =>
      JSON.parse(props.paint) as {
        colors: RoleColors;
        patterns: RolePatterns;
      },
    [props.paint],
  );
  return (
    <PartSymbols
      prefix={props.prefix}
      sources={props.sources}
      colors={colors}
      patterns={patterns}
    />
  );
}
