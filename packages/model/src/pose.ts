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

/**
 * The body of a bird at one moment, in sheet pixels, y down. The origin is the
 * ground point under the bird, and the bird faces +x.
 */
export interface BirdPose {
  /** The pivot of the body, between the hips. */
  hip: Pt;
  bodyAngle: number;
  /**
   * The base of the head against the neck point on the body, along the body.
   * A bird moves its head forward and back, so this is a point and not only
   * an angle.
   */
  head: Pt;
  /** Rotation of the head against the body. */
  headAngle: number;
  /** Rotation of each wing against the body. */
  wingNearAngle: number;
  wingFarAngle: number;
  /** 0 is a folded wing, 1 an open one. */
  wingNearOpen: number;
  wingFarOpen: number;
  /** Ankles relative to the origin. */
  footNear: Pt;
  footFar: Pt;
  footNearAngle: number;
  footFarAngle: number;
}

/** The expression of a bird at one moment. */
export interface BirdFace {
  /** 0 is a closed beak, 1 a wide open one. */
  open: number;
  /** 0 is an open eye, 1 a closed one. */
  blink: number;
}

/**
 * The body of a rabbit at one moment, in sheet pixels, y down. The origin is
 * the ground point under the rabbit, and the rabbit faces +x.
 */
export interface RabbitPose {
  /** The pivot of the body, the hip. */
  hip: Pt;
  bodyAngle: number;
  /** Rotation of the head against the body. */
  headAngle: number;
  /** Rotation of each ear against the head. 0 stands straight up. */
  earNearAngle: number;
  earFarAngle: number;
  /** Bottoms of the front paws, relative to the origin. */
  pawNear: Pt;
  pawFar: Pt;
  /** Heels of the hind feet, relative to the origin. */
  footNear: Pt;
  footFar: Pt;
  footNearAngle: number;
  footFarAngle: number;
}

/** The expression of a rabbit at one moment. */
export interface RabbitFace {
  /** 0 is a closed smile, 1 a wide open mouth. */
  open: number;
  /** 0 is an open eye, 1 a closed one. */
  blink: number;
}

interface FrameBase {
  /**
   * How far the character has moved forward since the start of the clip, in
   * sheet pixels. A walk in place uses this to move the ground under the feet.
   */
  travel: number;
}

/** What a clip of a cutout character gives for one moment. */
export interface CutoutFrame extends FrameBase {
  kind: 'cutout';
  pose: Pose;
  face: Face;
}

/** What a clip of a bird gives for one moment. */
export interface BirdFrame extends FrameBase {
  kind: 'bird';
  pose: BirdPose;
  face: BirdFace;
}

/** What a clip of a rabbit gives for one moment. */
export interface RabbitFrame extends FrameBase {
  kind: 'rabbit';
  pose: RabbitPose;
  face: RabbitFace;
}

export type ClipFrame = CutoutFrame | BirdFrame | RabbitFrame;

export type ClipId =
  'idle' | 'walk' | 'wave' | 'talk' | 'peck' | 'flap' | 'hop' | 'lookout';

/**
 * An animation for the rigs of one kind. The frame at `t` depends only on
 * `t`.
 */
export interface Clip<F extends ClipFrame = ClipFrame> {
  id: ClipId;
  kind: F['kind'];
  /** Length in seconds. A looping clip ends where it starts. */
  duration: number;
  loops: boolean;
  frameAt(t: number): F;
}
