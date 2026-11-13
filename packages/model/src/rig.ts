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

/** The parts of the face that are drawn in code, in head pixels. */
export interface CutoutFace {
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

export type Rig = CutoutRig;
