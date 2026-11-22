// Draws the sky and the weather of a scene: the sky with the sun, the moon
// and the stars, the clouds, the rain, the snow and the mist, and the tint of
// the night. Everything here is in the pixels of the picture, at depth 0, and
// depends only on the scene data and the time.
import type {
  Background,
  Pt,
  Scene,
  Sky,
  SkyPresetId,
  WeatherState,
} from '@toonhouse/model';

import type { DrawNode, VerticalGradient } from './draw.ts';
import { clamp01, lerp, smoothstep } from './math.ts';
import { random } from './random.ts';
import {
  DEFAULT_SKY,
  FAIR_WEATHER,
  NOON,
  sceneSeed,
  sceneSky,
  skyStateAt,
  weatherAt,
  windDrift,
} from './sky.ts';

/** The sky and the weather of a scene at one moment, as `drawScene` draws them. */
export interface SkyWeather {
  sky: Sky;
  /** Whether the scene has the sun, the moon, the stars and the night. */
  sun: boolean;
  /** The time of day in hours. It doesn't wrap. */
  hour: number;
  weather: WeatherState;
  /** The wind added up since the start of the scene, see `windDrift`. */
  drift: number;
  /** The time in the scene, which the rain and the snow fall by. */
  t: number;
  seed: number;
}

/** The sky and the weather of a scene at `t`. */
export function skyWeatherAt(
  scene: Scene,
  bg: Background,
  t: number,
): SkyWeather {
  const { hour, sun } = skyStateAt(scene, t);
  return {
    sky: sceneSky(scene, bg),
    sun,
    hour,
    weather: weatherAt(scene, t),
    drift: windDrift(scene, t),
    t,
    seed: sceneSeed(scene),
  };
}

/**
 * The sky of a background at noon in fair weather, as a scene on it that
 * sets nothing starts. The library and the studio show a background with it.
 */
export const restingSky = (bg: Background, seed = 0): SkyWeather => ({
  sky: bg.sky ?? DEFAULT_SKY,
  sun: true,
  hour: NOON,
  weather: { ...FAIR_WEATHER },
  drift: 0,
  t: 0,
  seed,
});

/**
 * The drawings of the sky, which every asset pack uses, by the id of their
 * part. They are in `assets/sky/`. The renderer needs only their sizes, and
 * the stage loads the files.
 */
export const SKY_PARTS = {
  'sky-sun': {
    svg: 'sun.svg',
    width: 956,
    height: 954,
    pivot: { x: 478, y: 477 },
  },
  'sky-cloud-1': {
    svg: 'cloud-1.svg',
    width: 656,
    height: 374,
    pivot: { x: 328, y: 374 },
  },
  'sky-cloud-2': {
    svg: 'cloud-2.svg',
    width: 610,
    height: 323,
    pivot: { x: 305, y: 323 },
  },
  'sky-cloud-3': {
    svg: 'cloud-3.svg',
    width: 655,
    height: 377,
    pivot: { x: 327, y: 377 },
  },
  'sky-cloud-4': {
    svg: 'cloud-4.svg',
    width: 605,
    height: 322,
    pivot: { x: 302, y: 322 },
  },
} as const;

type SkyPartId = keyof typeof SKY_PARTS;

const CLOUD_PARTS: readonly SkyPartId[] = [
  'sky-cloud-1',
  'sky-cloud-2',
  'sky-cloud-3',
  'sky-cloud-4',
];

/** The two colors of a sky, at the top and at the bottom. */
type SkyColors = readonly [top: string, bottom: string];

interface SkyPalette {
  day: SkyColors;
  dusk: SkyColors;
  night: SkyColors;
}

/**
 * The colors of the preset skies. The day colors of `blue` and `peach` are
 * the flat skies that the backgrounds had before the sky was apart from them.
 */
const PRESETS: Record<SkyPresetId, SkyPalette> = {
  blue: {
    day: ['#8fcff0', '#9fd8f2'],
    dusk: ['#6f78b8', '#f4a77a'],
    night: ['#0b1433', '#22305c'],
  },
  peach: {
    day: ['#f1c283', '#f5d095'],
    dusk: ['#8a6aa8', '#f39a6b'],
    night: ['#120f2e', '#2c2650'],
  },
  pale: {
    day: ['#c6e2ef', '#eaf4f6'],
    dusk: ['#9a9cc4', '#f2c4a8'],
    night: ['#151a30', '#2b3350'],
  },
  lilac: {
    day: ['#bfb1e6', '#f0d3e6'],
    dusk: ['#7b5fa8', '#f29e8e'],
    night: ['#140f30', '#30244f'],
  },
};

/** What a picked color mixes toward at dusk and at night, and how much. */
const DUSK_MIX: SkyColors = ['#6a5fa8', '#f39a6b'];
const NIGHT_MIX: SkyColors = ['#0b1433', '#22305c'];

const SPACE: SkyColors = ['#04050d', '#151a38'];

const hex = (c: string) =>
  [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** The color `u` of the way from `a` to `b`. */
export function mixColor(a: string, b: string, u: number): string {
  const x = hex(a);
  const y = hex(b);
  return `#${x
    .map((v, i) =>
      Math.round(lerp(v, y[i]!, clamp01(u)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

const mixPair = (a: SkyColors, b: SkyColors, u: number): SkyColors => [
  mixColor(a[0], b[0], u),
  mixColor(a[1], b[1], u),
];

function palette(sky: Sky): SkyPalette {
  if (sky.kind === 'preset') return PRESETS[sky.id] ?? PRESETS.blue;
  if (sky.kind === 'space') return { day: SPACE, dusk: SPACE, night: SPACE };
  const day: SkyColors = [sky.top, sky.bottom];
  return {
    day,
    dusk: mixPair(day, DUSK_MIX, 0.6),
    night: mixPair(day, NIGHT_MIX, 0.85),
  };
}

/** How much of the day, the dusk and the night there is at an hour. */
interface Phase {
  day: number;
  dusk: number;
  night: number;
}

/**
 * The phases through one day, by the hour. The sun rises at 6 and sets at
 * 18, which are the middle of the dusk.
 */
const PHASES: readonly [hour: number, phase: Phase][] = [
  [0, { day: 0, dusk: 0, night: 1 }],
  [5, { day: 0, dusk: 0, night: 1 }],
  [6, { day: 0, dusk: 1, night: 0 }],
  [7.5, { day: 1, dusk: 0, night: 0 }],
  [16.5, { day: 1, dusk: 0, night: 0 }],
  [18, { day: 0, dusk: 1, night: 0 }],
  [19, { day: 0, dusk: 0, night: 1 }],
  [24, { day: 0, dusk: 0, night: 1 }],
];

const DAYTIME: Phase = { day: 1, dusk: 0, night: 0 };

/** The hour of a day, from 0 to 24. */
const dayHour = (hour: number) => ((hour % 24) + 24) % 24;

/** How much of the day, the dusk and the night there is at the time of day. */
export function phaseAt(hour: number): Phase {
  const h = dayHour(hour);
  for (let i = 1; i < PHASES.length; i++) {
    const [h1, b] = PHASES[i]!;
    if (h > h1) continue;
    const [h0, a] = PHASES[i - 1]!;
    const u = smoothstep(h0, h1, h);
    return {
      day: lerp(a.day, b.day, u),
      dusk: lerp(a.dusk, b.dusk, u),
      night: lerp(a.night, b.night, u),
    };
  }
  return PHASES.at(-1)![1];
}

/** The phase of the scene, which is always day without the sun. */
const phaseOf = (sw: SkyWeather): Phase =>
  sw.sun && sw.sky.kind !== 'space' ? phaseAt(sw.hour) : DAYTIME;

function blend(colors: readonly string[], weights: readonly number[]): string {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const rgb = [0, 0, 0];
  colors.forEach((c, i) => {
    const v = hex(c);
    for (let k = 0; k < 3; k++) rgb[k]! += (v[k]! * weights[i]!) / sum;
  });
  return `#${rgb
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** The gray of an overcast sky, which heavy and dark clouds turn the sky to. */
const OVERCAST: SkyPalette = {
  day: ['#8e98a3', '#aab2ba'],
  dusk: ['#6c6875', '#958985'],
  night: ['#14171f', '#242932'],
};

/**
 * How overcast the sky is, from 0 to 1. The cloud drawings can't cover the
 * whole sky, so many dark clouds turn the sky itself gray, and the stars, the
 * moon and the sun fade by the same amount. Space doesn't get overcast.
 */
export function overcast(sw: SkyWeather): number {
  if (sw.sky.kind === 'space') return 0;
  return clamp01(sw.weather.clouds * sw.weather.cloudDark);
}

const phaseColors = (p: SkyPalette, w: Phase): SkyColors => {
  const weights = [w.day, w.dusk, w.night];
  return [
    blend([p.day[0], p.dusk[0], p.night[0]], weights),
    blend([p.day[1], p.dusk[1], p.night[1]], weights),
  ];
};

/** The colors of the sky at the time of the scene. */
export function skyColors(sw: SkyWeather): SkyColors {
  const w = phaseOf(sw);
  const colors = phaseColors(palette(sw.sky), w);
  const gray = overcast(sw);
  if (gray <= 0) return colors;
  return mixPair(colors, phaseColors(OVERCAST, w), gray);
}

const DUSK_TINT = '#f0d2c0';
const NIGHT_TINT = '#56659a';
/** How much of the tint stays indoors, where the room has lights. */
const INDOOR_TINT = 0.45;

/**
 * The color that the night multiplies the scene by, or undefined for none.
 * The sky, the stars, the sun and the moon don't get it.
 */
export function nightTint(sw: SkyWeather, indoor: boolean): string | undefined {
  const w = phaseOf(sw);
  if (w.day >= 1) return undefined;
  const tint = blend(
    ['#ffffff', DUSK_TINT, NIGHT_TINT],
    [w.day, w.dusk, w.night],
  );
  return indoor ? mixColor('#ffffff', tint, INDOOR_TINT) : tint;
}

const rect = (bg: Background, fill: string | VerticalGradient): DrawNode => ({
  type: 'rect',
  x: 0,
  y: 0,
  width: bg.width,
  height: bg.height,
  fill,
});

/** Where a part of the sky goes: its pivot at `x`, `y`, at the size `scale`. */
function skyPart(id: SkyPartId, x: number, y: number, scale: number): DrawNode {
  const p = SKY_PARTS[id];
  return {
    type: 'part',
    part: id,
    width: p.width,
    height: p.height,
    transform: [
      scale,
      0,
      0,
      scale,
      x - p.pivot.x * scale,
      y - p.pivot.y * scale,
    ],
  };
}

/** A path of small circles, one for each of `dots`. */
function dotsPath(
  dots: readonly { x: number; y: number; r: number }[],
): string {
  const f = (v: number) => Math.round(v * 10) / 10;
  return dots
    .map(
      ({ x, y, r }) =>
        `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`,
    )
    .join('');
}

const STARS = 70;

function drawStars(bg: Background, seed: number, opacity: number): DrawNode {
  const dots = Array.from({ length: STARS }, (_, i) => ({
    x: random(seed, i, 100) * bg.width,
    y: random(seed, i, 101) ** 1.3 * bg.height * 0.8,
    r: (0.0006 + 0.0012 * random(seed, i, 102)) * bg.width,
  }));
  return {
    type: 'group',
    opacity,
    children: [{ type: 'path', d: dotsPath(dots), fill: '#fff8dc' }],
  };
}

/**
 * The point on the quadratic curve from `from` through `top` to `to`, from
 * 0 at the start to 1 at the end. The curve is at `top` halfway.
 */
export function arcPoint(arc: { from: Pt; top: Pt; to: Pt }, u: number): Pt {
  const { from, top, to } = arc;
  const c = {
    x: 2 * top.x - (from.x + to.x) / 2,
    y: 2 * top.y - (from.y + to.y) / 2,
  };
  const a = (1 - u) * (1 - u);
  const b = 2 * u * (1 - u);
  const e = u * u;
  return {
    x: a * from.x + b * c.x + e * to.x,
    y: a * from.y + b * c.y + e * to.y,
  };
}

/** The path of the sun of a background that doesn't set one. */
const defaultArc = (bg: Background) => ({
  from: { x: bg.width * 0.1, y: bg.height * 0.95 },
  top: { x: bg.width / 2, y: bg.height * 0.13 },
  to: { x: bg.width * 0.9, y: bg.height * 0.95 },
});

/** The width of the sun against the width of the frame. */
const SUN_SIZE = 0.095;
const MOON_SIZE = 0.06;

/** A crescent moon with its middle at `x`, `y`. */
function moon(x: number, y: number, size: number): DrawNode {
  const r = size / 2;
  const f = (v: number) => Math.round(v * 10) / 10;
  return {
    type: 'path',
    d: `M${f(x)} ${f(y - r)}A${f(r)} ${f(r)} 0 1 0 ${f(x)} ${f(y + r)}A${f(r * 0.7)} ${f(r)} 0 1 1 ${f(x)} ${f(y - r)}Z`,
    fill: '#f6f0cf',
  };
}

/**
 * The sky, with the stars, the sun and the moon. The sun is up from 6 to 18
 * along the path of the background, and the moon from 18 to 6.
 */
export function drawSky(bg: Background, sw: SkyWeather): DrawNode {
  const [top, bottom] = skyColors(sw);
  const children: DrawNode[] = [
    rect(bg, {
      type: 'vertical',
      stops: [
        { at: 0, color: top },
        { at: 1, color: bottom },
      ],
    }),
  ];
  if (sw.sky.kind === 'space') {
    children.push(drawStars(bg, sw.seed, 1));
    return { type: 'group', children };
  }
  const clear = 1 - overcast(sw);
  if (!sw.sun || clear <= 0) return { type: 'group', children };
  const w = phaseAt(sw.hour);
  const stars = clamp01(w.night + 0.3 * w.dusk) * clear;
  if (stars > 0) children.push(drawStars(bg, sw.seed, stars));
  const arc = bg.sun ?? defaultArc(bg);
  const h = dayHour(sw.hour);
  const fade = (node: DrawNode): DrawNode =>
    clear < 1 ? { type: 'group', opacity: clear, children: [node] } : node;
  const moonU = dayHour(h - 18) / 12;
  if (moonU <= 1) {
    const at = arcPoint(arc, moonU);
    children.push(fade(moon(at.x, at.y, MOON_SIZE * bg.width)));
  }
  const sunU = (h - 6) / 12;
  if (sunU >= 0 && sunU <= 1) {
    const at = arcPoint(arc, sunU);
    const p = SKY_PARTS['sky-sun'];
    children.push(
      fade(skyPart('sky-sun', at.x, at.y, (SUN_SIZE * bg.width) / p.width)),
    );
  }
  return { type: 'group', children };
}

const CLOUD_SLOTS = 12;
/** How many widths of the frame a cloud moves in a second of full wind. */
const CLOUD_SPEED = 0.1;
/** The darkest clouds, which `cloudDark` tints toward. */
const STORM_GRAY = '#6f7886';

/**
 * The clouds. Each slot has its own place, size and drawing from the seed,
 * and a threshold. A slot shows when `clouds` passes its threshold, and it
 * slides in from its side of the frame to its place, so that the clouds
 * don't appear in place. The wind moves the clouds, and a cloud that leaves
 * the frame comes back on the other side.
 */
export function drawClouds(bg: Background, sw: SkyWeather): DrawNode | null {
  const { clouds, cloudDark } = sw.weather;
  const { width: w, height: h } = bg;
  // Each slot fades in over this much of `clouds`, and the last one is in
  // fully at 1.
  const band = 1 / CLOUD_SLOTS;
  const slots: { size: number; node: DrawNode }[] = [];
  for (let i = 0; i < CLOUD_SLOTS; i++) {
    const r = (c: number) => random(sw.seed, i, c);
    const threshold = ((i + 0.8 * r(0)) / CLOUD_SLOTS) * (1 - band);
    const presence = smoothstep(0, 1, (clouds - threshold) / band);
    if (presence <= 0) continue;
    const id = CLOUD_PARTS[Math.floor(r(1) * CLOUD_PARTS.length)]!;
    const art = SKY_PARTS[id];
    const size = 0.08 + 0.1 * r(2);
    const scale = (size * w) / art.width;
    const reach = Math.max(art.pivot.x, art.width - art.pivot.x) * scale;
    const span = w + 2 * reach;
    // The larger clouds look nearer, so they move faster.
    const speed = CLOUD_SPEED * w * (0.5 + size * 4);
    const moved = r(3) * w + sw.drift * speed + reach;
    const home = (((moved % span) + span) % span) - reach;
    const from = r(4) < 0.5 ? -reach : w + reach;
    const x = lerp(from, home, presence);
    const y = (0.12 + 0.2 * r(5)) * h;
    slots.push({ size, node: skyPart(id, x, y, scale) });
  }
  if (slots.length === 0) return null;
  slots.sort((a, b) => a.size - b.size);
  const tint =
    cloudDark > 0 ? mixColor('#ffffff', STORM_GRAY, cloudDark) : undefined;
  return {
    type: 'group',
    ...(tint && { tint }),
    children: slots.map((s) => s.node),
  };
}

/** The particles of rain or snow that fall behind or in front of the actors. */
export type FallBand = 'far' | 'near';

interface Band {
  count: number;
  channel: number;
  /** In heights of the frame a second. */
  speed: number;
  /** In widths of the frame. */
  size: number;
  color: string;
  opacity: number;
}

const RAIN: Record<FallBand, Band> = {
  far: {
    count: 160,
    channel: 10,
    speed: 1.4,
    size: 0.0014,
    color: '#c4d3e4',
    opacity: 0.55,
  },
  near: {
    count: 110,
    channel: 20,
    speed: 2.1,
    size: 0.0024,
    color: '#dde7f2',
    opacity: 0.7,
  },
};

const SNOW: Record<FallBand, Band> = {
  far: {
    count: 140,
    channel: 30,
    speed: 0.09,
    size: 0.0024,
    color: '#ffffff',
    opacity: 0.8,
  },
  near: {
    count: 90,
    channel: 40,
    speed: 0.14,
    size: 0.0042,
    color: '#ffffff',
    opacity: 0.95,
  },
};

/** The length of a rain drop against the height of the frame, by its size. */
const DROP_LENGTH = 18;
/** How far a drop goes sideways for each pixel down, in full wind. */
const RAIN_SLANT = 0.6;
/** How many widths of the frame a flake moves in a second of full wind. */
const SNOW_SPEED = 0.25;

/** `v` wrapped into the range from `lo` to `lo + span`. */
const wrap = (v: number, lo: number, span: number) =>
  ((((v - lo) % span) + span) % span) + lo;

/**
 * Where particle `i` of a band is at `t`. It falls from above the frame to
 * below it, at its own speed, and starts again from the top.
 */
function fall(
  sw: SkyWeather,
  bg: Background,
  b: Band,
  i: number,
  margin: number,
) {
  const r = (c: number) => random(sw.seed, i, b.channel + c);
  const speed = b.speed * (0.8 + 0.4 * r(0));
  const loop = bg.height + 2 * margin;
  const y = wrap(r(1) * loop + speed * bg.height * sw.t, -margin, loop);
  return { x: r(2), y, speed, r };
}

function drawRain(
  bg: Background,
  sw: SkyWeather,
  band: FallBand,
): DrawNode | null {
  const b = RAIN[band];
  const n = Math.round(clamp01(sw.weather.rain) * b.count);
  if (n === 0) return null;
  const { width: w } = bg;
  const len = DROP_LENGTH * b.size * w;
  const slant = RAIN_SLANT * sw.weather.wind;
  const pad = Math.abs(slant) * bg.height + len;
  const f = (v: number) => Math.round(v * 10) / 10;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = fall(sw, bg, b, i, len);
    const x = wrap(p.x * (w + 2 * pad) + slant * p.y, -pad, w + 2 * pad);
    d += `M${f(x)} ${f(p.y)}l${f(slant * len)} ${f(len)}`;
  }
  return {
    type: 'group',
    opacity: b.opacity,
    children: [
      {
        type: 'path',
        d,
        stroke: b.color,
        strokeWidth: b.size * w,
        lineCap: 'round',
      },
    ],
  };
}

function drawSnow(
  bg: Background,
  sw: SkyWeather,
  band: FallBand,
): DrawNode | null {
  const b = SNOW[band];
  const n = Math.round(clamp01(sw.weather.snow) * b.count);
  if (n === 0) return null;
  const { width: w } = bg;
  const size = b.size * w;
  const dots = [];
  for (let i = 0; i < n; i++) {
    const p = fall(sw, bg, b, i, size);
    // The slower flakes look further, so the wind moves them less.
    const drift = sw.drift * SNOW_SPEED * w * (p.speed / b.speed);
    const sway =
      0.01 * w * Math.sin(2 * Math.PI * (0.3 * sw.t * (0.6 + p.r(3)) + p.r(4)));
    const x = wrap(p.x * w + drift + sway, -size, w + 2 * size);
    dots.push({ x, y: p.y, r: size * (0.7 + 0.6 * p.r(5)) });
  }
  return {
    type: 'group',
    opacity: b.opacity,
    children: [{ type: 'path', d: dotsPath(dots), fill: b.color }],
  };
}

/** The rain and the snow of one band, or null if neither falls. */
export function drawFalling(
  bg: Background,
  sw: SkyWeather,
  band: FallBand,
): DrawNode | null {
  const children = [drawRain(bg, sw, band), drawSnow(bg, sw, band)].filter(
    (n): n is DrawNode => n !== null,
  );
  return children.length > 0 ? { type: 'group', children } : null;
}

const MIST = '#e6ecf0';
/** How much one veil of mist covers at the full mist. */
const MIST_VEIL = 0.4;

/**
 * A veil of mist over the whole frame, thicker at the bottom. Each veil
 * between the layers makes the layers behind it hazier.
 */
export function mistVeil(bg: Background, sw: SkyWeather): DrawNode | null {
  const a = clamp01(sw.weather.mist) * MIST_VEIL;
  if (a <= 0) return null;
  return rect(bg, {
    type: 'vertical',
    stops: [
      { at: 0, color: MIST, opacity: a * 0.6 },
      { at: 1, color: MIST, opacity: a },
    ],
  });
}
