import type { Clip, PropFrame } from '@toonhouse/model';

const still = (): PropFrame => ({
  kind: 'prop',
  pose: { wind: 0, cycle: 0 },
  travel: 0,
});

/** Still air: the prop stands as drawn. */
export const idle: Clip<PropFrame> = {
  id: 'idle',
  kind: 'prop',
  duration: 4,
  loops: true,
  frameAt: still,
};

const RUSTLE = 6;

/**
 * Wind in the leaves. The bones sway as far as the rig sets, and the wind
 * comes in gusts, a little stronger and weaker twice in a loop.
 */
export const rustle: Clip<PropFrame> = {
  id: 'rustle',
  kind: 'prop',
  duration: RUSTLE,
  loops: true,
  frameAt(t) {
    const cycle = (((t / RUSTLE) % 1) + 1) % 1;
    const wind = 0.8 + 0.2 * Math.sin(2 * 2 * Math.PI * cycle);
    return { kind: 'prop', pose: { wind, cycle }, travel: 0 };
  },
};

/** In full wind, a prop sways `1 + WIND_SWAY` times as far as in still air. */
const WIND_SWAY = 1.5;

/**
 * The frame of a prop clip in the wind of the weather, from -1 to 1. The
 * clip gives the gusts, and a stronger wind either way makes them sway more.
 * In still air, `rustle` still sways gently, and `idle` stays still in any
 * wind.
 */
export const inWind = (frame: PropFrame, wind: number): PropFrame => ({
  ...frame,
  pose: {
    ...frame.pose,
    wind: frame.pose.wind * (1 + WIND_SWAY * Math.min(1, Math.abs(wind))),
  },
});

/** The clips of a prop, in the order the studio lists them. */
export const PROP_CLIPS: readonly Clip<PropFrame>[] = [idle, rustle];
