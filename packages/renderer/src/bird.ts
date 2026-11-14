// Turns a bird rig and a clip frame into a list of things to draw.
import type {
  BirdFrame,
  BirdPartId,
  BirdRig,
  Matrix,
  Pt,
} from '@toonhouse/model';

import type { CharacterDrawing, DrawNode, DrawOptions } from './draw.ts';
import { placed, skeleton } from './draw.ts';
import { eyeLids } from './face.ts';
import { add, deg, pinned, rotate, sub, twoBoneJoint } from './math.ts';
import { arrange, layered, type SlotDrawing } from './order.ts';

const fmt = (n: number) => Math.round(n * 100) / 100;
const line = (...pts: Pt[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p.x)} ${fmt(p.y)}`).join('');

/**
 * The joint of a two-bone leg from the hip to the ankle. The joint bends
 * backwards, as on a bird. A reach longer than the leg straightens it.
 */
export function legJoint(hip: Pt, ankle: Pt, thigh: number, shank: number) {
  return twoBoneJoint(hip, ankle, thigh, shank, 1);
}

/** Draws a bird with its ground point at the origin, in sheet pixels, y down. */
export function drawBird(
  rig: BirdRig,
  frame: BirdFrame,
  { facing }: DrawOptions,
): CharacterDrawing {
  const { pose } = frame;
  const { parts, colors, legs } = rig;
  const ow = rig.outlineWidth;
  const part = (
    id: BirdPartId,
    transform: Matrix,
    layer?: string,
  ): DrawNode => ({
    type: 'part',
    part: id,
    ...(layer === undefined ? {} : { layer }),
    width: parts[id].width,
    height: parts[id].height,
    transform,
  });
  /** A part with all its layers, placed with one transform. */
  const piece = (id: BirdPartId, transform: Matrix): SlotDrawing =>
    layered(parts[id], (layer) => [part(id, transform, layer)]);
  /** A thick line with an outline: a stroke under a narrower stroke. */
  const tube = (d: string, width: number, color: string): DrawNode[] => [
    {
      type: 'path',
      d,
      stroke: colors.outline,
      strokeWidth: width + 2 * ow,
      lineCap: 'round',
      lineJoin: 'round',
    },
    {
      type: 'path',
      d,
      stroke: color,
      strokeWidth: width,
      lineCap: 'round',
      lineJoin: 'round',
    },
  ];

  const b0 = parts.body;
  const onBody = (p: Pt) =>
    add(pose.hip, rotate(sub(p, b0.pivot), pose.bodyAngle));
  const neck = onBody(rig.body.neck);
  const headAt = add(neck, rotate(pose.head, pose.bodyAngle));
  const headAngle = pose.bodyAngle + pose.headAngle;

  const ankleHeight = rig.ankleHeight * rig.scales.foot;
  const leg = (hipOnBody: Pt, footAt: Pt, angle: number) => {
    const hip = onBody(hipOnBody);
    const ankle = { x: footAt.x, y: footAt.y - ankleHeight };
    const knee = legJoint(hip, ankle, legs.thighLength, legs.shankLength);
    return {
      hip,
      knee,
      ankle,
      leg: [
        ...tube(line(knee, ankle), legs.shankWidth, colors.leg),
        ...tube(
          line(hip, knee),
          legs.thighWidth,
          colors.thigh ?? colors.feathers,
        ),
      ],
      foot: piece(
        'foot',
        pinned(ankle, angle, rig.scales.foot, parts.foot.pivot),
      ),
    };
  };
  const nearLeg = leg(rig.body.hipNear, pose.footNear, pose.footNearAngle);
  const farLeg = leg(rig.body.hipFar, pose.footFar, pose.footFarAngle);

  const wing = (shoulderOnBody: Pt, angle: number, open: number) => {
    const shoulder = onBody(shoulderOnBody);
    const id = open > 0.5 ? 'wingOpen' : 'wing';
    const offset = deg(
      open > 0.5 ? rig.wings.openAngle : rig.wings.foldedAngle,
    );
    return {
      shoulder,
      drawing: piece(
        id,
        pinned(
          shoulder,
          pose.bodyAngle + offset + angle,
          open > 0.5 ? rig.scales.wingOpen : rig.scales.wing,
          parts[id].pivot,
        ),
      ),
    };
  };
  const nearWing = wing(
    rig.body.shoulderNear,
    pose.wingNearAngle,
    pose.wingNearOpen,
  );
  const farWing = wing(
    rig.body.shoulderFar,
    pose.wingFarAngle,
    pose.wingFarOpen,
  );

  const character = arrange(rig, {
    wingFar: farWing.drawing,
    legFar: { nodes: farLeg.leg },
    footFar: farLeg.foot,
    legNear: { nodes: nearLeg.leg },
    footNear: nearLeg.foot,
    neck: { nodes: tube(line(neck, headAt), rig.neck.width, colors.feathers) },
    body: piece('body', pinned(pose.hip, pose.bodyAngle, 1, b0.pivot)),
    head: layered(parts.head, (layer) => [
      {
        type: 'group',
        transform: pinned(headAt, headAngle, rig.scales.head, parts.head.pivot),
        children:
          layer === undefined
            ? headNodes(rig, frame.face, part)
            : [part('head', [1, 0, 0, 1, 0, 0], layer)],
      },
    ]),
    wingNear: nearWing.drawing,
  });

  const j = {
    hip: pose.hip,
    neck,
    head: headAt,
    shoulderNear: nearWing.shoulder,
    shoulderFar: farWing.shoulder,
    hipNear: nearLeg.hip,
    kneeNear: nearLeg.knee,
    ankleNear: nearLeg.ankle,
    hipFar: farLeg.hip,
    kneeFar: farLeg.knee,
    ankleFar: farLeg.ankle,
  };
  return {
    node: placed(rig.shadow, facing, character),
    skeleton: skeleton(
      j,
      [
        [j.hip, j.neck, j.head],
        [j.hip, j.shoulderNear],
        [j.hip, j.shoulderFar],
        [j.hipNear, j.kneeNear, j.ankleNear],
        [j.hipFar, j.kneeFar, j.ankleFar],
      ],
      facing,
    ),
  };
}

/**
 * The head with the face drawn on it, in head pixels: lids for blinking, and
 * the lower half of the beak turning down to open it.
 */
function headNodes(
  rig: BirdRig,
  face: BirdFrame['face'],
  part: (id: BirdPartId, transform: Matrix) => DrawNode,
): DrawNode[] {
  const f = rig.face;
  const { colors } = rig;
  const nodes: DrawNode[] = [
    part('head', [1, 0, 0, 1, 0, 0]),
    ...eyeLids(f, face.blink, { lid: colors.feathers, line: colors.line }),
  ];
  if (face.open > 0.02) {
    const { hinge, control, end, lower, openAngle } = f.beak;
    const a = deg(openAngle) * face.open;
    const turn = (p: Pt) => add(hinge, rotate(sub(p, hinge), a));
    const c2 = turn(control);
    const e2 = turn(end);
    const q = (c: Pt, p: Pt) =>
      `Q${fmt(c.x)} ${fmt(c.y)} ${fmt(p.x)} ${fmt(p.y)}`;
    nodes.push(
      // The inside of the mouth lies between the line under the upper half and
      // the same line turned down. It covers the traced lower half.
      {
        type: 'path',
        d: `M${fmt(hinge.x)} ${fmt(hinge.y)}${q(control, end)}L${fmt(e2.x)} ${fmt(e2.y)}${q(c2, hinge)}Z`,
        fill: colors.mouth,
      },
      {
        type: 'group',
        transform: pinned(hinge, a, 1, hinge),
        children: [
          {
            type: 'path',
            d: lower,
            fill: colors.beak,
            stroke: colors.outline,
            strokeWidth: rig.outlineWidth,
            lineJoin: 'round',
          },
        ],
      },
    );
  }
  return nodes;
}
