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

/** The clips of a prop, in the order the studio lists them. */
export const PROP_CLIPS: readonly Clip<PropFrame>[] = [idle, rustle];
