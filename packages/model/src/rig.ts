import type { Pt } from './geometry.ts';

/** A traced SVG piece of a character, in the pixels of the piece. */
export interface RigPart {
  /** The SVG file, next to the rig file. */
  svg: string;
  width: number;
  height: number;
  /** The joint that the piece rotates around. */
  pivot: Pt;
}

export type RigPartId =
  'head' | 'mouthPatch' | 'torso' | 'hand' | 'handOpen' | 'foot';

/**
 * A cutout character: traced pieces for the head, the torso, the hands and the
 * feet, with rubber-hose arms and legs drawn between them. The far hand and
 * foot reuse the pieces of the near ones. All lengths are in the pixels of the
 * parts sheet, which is also the unit of a pose.
 */
export interface CutoutRig {
  kind: 'cutout';
  parts: Record<Exclude<RigPartId, 'mouthPatch'>, RigPart> & {
    /** Covers the mouth that the head was traced with. Drawn in head pixels. */
    mouthPatch?: RigPart;
  };
  /** Joints on the torso, in torso pixels. The torso pivot is the hip middle. */
  torso: {
    neck: Pt;
    shoulderNear: Pt;
    shoulderFar: Pt;
    hipNear: Pt;
    hipFar: Pt;
  };
  /** The pieces come from the sheet at different scales; these even them. */
  scales: { head: number; hand: number; foot: number };
  /** Rotation of each hand piece against the end of the arm, in degrees. */
  hands: { relaxedAngle: number; openAngle: number };
  /** Height of the ankle above the sole, in foot pixels. */
  ankleHeight: number;
  limbs: {
    armLength: number;
    legLength: number;
    armWidth: number;
    legWidth: number;
    outlineWidth: number;
    /** A short sleeve over the top of each arm. */
    sleeve?: { color: string; length: number; extraWidth: number };
  };
  colors: {
    outline: string;
    skin: string;
    /** Lines drawn on the face: the lash line and the mouth. */
    line: string;
    lid: string;
    mouth: string;
    tongue: string;
  };
  /** Brightness of the far arm and leg, from 0 to 1. */
  farShade: number;
  shadow: { rx: number; ry: number };
  face: CutoutFace;
}

/** An eye with lids drawn in code, in head pixels. */
export interface EyeFace {
  /**
   * The box of the eye as an ellipse. The lids move from its top and bottom to
   * `shutY`, and are clipped to it.
   */
  eye: { cx: number; cy: number; rx: number; ry: number };
  /**
   * The outline of the eye as SVG path data, for an eye that an ellipse does
   * not fit, such as one with an eyeliner wing. If it is set, the lids are
   * clipped to it instead of to `eye`.
   */
  eyeClip?: string;
  /** Where the lids meet when the eye is closed. */
  shutY: number;
}

/** The parts of the face that are drawn in code, in head pixels. */
export interface CutoutFace extends EyeFace {
  mouth: {
    back: Pt;
    front: Pt;
    /** Control point of the upper lip curve. */
    control: Pt;
    /** How far the lower lip drops when the mouth is fully open. */
    openDepth: number;
    /** The dimple at the back corner, as SVG path data. */
    corner: string;
    tongue: {
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      /** How far the tongue moves down and grows when fully open. */
      drop: number;
      grow: number;
    };
  };
}

export type BirdPartId = 'head' | 'body' | 'wing' | 'wingOpen' | 'foot';

/**
 * A bird: traced pieces for the head, the body with the tail, the wings and
 * the feet. The neck and the legs are drawn in code. Each leg has two straight
 * bones, a feathered thigh and a bare shank, with the joint between them
 * bending backwards. All lengths are in the pixels of the parts sheet, which is
 * also the unit of a pose.
 */
export interface BirdRig {
  kind: 'bird';
  parts: Record<BirdPartId, RigPart>;
  /**
   * Joints on the body, in body pixels. The body pivot is between the hips.
   * The shoulders are where the wings turn.
   */
  body: {
    neck: Pt;
    shoulderNear: Pt;
    shoulderFar: Pt;
    hipNear: Pt;
    hipFar: Pt;
  };
  scales: { head: number; wing: number; wingOpen: number; foot: number };
  /** Rotation of each wing piece against the body, in degrees. */
  wings: { foldedAngle: number; openAngle: number };
  neck: { width: number };
  /** Height of the ankle above the sole, in foot pixels. */
  ankleHeight: number;
  legs: {
    thighLength: number;
    shankLength: number;
    thighWidth: number;
    shankWidth: number;
  };
  outlineWidth: number;
  colors: {
    outline: string;
    /** The feathers, for the neck, the thighs and the eyelids. */
    feathers: string;
    leg: string;
    line: string;
    beak: string;
    mouth: string;
  };
  /** Brightness of the far wing and leg, from 0 to 1. */
  farShade: number;
  shadow: { rx: number; ry: number };
  face: BirdHead;
}

/** The parts of a bird's face that are drawn in code, in head pixels. */
export interface BirdHead extends EyeFace {
  /**
   * The lower half of the beak. It turns down around `hinge` to open the
   * beak, and the inside of the mouth shows between the halves.
   */
  beak: {
    /** The back corner of the beak, where the lower half turns. */
    hinge: Pt;
    /**
     * The line between the halves is a quadratic curve from `hinge` through
     * `control` to `end`, under the tip of the upper half.
     */
    control: Pt;
    end: Pt;
    /** The lower half as SVG path data, closed, along the same line. */
    lower: string;
    openAngle: number;
  };
}

export type RabbitPartId = 'head' | 'ear' | 'body' | 'paw' | 'foot';

/**
 * A rabbit: traced pieces for the head, an ear, the body with the haunch and
 * the tail, a front paw and a long hind foot. Both ears use the same piece,
 * and so do both front paws and both hind feet. The front legs and the hind
 * legs are drawn in code. A hind leg has two bones from the hip to the heel,
 * with the knee bending forwards, and the long foot is the third bone. All
 * lengths are in the pixels of the parts sheet, which is also the unit of a
 * pose.
 */
export interface RabbitRig {
  kind: 'rabbit';
  parts: Record<RabbitPartId, RigPart>;
  /**
   * Joints on the body, in body pixels. The body pivot is the hip, in the
   * middle of the haunch.
   */
  body: {
    neck: Pt;
    shoulderNear: Pt;
    shoulderFar: Pt;
    hipNear: Pt;
    hipFar: Pt;
  };
  /** The roots of the ears on the head, in head pixels. */
  ears: { near: Pt; far: Pt };
  scales: { head: number; ear: number; paw: number; foot: number };
  /** Height of the heel above the sole, in foot pixels. */
  heelHeight: number;
  /** Height of the wrist above the bottom of the paw, in paw pixels. */
  wristHeight: number;
  legs: {
    /** A front leg is a rubber hose of this length. */
    armLength: number;
    armWidth: number;
    thighLength: number;
    shankLength: number;
    shankWidth: number;
  };
  outlineWidth: number;
  colors: {
    outline: string;
    fur: string;
    /** The front of the front legs and the inside of the hind legs. */
    belly: string;
    line: string;
    mouth: string;
    tongue: string;
    teeth: string;
  };
  /** Brightness of the far ear and legs, from 0 to 1. */
  farShade: number;
  shadow: { rx: number; ry: number };
  face: RabbitHead;
}

/** The parts of a rabbit's face that are drawn in code, in head pixels. */
export interface RabbitHead extends EyeFace {
  /**
   * The traced smile is the upper lip. An open mouth is the same curve closed
   * by a lower curve that drops by up to `openDepth`.
   */
  mouth: {
    back: Pt;
    front: Pt;
    control: Pt;
    openDepth: number;
    /** The two front teeth, as SVG path data, under the upper lip. */
    teeth: string;
  };
}

export type Rig = CutoutRig | BirdRig | RabbitRig;
export type RigKind = Rig['kind'];
/** A piece of any rig. */
export type PartId = RigPartId | BirdPartId | RabbitPartId;
