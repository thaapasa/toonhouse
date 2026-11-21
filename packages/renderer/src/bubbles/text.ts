// Wraps the text of a speech bubble with the letter widths in
// `fontMetrics.ts`, so that the lines break in the same places in the editor,
// the player and the exported video. The stage draws the text with kerning
// and ligatures off, so that the widths match. A joined-up font needs its
// contextual alternates, which can make a line up to a few percent wider than
// measured, and the padding of the bubble takes that.
import type { Bubble, BubbleFontId } from '@toonhouse/model';

import { FONT_METRICS, METRIC_CHARS } from './fontMetrics.ts';

type FontStyle = 'regular' | 'bold' | 'italic' | 'boldItalic';

interface StyleMetrics {
  ascender: number;
  descender: number;
  widths: Map<string, number>;
}

const metrics = new Map<string, StyleMetrics>();

/** The metrics of a style of a font. Each font has at least the regular style. */
function styleMetrics(font: BubbleFontId, style: FontStyle): StyleMetrics {
  const styles: Partial<
    Record<FontStyle, { ascender: number; descender: number; widths: string }>
  > = FONT_METRICS[font].styles;
  // Without a file for the style, the browser makes the regular letters bold
  // or slanted, and they keep their widths.
  const key = styles[style] ? style : 'regular';
  const id = `${font}/${key}`;
  let m = metrics.get(id);
  if (!m) {
    const s = styles[key]!;
    const widths = s.widths.split(',').map(Number);
    m = {
      ascender: s.ascender / 1000,
      descender: s.descender / 1000,
      widths: new Map([...METRIC_CHARS].map((c, i) => [c, widths[i]! / 1000])),
    };
    metrics.set(id, m);
  }
  return m;
}

export const BUBBLE_FONTS = Object.keys(FONT_METRICS) as BubbleFontId[];

/** The CSS font family of a bubble font. */
export const fontFamily = (font: BubbleFontId) => FONT_METRICS[font].family;

/** The bubble font with the CSS font family, such as the font of an asset pack. */
export const fontByFamily = (family: string): BubbleFontId | null =>
  BUBBLE_FONTS.find((f) => FONT_METRICS[f].family === family) ?? null;

/** The default font of a bubble when neither the bubble nor the asset pack sets one. */
export const DEFAULT_BUBBLE_FONT: BubbleFontId = 'comic-relief';

export interface TextLayout {
  /** The lines, in capitals if the bubble says so. */
  lines: { text: string; width: number }[];
  /** The width of the widest line, in frame pixels. */
  width: number;
  height: number;
  lineHeight: number;
  /** How far the first baseline is below the top of the text. */
  baseline: number;
}

/** The text of the bubble as it shows. */
export const shownText = (bubble: Bubble) =>
  bubble.caps ? bubble.text.toUpperCase() : bubble.text;

const styleOf = (bubble: Bubble): FontStyle =>
  bubble.bold
    ? bubble.italic
      ? 'boldItalic'
      : 'bold'
    : bubble.italic
      ? 'italic'
      : 'regular';

/**
 * Splits text into the letters that a reader sees, so that an emoji made of
 * several code points or a letter with a combining accent stays whole. The
 * fixed locale keeps the result the same on every device. Grapheme rules
 * don't depend on the locale anyway.
 */
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
const lettersOf = (s: string) =>
  Array.from(graphemes.segment(s), (g) => g.segment);

/**
 * Breaks the text of the bubble into lines of at most `bubble.width`. A word
 * that is wider than that breaks between its letters.
 */
export function layoutText(bubble: Bubble, font: BubbleFontId): TextLayout {
  const m = styleMetrics(font, styleOf(bubble));
  const size = bubble.fontSize;
  // A letter without a width, such as an emoji, counts as 1 em. The composed
  // form finds the width of a letter typed with a combining accent.
  const widthOf = (letter: string) =>
    m.widths.get(letter) ?? m.widths.get(letter.normalize('NFC')) ?? 1;
  const measureLetters = (letters: readonly string[]) => {
    let w = 0;
    for (const l of letters) w += widthOf(l);
    return w * size;
  };
  const measure = (s: string) => measureLetters(lettersOf(s));
  const max = Math.max(bubble.width, size);
  const lines: { text: string; width: number }[] = [];
  const push = (text: string) => lines.push({ text, width: measure(text) });

  for (const paragraph of shownText(bubble).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/ +/)) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next) <= max) {
        line = next;
        continue;
      }
      if (line) push(line);
      // A word that doesn't fit on a line of its own breaks between letters.
      let rest = lettersOf(word);
      while (measureLetters(rest) > max) {
        let cut = 1;
        while (
          cut < rest.length &&
          measureLetters(rest.slice(0, cut + 1)) <= max
        )
          cut++;
        push(rest.slice(0, cut).join(''));
        rest = rest.slice(cut);
      }
      line = rest.join('');
    }
    push(line.trimEnd());
  }

  const lineHeight = size * (bubble.lineSpacing ?? 1.2);
  const glyphHeight = (m.ascender + m.descender) * size;
  return {
    lines,
    width: Math.max(0, ...lines.map((l) => l.width)),
    height: lines.length * lineHeight,
    lineHeight,
    baseline: (lineHeight - glyphHeight) / 2 + m.ascender * size,
  };
}
