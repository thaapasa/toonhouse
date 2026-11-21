import type { Rig } from '@toonhouse/model';
import { clipsFor, drawOrder, drawRig } from '@toonhouse/renderer';
import { describe, expect, it } from 'vitest';

import bunny from '../../../assets/characters/bunny/rig.json';
import chicken from '../../../assets/characters/chicken/rig.json';
import emo from '../../../assets/characters/emo/rig.json';
import wizard from '../../../assets/characters/wizard/rig.json';
import testTree from '../../../assets/fixtures/props/test-tree/rig.json';
import {
  angleFields,
  angleOf,
  attachmentAt,
  attachmentMover,
  attachments,
  normalizeAngle,
  pieceLayers,
  withAngle,
  withAttachment,
  withEntryMoved,
  withPivot,
} from './rigEdit.ts';

const rigs = { emo, chicken, bunny, testTree } as unknown as Record<
  string,
  Rig
>;

describe('attachmentMover', () => {
  for (const [name, rig] of Object.entries(rigs)) {
    for (const facing of [1, -1] as const) {
      it(`moves each joint of ${name} with the drag, facing ${facing}`, () => {
        const clip = clipsFor(rig.kind)[1]!;
        const frame = clip.frameAt(clip.duration * 0.3);
        const d = { x: 12, y: -7 };
        for (const a of attachments(rig)) {
          const m = attachmentMover(rig, frame, facing, a)(d);
          const p = attachmentAt(rig, a);
          const moved = withAttachment(rig, a, { x: p.x + m.x, y: p.y + m.y });
          const at = (r: Rig) =>
            drawRig(r, frame, { facing }).rigOutline.pivots.find(
              (j) => j.name === a.joint,
            )!.at;
          expect(at(moved).x - at(rig).x).toBeCloseTo(d.x, 6);
          expect(at(moved).y - at(rig).y).toBeCloseTo(d.y, 6);
        }
      });
    }
  }
});

describe('withPivot', () => {
  it('moves the mouth patch with the head', () => {
    const rig = rigs.emo!;
    const parts = rig.parts as Record<
      string,
      { pivot: { x: number; y: number } }
    >;
    const head = parts.head!.pivot;
    const patch = parts.mouthPatch!.pivot;
    const next = withPivot(rig, 'head', { x: head.x + 20, y: head.y - 5 });
    const moved = next.parts as typeof parts;
    expect(moved.head!.pivot).toEqual({ x: head.x + 20, y: head.y - 5 });
    expect(moved.mouthPatch!.pivot).toEqual({
      x: patch.x + 20,
      y: patch.y - 5,
    });
    expect(parts.head!.pivot).toBe(head);
  });
});

describe('angles', () => {
  it('keeps angles in whole degrees from -179 to 180', () => {
    expect(normalizeAngle(190.4)).toBe(-170);
    expect(normalizeAngle(-180)).toBe(180);
    expect(normalizeAngle(540)).toBe(180);
    expect(normalizeAngle(-90)).toBe(-90);
  });

  it('lists the angles that each rig has', () => {
    const ids = (r: unknown) => angleFields(r as Rig).map((f) => f.id);
    expect(ids(emo)).toEqual(['relaxedAngle', 'openAngle']);
    expect(ids(wizard)).toEqual([
      'relaxedAngle',
      'openAngle',
      'staffHandAngle',
    ]);
    expect(ids(chicken)).toEqual(['foldedAngle', 'openAngle']);
    expect(ids(bunny)).toEqual([]);
  });

  it('changes only the one angle', () => {
    const rig = rigs.emo!;
    const [relaxed, open] = angleFields(rig);
    const next = withAngle(rig, relaxed!, -80);
    expect(angleOf(next, relaxed!)).toBe(-80);
    expect(angleOf(next, open!)).toBe(angleOf(rig, open!));
  });
});

// The wizard has no layers and no draw order of its own.
describe('withEntryMoved', () => {
  const rig = wizard as unknown as Rig;
  const ids = (r: Rig) => drawOrder(r).map((e) => e.id);

  it('moves an entry towards the front or the back', () => {
    const next = withEntryMoved(rig, 'torso', 1);
    const order = ids(next);
    expect(order.indexOf('torso')).toBe(ids(rig).indexOf('torso') + 1);
    expect(next.drawOrder).toEqual(order);
    expect(ids(withEntryMoved(rig, 'torso', -1)).indexOf('torso')).toBe(
      ids(rig).indexOf('torso') - 1,
    );
  });

  it('keeps the rig at the ends of the order', () => {
    expect(withEntryMoved(rig, 'armFar', -1)).toBe(rig);
    expect(withEntryMoved(rig, 'handNear', 1)).toBe(rig);
  });

  it('goes back to the default order when the order is the default', () => {
    const back = withEntryMoved(withEntryMoved(rig, 'torso', 1), 'torso', -1);
    expect(back).not.toHaveProperty('drawOrder');
  });
});

describe('pieceLayers', () => {
  it('gives the layers of a piece in the draw order', () => {
    const rig = wizard as unknown as Rig;
    expect(pieceLayers(rig, 'head')).toEqual([undefined]);
    const head = (rig.parts as Record<string, object>).head;
    const layered = {
      ...rig,
      parts: {
        ...rig.parts,
        head: {
          ...head,
          layers: [
            { id: 'backHair', svg: 'back.svg' },
            { id: 'frontHair', svg: 'front.svg' },
          ],
        },
      },
      drawOrder: ['head.backHair', 'torso', 'head', 'head.frontHair'],
    } as Rig;
    expect(pieceLayers(layered, 'head')).toEqual([
      'backHair',
      undefined,
      'frontHair',
    ]);
  });
});
