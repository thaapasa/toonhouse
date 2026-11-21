// Turns a rabbit rig and a clip frame into a list of things to draw.
import type {
  Matrix,
  Pt,
  RabbitFrame,
  RabbitPartId,
  RabbitPose,
  RabbitRig,
} from '@toonhouse/model';

import type { DrawNode, DrawOptions, RigDrawing } from './draw.ts';
import {
  curve,
  fmt,
  line,
  outlinedStroke,
  partNode,
  partSlot,
  placed,
  rigOutline,
} from './drawKit.ts';
import { eyeLids } from './face.ts';
import {
  add,
  curveMiddle,
  hoseControl,
  pinned,
  rotate,
  sub,
  twoBoneJoint,
} from './math.ts';
import { arrange, layered, type SlotDrawing } from './order.ts';

/**
 * The pose with the hip lifted so that no ground point of the body is below
 * the ground. A rig without ground points keeps the pose of the clip.
 */
export function clearOfGround(rig: RabbitRig, pose: RabbitPose): RabbitPose {
  const pivot = rig.parts.body.pivot;
  let lowest = 0;
  for (const p of rig.groundPoints ?? []) {
    const y = pose.hip.y + rotate(sub(p, pivot), pose.bodyAngle).y;
    lowest = Math.max(lowest, y);
  }
  if (lowest === 0) return pose;
  return { ...pose, hip: { x: pose.hip.x, y: pose.hip.y - lowest } };
}

/** Draws a rabbit with its ground point at the origin, in sheet pixels, y down. */
export function drawRabbit(
  rig: RabbitRig,
  frame: RabbitFrame,
  { facing }: DrawOptions,
): RigDrawing {
  const pose = clearOfGround(rig, frame.pose);
  const { parts, colors, legs, scales } = rig;
  const ow = rig.outlineWidth;
  const part = (id: RabbitPartId, transform: Matrix, layer?: string) =>
    partNode(id, parts[id], transform, layer);
  const piece = (id: RabbitPartId, transform: Matrix) =>
    partSlot(id, parts[id], transform);
  /** A thick line with an outline, in the color of the fur. */
  const tube = (d: string, width: number) =>
    outlinedStroke(
      d,
      width,
      colors.fur,
      { color: colors.outline, width: ow },
      { lineJoin: 'round' },
    );

  const b0 = parts.body;
  const onBody = (p: Pt) =>
    add(pose.hip, rotate(sub(p, b0.pivot), pose.bodyAngle));
  const neck = onBody(rig.body.neck);
  const headAngle = pose.bodyAngle + pose.headAngle;
  const headTransform = pinned(neck, headAngle, scales.head, parts.head.pivot);
  const onHead = (p: Pt) => {
    const d = sub(p, parts.head.pivot);
    return add(
      neck,
      rotate({ x: d.x * scales.head, y: d.y * scales.head }, headAngle),
    );
  };

  // A hind leg: the thigh and the shank from the hip to the heel, with the
  // knee bending forwards, and the long foot turning around the heel.
  const heelHeight = rig.heelHeight * scales.foot;
  const hindLeg = (hipOnBody: Pt, footAt: Pt, angle: number) => {
    const hip = onBody(hipOnBody);
    const heel = { x: footAt.x, y: footAt.y - heelHeight };
    const knee = twoBoneJoint(
      hip,
      heel,
      legs.thighLength,
      legs.shankLength,
      -1,
    );
    return {
      hip,
      knee,
      heel,
      leg: tube(line(hip, knee, heel), legs.shankWidth),
      foot: piece('foot', pinned(heel, angle, scales.foot, parts.foot.pivot)),
    };
  };
  const nearHind = hindLeg(rig.body.hipNear, pose.footNear, pose.footNearAngle);
  const farHind = hindLeg(rig.body.hipFar, pose.footFar, pose.footFarAngle);

  // A front leg: a short rubber hose from the shoulder to the paw, with the
  // elbow bending backwards.
  const wristHeight = rig.wristHeight * scales.paw;
  const frontLeg = (shoulderOnBody: Pt, pawAt: Pt) => {
    const shoulder = onBody(shoulderOnBody);
    const wrist = { x: pawAt.x, y: pawAt.y - wristHeight };
    const c = hoseControl(shoulder, wrist, legs.armLength, 1);
    return {
      shoulder,
      elbow: curveMiddle(shoulder, c, wrist),
      wrist,
      leg: tube(curve(shoulder, c, wrist), legs.armWidth),
      paw: piece('paw', pinned(wrist, 0, scales.paw, parts.paw.pivot)),
    };
  };
  const nearFront = frontLeg(rig.body.shoulderNear, pose.pawNear);
  const farFront = frontLeg(rig.body.shoulderFar, pose.pawFar);

  // The ears are drawn in head pixels, so that they move with the head.
  const ear = (root: Pt, angle: number): SlotDrawing =>
    layered(parts.ear, (layer) => [
      {
        type: 'group',
        transform: headTransform,
        children: [
          part(
            'ear',
            pinned(root, angle, scales.ear / scales.head, parts.ear.pivot),
            layer,
          ),
        ],
      },
    ]);

  const character = arrange(rig, {
    hindLegFar: { nodes: farHind.leg },
    footFar: farHind.foot,
    frontLegFar: { nodes: farFront.leg },
    pawFar: farFront.paw,
    earFar: ear(rig.ears.far, pose.earFarAngle),
    earNear: ear(rig.ears.near, pose.earNearAngle),
    hindLegNear: { nodes: nearHind.leg },
    body: piece('body', pinned(pose.hip, pose.bodyAngle, 1, b0.pivot)),
    footNear: nearHind.foot,
    head: layered(parts.head, (layer) => [
      {
        type: 'group',
        transform: headTransform,
        children:
          layer === undefined
            ? headNodes(rig, frame.face, part)
            : [part('head', [1, 0, 0, 1, 0, 0], layer)],
      },
    ]),
    frontLegNear: { nodes: nearFront.leg },
    pawNear: nearFront.paw,
  });

  const j = {
    hip: pose.hip,
    neck,
    earNear: onHead(rig.ears.near),
    earFar: onHead(rig.ears.far),
    shoulderNear: nearFront.shoulder,
    elbowNear: nearFront.elbow,
    wristNear: nearFront.wrist,
    shoulderFar: farFront.shoulder,
    elbowFar: farFront.elbow,
    wristFar: farFront.wrist,
    hipNear: nearHind.hip,
    kneeNear: nearHind.knee,
    heelNear: nearHind.heel,
    hipFar: farHind.hip,
    kneeFar: farHind.knee,
    heelFar: farHind.heel,
  };
  return {
    node: placed(rig.shadow, facing, character),
    rigOutline: rigOutline(
      j,
      [
        [j.hip, j.neck, j.earNear],
        [j.neck, j.earFar],
        [j.hip, j.shoulderNear, j.elbowNear, j.wristNear],
        [j.shoulderFar, j.elbowFar, j.wristFar],
        [j.hipNear, j.kneeNear, j.heelNear],
        [j.hipFar, j.kneeFar, j.heelFar],
      ],
      facing,
    ),
  };
}

/**
 * The head with the face drawn on it, in head pixels: lids for blinking, and
 * an open mouth with the front teeth under the traced smile.
 */
function headNodes(
  rig: RabbitRig,
  face: RabbitFrame['face'],
  part: (id: RabbitPartId, transform: Matrix) => DrawNode,
): DrawNode[] {
  const f = rig.face;
  const { colors } = rig;
  const nodes: DrawNode[] = [
    part('head', [1, 0, 0, 1, 0, 0]),
    ...eyeLids(f, face.blink, { lid: colors.fur, line: colors.line }),
  ];
  if (face.open > 0.02) {
    const { back, front, control, openDepth, teeth } = f.mouth;
    const drop = 4 + face.open * openDepth;
    const upper = curve(back, control, front);
    const shape = `${upper}Q${fmt(control.x + 4)} ${fmt(control.y + drop)} ${fmt(back.x)} ${fmt(back.y)}Z`;
    const stroke = {
      stroke: colors.line,
      strokeWidth: rig.outlineWidth,
      lineCap: 'round',
      lineJoin: 'round',
    } as const;
    nodes.push(
      { type: 'path', d: shape, fill: colors.mouth },
      {
        type: 'group',
        clip: { type: 'path', d: shape },
        children: [
          {
            type: 'ellipse',
            cx: control.x + 2,
            cy: control.y + drop * 0.55,
            rx: 16,
            ry: 4 + drop * 0.3,
            fill: colors.tongue,
          },
          {
            type: 'path',
            d: teeth,
            fill: colors.teeth,
            ...stroke,
            strokeWidth: 2.5,
          },
        ],
      },
      { type: 'path', d: shape, ...stroke },
    );
  }
  return nodes;
}
