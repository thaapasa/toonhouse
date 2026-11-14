import type { Pt } from './geometry.ts';

/**
 * A part of a character: traced SVG drawings in the pixels of the part. The
 * `svg` file is the main layer, and the drawings that the renderer adds to the
 * part, such as the eyelids on the head, go with it.
 */
export interface RigPart {
  /** The SVG file of the main layer, next to the rig file. */
  svg: string;
  width: number;
  height: number;
  /** The joint that the piece rotates around. */
  pivot: Pt;
  /**
   * More layers of the part, such as the back hair and the front hair of the
   * head. They are drawn in the pixels of the part, so they move with it, and
   * each has its own entry in the draw order.
   */
  layers?: RigLayer[];
}

/** A layer of a part, other than the main layer. */
export interface RigLayer {
  /** A camelCase name, unique within the part, such as `frontHair`. */
  id: string;
  /** The SVG file, next to the rig file, the same size as the part. */
  svg: string;
}

/** The fields that every kind of rig has. */
interface RigBase {
  /**
   * The draw order of the rig, from the back to the front, as the ids of its
   * draw entries. The renderer has a default order for each rig kind. It
   * uses that if this is not set, and it puts the entries that this leaves out
   * after the entry before them in the default order.
   */
  drawOrder?: string[];
}

export type RigPartId =
  'head' | 'mouthPatch' | 'torso' | 'hand' | 'handOpen' | 'foot' | 'staff';

/**
 * A cutout character: traced pieces for the head, the torso, the hands and the
 * feet, with rubber-hose arms and legs drawn between them. The far hand and
 * foot reuse the pieces of the near ones. All lengths are in the pixels of the
 * parts sheet, which is also the unit of a pose.
 */
export interface CutoutRig extends RigBase {
  kind: 'cutout';
  parts: Record<Exclude<RigPartId, 'mouthPatch' | 'staff'>, RigPart> & {
    /** Covers the mouth that the head was traced with. Drawn in head pixels. */
    mouthPatch?: RigPart;
    /**
     * A staff held in the near hand. The pivot is the point on the staff
     * that sits in the fist.
     */
    staff?: RigPart;
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
    /** The color of the legs, if not the skin, such as for trousers. */
    legColor?: string;
  };
  /** How the near hand holds the staff, if the rig has one. */
  staff?: StaffHold;
  colors: {
    outline: string;
    skin: string;
    /** Lines drawn on the face: the lash line and the mouth. */
    line: string;
    lid: string;
    mouth: string;
    tongue: string;
  };
  /**
   * Draw the near foot behind the torso, for clothes that reach the ground,
   * such as a long robe. Otherwise the near foot is drawn over the torso.
   * This sets the default draw order, so it has no effect if the rig has a
   * draw order of its own.
   */
  feetBehindTorso?: boolean;
  /** Brightness of the far arm and leg, from 0 to 1. */
  farShade: number;
  shadow: { rx: number; ry: number };
  face: CutoutFace;
}

/**
 * A staff in the near hand. The clips move the hands for the proportions of
 * the boy, so the rig moves the near hand to where it holds the staff. The
 * hand stays a fist, also when a clip opens it, and the staff stays upright
 * apart from the lean of the torso and a part of the turn of the hand.
 */
export interface StaffHold {
  /** The near wrist against the near shoulder, when standing. */
  hold: Pt;
  /** How much of the motion of the near hand in the clip to keep, 0 to 1. */
  follow: number;
  /**
   * How much the staff turns with the hand angle of the clip. A negative
   * value turns it the other way, so that the top tips forward when the clip
   * tips an open hand back, as in the wave.
   */
  turn: number;
  /** Rotation of the fist, in degrees. 0 is the relaxed hand hanging down. */
  handAngle: number;
  /** The point in the fist that the staff goes through, in hand pixels. */
  grip: Pt;
  scale: number;
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
export interface BirdRig extends RigBase {
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
export interface RabbitRig extends RigBase {
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
