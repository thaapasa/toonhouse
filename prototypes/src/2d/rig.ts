import type { Pt } from './math.ts';

/** A traced piece of the character, with its points in the piece's pixels. */
export interface PartData {
  svg: string;
  width: number;
  height: number;
  /** The joint that the piece rotates around. */
  pivot: Pt;
}

export interface TorsoData extends PartData {
  /** The pivot of the torso is the middle of the hips. */
  neck: Pt;
  shoulder: Pt;
  hipNear: Pt;
  hipFar: Pt;
}

/** The contents of `public/2d/rig.json`. */
export interface RigData {
  head: PartData;
  torso: TorsoData;
  hand: PartData;
  handOpen: PartData;
  foot: PartData;
  outline: string;
  skin: string;
  /** Arm and leg lengths and thicknesses, in the pixels of the sheet. */
  armLength: number;
  legLength: number;
  armWidth: number;
  legWidth: number;
  outlineWidth: number;
  /** The pieces come from the sheet at different scales; these even them. */
  headScale: number;
  footScale: number;
  handScale: number;
}

/** The pose of the character at one moment, in sheet pixels, y down. */
export interface Pose {
  /** Middle of the hips, relative to the ground point under the character. */
  hip: Pt;
  torsoAngle: number;
  headAngle: number;
  /** Wrists relative to the shoulder, ankles relative to the ground point. */
  handNear: Pt;
  handFar: Pt;
  handNearAngle: number;
  handFarAngle: number;
  /** 0 is the relaxed hand, 1 the open hand. */
  handNearOpen: number;
  footNear: Pt;
  footFar: Pt;
  footNearAngle: number;
  footFarAngle: number;
}
