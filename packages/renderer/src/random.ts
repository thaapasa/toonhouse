// Random numbers that depend only on their inputs, so that a scene looks the
// same each time it plays. The renderer has no other randomness.

/** Mixes the bits of a 32-bit integer, so that close inputs give far outputs. */
function mix32(n: number): number {
  let h = n | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * A number in [0, 1) for the item `index` of a seed. Each `channel` gives an
 * unrelated number for the same item, such as its x and its size.
 */
export function random(seed: number, index: number, channel: number): number {
  let h = mix32(seed + 0x9e3779b9);
  h = mix32(h + Math.imul(index + 1, 0x85ebca6b));
  h = mix32(h + Math.imul(channel + 1, 0xc2b2ae35));
  return h / 0x1_0000_0000;
}

/** A 32-bit hash of a text, FNV-1a. */
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
