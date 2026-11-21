// Draws a cutout rig: traced parts on a body, with rubber-hose arms and legs
// and a face drawn on the head.
import type {
  CutoutFrame,
  CutoutRig,
  Matrix,
  Pose,
  Pt,
  RigPartId,
} from '@toonhouse/model';

import { hang, HIP_HEIGHT, NEAR_ARM_REST } from './clips/body.ts';
import type { DrawNode, DrawOptions, RigDrawing } from './draw.ts';
import {
  curve,
  outlinedStroke,
  partNode,
  partSlot,
  placed,
  rigOutline,
} from './drawKit.ts';
import { eyeLids, mouthShape, tongue, upperLip } from './face.ts';
import {
  add,
  curveMiddle,
  deg,
  hoseControl,
  mix,
  pinned,
  rotate,
  sub,
} from './math.ts';
import { arrange, layered, type SlotDrawing } from './order.ts';

/** Tangent angle at the end of the quadratic curve a-c-b. */
const endAngle = (c: Pt, b: Pt) => Math.atan2(b.y - c.y, b.x - c.x);

/**
 * A pose of a shared clip, fitted to the body of the character with the
 * motion settings of the rig.
 */
export function fittedPose(rig: CutoutRig, pose: Pose): Pose {
  const m = rig.motion;
  if (!m) return pose;
  const up = m.groundOffset ?? 0;
  const forward = m.feetOffset ?? 0;
  const foot = (p: Pt): Pt => ({ x: p.x + forward, y: p.y - up });
  return {
    ...pose,
    hip: {
      x: pose.hip.x,
      y: pose.hip.y + HIP_HEIGHT - (m.hipHeight ?? HIP_HEIGHT) - up,
    },
    footNear: foot(pose.footNear),
    footFar: foot(pose.footFar),
  };
}

export function drawCutout(
  rig: CutoutRig,
  frame: CutoutFrame,
  { facing }: DrawOptions,
): RigDrawing {
  const pose = fittedPose(rig, frame.pose);
  const { parts, limbs, colors } = rig;
  const part = (id: RigPartId, transform: Matrix, layer?: string) =>
    partNode(id, parts[id]!, transform, layer);
  const piece = (id: RigPartId, transform: Matrix) =>
    partSlot(id, parts[id]!, transform);
  const outline = { color: colors.outline, width: limbs.outlineWidth };

  /** A rubber-hose limb. */
  const hose = (d: string, width: number, color: string = colors.skin) =>
    outlinedStroke(d, width, color, outline);
  /** A short sleeve over the top of an arm, along the same curve. */
  const sleeve = (d: string): DrawNode[] => {
    const s = limbs.sleeve;
    if (!s) return [];
    const width = limbs.armWidth + s.extraWidth;
    return outlinedStroke(d, width, s.color, outline, {
      dash: [s.length, 2],
    });
  };

  // Points on the torso, moved with it.
  const t0 = parts.torso;
  const torsoScale = rig.scales.torso ?? 1;
  const onTorso = (p: Pt) =>
    add(
      pose.hip,
      rotate(
        {
          x: (p.x - t0.pivot.x) * torsoScale,
          y: (p.y - t0.pivot.y) * torsoScale,
        },
        pose.torsoAngle,
      ),
    );
  const neck = onTorso(rig.torso.neck);

  // Legs bend at the knee towards the front.
  const ankleHeight = rig.ankleHeight * rig.scales.foot;
  const leg = (
    hipOnTorso: Pt,
    footAt: Pt,
    footAngle: number,
    follow: number,
  ) => {
    const hip = onTorso(hipOnTorso);
    const ankle = { x: footAt.x, y: footAt.y - ankleHeight };
    const c = hoseControl(hip, ankle, limbs.legLength, -1);
    // How far the shin leans from straight down, positive with the ankle
    // behind the knee.
    const shin = endAngle(c, ankle) - Math.PI / 2;
    const angle = footAngle + (shin - footAngle) * follow;
    return {
      hip,
      knee: curveMiddle(hip, c, ankle),
      ankle,
      limb: hose(curve(hip, c, ankle), limbs.legWidth, limbs.legColor),
      foot: piece(
        'foot',
        pinned(ankle, angle, rig.scales.foot, parts.foot.pivot),
      ),
    };
  };
  const nearLeg = leg(
    rig.torso.hipNear,
    pose.footNear,
    pose.footNearAngle,
    pose.footNearFollow,
  );
  const farLeg = leg(
    rig.torso.hipFar,
    pose.footFar,
    pose.footFarAngle,
    pose.footFarFollow,
  );

  // Arms bend at the elbow towards the back.
  const arm = (shoulderOnTorso: Pt, hand: Pt) => {
    const shoulder = onTorso(shoulderOnTorso);
    const wrist = add(shoulder, hand);
    const c = hoseControl(shoulder, wrist, limbs.armLength, 1);
    const d = curve(shoulder, c, wrist);
    return {
      shoulder,
      elbow: curveMiddle(shoulder, c, wrist),
      wrist,
      tangent: endAngle(c, wrist),
      nodes: [...hose(d, limbs.armWidth), ...sleeve(d)],
    };
  };
  // The clips place the hands for the boy. If the rig has a staff, the near
  // hand stays near the hold point of the rig and keeps only a part of the
  // motion of the clip, so that the staff doesn't cross the face.
  const staff = rig.staff && parts.staff ? rig.staff : undefined;
  const handNear = staff
    ? add(
        staff.hold,
        mix(
          { x: 0, y: 0 },
          sub(pose.handNear, hang(0, NEAR_ARM_REST)),
          staff.follow,
        ),
      )
    : pose.handNear;
  const nearArm = arm(rig.torso.shoulderNear, handNear);
  const farArm = arm(rig.torso.shoulderFar, pose.handFar);
  const hand = (
    a: typeof nearArm,
    open: boolean,
    angle: number,
  ): SlotDrawing => {
    const id = open ? 'handOpen' : 'hand';
    const offset = deg(open ? rig.hands.openAngle : rig.hands.relaxedAngle);
    return piece(
      id,
      pinned(
        a.wrist,
        a.tangent + offset + angle,
        open ? (rig.scales.handOpen ?? rig.scales.hand) : rig.scales.hand,
        parts[id].pivot,
      ),
    );
  };

  /** The fist around the staff, and the staff behind the arm. */
  const staffHand = (s: NonNullable<typeof staff>) => {
    const turn = pose.torsoAngle + s.turn * pose.handNearAngle;
    const fist = turn + deg(s.handAngle);
    const grip = add(
      nearArm.wrist,
      rotate(
        {
          x: (s.grip.x - parts.hand.pivot.x) * rig.scales.hand,
          y: (s.grip.y - parts.hand.pivot.y) * rig.scales.hand,
        },
        fist,
      ),
    );
    return {
      staff: piece('staff', pinned(grip, turn, s.scale, parts.staff!.pivot)),
      hand: piece(
        'hand',
        pinned(nearArm.wrist, fist, rig.scales.hand, parts.hand.pivot),
      ),
    };
  };
  const held = staff ? staffHand(staff) : undefined;

  const headTransform = pinned(
    neck,
    pose.torsoAngle + pose.headAngle,
    rig.scales.head,
    parts.head.pivot,
  );
  // The far side of the body is a little darker, so the limbs read apart.
  const character = arrange(rig, {
    armFar: { nodes: farArm.nodes },
    handFar: hand(farArm, false, pose.handFarAngle),
    legFar: { nodes: farLeg.limb },
    footFar: farLeg.foot,
    legNear: { nodes: nearLeg.limb },
    footNear: nearLeg.foot,
    torso: piece(
      'torso',
      pinned(pose.hip, pose.torsoAngle, torsoScale, t0.pivot),
    ),
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
    staff: held?.staff,
    armNear: { nodes: nearArm.nodes },
    handNear:
      held?.hand ?? hand(nearArm, pose.handNearOpen > 0.5, pose.handNearAngle),
  });

  const node = placed(rig.shadow, facing, character);

  const pivots = {
    hip: pose.hip,
    neck,
    shoulderNear: nearArm.shoulder,
    elbowNear: nearArm.elbow,
    wristNear: nearArm.wrist,
    shoulderFar: farArm.shoulder,
    elbowFar: farArm.elbow,
    wristFar: farArm.wrist,
    hipNear: nearLeg.hip,
    kneeNear: nearLeg.knee,
    ankleNear: nearLeg.ankle,
    hipFar: farLeg.hip,
    kneeFar: farLeg.knee,
    ankleFar: farLeg.ankle,
  };
  const j = pivots;
  return {
    node,
    rigOutline: rigOutline(
      pivots,
      [
        [j.hip, j.neck],
        [j.shoulderNear, j.elbowNear, j.wristNear],
        [j.shoulderFar, j.elbowFar, j.wristFar],
        [j.hipNear, j.kneeNear, j.ankleNear],
        [j.hipFar, j.kneeFar, j.ankleFar],
      ],
      facing,
    ),
  };
}

/**
 * The head and the face drawn on it, in head pixels: lids for blinking, and a
 * mouth over the patch that covers the traced one.
 */
function headNodes(
  rig: CutoutRig,
  face: CutoutFrame['face'],
  part: (id: RigPartId, transform: Matrix) => DrawNode,
): DrawNode[] {
  const f = rig.face;
  const { colors } = rig;
  const nodes: DrawNode[] = [part('head', [1, 0, 0, 1, 0, 0])];

  nodes.push(...eyeLids(f, face.blink, colors));

  if (face.talking && rig.parts.mouthPatch) {
    // A closed mouth is the smile line alone; an open one is a filled shape
    // with the tongue inside and the outline around it.
    const open = face.open > 0.02;
    const shape = open ? mouthShape(f, face.open) : upperLip(f);
    const line = {
      stroke: colors.line,
      lineCap: 'round',
      lineJoin: 'round',
    } as const;
    nodes.push(part('mouthPatch', [1, 0, 0, 1, 0, 0]));
    if (open) {
      nodes.push(
        { type: 'path', d: shape, fill: colors.mouth },
        {
          type: 'group',
          clip: { type: 'path', d: shape },
          children: [
            { type: 'ellipse', ...tongue(f, face.open), fill: colors.tongue },
          ],
        },
      );
    }
    nodes.push(
      { type: 'path', d: shape, ...line, strokeWidth: 5 },
      { type: 'path', d: f.mouth.corner, ...line, strokeWidth: 4 },
    );
  }
  return nodes;
}
