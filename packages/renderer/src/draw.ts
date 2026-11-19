// Turns a rig and a clip frame into a list of things to draw. The output is
// plain data, so that the editor can draw it as SVG and export on a canvas.
import type {
  ClipFrame,
  CutoutFrame,
  CutoutRig,
  Matrix,
  PartId,
  Pose,
  Pt,
  Rig,
  RigPartId,
} from '@toonhouse/model';

import { drawBird } from './bird.ts';
import { hang, HIP_HEIGHT, NEAR_ARM_REST } from './clips/body.ts';
import { eyeLids, mouthShape, tongue, upperLip } from './face.ts';
import {
  add,
  curveMiddle,
  deg,
  hoseControl,
  IDENTITY,
  mix,
  multiply,
  pinned,
  rotate,
  scaling,
  sub,
} from './math.ts';
import { arrange, layered, type SlotDrawing } from './order.ts';
import { drawProp } from './prop.ts';
import { drawRabbit } from './rabbit.ts';

/** A shape that clips a group. */
export type ClipShape =
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'path'; d: string };

export interface PathStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  lineCap?: 'round';
  lineJoin?: 'round';
  /** Dash lengths, measured with the whole path as length 1. */
  dash?: readonly number[];
}

export type DrawNode =
  | {
      type: 'group';
      transform?: Matrix;
      /** Brightness of everything in the group, from 0 to 1. */
      shade?: number;
      /**
       * The actor that the parts in the group belong to, such as a
       * character on a background. The parts of each actor have their own
       * ids, so a drawing of several actors looks them up by actor.
       */
      actor?: string;
      clip?: ClipShape;
      children: DrawNode[];
    }
  | {
      /** A layer of a part of the rig, drawn in the pixels of the part. */
      type: 'part';
      part: PartId;
      /** The layer, if not the main layer of the part. */
      layer?: string;
      width: number;
      height: number;
      transform: Matrix;
    }
  | ({ type: 'path'; d: string } & PathStyle)
  | {
      type: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill: string;
      opacity?: number;
    }
  | {
      /** One line of text, with `x` and `y` at the start of its baseline. */
      type: 'text';
      x: number;
      y: number;
      text: string;
      /** The CSS font family. */
      font: string;
      size: number;
      fill: string;
      bold?: boolean;
      italic?: boolean;
      /** Which point of the line `x` is at. */
      anchor: 'start' | 'middle' | 'end';
    }
  | {
      type: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
    };

/** The joints of the character, for showing the rig in the studio. */
export interface Skeleton {
  joints: { name: string; at: Pt }[];
  /** Chains of joints, drawn as lines. */
  bones: Pt[][];
}

export interface CharacterDrawing {
  node: DrawNode;
  skeleton: Skeleton;
}

export interface DrawOptions {
  /** 1 faces right, -1 faces left. */
  facing: 1 | -1;
}

const fmt = (n: number) => Math.round(n * 100) / 100;
const curve = (a: Pt, c: Pt, b: Pt) =>
  `M${fmt(a.x)} ${fmt(a.y)}Q${fmt(c.x)} ${fmt(c.y)} ${fmt(b.x)} ${fmt(b.y)}`;
/** Tangent angle at the end of the quadratic curve a-c-b. */
const endAngle = (c: Pt, b: Pt) => Math.atan2(b.y - c.y, b.x - c.x);

/**
 * Draws a character with its ground point at the origin, in sheet pixels,
 * y down. The frame must come from a clip for the kind of the rig.
 */
export function drawCharacter(
  rig: Rig,
  frame: ClipFrame,
  options: DrawOptions,
): CharacterDrawing {
  if (rig.kind === 'cutout' && frame.kind === 'cutout') {
    return drawCutout(rig, frame, options);
  }
  if (rig.kind === 'bird' && frame.kind === 'bird') {
    return drawBird(rig, frame, options);
  }
  if (rig.kind === 'rabbit' && frame.kind === 'rabbit') {
    return drawRabbit(rig, frame, options);
  }
  if (rig.kind === 'prop' && frame.kind === 'prop') {
    return drawProp(rig, frame, options);
  }
  throw new Error(`A ${frame.kind} clip does not work on a ${rig.kind} rig`);
}

/** Lines through points, one list of points for each chain of bones. */
export function skeleton(
  joints: Record<string, Pt>,
  chains: Pt[][],
  facing: 1 | -1,
): Skeleton {
  const flip = (p: Pt): Pt => ({ x: p.x * facing, y: p.y });
  return {
    joints: Object.entries(joints).map(([name, at]) => ({
      name,
      at: flip(at),
    })),
    bones: chains.map((chain) => chain.map(flip)),
  };
}

/** The ground shadow and the character, turned to face either way. */
export function placed(
  shadow: { rx: number; ry: number } | undefined,
  facing: 1 | -1,
  children: DrawNode[],
): DrawNode {
  const under: DrawNode[] = shadow
    ? [
        {
          type: 'ellipse',
          cx: 0,
          cy: 0,
          rx: shadow.rx,
          ry: shadow.ry,
          fill: '#000',
          opacity: 0.18,
        },
      ]
    : [];
  return {
    type: 'group',
    children: [
      ...under,
      { type: 'group', transform: scaling(facing, 1), children },
    ],
  };
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The box around the parts of a drawing, or null if it has none. The drawn
 * limbs and the shadow don't count, so this is a little smaller than what
 * shows.
 */
export function partBounds(node: DrawNode): Bounds | null {
  const xs: number[] = [];
  const ys: number[] = [];
  const visit = (n: DrawNode, m: Matrix) => {
    if (n.type === 'group') {
      const g = n.transform ? multiply(m, n.transform) : m;
      n.children.forEach((c) => visit(c, g));
    } else if (n.type === 'part') {
      const t = multiply(m, n.transform);
      for (const [x, y] of [
        [0, 0],
        [n.width, 0],
        [0, n.height],
        [n.width, n.height],
      ] as const) {
        xs.push(t[0] * x + t[2] * y + t[4]);
        ys.push(t[1] * x + t[3] * y + t[5]);
      }
    }
  };
  visit(node, IDENTITY);
  if (xs.length === 0) return null;
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

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

function drawCutout(
  rig: CutoutRig,
  frame: CutoutFrame,
  { facing }: DrawOptions,
): CharacterDrawing {
  const pose = fittedPose(rig, frame.pose);
  const { parts, limbs, colors } = rig;
  const part = (id: RigPartId, transform: Matrix, layer?: string): DrawNode => {
    const p = parts[id]!;
    return {
      type: 'part',
      part: id,
      ...(layer === undefined ? {} : { layer }),
      width: p.width,
      height: p.height,
      transform,
    };
  };
  /** A part with all its layers, placed with one transform. */
  const piece = (id: RigPartId, transform: Matrix): SlotDrawing =>
    layered(parts[id]!, (layer) => [part(id, transform, layer)]);

  /** A rubber-hose limb: an outline stroke under a fill stroke. */
  const hose = (
    d: string,
    width: number,
    color: string = colors.skin,
  ): DrawNode[] => [
    {
      type: 'path',
      d,
      stroke: colors.outline,
      strokeWidth: width + 2 * limbs.outlineWidth,
      lineCap: 'round',
    },
    {
      type: 'path',
      d,
      stroke: color,
      strokeWidth: width,
      lineCap: 'round',
    },
  ];
  /** A short sleeve over the top of an arm, along the same curve. */
  const sleeve = (d: string): DrawNode[] => {
    const s = limbs.sleeve;
    if (!s) return [];
    const dash = [s.length, 2];
    const width = limbs.armWidth + s.extraWidth;
    return [
      {
        type: 'path',
        d,
        stroke: colors.outline,
        strokeWidth: width + 2 * limbs.outlineWidth,
        lineCap: 'round',
        dash,
      },
      {
        type: 'path',
        d,
        stroke: s.color,
        strokeWidth: width,
        lineCap: 'round',
        dash,
      },
    ];
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

  const joints = {
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
  const j = joints;
  return {
    node,
    skeleton: skeleton(
      joints,
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
