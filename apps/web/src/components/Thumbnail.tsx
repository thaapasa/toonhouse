// The colors of the cards on the home board in design/project/Main.dc.html.
const palettes = [
  { sky: '#BFE6FF', ground: '#63B03E' },
  { sky: '#FFD9A8', ground: '#8CCB5E' },
  { sky: '#3B4A7A', ground: '#2E6E46' },
  { sky: '#CDEBD9', ground: '#5FA53A' },
  { sky: '#E4DAF5', ground: '#C9A86A' },
];

/**
 * A stand-in for the picture of a cartoon until the cartoons have scenes. The
 * id picks the colors, so that each cartoon keeps its own.
 */
export function Thumbnail({ id }: { id: string }) {
  const hash = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
  const { sky, ground } = palettes[hash % palettes.length]!;
  return (
    <span className="thumbnail-art" style={{ background: sky }}>
      <span className="thumbnail-ground" style={{ background: ground }} />
    </span>
  );
}
