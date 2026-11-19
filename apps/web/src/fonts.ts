// Loads the fonts of the speech bubbles from assets/fonts, so that a bubble
// looks the same on every device. The build bundles the font files.
const list = import.meta.glob<
  {
    id: string;
    family: string;
    files: Record<'regular' | 'bold' | 'italic' | 'boldItalic', string>;
  }[]
>('../../../assets/fonts/fonts.json', { eager: true, import: 'default' });
const urls = import.meta.glob<string>('../../../assets/fonts/*/*.ttf', {
  eager: true,
  query: '?url',
  import: 'default',
});

const STYLES = {
  regular: { weight: 'normal', style: 'normal' },
  bold: { weight: 'bold', style: 'normal' },
  italic: { weight: 'normal', style: 'italic' },
  boldItalic: { weight: 'bold', style: 'italic' },
} as const;

export interface FontFace {
  family: string;
  url: string;
  weight: string;
  style: string;
}

/** Each file of each bubble font. */
export const fontFaces: FontFace[] = Object.values(list)
  .flat()
  .flatMap((font) =>
    Object.entries(font.files).map(([key, file]) => ({
      family: font.family,
      url: urls[`../../../assets/fonts/${file}`]!,
      ...STYLES[key as keyof typeof STYLES],
    })),
  );

/** The `@font-face` rule of a font, with `src` as the URL of the file. */
export function fontFaceRule(face: FontFace, src: string): string {
  return `@font-face { font-family: '${face.family}'; src: url('${src}') format('truetype'); font-weight: ${face.weight}; font-style: ${face.style}; font-display: block; }`;
}

const style = document.createElement('style');
style.textContent = fontFaces.map((f) => fontFaceRule(f, f.url)).join('\n');
document.head.append(style);
