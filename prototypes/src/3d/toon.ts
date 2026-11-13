import * as THREE from 'three';

/**
 * A gradient map with three flat bands: shadow, midtone and light. Nearest
 * filtering keeps the steps hard.
 */
export function makeGradientMap(levels: number[] = [90, 175, 255]) {
  const data = new Uint8Array(levels);
  const tex = new THREE.DataTexture(data, levels.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export interface ToonOptions {
  gradientMap: THREE.Texture;
  /** Replaces the color of materials with these names. */
  colors?: Record<string, THREE.ColorRepresentation>;
  /** Multiplies every color, to lift dark textures. */
  tint?: number;
}

/** Swaps every mesh material for a `MeshToonMaterial` with the same color and map. */
export function toonify(root: THREE.Object3D, opts: ToonOptions) {
  const cache = new Map<THREE.Material, THREE.MeshToonMaterial>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const convert = (m: THREE.Material) => {
      let toon = cache.get(m);
      if (!toon) {
        const src = m as THREE.MeshStandardMaterial;
        toon = new THREE.MeshToonMaterial({
          color: src.color ?? 0xffffff,
          map: src.map ?? null,
          gradientMap: opts.gradientMap,
        });
        toon.name = m.name;
        const override = opts.colors?.[m.name];
        if (override !== undefined) toon.color.set(override);
        if (opts.tint !== undefined) toon.color.multiplyScalar(opts.tint);
        cache.set(m, toon);
      }
      return toon;
    };
    obj.material = Array.isArray(obj.material)
      ? obj.material.map(convert)
      : convert(obj.material);
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

/**
 * Adds an inverted-hull outline to every mesh under `root`. The hull is pushed
 * out in screen space, so the line has the same width in pixels at any
 * distance. Flat-shaded models have split normals at hard edges, which would
 * tear the hull open, so the hull uses normals averaged over vertices that
 * share a position.
 */
export function addOutlines(root: THREE.Object3D, material: THREE.Material) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !obj.userData.isOutline) meshes.push(obj);
  });
  for (const mesh of meshes) {
    addSmoothNormals(mesh.geometry);
    let hull: THREE.Mesh;
    if (mesh instanceof THREE.SkinnedMesh) {
      const skinned = new THREE.SkinnedMesh(mesh.geometry, material);
      skinned.bind(mesh.skeleton, mesh.bindMatrix);
      hull = skinned;
    } else {
      hull = new THREE.Mesh(mesh.geometry, material);
    }
    hull.userData.isOutline = true;
    hull.castShadow = false;
    hull.receiveShadow = false;
    hull.frustumCulled = false;
    mesh.add(hull);
  }
}

function addSmoothNormals(geometry: THREE.BufferGeometry) {
  if (geometry.getAttribute('outlineNormal')) return;
  const pos = geometry.getAttribute('position');
  const nor = geometry.getAttribute('normal');
  const sums = new Map<string, THREE.Vector3>();
  const keys: string[] = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
    keys.push(key);
    n.fromBufferAttribute(nor, i);
    const sum = sums.get(key);
    if (sum) sum.add(n);
    else sums.set(key, n.clone());
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const s = sums.get(keys[i]!)!.clone().normalize();
    out.set([s.x, s.y, s.z], i * 3);
  }
  geometry.setAttribute('outlineNormal', new THREE.BufferAttribute(out, 3));
}

export interface OutlineMaterial extends THREE.MeshBasicMaterial {
  userData: {
    uniforms: {
      outlineWidth: { value: number };
      outlineResolution: { value: THREE.Vector2 };
    };
  };
}

/** The hull material: a flat color drawn on back faces, pushed out in pixels. */
export function makeOutlineMaterial(
  color: THREE.ColorRepresentation,
  widthPx: number,
) {
  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
  }) as OutlineMaterial;
  const uniforms = {
    outlineWidth: { value: widthPx },
    outlineResolution: { value: new THREE.Vector2(1, 1) },
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 outlineNormal;
uniform float outlineWidth;
uniform vec2 outlineResolution;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
{
  vec3 oN = outlineNormal;
  #ifdef USE_SKINNING
    oN = (skinMatrix * vec4(oN, 0.0)).xyz;
  #endif
  vec3 vN = normalize(mat3(modelViewMatrix) * oN);
  vec2 clipN = (projectionMatrix * vec4(vN, 0.0)).xy;
  float len = length(clipN);
  if (len > 1e-5) {
    gl_Position.xy += clipN / len * outlineWidth * 2.0 / outlineResolution * gl_Position.w;
  }
  // Push the hull a little away from the camera so it never covers front faces.
  gl_Position.z += 0.0004 * gl_Position.w;
}`,
      );
  };
  return mat;
}
