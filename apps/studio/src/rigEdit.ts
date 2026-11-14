// Reads and changes a rig for the rig editor. The editor moves two kinds of
// points: the attachment points on a piece, where a child piece or a limb
// joins it, such as where a bone of a prop joins its parent, and the pivot of
// each piece. It also changes the rest angles of
// some pieces and the draw order.
import type { ClipFrame, PartId, Pt, Rig, RigPart } from '@toonhouse/model';
import {
  defaultDrawOrder,
  drawCharacter,
  type DrawEntry,
  drawOrder,
} from '@toonhouse/renderer';

/** What the rig editor has selected. */
export type RigTarget =
  { type: 'attachment'; joint: string } | { type: 'piece'; part: PartId };

/** An attachment point, at `rig[group][key]`. */
export interface Attachment {
  /** The name of the joint in the skeleton of the drawing. */
  joint: string;
  group: 'torso' | 'body' | 'ears' | 'bones';
  /** The key in the group, or the bone id for the bones of a prop. */
  key: string;
  /** The piece that the point is on, in its pixels. */
  piece: PartId;
}

const BODY_POINTS = [
  'neck',
  'shoulderNear',
  'shoulderFar',
  'hipNear',
  'hipFar',
] as const;

export function attachments(rig: Rig): Attachment[] {
  if (rig.kind === 'prop') {
    return rig.bones.flatMap((b) => {
      const parent = rig.bones.find((p) => p.id === b.parent);
      return parent
        ? [{ joint: b.id, group: 'bones', key: b.id, piece: parent.part }]
        : [];
    });
  }
  const group = rig.kind === 'cutout' ? 'torso' : 'body';
  const list: Attachment[] = BODY_POINTS.map((key) => ({
    joint: key,
    group,
    key,
    piece: group,
  }));
  if (rig.kind === 'rabbit') {
    list.push(
      { joint: 'earNear', group: 'ears', key: 'near', piece: 'head' },
      { joint: 'earFar', group: 'ears', key: 'far', piece: 'head' },
    );
  }
  return list;
}

type PointGroups = Record<string, Record<string, Pt>>;

export function attachmentAt(rig: Rig, a: Attachment): Pt {
  if (rig.kind === 'prop') {
    // A bone without a point of its own joins its parent at the pivot.
    const bone = rig.bones.find((b) => b.id === a.key);
    return bone?.at ?? rig.parts[a.piece]!.pivot;
  }
  return (rig as unknown as PointGroups)[a.group]![a.key]!;
}

export function withAttachment(rig: Rig, a: Attachment, p: Pt): Rig {
  if (rig.kind === 'prop') {
    return {
      ...rig,
      bones: rig.bones.map((b) => (b.id === a.key ? { ...b, at: p } : b)),
    };
  }
  const groups = rig as unknown as PointGroups;
  return { ...rig, [a.group]: { ...groups[a.group], [a.key]: p } } as Rig;
}

type Parts = Partial<Record<PartId, RigPart>>;

/** The pieces with a pivot to edit. The mouth patch moves with the head. */
export const pieces = (rig: Rig): PartId[] =>
  (Object.keys(rig.parts) as PartId[]).filter((id) => id !== 'mouthPatch');

export const pieceOf = (rig: Rig, part: PartId): RigPart =>
  (rig.parts as Parts)[part]!;

export function withPivot(rig: Rig, part: PartId, p: Pt): Rig {
  const parts = rig.parts as Parts;
  const old = parts[part]!.pivot;
  const next: Parts = { ...parts, [part]: { ...parts[part]!, pivot: p } };
  // The mouth patch is drawn in head pixels with the head pivot, so it keeps
  // its place on the face only if its pivot moves with the head's.
  const patch = parts.mouthPatch;
  if (part === 'head' && patch) {
    next.mouthPatch = {
      ...patch,
      pivot: {
        x: patch.pivot.x + p.x - old.x,
        y: patch.pivot.y + p.y - old.y,
      },
    };
  }
  return { ...rig, parts: next } as Rig;
}

export function findTarget(rig: Rig, target: RigTarget | null) {
  if (target?.type === 'attachment') {
    const a = attachments(rig).find((x) => x.joint === target.joint);
    return a ? { ...target, attachment: a, at: attachmentAt(rig, a) } : null;
  }
  if (target?.type === 'piece' && (rig.parts as Parts)[target.part]) {
    return { ...target, at: pieceOf(rig, target.part).pivot };
  }
  return null;
}

export function withTarget(rig: Rig, target: RigTarget, p: Pt): Rig {
  if (target.type === 'piece') return withPivot(rig, target.part, p);
  const a = attachments(rig).find((x) => x.joint === target.joint);
  return a ? withAttachment(rig, a, p) : rig;
}

/**
 * Turns a move on the stage into the move of an attachment point in the
 * pixels of its piece, for one frame. The piece may be turned, scaled and
 * flipped, so this moves the point by 1 px in x and in y, sees where the
 * joint goes, and inverts that.
 */
export function attachmentMover(
  rig: Rig,
  frame: ClipFrame,
  facing: 1 | -1,
  a: Attachment,
): (d: Pt) => Pt {
  const jointAt = (r: Rig) =>
    drawCharacter(r, frame, { facing }).skeleton.joints.find(
      (j) => j.name === a.joint,
    )!.at;
  const p = attachmentAt(rig, a);
  const o = jointAt(rig);
  const moved = (dx: number, dy: number) => {
    const q = jointAt(withAttachment(rig, a, { x: p.x + dx, y: p.y + dy }));
    return { x: q.x - o.x, y: q.y - o.y };
  };
  const ex = moved(1, 0);
  const ey = moved(0, 1);
  const det = ex.x * ey.y - ey.x * ex.y;
  if (Math.abs(det) < 1e-9) return () => ({ x: 0, y: 0 });
  return (d) => ({
    x: (d.x * ey.y - ey.x * d.y) / det,
    y: (ex.x * d.y - ex.y * d.x) / det,
  });
}

export const roundPt = (p: Pt): Pt => ({
  x: Math.round(p.x),
  y: Math.round(p.y),
});

/**
 * A rest angle of a piece, at `rig[group][key]` in degrees. The renderer adds
 * it to the direction of what the piece hangs from: the end of the arm, or
 * the up direction of the body.
 */
export interface AngleField {
  id: string;
  group: 'hands' | 'wings' | 'staff';
  key: string;
  part: PartId;
  reference: 'arm' | 'body';
  /**
   * The direction of the reference in the editor, in degrees, so that the
   * piece shows as it usually does in the clips: the relaxed hand hangs
   * down, and the open hand is held up.
   */
  viewTurn: number;
  label: 'turn' | 'turnWithStaff';
}

export function angleFields(rig: Rig): AngleField[] {
  if (rig.kind === 'cutout') {
    const list: AngleField[] = [
      {
        id: 'relaxedAngle',
        group: 'hands',
        key: 'relaxedAngle',
        part: 'hand',
        reference: 'arm',
        viewTurn: 90,
        label: 'turn',
      },
      {
        id: 'openAngle',
        group: 'hands',
        key: 'openAngle',
        part: 'handOpen',
        reference: 'arm',
        viewTurn: -90,
        label: 'turn',
      },
    ];
    if (rig.staff && rig.parts.staff) {
      list.push({
        id: 'staffHandAngle',
        group: 'staff',
        key: 'handAngle',
        part: 'hand',
        reference: 'body',
        viewTurn: 0,
        label: 'turnWithStaff',
      });
    }
    return list;
  }
  if (rig.kind === 'bird') {
    return [
      {
        id: 'foldedAngle',
        group: 'wings',
        key: 'foldedAngle',
        part: 'wing',
        reference: 'body',
        viewTurn: 0,
        label: 'turn',
      },
      {
        id: 'openAngle',
        group: 'wings',
        key: 'openAngle',
        part: 'wingOpen',
        reference: 'body',
        viewTurn: 0,
        label: 'turn',
      },
    ];
  }
  return [];
}

type NumberGroups = Record<string, Record<string, number>>;

export const angleOf = (rig: Rig, f: AngleField): number =>
  (rig as unknown as NumberGroups)[f.group]![f.key]!;

/** An angle in whole degrees, from -179 to 180. */
export const normalizeAngle = (deg: number): number => {
  const a = Math.round(deg) % 360;
  if (a > 180) return a - 360;
  if (a <= -180) return a + 360;
  return a;
};

export function withAngle(rig: Rig, f: AngleField, deg: number): Rig {
  const groups = rig as unknown as NumberGroups;
  return {
    ...rig,
    [f.group]: { ...groups[f.group], [f.key]: normalizeAngle(deg) },
  } as Rig;
}

/**
 * The rig with the entry `id` moved by `by` places in the draw order, towards
 * the front for a positive `by`. If the order becomes the default one, the rig
 * goes back to the default order, so that its file has no draw order to keep
 * up to date.
 */
export function withEntryMoved(rig: Rig, id: string, by: number): Rig {
  const order = drawOrder(rig).map((e) => e.id);
  const from = order.indexOf(id);
  const to = Math.min(Math.max(from + by, 0), order.length - 1);
  if (from < 0 || to === from) return rig;
  order.splice(from, 1);
  order.splice(to, 0, id);
  const defaults = defaultDrawOrder(rig).map((e) => e.id);
  return order.join() === defaults.join()
    ? withDefaultDrawOrder(rig)
    : ({ ...rig, drawOrder: order } as Rig);
}

export function withDefaultDrawOrder(rig: Rig): Rig {
  const next = { ...rig };
  delete next.drawOrder;
  return next;
}

/**
 * The layers of a piece in the order they are drawn, with `undefined` for
 * the main layer. A piece that more than one slot draws, such as the foot,
 * takes the order of the first slot.
 */
export function pieceLayers(rig: Rig, part: PartId): (string | undefined)[] {
  const own = new Set((pieceOf(rig, part).layers ?? []).map((l) => l.id));
  const entries: DrawEntry[] = drawOrder(rig);
  const slot = entries.find((e) => e.parts.includes(part))?.slot;
  if (slot === undefined) return [undefined];
  return entries
    .filter(
      (e) => e.slot === slot && (e.layer === undefined || own.has(e.layer)),
    )
    .map((e) => e.layer);
}
