import type { Background, Scene } from '@toonhouse/model';
import { describe, expect, it } from 'vitest';

import testHills from '../../../assets/fixtures/backgrounds/test-hills/background.json';
import testRoom from '../../../assets/fixtures/backgrounds/test-room/background.json';
import { drawScene, wholeBackground } from './background.ts';
import type { DrawNode } from './draw.ts';
import { FAIR_WEATHER } from './sky.ts';
import {
  arcPoint,
  drawClouds,
  drawFalling,
  drawSky,
  nightTint,
  overcast,
  phaseAt,
  SKY_PARTS,
  skyColors,
  type SkyWeather,
  skyWeatherAt,
} from './skyDraw.ts';

const bg = testHills as Background;
const room = testRoom as Background;

const sw = (more: Partial<SkyWeather> = {}): SkyWeather => ({
  sky: { kind: 'preset', id: 'blue' },
  sun: true,
  hour: 12,
  weather: { ...FAIR_WEATHER },
  drift: 0,
  t: 0,
  seed: 1,
  ...more,
});

/** The x of the pivot of each cloud, by its drawing and its size. */
function clouds(node: DrawNode | null) {
  if (node?.type !== 'group') return new Map<string, number>();
  return new Map(
    node.children.flatMap((c) => {
      if (c.type !== 'part') return [];
      const { pivot } = SKY_PARTS[c.part as keyof typeof SKY_PARTS];
      const m = c.transform;
      return [[`${c.part}@${m[0]}`, m[4] + m[0] * pivot.x] as const];
    }),
  );
}

/** The start points of the segments or the circles of a path. */
const points = (d: string) =>
  [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => `${m[1]},${m[2]}`);

function pathsOf(node: DrawNode | null): string[] {
  if (!node) return [];
  if (node.type === 'path') return [node.d];
  if (node.type === 'group') return node.children.flatMap(pathsOf);
  return [];
}

describe('the sky', () => {
  it('has the colors of the preset at noon and darker ones at night', () => {
    expect(skyColors(sw())).toEqual(['#8fcff0', '#9fd8f2']);
    const [top] = skyColors(sw({ hour: 23 }));
    expect(top).toBe('#0b1433');
    expect(skyColors(sw({ hour: 23 + 24 }))).toEqual(
      skyColors(sw({ hour: 23 })),
    );
  });

  it('goes from the day through the dusk to the night', () => {
    expect(phaseAt(12)).toEqual({ day: 1, dusk: 0, night: 0 });
    expect(phaseAt(18)).toEqual({ day: 0, dusk: 1, night: 0 });
    expect(phaseAt(2)).toEqual({ day: 0, dusk: 0, night: 1 });
  });

  it('derives the dusk and the night of a picked gradient', () => {
    const sky = {
      kind: 'gradient',
      top: '#ff0000',
      bottom: '#00ff00',
    } as const;
    expect(skyColors(sw({ sky }))).toEqual(['#ff0000', '#00ff00']);
    expect(skyColors(sw({ sky, hour: 0 }))).not.toEqual(['#ff0000', '#00ff00']);
  });

  it('keeps space the same at any time, with no sun and no tint', () => {
    const space = sw({ sky: { kind: 'space' }, hour: 0 });
    expect(skyColors(space)).toEqual(skyColors({ ...space, hour: 12 }));
    expect(nightTint(space, false)).toBeUndefined();
    expect(JSON.stringify(drawSky(bg, space))).not.toContain('sky-sun');
  });

  it('moves the sun along the arc of the background from 6 to 18', () => {
    const sunAt = (hour: number) => {
      const g = drawSky(bg, sw({ hour }));
      const sun =
        g.type === 'group' && g.children.find((c) => c.type === 'part');
      return sun ? sun : null;
    };
    expect(sunAt(5)).toBeNull();
    expect(sunAt(19)).toBeNull();
    const noon = sunAt(12);
    expect(noon?.type).toBe('part');
    const top = arcPoint(bg.sun!, 0.5);
    if (noon?.type !== 'part') return;
    const m = noon.transform;
    expect(m[4] + m[0] * 478).toBeCloseTo(top.x);
    expect(m[5] + m[3] * 477).toBeCloseTo(top.y);
  });

  it('has no sun, moon, stars or night without the sun', () => {
    const off = sw({ sun: false, hour: 0 });
    expect(skyColors(off)).toEqual(skyColors(sw()));
    expect(nightTint(off, false)).toBeUndefined();
    const g = drawSky(bg, off);
    expect(g.type === 'group' && g.children.length).toBe(1);
  });

  it('turns the sky gray and fades the stars, the moon and the sun under dark clouds', () => {
    const storm = { ...FAIR_WEATHER, clouds: 1, cloudDark: 1 };
    const half = { ...FAIR_WEATHER, clouds: 1, cloudDark: 0.5 };
    expect(overcast(sw())).toBe(0);
    expect(overcast(sw({ weather: half }))).toBe(0.5);
    expect(skyColors(sw({ weather: storm }))).not.toEqual(skyColors(sw()));
    expect(overcast(sw({ weather: storm, sky: { kind: 'space' } }))).toBe(0);

    const opacities = (g: DrawNode): number[] =>
      g.type === 'group'
        ? g.children
            .slice(1)
            .map((c) => (c.type === 'group' ? (c.opacity ?? 1) : 1))
        : [];
    // At night the sky has the stars and the moon, and at noon the sun.
    const clearNight = opacities(drawSky(bg, sw({ hour: 0 })));
    const halfNight = opacities(drawSky(bg, sw({ hour: 0, weather: half })));
    expect(clearNight).toEqual([1, 1]);
    expect(halfNight).toEqual([0.5, 0.5]);
    expect(opacities(drawSky(bg, sw({ weather: half })))).toEqual([0.5]);
    const g = drawSky(bg, sw({ hour: 0, weather: storm }));
    expect(g.type === 'group' && g.children.length).toBe(1);
  });

  it('tints the night less indoors', () => {
    const night = sw({ hour: 0 });
    const out = nightTint(night, false)!;
    const inside = nightTint(night, true)!;
    const sum = (c: string) =>
      [1, 3, 5].reduce((a, i) => a + parseInt(c.slice(i, i + 2), 16), 0);
    expect(sum(inside)).toBeGreaterThan(sum(out));
    expect(nightTint(sw(), false)).toBeUndefined();
  });
});

describe('clouds', () => {
  it('has more clouds with a higher amount, and none without clouds', () => {
    const count = (c: number) =>
      clouds(drawClouds(bg, sw({ weather: { ...FAIR_WEATHER, clouds: c } })))
        .size;
    expect(
      drawClouds(bg, sw({ weather: { ...FAIR_WEATHER, clouds: 0 } })),
    ).toBe(null);
    expect(count(0.3)).toBeGreaterThan(0);
    expect(count(1)).toBeGreaterThan(count(0.3));
  });

  it('brings the clouds in from the side of the frame, not in place', () => {
    const at = (c: number) =>
      clouds(drawClouds(bg, sw({ weather: { ...FAIR_WEATHER, clouds: c } })));
    const full = at(1);
    // A cloud that has only started to come in is outside the frame or at
    // its edge, and it moves toward its place as the clouds grow.
    for (let c = 0.01; c < 1; c += 0.01) {
      const now = at(c);
      const next = at(c + 0.002);
      for (const [key, x] of now) {
        const home = full.get(key)!;
        const later = next.get(key)!;
        expect(Math.abs(later - home)).toBeLessThanOrEqual(
          Math.abs(x - home) + 1e-6,
        );
      }
      for (const [key, x] of next) {
        if (now.has(key)) continue;
        expect(x < 0 || x > bg.width).toBe(true);
      }
    }
  });

  it('moves a cloud that is partly in without jumps as the wind blows', () => {
    // At 0.3 the clouds of this seed have a slot that is only partly in.
    const weather = { ...FAIR_WEATHER, clouds: 0.3, wind: 1 };
    const at = (drift: number) =>
      clouds(drawClouds(bg, sw({ seed: 12345, drift, weather })));
    const step = 0.01;
    // Over a step of drift a cloud moves under 0.2 % of the frame width when
    // fully in. A cloud partly in crosses faster, but a jump back over the
    // frame would be far more than this.
    const most = 0.03 * bg.width;
    const inFrame = (x: number) => x > 0 && x < bg.width;
    let before = at(0);
    for (let d = step; d < 40; d += step) {
      const now = at(d);
      for (const [key, x] of now) {
        const was = before.get(key)!;
        // A cloud that goes out on one side comes back on the other.
        if (!inFrame(x) && !inFrame(was)) continue;
        expect(Math.abs(x - was)).toBeLessThan(most);
      }
      before = now;
    }
  });

  it('puts the clouds of another seed in other places', () => {
    const a = clouds(drawClouds(bg, sw({ seed: 1 })));
    const b = clouds(drawClouds(bg, sw({ seed: 2 })));
    expect([...a.values()]).not.toEqual([...b.values()]);
  });

  it('drifts the clouds with the wind and brings them back on the other side', () => {
    const xs = (drift: number) => [
      ...clouds(
        drawClouds(bg, sw({ drift, weather: { ...FAIR_WEATHER, clouds: 1 } })),
      ).values(),
    ];
    const a = xs(0);
    const b = xs(1);
    expect(b.some((x, i) => x > a[i]!)).toBe(true);
    for (const x of xs(1000)) {
      expect(x).toBeGreaterThan(-bg.width);
      expect(x).toBeLessThan(2 * bg.width);
    }
  });

  it('tints the dark clouds gray', () => {
    const dark = drawClouds(
      bg,
      sw({ weather: { ...FAIR_WEATHER, cloudDark: 1 } }),
    );
    expect(dark?.type === 'group' && dark.tint).toBe('#6f7886');
    const light = drawClouds(bg, sw());
    expect(light?.type === 'group' && light.tint).toBeUndefined();
  });
});

describe('rain and snow', () => {
  const weather = (rain: number, snow: number) => ({
    ...FAIR_WEATHER,
    rain,
    snow,
  });

  it('keeps the drops and flakes that fall when it gets heavier', () => {
    for (const band of ['far', 'near'] as const) {
      const light = points(
        pathsOf(
          drawFalling(bg, sw({ t: 3.3, weather: weather(0.3, 0.3) }), band),
        ).join(''),
      );
      const heavy = points(
        pathsOf(
          drawFalling(bg, sw({ t: 3.3, weather: weather(0.9, 0.9) }), band),
        ).join(''),
      );
      expect(heavy.length).toBeGreaterThan(light.length);
      for (const p of light) expect(heavy).toContain(p);
    }
  });

  it('falls with time and draws each band as few paths', () => {
    const at = (t: number) =>
      pathsOf(drawFalling(bg, sw({ t, weather: weather(1, 1) }), 'near'));
    expect(at(0)).toHaveLength(2);
    expect(at(0)).not.toEqual(at(0.5));
    expect(drawFalling(bg, sw(), 'near')).toBeNull();
  });
});

describe('the scene', () => {
  const scene: Scene = {
    id: 's',
    background: 'hills',
    actors: [],
    weather: { start: { rain: 0.5, mist: 0.5 }, changes: [] },
    sky: { start: 22, changes: [] },
  };

  function kinds(node: DrawNode): string[] {
    if (node.type === 'part') return [node.part];
    if (node.type === 'group')
      return [...(node.tint ? ['tint'] : []), ...node.children.flatMap(kinds)];
    if (node.type === 'rect')
      return [typeof node.fill === 'string' ? 'rect' : 'veil'];
    if (node.type === 'path') return [node.stroke ? 'rain' : 'dots'];
    return [node.type];
  }

  it('is the same for the same scene and time', () => {
    const a = drawScene(
      bg,
      wholeBackground(bg),
      [],
      skyWeatherAt(scene, bg, 4.2),
    );
    const b = drawScene(
      bg,
      wholeBackground(bg),
      [],
      skyWeatherAt(scene, bg, 4.2),
    );
    expect(a).toEqual(b);
  });

  it('puts the mist between the far layers and the rain on both sides of the ground', () => {
    const order = kinds(
      drawScene(bg, wholeBackground(bg), [], skyWeatherAt(scene, bg, 1)),
    ).filter((k) => !k.startsWith('sky-cloud'));
    // The sky with the stars and the moon, then the tinted rest.
    expect(order).toEqual([
      'veil',
      'dots',
      'dots',
      'tint',
      'hills',
      'veil',
      'meadow',
      'veil',
      'rain',
      'ground',
      'grass',
      'rain',
    ]);
  });

  it('puts the weather indoors only behind the room', () => {
    const order = kinds(
      drawScene(room, wholeBackground(room), [], skyWeatherAt(scene, room, 1)),
    ).filter((k) => !k.startsWith('sky-cloud'));
    expect(order.slice(order.indexOf('tint'))).toEqual([
      'tint',
      'veil',
      'rain',
      'room',
    ]);
  });
});
