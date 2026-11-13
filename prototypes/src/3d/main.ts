import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { directionAt, distanceAt, pointAt, SCENE } from '../common/path.ts';
import { createPlayer } from '../common/player.ts';
import {
  angleDelta,
  makePhaseMap,
  MAX_SPEED,
  smoothstep,
  walkClipSeconds,
  walkWeight,
  waveWeight,
} from './motion.ts';
import {
  addOutlines,
  makeGradientMap,
  makeOutlineMaterial,
  toonify,
} from './toon.ts';

const stage = document.getElementById('stage')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
stage.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const gradientMap = makeGradientMap();
const outline = makeOutlineMaterial(0x2a1d1a, 2.8);

let current = 0;
let ready: ((t: number) => void) | null = null;

function resize() {
  const w = stage.clientWidth || 1;
  const h = stage.clientHeight || 1;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  outline.userData.uniforms.outlineResolution.value.copy(size);
  draw(current);
}
new ResizeObserver(resize).observe(stage);

function draw(t: number) {
  current = t;
  ready?.(t);
  renderer.render(scene, camera);
}

createPlayer(document.getElementById('controls')!, {
  duration: SCENE.duration,
  fps: SCENE.fps,
  render: draw,
});

const loader = new GLTFLoader();
const base = import.meta.env.BASE_URL + '3d/';
const load = (name: string) => loader.loadAsync(base + name);

const [anne, ...props] = await Promise.all([
  load('anne.glb'),
  load('tree-round.glb'),
  load('tree-layered.glb'),
  load('tree-wide.glb'),
  load('tree-birch.glb'),
  load('rock-big.glb'),
  load('rock-small.glb'),
  load('bench.glb'),
]);

// Character ------------------------------------------------------------------

const model = anne.scene;
model.getObjectByName('Weapon_DoubleAxe')!.visible = false;
const clip = (name: string) => {
  const c = anne.animations.find((a) => a.name.split('|').includes(name));
  if (!c) throw new Error(`No clip ${name}`);
  return c;
};
const mixer = new THREE.AnimationMixer(model);
const idle = mixer.clipAction(clip('Idle'));
const walk = mixer.clipAction(clip('Walk'));
const wave = mixer.clipAction(clip('Wave'));
for (const a of [idle, walk, wave]) {
  a.play();
  a.setEffectiveWeight(0);
}

const calib = calibrateWalk();
console.info(
  '3d calibration',
  JSON.stringify({ ...calib, advance: undefined }),
);

toonify(model, { gradientMap });
addOutlines(model, outline);
scene.add(model);

/**
 * Measures the walk clip with the model at the origin. For each sample it
 * records how far the planted foot moves backwards until the next sample: the
 * distance the body should move forward over that slice of the clip. It also
 * finds the phase where the feet pass each other.
 */
function calibrateWalk() {
  const footL = model.getObjectByName('FootL')!;
  const footR = model.getObjectByName('FootR')!;
  const n = 240;
  const T = walk.getClip().duration;
  walk.setEffectiveWeight(1);
  const samples: { l: THREE.Vector3; r: THREE.Vector3 }[] = [];
  for (let i = 0; i < n; i++) {
    walk.time = (i / n) * T;
    mixer.update(0);
    model.updateMatrixWorld(true);
    samples.push({
      l: footL.getWorldPosition(new THREE.Vector3()),
      r: footR.getWorldPosition(new THREE.Vector3()),
    });
  }
  walk.setEffectiveWeight(0);
  const floor = Math.min(...samples.map((s) => Math.min(s.l.y, s.r.y)));
  // null where neither foot is on the ground: the walk has a short hop there.
  const planted: (number | null)[] = [];
  let passing = 0;
  let passGap = Infinity;
  for (let i = 0; i < n; i++) {
    const a = samples[i]!;
    const b = samples[(i + 1) % n]!;
    const low = a.l.y < a.r.y ? 'l' : 'r';
    planted.push(a[low].y < floor + 0.006 ? a[low].z - b[low].z : null);
    const gap = Math.abs(a.l.z - a.r.z);
    if (gap < passGap) {
      passGap = gap;
      passing = i / n;
    }
  }
  const known = planted.filter((d): d is number => d !== null);
  const mean = known.reduce((x, y) => x + y, 0) / known.length;
  // In the hop, keep the body moving at the average speed. Never let it stop
  // or move backwards, so that distance maps to exactly one phase.
  const advance = planted.map((d) => Math.max(d ?? mean, 0.4 * mean));
  const cycle = advance.reduce((x, y) => x + y, 0);
  const box = new THREE.Box3().setFromObject(model, true);
  return {
    duration: T,
    groundSpeed: cycle / T,
    advance,
    passingPhase: passing,
    height: box.max.y - box.min.y,
  };
}

// World ------------------------------------------------------------------------

/** Path metres to world units, so that the top walk speed matches the clip. */
const K = calib.groundSpeed / MAX_SPEED;
const H = calib.height;
const toWorld = (x: number, z: number) => new THREE.Vector3(x * K, 0, z * K);

const walkT = walk.getClip().duration;
const walkPhase = makePhaseMap(calib.advance, 0.8);
// Start the walk cycle so that the feet pass each other just as the walk ends.
const walkOffset =
  walkPhase.toDistance(calib.passingPhase) -
  walkClipSeconds(SCENE.walkEnd) / walkT;

scene.background = skyTexture();
scene.fog = new THREE.Fog(0xcfe8f0, 18 * H, 40 * H);

const hemi = new THREE.HemisphereLight(0xdff2ff, 0x6b8f4e, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3dc, 2.2);
sun.position.set(-3 * H, 6 * H, 4 * H);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -8 * H;
sc.right = 8 * H;
sc.top = 8 * H;
sc.bottom = -8 * H;
sc.near = 0.1;
sc.far = 30 * H;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(60 * H, 64),
  new THREE.MeshToonMaterial({ color: 0x8fcf6a, gradientMap }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

scene.add(pathRibbon());

function pathRibbon() {
  const steps = 120;
  const halfWidth = 0.42 * H;
  const pts: number[] = [];
  const idx: number[] = [];
  const length = distanceAt(SCENE.walkEnd);
  const extra = 1.2; // path metres beyond the stop
  for (let i = 0; i <= steps; i++) {
    const s = -extra + ((length + 2 * extra) * i) / steps;
    const sc = Math.min(Math.max(s, 0), length);
    const p = pointAt(sc);
    const d = directionAt(sc);
    const over = s - sc;
    const cx = (p.x + d.x * over) * K;
    const cz = (p.z + d.z * over) * K;
    pts.push(cx - d.z * halfWidth, 0.003, cz + d.x * halfWidth);
    pts.push(cx + d.z * halfWidth, 0.003, cz - d.x * halfWidth);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(
    g,
    new THREE.MeshToonMaterial({
      color: 0xe8d29a,
      gradientMap,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  m.receiveShadow = true;
  return m;
}

const [treeRound, treeLayered, treeWide, treeBirch, rockBig, rockSmall, bench] =
  props.map((g) => g.scene);

/** Places a copy of a prop at path coordinates, scaled to a height in character heights. */
function place(
  src: THREE.Object3D,
  x: number,
  z: number,
  heightH: number,
  yawDeg = 0,
  sink = 0,
) {
  const obj = src.clone(true);
  const box = new THREE.Box3().setFromObject(obj);
  const s = (heightH * H) / (box.max.y - box.min.y);
  obj.scale.setScalar(s);
  obj.position.copy(toWorld(x, z));
  obj.position.y = -box.min.y * s - sink * heightH * H;
  obj.rotation.y = (yawDeg * Math.PI) / 180;
  scene.add(obj);
  return obj;
}

const propColors = {
  Tree_Green: 0x5fb04a,
  Tree_Wood: 0x8a5a3c,
  Green: 0x6cbf52,
  Brown: 0x8a5a3c,
  Wood: 0x9a6640,
  White: 0xf2efe6,
  Black: 0x3a3a3a,
  DarkGreen: 0x4f9a45,
  Stone: 0xa9a59c,
  Stone_Dark: 0x8f97a3,
};
for (const p of [
  treeRound,
  treeLayered,
  treeWide,
  treeBirch,
  rockBig,
  rockSmall,
  bench,
]) {
  toonify(p!, { gradientMap, colors: propColors });
  addOutlines(p!, outline);
}

// Trees in a loose row behind the path, smaller ones further back.
place(treeRound!, -6.4, -5.2, 2.7);
place(treeWide!, -3.0, -6.4, 2.5, 40);
place(treeBirch!, -0.4, -4.6, 2.9);
place(treeLayered!, 2.6, -5.6, 2.8);
place(treeRound!, 5.6, -4.4, 2.4, 90);
place(treeLayered!, -9.6, -3.0, 2.6, 200);
place(treeWide!, 8.4, -7.0, 2.2, 160);
// Bushes: the round tree sunk into the ground so that only the crown shows.
place(treeRound!, -4.4, -3.0, 1.4, 0, 0.55);
place(treeRound!, 3.8, -2.6, 1.2, 120, 0.55);
place(treeRound!, -7.6, 0.4, 1.6, 60, 0.55);
place(bench!, 2.0, -1.0, 0.5, -10);
place(rockBig!, -5.4, 2.6, 0.45, 30);
place(rockSmall!, 4.2, 2.2, 0.3, 10);
place(rockSmall!, -1.2, -2.4, 0.22, 200);

// Camera -------------------------------------------------------------------------

const mid = toWorld(-1.3, 0.1);

/** A low camera in front of the path that pans part of the way with the character. */
function placeCamera(t: number) {
  const p = pointAt(distanceAt(t));
  const x = mid.x + (p.x * K - mid.x) * 0.55;
  camera.position.set(x, 0.8 * H, mid.z + 7 * H);
  camera.lookAt(x, 0.55 * H, mid.z);
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5fb3e8');
  grad.addColorStop(0.6, '#a9dcf2');
  grad.addColorStop(1, '#e8f6f2');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Pose -----------------------------------------------------------------------------

function pose(t: number) {
  placeCamera(t);
  const d = distanceAt(t);
  const p = pointAt(d);
  const dir = directionAt(d);
  const pos = toWorld(p.x, p.z);
  model.position.copy(pos);

  const pathYaw = Math.atan2(dir.x, dir.z);
  const camYaw = Math.atan2(
    camera.position.x - pos.x,
    camera.position.z - pos.z,
  );
  const turn = smoothstep(4.6, 5.7, t) * 0.7;
  model.rotation.y = pathYaw + angleDelta(pathYaw, camYaw) * turn;

  const ww = walkWeight(t);
  const wv = waveWeight(t);
  const wi = Math.max(0, 1 - ww - wv);
  walk.setEffectiveWeight(ww);
  wave.setEffectiveWeight(wv);
  idle.setEffectiveWeight(wi);
  walk.time =
    walkPhase.toPhase(mod(walkOffset + walkClipSeconds(t) / walkT, 1)) * walkT;
  idle.time = mod(t, idle.getClip().duration);
  wave.time = mod(
    Math.max(0, t - SCENE.waveStart + 0.15),
    wave.getClip().duration,
  );
  mixer.update(0);
}

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

ready = pose;
draw(current);

declare global {
  interface Window {
    /** Debug hook for the foot-sliding check in `scripts/`. */
    toon3d?: { feet(t: number): number[]; screen(): number[] };
  }
}
const footL = model.getObjectByName('FootL')!;
const footR = model.getObjectByName('FootR')!;
window.toon3d = {
  feet(t: number) {
    pose(t);
    model.updateMatrixWorld(true);
    const l = footL.getWorldPosition(new THREE.Vector3());
    const r = footR.getWorldPosition(new THREE.Vector3());
    return [l.x, l.y, l.z, r.x, r.y, r.z];
  },
  /** Where the character stands on the canvas, in CSS pixels. */
  screen() {
    const p = model.position.clone().project(camera);
    const top = model.position.clone().setY(H).project(camera);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    return [((p.x + 1) / 2) * w, ((1 - p.y) / 2) * h, ((top.y - p.y) / 2) * h];
  },
};
