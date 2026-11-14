// The draw order of a rig. Each rig kind draws a fixed set of slots: the
// limbs that the renderer draws and the parts on the bones. A slot that draws
// a part has an entry for the main layer and one for each other layer of the
// part. The draw order is a flat list of these entries, so a layer can go in
// front of or behind anything else, whatever bone it moves with.
import type { PartId, Rig, RigPart } from '@toonhouse/model';

import type { DrawNode } from './draw.ts';

interface Slot {
  id: string;
  /**
   * The parts that the slot can draw, such as the relaxed and the open hand.
   * A drawn limb has none.
   */
  parts: readonly PartId[];
  /** On the far side, drawn with the far shade. See `FarGroup`. */
  far?: FarGroup;
}

/**
 * The far entries next to each other in the draw order share one group with
 * the far shade if they have the same `FarGroup`. The far ear of the rabbit
 * has a group of its own, because a shared group changes the anti-aliasing of
 * the whole drawing in Chrome.
 */
export type FarGroup = 'body' | 'head';

/** One thing in the draw order: a drawn limb or a layer of a part. */
export interface DrawEntry {
  /** The slot id for a limb or a main layer, `slot.layer` for other layers. */
  id: string;
  slot: string;
  /** The parts that the slot can draw. Empty for a drawn limb. */
  parts: readonly PartId[];
  /** The layer, if this is not the main layer of the part or a limb. */
  layer?: string;
  /** On the far side, drawn with the far shade of the rig. */
  far?: FarGroup;
}

/** The slots of each rig kind, in the default draw order. */
function slots(rig: Rig): Slot[] {
  switch (rig.kind) {
    case 'cutout': {
      // A long robe covers the near foot.
      const behind = rig.feetBehindTorso === true;
      const footNear: Slot = { id: 'footNear', parts: ['foot'] };
      return [
        { id: 'armFar', parts: [], far: 'body' },
        { id: 'handFar', parts: ['hand'], far: 'body' },
        { id: 'legFar', parts: [], far: 'body' },
        { id: 'footFar', parts: ['foot'], far: 'body' },
        { id: 'legNear', parts: [] },
        ...(behind ? [footNear] : []),
        { id: 'torso', parts: ['torso'] },
        ...(behind ? [] : [footNear]),
        { id: 'head', parts: ['head'] },
        ...(rig.staff && rig.parts.staff
          ? [{ id: 'staff', parts: ['staff'] } satisfies Slot]
          : []),
        { id: 'armNear', parts: [] },
        { id: 'handNear', parts: ['hand', 'handOpen'] },
      ];
    }
    case 'bird':
      return [
        { id: 'wingFar', parts: ['wing', 'wingOpen'], far: 'body' },
        { id: 'legFar', parts: [], far: 'body' },
        { id: 'footFar', parts: ['foot'], far: 'body' },
        { id: 'legNear', parts: [] },
        { id: 'footNear', parts: ['foot'] },
        // The neck goes behind the body and the head, so only its middle
        // shows.
        { id: 'neck', parts: [] },
        { id: 'body', parts: ['body'] },
        { id: 'head', parts: ['head'] },
        { id: 'wingNear', parts: ['wing', 'wingOpen'] },
      ];
    case 'rabbit':
      return [
        { id: 'hindLegFar', parts: [], far: 'body' },
        { id: 'footFar', parts: ['foot'], far: 'body' },
        { id: 'frontLegFar', parts: [], far: 'body' },
        { id: 'pawFar', parts: ['paw'], far: 'body' },
        { id: 'earFar', parts: ['ear'], far: 'head' },
        { id: 'earNear', parts: ['ear'] },
        { id: 'hindLegNear', parts: [] },
        { id: 'body', parts: ['body'] },
        { id: 'footNear', parts: ['foot'] },
        { id: 'head', parts: ['head'] },
        { id: 'frontLegNear', parts: [] },
        { id: 'pawNear', parts: ['paw'] },
      ];
  }
}

const partOf = (rig: Rig, id: PartId): RigPart | undefined =>
  (rig.parts as Partial<Record<PartId, RigPart>>)[id];

/**
 * The entries of a rig in the default draw order of its kind. The other
 * layers of a part come right after its main layer, in the order of the part.
 */
export function defaultDrawOrder(rig: Rig): DrawEntry[] {
  return slots(rig).flatMap((s) => {
    const far = s.far ? { far: s.far } : {};
    const main: DrawEntry = { id: s.id, slot: s.id, parts: s.parts, ...far };
    const layers = s.parts
      .flatMap((p) => partOf(rig, p)?.layers ?? [])
      .map((l) => l.id);
    return [
      main,
      ...[...new Set(layers)].map((layer): DrawEntry => ({
        id: `${s.id}.${layer}`,
        slot: s.id,
        parts: s.parts,
        layer,
        ...far,
      })),
    ];
  });
}

/**
 * The entries of a rig in its draw order, from the back to the front. The
 * order of the rig wins. An entry that it leaves out, such as a new layer,
 * goes right after the entry before it in the default order, and the ids
 * that the rig doesn't have are dropped.
 */
export function drawOrder(rig: Rig): DrawEntry[] {
  const all = defaultDrawOrder(rig);
  if (!rig.drawOrder) return all;
  const byId = new Map(all.map((e) => [e.id, e]));
  const order: DrawEntry[] = [];
  for (const id of rig.drawOrder) {
    const e = byId.get(id);
    if (e && !order.includes(e)) order.push(e);
  }
  all.forEach((e, i) => {
    if (order.includes(e)) return;
    const before = i > 0 ? order.indexOf(all[i - 1]!) : -1;
    order.splice(before + 1, 0, e);
  });
  return order;
}

/**
 * What a slot draws in one frame, with the transforms of the whole
 * character: the nodes of the limb or the main layer, and the nodes of each
 * other layer by its id.
 */
export interface SlotDrawing {
  nodes: DrawNode[];
  layers?: Record<string, DrawNode[]>;
}

/**
 * Draws each layer of a part. `draw` gets no layer for the main layer, and
 * places every layer in the same way.
 */
export function layered(
  part: RigPart,
  draw: (layer?: string) => DrawNode[],
): SlotDrawing {
  return {
    nodes: draw(),
    layers: Object.fromEntries(
      (part.layers ?? []).map((l) => [l.id, draw(l.id)]),
    ),
  };
}

/**
 * The nodes of the slots in the draw order of the rig, with the far entries
 * in groups with the far shade.
 */
export function arrange(
  rig: Rig,
  drawn: Record<string, SlotDrawing | undefined>,
): DrawNode[] {
  const out: DrawNode[] = [];
  let shaded = null as { far: FarGroup; nodes: DrawNode[] } | null;
  for (const e of drawOrder(rig)) {
    const slot = drawn[e.slot];
    const nodes = e.layer === undefined ? slot?.nodes : slot?.layers?.[e.layer];
    if (!nodes?.length) continue;
    if (!e.far) {
      shaded = null;
      out.push(...nodes);
    } else if (shaded?.far === e.far) {
      shaded.nodes.push(...nodes);
    } else {
      shaded = { far: e.far, nodes: [...nodes] };
      out.push({ type: 'group', shade: rig.farShade, children: shaded.nodes });
    }
  }
  return out;
}
