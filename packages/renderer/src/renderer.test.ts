import type {
  BirdRig,
  CutoutRig,
  PropRig,
  RabbitRig,
  Rig,
} from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import testTree from '../../../assets/fixtures/props/test-tree/rig.json';
import boy from '../../../assets/packs/sunny/characters/blond-boy/rig.json';
import bunny from '../../../assets/packs/sunny/characters/bunny/rig.json';
import chicken from '../../../assets/packs/sunny/characters/hen/rig.json';
import wizardRig from '../../../assets/packs/sunny/characters/wizard/rig.json';
import { legJoint } from './bird.ts';
import {
  BIRD_WALK_SPEED,
  clipOf,
  RABBIT_HOP_SPEED,
  restClip,
  WALK_SPEED,
} from './clips/index.ts';
import { type DrawNode, drawRig } from './draw.ts';
import { rotate, sub, twoBoneJoint } from './math.ts';
import { defaultDrawOrder, drawOrder } from './order.ts';
import { clearOfGround } from './rabbit.ts';

const rig = boy as CutoutRig;
const bird = chicken as BirdRig;
const rabbit = bunny as RabbitRig;
const wizard = wizardRig as CutoutRig;
/**
 * The wizard without the layers of its feet and its own draw order, to test
 * the default order of a rig with a long robe.
 */
const robed: CutoutRig = (() => {
  const r = {
    ...wizard,
    parts: { ...wizard.parts, foot: { ...wizard.parts.foot } },
  };
  delete r.drawOrder;
  delete r.parts.foot.layers;
  return r;
})();
const tree = testTree as PropRig;

function parts(node: DrawNode): string[] {
  if (node.type === 'part') return [node.part];
  if (node.type === 'group') return node.children.flatMap(parts);
  return [];
}

describe.each([
  ['cutout', clipOf('cutout', 'walk'), WALK_SPEED],
  ['bird', clipOf('bird', 'walk'), BIRD_WALK_SPEED],
] as const)('%s walk', (_, walk, speed) => {
  it('keeps a planted foot still against the ground', () => {
    // When the near foot is on the ground, its position plus the distance
    // travelled stays the same.
    let planted: number[] = [];
    for (let t = 0; t < walk.duration; t += 1 / 120) {
      const f = walk.frameAt(t);
      if (f.pose.footNear.y === 0) planted.push(f.pose.footNear.x + f.travel);
      else if (planted.length > 0) {
        const spread = Math.max(...planted) - Math.min(...planted);
        expect(spread).toBeLessThan(0.5);
        planted = [];
      }
    }
  });

  it('moves at the walking speed', () => {
    expect(walk.frameAt(1).travel).toBeCloseTo(speed, 6);
  });
});

describe('drawRig', () => {
  it('draws the mouth patch only while the character talks', () => {
    const talk = clipOf('cutout', 'talk');
    const drawn = (t: number) =>
      parts(drawRig(rig, talk.frameAt(t), { facing: 1 }).node);
    // Before the words, and between them with the mouth closed.
    expect(drawn(0)).not.toContain('mouthPatch');
    expect(drawn(1)).toContain('mouthPatch');
    expect(drawn(2.9)).not.toContain('mouthPatch');
    for (const clip of ['idle', 'walk'] as const) {
      const frame = clipOf('cutout', clip).frameAt(0.5);
      expect(parts(drawRig(rig, frame, { facing: 1 }).node)).not.toContain(
        'mouthPatch',
      );
    }
  });

  it('opens the hand for the wave', () => {
    const wave = clipOf('cutout', 'wave');
    expect(
      parts(drawRig(rig, wave.frameAt(0), { facing: 1 }).node),
    ).not.toContain('handOpen');
    expect(
      parts(drawRig(rig, wave.frameAt(1.5), { facing: 1 }).node),
    ).toContain('handOpen');
  });

  it('keeps the fist on the staff in the wave', () => {
    const wave = clipOf('cutout', 'wave');
    const drawn = parts(drawRig(wizard, wave.frameAt(1.5), { facing: 1 }).node);
    expect(drawn).toContain('staff');
    expect(drawn).not.toContain('handOpen');
    expect(
      parts(drawRig(rig, wave.frameAt(1.5), { facing: 1 }).node),
    ).not.toContain('staff');
  });

  it('draws the feet behind a long robe', () => {
    const frame = clipOf('cutout', 'idle').frameAt(0);
    const order = (r: CutoutRig) =>
      parts(drawRig(r, frame, { facing: 1 }).node);
    const robe = order(robed);
    expect(robe.lastIndexOf('foot')).toBeLessThan(robe.indexOf('torso'));
    const shorts = order(rig);
    expect(shorts.lastIndexOf('foot')).toBeGreaterThan(shorts.indexOf('torso'));
  });

  it('mirrors the rig outline when facing left', () => {
    const frame = clipOf('cutout', 'idle').frameAt(0);
    const right = drawRig(rig, frame, { facing: 1 }).rigOutline.pivots;
    const left = drawRig(rig, frame, { facing: -1 }).rigOutline.pivots;
    right.forEach((j, i) => {
      expect(left[i]!.at.x).toBeCloseTo(-j.at.x, 6);
      expect(left[i]!.at.y).toBeCloseTo(j.at.y, 6);
    });
  });
});

describe('motion settings', () => {
  // The boy without the motion settings of his rig file.
  const plain: CutoutRig = { ...rig };
  delete plain.motion;
  const frame = clipOf('cutout', 'walk').frameAt(0.2);
  const pivotsOf = (r: CutoutRig) =>
    Object.fromEntries(
      drawRig(r, frame, { facing: 1 }).rigOutline.pivots.map((j) => [
        j.name,
        j.at,
      ]),
    );
  const base = pivotsOf(plain);

  it('changes nothing with the defaults', () => {
    expect(pivotsOf({ ...plain, motion: {} })).toEqual(base);
    expect(
      pivotsOf({ ...plain, scales: { ...plain.scales, torso: 1 } }),
    ).toEqual(base);
  });

  it('lowers the hips but keeps the feet', () => {
    const j = pivotsOf({ ...plain, motion: { hipHeight: 236 } });
    expect(j.hip!.y).toBeCloseTo(base.hip!.y + 10, 6);
    expect(j.ankleNear).toEqual(base.ankleNear);
  });

  it('moves the feet against the hips', () => {
    const j = pivotsOf({ ...plain, motion: { feetOffset: -12 } });
    expect(j.ankleNear!.x).toBeCloseTo(base.ankleNear!.x - 12, 6);
    expect(j.hip).toEqual(base.hip);
  });

  it('moves the whole character up', () => {
    const j = pivotsOf({ ...plain, motion: { groundOffset: 5 } });
    for (const [name, at] of Object.entries(base)) {
      expect(j[name]!.x).toBeCloseTo(at.x, 6);
      expect(j[name]!.y).toBeCloseTo(at.y - 5, 6);
    }
  });

  it('scales the open hand on its own', () => {
    const wave = clipOf('cutout', 'wave').frameAt(1.5);
    const handScale = (r: CutoutRig) => {
      const find = (n: DrawNode): DrawNode | undefined =>
        n.type === 'part' && n.part === 'handOpen'
          ? n
          : n.type === 'group'
            ? n.children.map(find).find(Boolean)
            : undefined;
      const hand = find(drawRig(r, wave, { facing: 1 }).node);
      if (hand?.type !== 'part') throw new Error('no open hand');
      return Math.hypot(hand.transform[0], hand.transform[1]);
    };
    expect(handScale(plain)).toBeCloseTo(plain.scales.hand, 6);
    expect(
      handScale({ ...plain, scales: { ...plain.scales, handOpen: 0.4 } }),
    ).toBeCloseTo(0.4, 6);
  });

  it('scales the torso and its pivot points around the hips', () => {
    const j = pivotsOf({ ...plain, scales: { ...plain.scales, torso: 0.5 } });
    expect(j.hip).toEqual(base.hip);
    expect(j.neck!.x - j.hip!.x).toBeCloseTo(
      (base.neck!.x - base.hip!.x) / 2,
      6,
    );
    expect(j.neck!.y - j.hip!.y).toBeCloseTo(
      (base.neck!.y - base.hip!.y) / 2,
      6,
    );
  });
});

describe('bird', () => {
  it('opens the wings for the flap', () => {
    const flap = clipOf('bird', 'flap');
    expect(
      parts(drawRig(bird, flap.frameAt(0), { facing: 1 }).node),
    ).not.toContain('wingOpen');
    expect(parts(drawRig(bird, flap.frameAt(1), { facing: 1 }).node)).toContain(
      'wingOpen',
    );
  });

  it('bends the leg backwards and keeps the bone lengths', () => {
    const hip = { x: 0, y: 0 };
    const ankle = { x: 10, y: 90 };
    const knee = legJoint(hip, ankle, 55, 55);
    expect(Math.hypot(knee.x - hip.x, knee.y - hip.y)).toBeCloseTo(55, 6);
    expect(Math.hypot(ankle.x - knee.x, ankle.y - knee.y)).toBeCloseTo(55, 6);
    // Behind the line from the hip to the ankle.
    const cross = ankle.x * knee.y - ankle.y * knee.x;
    expect(cross).toBeGreaterThan(0);
  });

  it('paints the thighs in the thigh color if the rig has one', () => {
    const idle = clipOf('bird', 'idle').frameAt(0);
    const strokes = (r: BirdRig) =>
      JSON.stringify(drawRig(r, idle, { facing: 1 }).node);
    expect(strokes(bird)).not.toContain('#123456');
    expect(
      strokes({ ...bird, colors: { ...bird.colors, thigh: '#123456' } }),
    ).toContain('"stroke":"#123456"');
  });

  it('refuses a clip of another kind', () => {
    expect(() =>
      drawRig(bird, clipOf('cutout', 'idle').frameAt(0), {
        facing: 1,
      }),
    ).toThrow();
  });
});

describe('rabbit', () => {
  const hop = clipOf('rabbit', 'hop');

  /**
   * The positions plus the distance travelled, in each run of frames where
   * `planted` holds. Each run must stay in one place.
   */
  function plantedSpreads(
    planted: (f: ReturnType<typeof hop.frameAt>) => number | undefined,
  ) {
    const spreads: number[] = [];
    let run: number[] = [];
    for (let t = 0; t < hop.duration; t += 1 / 120) {
      const x = planted(hop.frameAt(t));
      if (x !== undefined) run.push(x);
      else if (run.length > 0) {
        spreads.push(Math.max(...run) - Math.min(...run));
        run = [];
      }
    }
    return spreads;
  }

  it('keeps a planted front paw still against the ground', () => {
    const spreads = plantedSpreads((f) =>
      f.pose.pawNear.y === 0 ? f.pose.pawNear.x + f.travel : undefined,
    );
    expect(spreads.length).toBeGreaterThan(0);
    for (const s of spreads) expect(s).toBeLessThan(0.5);
  });

  it('keeps a flat hind foot still against the ground', () => {
    const spreads = plantedSpreads((f) =>
      f.pose.footNear.y === 0 && f.pose.footNearAngle === 0
        ? f.pose.footNear.x + f.travel
        : undefined,
    );
    expect(spreads.length).toBeGreaterThan(0);
    for (const s of spreads) expect(s).toBeLessThan(0.5);
  });

  it('hops at the hopping speed on average', () => {
    expect(hop.frameAt(hop.duration).travel / hop.duration).toBeCloseTo(
      RABBIT_HOP_SPEED,
      6,
    );
  });

  it('bends the knee of a hind leg forwards', () => {
    const knee = twoBoneJoint({ x: 0, y: 0 }, { x: 10, y: 90 }, 68, 72, -1);
    expect(Math.hypot(knee.x, knee.y)).toBeCloseTo(68, 6);
    // In front of the line from the hip to the heel.
    expect(10 * knee.y - 90 * knee.x).toBeLessThan(0);
  });

  it('lifts the body so that its ground points stay above the ground', () => {
    const lookout = clipOf('rabbit', 'lookout');
    const frame = lookout.frameAt(2);
    // A point far back at the bottom of the body, which goes down when the
    // body tips back to sit up.
    const tail = { x: rabbit.parts.body.pivot.x - 150, y: 260 };
    const withTail: RabbitRig = { ...rabbit, groundPoints: [tail] };
    const hip = (r: RabbitRig) =>
      drawRig(r, frame, { facing: 1 }).rigOutline.pivots.find(
        (j) => j.name === 'hip',
      )!.at;
    const lifted = clearOfGround(withTail, frame.pose);
    const p = rotate(sub(tail, rabbit.parts.body.pivot), lifted.bodyAngle);
    expect(lifted.hip.y + p.y).toBeCloseTo(0, 6);
    expect(hip(withTail).y).toBeLessThan(hip(rabbit).y);
    // Standing points that are already above the ground change nothing.
    const sitting = clipOf('rabbit', 'idle').frameAt(0);
    expect(clearOfGround(withTail, sitting.pose)).toBe(sitting.pose);
  });

  it('opens the mouth to talk', () => {
    const talk = clipOf('rabbit', 'talk');
    const paths = (t: number) =>
      JSON.stringify(drawRig(rabbit, talk.frameAt(t), { facing: 1 }));
    expect(paths(0)).not.toContain(rabbit.colors.teeth);
    expect(paths(0.8)).toContain(rabbit.colors.teeth);
  });
});

describe('draw order', () => {
  const idle = clipOf('cutout', 'idle').frameAt(0);
  const ids = (r: Rig) => drawOrder(r).map((e) => e.id);
  /** The parts and layers in the order they are drawn, as `part.layer`. */
  function layers(node: DrawNode): string[] {
    if (node.type === 'part') {
      return [node.layer ? `${node.part}.${node.layer}` : node.part];
    }
    if (node.type === 'group') return node.children.flatMap(layers);
    return [];
  }
  /** The boy with back hair and front hair on the head. */
  const withHair = (order?: string[]): CutoutRig => ({
    ...rig,
    parts: {
      ...rig.parts,
      head: {
        ...rig.parts.head,
        layers: [
          { id: 'backHair', svg: 'head-back-hair.svg' },
          { id: 'frontHair', svg: 'head-front-hair.svg' },
        ],
      },
    },
    ...(order ? { drawOrder: order } : {}),
  });

  it('has a default order for each rig kind', () => {
    expect(ids(rig)).toEqual([
      'armFar',
      'handFar',
      'legFar',
      'footFar',
      'legNear',
      'torso',
      'footNear',
      'head',
      'armNear',
      'handNear',
    ]);
    expect(ids(robed)).toEqual([
      'armFar',
      'handFar',
      'legFar',
      'footFar',
      'legNear',
      'footNear',
      'torso',
      'head',
      'staff',
      'armNear',
      'handNear',
    ]);
    expect(ids(bird)).toEqual([
      'wingFar',
      'legFar',
      'footFar',
      'legNear',
      'footNear',
      'neck',
      'body',
      'head',
      'wingNear',
    ]);
    expect(ids(rabbit)).toEqual([
      'hindLegFar',
      'footFar',
      'frontLegFar',
      'pawFar',
      'earFar',
      'earNear',
      'hindLegNear',
      'body',
      'footNear',
      'head',
      'frontLegNear',
      'pawNear',
    ]);
  });

  it('draws the far side in one shaded group, as before', () => {
    const node = drawRig(rig, idle, { facing: 1 }).node;
    const character = node.type === 'group' ? node.children[1] : undefined;
    const children = character?.type === 'group' ? character.children : [];
    const far = children[0];
    expect(far?.type === 'group' && far.shade).toBe(rig.farShade);
    expect(far && layers(far)).toEqual(['hand', 'foot']);
    expect(children.filter((c) => c.type === 'group' && c.shade)).toHaveLength(
      1,
    );
    expect(layers(node)).toEqual([
      'hand',
      'foot',
      'torso',
      'foot',
      'head',
      'hand',
    ]);
  });

  it('draws the same with the default order written out', () => {
    const plainTree: PropRig = { ...tree };
    delete plainTree.drawOrder;
    for (const r of [rig, robed, bird, rabbit, plainTree]) {
      const clip = restClip(r.kind);
      const frame = clip.frameAt(0.4);
      const explicit = {
        ...r,
        drawOrder: defaultDrawOrder(r).map((e) => e.id),
      } as Rig;
      expect(drawRig(explicit, frame, { facing: 1 })).toEqual(
        drawRig(r, frame, { facing: 1 }),
      );
    }
  });

  it('puts the layers of a part after its main layer by default', () => {
    expect(ids(withHair())).toContain('head.backHair');
    expect(layers(drawRig(withHair(), idle, { facing: 1 }).node)).toEqual([
      'hand',
      'foot',
      'torso',
      'foot',
      'head',
      'head.backHair',
      'head.frontHair',
      'hand',
    ]);
  });

  it('draws the front hair over the near hand and the back hair behind the torso', () => {
    const order = defaultDrawOrder(rig)
      .map((e) => e.id)
      .filter((id) => id !== 'torso');
    const hair = withHair([
      'head.backHair',
      'torso',
      ...order,
      'head.frontHair',
    ]);
    const drawn = layers(drawRig(hair, idle, { facing: 1 }).node);
    expect(drawn.indexOf('head.backHair')).toBeLessThan(drawn.indexOf('torso'));
    expect(drawn.at(-1)).toBe('head.frontHair');
    expect(drawn.at(-2)).toBe('hand');
  });

  it('moves the layers with the head', () => {
    const transforms: Record<string, unknown> = {};
    const visit = (node: DrawNode, group?: unknown) => {
      if (node.type === 'group') {
        for (const c of node.children) visit(c, node.transform ?? group);
      } else if (node.type === 'part' && node.part === 'head') {
        transforms[node.layer ?? 'main'] = [group, node.transform];
      }
    };
    const order = ['head.frontHair', 'head.backHair'];
    visit(drawRig(withHair(order), idle, { facing: 1 }).node);
    expect(transforms.backHair).toEqual(transforms.main);
    expect(transforms.frontHair).toEqual(transforms.main);
  });

  it('places the entries that the order leaves out, and drops unknown ids', () => {
    const hair = withHair(['head.frontHair', 'nose', ...ids(rig)]);
    expect(ids(hair)).toEqual([
      'head.frontHair',
      ...ids(rig).slice(0, ids(rig).indexOf('head') + 1),
      'head.backHair',
      ...ids(rig).slice(ids(rig).indexOf('head') + 1),
    ]);
  });

  it('can draw the near foot behind the torso without the robe flag', () => {
    const order = ids(rig).filter((id) => id !== 'footNear');
    order.splice(order.indexOf('torso'), 0, 'footNear');
    const drawn = parts(
      drawRig({ ...rig, drawOrder: order }, idle, { facing: 1 }).node,
    );
    expect(drawn.lastIndexOf('foot')).toBeLessThan(drawn.indexOf('torso'));
  });
});
