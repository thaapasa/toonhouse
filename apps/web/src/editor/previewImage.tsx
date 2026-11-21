// Makes the preview image of a cartoon from a frame of a scene. The editor
// loads this module only when the user sets the preview, because it pulls in
// `react-dom/server`.
import type { Scene } from '@toonhouse/model';
import type { SceneFrame } from '@toonhouse/renderer';
import { renderToStaticMarkup } from 'react-dom/server';

import { SceneDrawing } from '../components/SceneDrawing.tsx';
import { fontFaceRule, fontFaces } from '../fonts.ts';

/** The size of the image. The cards on the home page are smaller than this. */
const WIDTH = 960;
const HEIGHT = 540;
const QUALITY = 0.85;

/**
 * Draws the frame as the player shows it, without the selection and the parts
 * outside the frame, and returns it as a WebP image. A browser that can't make
 * WebP, such as Safari, gives a PNG.
 */
export async function makePreviewImage(
  scene: Scene,
  frame: SceneFrame,
): Promise<Blob> {
  const { width, height } = frame.background;
  const drawing = <SceneDrawing scene={scene} frame={frame} prefix="preview" />;
  // The drawing renders twice, so that only the fonts that it uses go in.
  const fonts = await embeddedFonts(renderToStaticMarkup(<svg>{drawing}</svg>));
  const svg = renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={WIDTH}
      height={HEIGHT}
      preserveAspectRatio="xMidYMid slice"
    >
      <style dangerouslySetInnerHTML={{ __html: fonts }} />
      {drawing}
    </svg>,
  );

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext('2d')!.drawImage(img, 0, 0, WIDTH, HEIGHT);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No image'))),
        'image/webp',
        QUALITY,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * An SVG that the browser draws as an image can't load files or use the fonts
 * of the page, so the fonts of the bubbles go into the SVG as data URLs. Only
 * the fonts that the drawing uses go in.
 */
async function embeddedFonts(drawing: string): Promise<string> {
  const used = fontFaces.filter((f) => drawing.includes(f.family));
  const rules = await Promise.all(
    used.map(async (face) => fontFaceRule(face, await dataUrl(face.url))),
  );
  return rules.join('\n');
}

async function dataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(blob);
  });
}
