// Draws a prop: a small tree of bones, each with a part, that sways in the
// wind of its clip.
import type { Matrix, PropFrame, PropRig, Pt } from '@toonhouse/model';

import {
  type CharacterDrawing,
  type DrawNode,
  placed,
  skeleton,
} from './draw.ts';
import { deg, hash, multiply, rotation, scaling, translation } from './math.ts';
import { arrange, layered, type SlotDrawing } from './order.ts';

/** Sways of the main motion in one cycle of the wind. */
const SWAYS = 3;
/** A faster flutter on top of the sway, also in one cycle. */
const FLUTTERS = 7;

/**
 * The turn and the squash of a bone in the wind. Each bone has its own phase
 * from its place in the rig, so that the clumps of a crown don't move
 * together. The motion goes round a whole number of times in one cycle, so a
 * looping clip ends where it starts.
 */
export function swayOf(
  rig: PropRig,
  index: number,
  frame: PropFrame,
): { angle: number; squash: number } {
  const sway = rig.bones[index]?.sway;
  const { wind, cycle } = frame.pose;
  if (!sway || wind === 0) return { angle: 0, squash: 0 };
  const phase = 2 * Math.PI * (0.37 * index + 0.3 * hash(index + 1));
  const main = 2 * Math.PI * SWAYS * cycle + phase;
  const flutter = 2 * Math.PI * FLUTTERS * cycle + 2 * phase;
  const angle =
    deg(sway.angle) * wind * (0.8 * Math.sin(main) + 0.2 * Math.sin(flutter));
  // The part squashes most at the ends of the sway, twice in each sway.
  const squash = (sway.squash ?? 0) * wind * Math.sin(main) ** 2;
  return { angle, squash };
}

/** Draws a prop with its ground point at the origin, in the pixels of the parts. */
export function drawProp(
  rig: PropRig,
  frame: PropFrame,
  { facing }: { facing: 1 | -1 },
): CharacterDrawing {
  // The transform of each bone from its pivot, in the pixels of its part
  // times its scale, to the drawing.
  const boneAt = new Map<string, Matrix>();
  const slots: Record<string, SlotDrawing> = {};
  const joints: Record<string, Pt> = {};
  const chains: Pt[][] = [];
  rig.bones.forEach((bone, i) => {
    const part = rig.parts[bone.part];
    if (!part) throw new Error(`The prop has no part ${bone.part}`);
    const { angle, squash } = swayOf(rig, i, frame);
    const parent =
      bone.parent === undefined
        ? undefined
        : rig.bones.find((b) => b.id === bone.parent);
    let base: Matrix = [1, 0, 0, 1, 0, 0];
    if (parent) {
      const p = boneAt.get(parent.id);
      const pp = rig.parts[parent.part];
      if (!p || !pp)
        throw new Error(`The bone ${bone.id} comes before its parent`);
      const at = bone.at ?? pp.pivot;
      base = multiply(p, translation(at.x - pp.pivot.x, at.y - pp.pivot.y));
    }
    const m = multiply(
      base,
      multiply(rotation(angle), scaling(bone.scale ?? 1)),
    );
    boneAt.set(bone.id, m);
    // The squash changes only the part, not where the child bones join it.
    const drawn = multiply(
      m,
      multiply(
        scaling(1 + squash, 1 - squash),
        translation(-part.pivot.x, -part.pivot.y),
      ),
    );
    slots[bone.id] = layered(part, (layer): DrawNode[] => [
      {
        type: 'part',
        part: bone.part,
        ...(layer === undefined ? {} : { layer }),
        width: part.width,
        height: part.height,
        transform: drawn,
      },
    ]);
    const joint = { x: m[4], y: m[5] };
    joints[bone.id] = joint;
    if (parent) chains.push([joints[parent.id]!, joint]);
  });

  return {
    node: placed(rig.shadow, facing, arrange(rig, slots)),
    skeleton: skeleton(joints, chains, facing),
  };
}
