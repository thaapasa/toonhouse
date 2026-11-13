import type { Pt } from './geometry.ts';

/**
 * The body of a cutout character at one moment, in sheet pixels, y down. The
 * origin is the ground point under the character, and the character faces +x.
 */
export interface Pose {
  /** Middle of the hips. */
  hip: Pt;
  torsoAngle: number;
  /** Rotation of the head against the torso. */
  headAngle: number;
  /** Wrists relative to the shoulders. */
  handNear: Pt;
  handFar: Pt;
  handNearAngle: number;
  handFarAngle: number;
  /** 0 is the relaxed hand, 1 the open hand. */
  handNearOpen: number;
  /** Ankles on the ground, relative to the origin. */
  footNear: Pt;
  footFar: Pt;
  footNearAngle: number;
  footFarAngle: number;
}

/** The expression at one moment. */
export interface Face {
  /** Show the mouth that the head was traced with, instead of a drawn one. */
  grin: boolean;
  /** 0 is a closed smile, 1 a wide open mouth. */
  open: number;
  /** 0 is an open eye, 1 a closed one. */
  blink: number;
}

/** What a clip gives for one moment. */
export interface ClipFrame {
  pose: Pose;
  face: Face;
  /**
   * How far the character has moved forward since the start of the clip, in
   * sheet pixels. A walk in place uses this to move the ground under the feet.
   */
  travel: number;
}

export type ClipId = 'idle' | 'walk' | 'wave' | 'talk';

/** An animation. The frame at `t` depends only on `t`. */
export interface Clip {
  id: ClipId;
  /** Length in seconds. A looping clip ends where it starts. */
  duration: number;
  loops: boolean;
  frameAt(t: number): ClipFrame;
}
