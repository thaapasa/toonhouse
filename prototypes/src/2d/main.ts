import { SCENE } from '../common/path.ts';
import { createPlayer } from '../common/player.ts';
import { frameAt, project, VIEW_H, VIEW_W } from './anim.ts';
import { add, hoseControl, type Pt, rotate, sub } from './math.ts';
import type { PartData, RigData } from './rig.ts';

const NS = 'http://www.w3.org/2000/svg';
const BASE = `${import.meta.env.BASE_URL}2d/`;

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.append(e);
  return e;
}

async function loadSymbol(defs: SVGDefsElement, id: string, file: string) {
  const text = await (await fetch(BASE + file)).text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const src = doc.documentElement;
  const symbol = el(
    'symbol',
    { id, viewBox: src.getAttribute('viewBox') ?? '' },
    defs,
  );
  symbol.append(
    ...Array.from(src.childNodes).map((n) => document.importNode(n, true)),
  );
}

function placed(
  part: PartData,
  id: string,
  parent: Element,
  extra: Record<string, string> = {},
) {
  return el(
    'use',
    { href: `#${id}`, width: part.width, height: part.height, ...extra },
    parent,
  );
}

/** `translate(at) rotate(angle) scale(scale) translate(-pivot)` as a string. */
function pinned(at: Pt, angle: number, scale: number, pivot: Pt) {
  return `translate(${at.x} ${at.y}) rotate(${(angle * 180) / Math.PI}) scale(${scale}) translate(${-pivot.x} ${-pivot.y})`;
}

/** A rubber-hose limb: an outline stroke under a fill stroke. */
function hose(parent: Element, rig: RigData, width: number, color: string) {
  const outline = el(
    'path',
    {
      fill: 'none',
      stroke: rig.outline,
      'stroke-width': width + 2 * rig.outlineWidth,
      'stroke-linecap': 'round',
    },
    parent,
  );
  const fill = el(
    'path',
    {
      fill: 'none',
      stroke: color,
      'stroke-width': width,
      'stroke-linecap': 'round',
    },
    parent,
  );
  return (a: Pt, c: Pt, b: Pt) => {
    const d = `M${a.x} ${a.y}Q${c.x} ${c.y} ${b.x} ${b.y}`;
    outline.setAttribute('d', d);
    fill.setAttribute('d', d);
  };
}

/**
 * A short sleeve over the top of an arm, drawn along the same curve. Round
 * caps give it a rounded shoulder and cuff.
 */
function sleeve(parent: Element, rig: RigData, width: number) {
  const common = { fill: 'none', 'stroke-linecap': 'round', pathLength: 1 };
  const outline = el(
    'path',
    {
      ...common,
      stroke: rig.outline,
      'stroke-width': width + 2 * rig.outlineWidth + 8,
      'stroke-dasharray': '0.2 2',
    },
    parent,
  );
  const red = el(
    'path',
    {
      ...common,
      stroke: '#e80000',
      'stroke-width': width + 8,
      'stroke-dasharray': '0.2 2',
    },
    parent,
  );
  return (a: Pt, c: Pt, b: Pt) => {
    const d = `M${a.x} ${a.y}Q${c.x} ${c.y} ${b.x} ${b.y}`;
    for (const p of [outline, red]) p.setAttribute('d', d);
  };
}

/** Tangent angle at the end of the quadratic curve a-c-b. */
const endAngle = (c: Pt, b: Pt) => Math.atan2(b.y - c.y, b.x - c.x);

async function main() {
  const rig = (await (await fetch(BASE + 'rig.json')).json()) as RigData;
  const stage = document.getElementById('stage')!;
  const svg = el('svg', {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    preserveAspectRatio: 'xMidYMid meet',
  });
  stage.append(svg);
  const defs = el('defs', {}, svg);
  await Promise.all([
    loadSymbol(defs, 'park', 'park.svg'),
    loadSymbol(defs, 'head', rig.head.svg),
    loadSymbol(defs, 'torso', rig.torso.svg),
    loadSymbol(defs, 'hand', rig.hand.svg),
    loadSymbol(defs, 'hand-open', rig.handOpen.svg),
    loadSymbol(defs, 'foot', rig.foot.svg),
  ]);
  el('use', { href: '#park', width: VIEW_W, height: VIEW_H }, svg);

  const shadow = el('ellipse', { fill: '#000', opacity: 0.18 }, svg);
  const character = el('g', {}, svg);
  // The far side of the body is a little darker, so the limbs read apart.
  const far = el('g', { style: 'filter: brightness(0.82)' }, character);
  const farArm = hose(far, rig, rig.armWidth, rig.skin);
  const farSleeve = sleeve(far, rig, rig.armWidth);
  const farHand = placed(rig.hand, 'hand', far);
  const farLeg = hose(far, rig, rig.legWidth, rig.skin);
  const farFoot = placed(rig.foot, 'foot', far);
  const nearLeg = hose(character, rig, rig.legWidth, rig.skin);
  const torso = placed(rig.torso, 'torso', character);
  const nearFoot = placed(rig.foot, 'foot', character);
  const head = placed(rig.head, 'head', character);
  const nearArm = hose(character, rig, rig.armWidth, rig.skin);
  const nearSleeve = sleeve(character, rig, rig.armWidth);
  const nearHand = placed(rig.hand, 'hand', character);
  const nearHandOpen = placed(rig.handOpen, 'hand-open', character);

  const t0 = rig.torso;
  function render(t: number) {
    const { ground, facing, pose } = frameAt(t);
    const screen = project(ground);
    const scale = screen.scale;
    character.setAttribute(
      'transform',
      `translate(${screen.x} ${screen.y}) scale(${scale * facing} ${scale})`,
    );
    shadow.setAttribute('cx', String(screen.x));
    shadow.setAttribute('cy', String(screen.y));
    shadow.setAttribute('rx', String(120 * scale));
    shadow.setAttribute('ry', String(22 * scale));

    // Points on the torso, moved with it.
    const onTorso = (p: Pt) =>
      add(pose.hip, rotate(sub(p, t0.pivot), pose.torsoAngle));
    torso.setAttribute(
      'transform',
      pinned(pose.hip, pose.torsoAngle, 1, t0.pivot),
    );
    const neck = onTorso(t0.neck);
    head.setAttribute(
      'transform',
      pinned(
        neck,
        pose.torsoAngle + pose.headAngle,
        rig.headScale,
        rig.head.pivot,
      ),
    );

    // Legs bend at the knee towards the front, arms at the elbow towards the back.
    const legs: [typeof nearLeg, SVGUseElement, Pt, Pt, number][] = [
      [
        nearLeg,
        nearFoot,
        onTorso(t0.hipNear),
        pose.footNear,
        pose.footNearAngle,
      ],
      [farLeg, farFoot, onTorso(t0.hipFar), pose.footFar, pose.footFarAngle],
    ];
    for (const [leg, foot, hip, ankleOnGround, angle] of legs) {
      const ankleHeight =
        (rig.foot.height - rig.foot.pivot.y - 8) * rig.footScale;
      const ankle = { x: ankleOnGround.x, y: ankleOnGround.y - ankleHeight };
      const c = hoseControl(hip, ankle, rig.legLength, -1);
      leg(hip, c, ankle);
      foot.setAttribute(
        'transform',
        pinned(ankle, angle, rig.footScale, rig.foot.pivot),
      );
    }

    const shoulderNear = onTorso(t0.shoulder);
    const shoulderFar = onTorso({
      x: t0.shoulder.x - 14,
      y: t0.shoulder.y + 4,
    });
    const arms: [typeof nearArm, typeof nearSleeve, Pt, Pt][] = [
      [nearArm, nearSleeve, shoulderNear, add(shoulderNear, pose.handNear)],
      [farArm, farSleeve, shoulderFar, add(shoulderFar, pose.handFar)],
    ];
    const wrists: { at: Pt; tangent: number }[] = [];
    for (const [arm, sl, shoulder, wrist] of arms) {
      const c = hoseControl(shoulder, wrist, rig.armLength, 1);
      arm(shoulder, c, wrist);
      sl(shoulder, c, wrist);
      wrists.push({ at: wrist, tangent: endAngle(c, wrist) });
    }
    const [wn, wf] = wrists as [(typeof wrists)[0], (typeof wrists)[0]];
    // The closed hand hangs along +y, the open hand points along -y.
    const open = pose.handNearOpen > 0.5;
    nearHand.style.display = open ? 'none' : '';
    nearHandOpen.style.display = open ? '' : 'none';
    nearHand.setAttribute(
      'transform',
      pinned(
        wn.at,
        wn.tangent - Math.PI / 2 + pose.handNearAngle,
        rig.handScale,
        rig.hand.pivot,
      ),
    );
    nearHandOpen.setAttribute(
      'transform',
      pinned(
        wn.at,
        wn.tangent + Math.PI / 2 + pose.handNearAngle,
        rig.handScale,
        rig.handOpen.pivot,
      ),
    );
    farHand.setAttribute(
      'transform',
      pinned(
        wf.at,
        wf.tangent - Math.PI / 2 + pose.handFarAngle,
        rig.handScale,
        rig.hand.pivot,
      ),
    );
  }

  createPlayer(document.getElementById('controls')!, {
    duration: SCENE.duration,
    fps: SCENE.fps,
    render,
  });
}

void main();
