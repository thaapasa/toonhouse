// Turns a rig and a clip frame into a list of things to draw. The output is
// plain data, so that the editor can draw it as SVG and export on a canvas.
import type {
  ClipFrame,
  CutoutFrame,
  CutoutRig,
  Matrix,
  PartId,
  Pt,
  Rig,
  RigPartId,
} from '@toonhouse/model';

import { drawBird } from './bird.ts';
import { eyeLids, mouthShape, tongue, upperLip } from './face.ts';
import {
  add,
  curveMiddle,
  deg,
  hoseControl,
  pinned,
  rotate,
  scaling,
  sub,
} from './math.ts';

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
      clip?: ClipShape;
      children: DrawNode[];
    }
  | {
      /** A traced piece of the rig, drawn in its own pixels. */
      type: 'part';
      part: PartId;
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
  shadow: { rx: number; ry: number },
  facing: 1 | -1,
  children: DrawNode[],
): DrawNode {
  return {
    type: 'group',
    children: [
      {
        type: 'ellipse',
        cx: 0,
        cy: 0,
        rx: shadow.rx,
        ry: shadow.ry,
        fill: '#000',
        opacity: 0.18,
      },
      { type: 'group', transform: scaling(facing, 1), children },
    ],
  };
}

function drawCutout(
  rig: CutoutRig,
  frame: CutoutFrame,
  { facing }: DrawOptions,
): CharacterDrawing {
  const { pose } = frame;
  const { parts, limbs, colors } = rig;
  const part = (id: RigPartId, transform: Matrix): DrawNode => {
    const p = id === 'mouthPatch' ? parts.mouthPatch! : parts[id];
    return {
      type: 'part',
      part: id,
      width: p.width,
      height: p.height,
      transform,
    };
  };

  /** A rubber-hose limb: an outline stroke under a fill stroke. */
  const hose = (d: string, width: number): DrawNode[] => [
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
      stroke: colors.skin,
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
  const onTorso = (p: Pt) =>
    add(pose.hip, rotate(sub(p, t0.pivot), pose.torsoAngle));
  const neck = onTorso(rig.torso.neck);

  // Legs bend at the knee towards the front.
  const ankleHeight = rig.ankleHeight * rig.scales.foot;
  const leg = (hipOnTorso: Pt, footAt: Pt, angle: number) => {
    const hip = onTorso(hipOnTorso);
    const ankle = { x: footAt.x, y: footAt.y - ankleHeight };
    const c = hoseControl(hip, ankle, limbs.legLength, -1);
    return {
      hip,
      knee: curveMiddle(hip, c, ankle),
      ankle,
      limb: hose(curve(hip, c, ankle), limbs.legWidth),
      foot: part(
        'foot',
        pinned(ankle, angle, rig.scales.foot, parts.foot.pivot),
      ),
    };
  };
  const nearLeg = leg(rig.torso.hipNear, pose.footNear, pose.footNearAngle);
  const farLeg = leg(rig.torso.hipFar, pose.footFar, pose.footFarAngle);

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
  const nearArm = arm(rig.torso.shoulderNear, pose.handNear);
  const farArm = arm(rig.torso.shoulderFar, pose.handFar);
  const hand = (a: typeof nearArm, open: boolean, angle: number): DrawNode => {
    const id = open ? 'handOpen' : 'hand';
    const offset = deg(open ? rig.hands.openAngle : rig.hands.relaxedAngle);
    return part(
      id,
      pinned(
        a.wrist,
        a.tangent + offset + angle,
        rig.scales.hand,
        parts[id].pivot,
      ),
    );
  };

  const character: DrawNode[] = [
    // The far side of the body is a little darker, so the limbs read apart.
    {
      type: 'group',
      shade: rig.farShade,
      children: [
        ...farArm.nodes,
        hand(farArm, false, pose.handFarAngle),
        ...farLeg.limb,
        farLeg.foot,
      ],
    },
    ...nearLeg.limb,
    part('torso', pinned(pose.hip, pose.torsoAngle, 1, t0.pivot)),
    nearLeg.foot,
    {
      type: 'group',
      transform: pinned(
        neck,
        pose.torsoAngle + pose.headAngle,
        rig.scales.head,
        parts.head.pivot,
      ),
      children: headNodes(rig, frame.face, part),
    },
    ...nearArm.nodes,
    hand(nearArm, pose.handNearOpen > 0.5, pose.handNearAngle),
  ];

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

  if (!face.grin && rig.parts.mouthPatch) {
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
