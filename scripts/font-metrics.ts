// Saves the widths of the letters of the bubble fonts in assets/fonts as a
// TypeScript file in the renderer. The renderer can't measure text, because
// it has no DOM, so it wraps the text of a speech bubble with these widths.
// Run it after adding or changing a font in assets/fonts/fonts.json.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import opentype from 'opentype.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = join(root, 'assets/fonts');
const output = join(root, 'packages/renderer/src/bubbles/fontMetrics.ts');

type Style = 'regular' | 'bold' | 'italic' | 'boldItalic';

interface FontEntry {
  id: string;
  family: string;
  files: Partial<Record<Style, string>> & { regular: string };
}

// The letters of Finnish, Swedish and English, the other Latin-1 letters and
// the punctuation that people type. A letter outside this list measures as one
// em.
const ranges: [number, number][] = [
  [0x20, 0x7e],
  [0xa0, 0xff],
];
const extra = 'ŠšŽžŒœ‘’‚“”„–—…•€™';
const chars = [
  ...ranges.flatMap(([from, to]) =>
    Array.from({ length: to - from + 1 }, (_, i) =>
      String.fromCodePoint(from + i),
    ),
  ),
  ...extra,
].join('');

const fonts = JSON.parse(
  await readFile(join(fontsDir, 'fonts.json'), 'utf8'),
) as FontEntry[];

/** Widths in thousandths of an em. */
const permille = (units: number, upm: number) =>
  Math.round((units / upm) * 1000);

const out: Record<string, unknown> = {};
for (const font of fonts) {
  const styles: Record<string, unknown> = {};
  for (const [style, file] of Object.entries(font.files)) {
    const buf = await readFile(join(fontsDir, file));
    const f = opentype.parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
    const upm = f.unitsPerEm;
    const missing: string[] = [];
    const widths = [...chars].map((c) => {
      const glyph = f.charToGlyph(c);
      if (glyph.index === 0 && c !== ' ') missing.push(c);
      return glyph.index === 0 ? 1000 : permille(glyph.advanceWidth ?? 0, upm);
    });
    for (const c of 'äöåÄÖÅ') {
      if (missing.includes(c)) throw new Error(`${file} has no letter ${c}`);
    }
    if (missing.length > 0)
      console.log(`${file}: no glyph for ${missing.join('')}`);
    styles[style] = {
      ascender: permille(f.ascender, upm),
      descender: permille(-f.descender, upm),
      widths: widths.join(','),
    };
  }
  out[font.id] = { family: font.family, styles };
}

const source = `// Made by scripts/font-metrics.ts from assets/fonts. Don't edit by hand.

/** The letters that the widths of each font style are for, in this order. */
export const METRIC_CHARS = ${JSON.stringify(chars)};

/**
 * The bubble fonts by id. Each style has the ascender and the descender of the
 * font, and the widths of \`METRIC_CHARS\` joined with commas, all in
 * thousandths of an em.
 */
export const FONT_METRICS = ${JSON.stringify(out, null, 2)} as const;
`;
await writeFile(output, source);
console.log(`Wrote ${output}`);
