// Checks the color settings of every character and prop against its SVG
// layers, so that a typo in a role or a preset that doesn't match the
// drawings fails a test.
import { describe, expect, it } from 'vitest';

import { RIGS } from './characters.ts';

/** The fills and the strokes of the paths of each role class in the SVGs. */
function roleColors(svgs: string[]) {
  const colors = new Map<string, Set<string>>();
  for (const svg of svgs) {
    for (const [tag] of svg.matchAll(/<[a-z]+\s[^>]*class="[^"]*"[^>]*>/g)) {
      const paint = /\s(?:fill|stroke)="(#[0-9a-f]+)"/i.exec(tag)?.[1];
      const classes = /class="([^"]*)"/.exec(tag)![1]!.split(/\s+/);
      for (const c of classes) {
        const role = /^c-(.+)$/.exec(c)?.[1];
        if (!role || !paint) continue;
        const set = colors.get(role) ?? new Set();
        set.add(paint.toLowerCase());
        colors.set(role, set);
      }
    }
  }
  return colors;
}

const cases = RIGS.filter((r) => r.rig.colorSettings).map(
  (r) => [r.id, r] as const,
);

describe.each(cases)('color settings of %s', (_, asset) => {
  const settings = asset.rig.colorSettings!;
  const drawn = roleColors(Object.values(asset.parts));
  // A role can also color only what the renderer draws, such as trousers
  // on the rubber-hose legs.
  const rig = asset.rig;
  const rendered = new Set([
    ...('colors' in rig ? Object.keys(rig.colors) : []),
    ...Object.values(rig.colorRoles ?? {}),
  ]);

  it('has unique ids', () => {
    const ids = settings.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of settings) {
      const presets = s.presets.map((p) => p.id);
      expect(presets.length).toBeGreaterThan(0);
      expect(new Set(presets).size).toBe(presets.length);
    }
  });

  it('sets only roles that the rig has', () => {
    for (const s of settings) {
      for (const p of s.presets) {
        for (const role of Object.keys(p.colors)) {
          const known = drawn.has(role) || rendered.has(role);
          expect(known, `${s.id}.${p.id}: ${role}`).toBe(true);
        }
      }
    }
  });

  it('has the colors of the drawings in the first preset', () => {
    for (const s of settings) {
      for (const [role, color] of Object.entries(s.presets[0]!.colors)) {
        if (!drawn.has(role)) continue;
        expect([...drawn.get(role)!], `${s.id}: ${role}`).toEqual([
          color.toLowerCase(),
        ]);
      }
    }
  });
});
