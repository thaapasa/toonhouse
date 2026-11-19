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

const css = Object.values(list)
  .flat()
  .flatMap((font) =>
    Object.entries(font.files).map(([key, file]) => {
      const url = urls[`../../../assets/fonts/${file}`];
      const s = STYLES[key as keyof typeof STYLES];
      return `@font-face { font-family: '${font.family}'; src: url('${url}') format('truetype'); font-weight: ${s.weight}; font-style: ${s.style}; font-display: block; }`;
    }),
  )
  .join('\n');

const style = document.createElement('style');
style.textContent = css;
document.head.append(style);
