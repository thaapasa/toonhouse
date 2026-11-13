// Takes screenshots of a prototype page at given times with headless Chromium.
// Usage: node scripts/screenshot.ts <page> <out-prefix> <t1> [t2 ...]
// Example: node scripts/screenshot.ts 2d ../assets/work/shots/2d 0 2.5 6
// The dev server must run on PROTOTYPES_PORT (default 10790).
// SHOT_WIDTH and SHOT_HEIGHT set the window size (default 1280x800).
import { chromium } from 'playwright';

const [page, prefix, ...times] = process.argv.slice(2);
if (!page || !prefix || times.length === 0) {
  console.error('Usage: node scripts/screenshot.ts <page> <out-prefix> <t...>');
  process.exit(1);
}
const port = process.env.PROTOTYPES_PORT ?? '10790';
const width = Number(process.env.SHOT_WIDTH ?? 1280);
const height = Number(process.env.SHOT_HEIGHT ?? 800);

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const tab = await browser.newPage({ viewport: { width, height } });
const errors: string[] = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await tab.goto(`http://localhost:${port}/${page}.html?t=0`);
await tab.waitForFunction(() => window.toon !== undefined, null, {
  timeout: 30000,
});
// Give asset loading a moment.
await tab.waitForTimeout(Number(process.env.SHOT_WAIT ?? 1500));
for (const t of times) {
  await tab.evaluate((v) => window.toon!.setTime(v), Number(t));
  await tab.waitForTimeout(150);
  const file = `${prefix}-${String(t).replace('.', '_')}.png`;
  // SHOT_CLIP=x,y,w,h takes a close-up of one part of the page.
  const clip = process.env.SHOT_CLIP?.split(',').map(Number);
  const opts = {
    path: file,
    timeout: 90000,
    ...(clip
      ? {
          clip: { x: clip[0]!, y: clip[1]!, width: clip[2]!, height: clip[3]! },
        }
      : {}),
  };
  // A busy machine sometimes makes a screenshot time out; try once more.
  await tab.screenshot(opts).catch(() => tab.screenshot(opts));
  console.log(file);
}
if (errors.length) console.error('Page errors:\n' + errors.join('\n'));
await browser.close();
