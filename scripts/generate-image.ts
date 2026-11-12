// Generates an image with the Draw Things HTTP API and saves it as a PNG.
// The request is saved next to the image as `<name>.prompt.json`, so the image
// can be made again with the same prompt, seed and settings.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';

const usage = `Usage: pnpm generate-image --out <file.png> (--prompt <text> | --prompt-file <file>) [options]

Options:
  --negative <text>   Negative prompt (default: a list for the flat cartoon style)
  --seed <n>          Seed (default: random)
  --width <px>        Width (default: 640)
  --height <px>       Height (default: 960)
  --steps <n>         Sampling steps (default: 8)
  --count <n>         Number of images, each with the next seed (default: 1)

Env: DRAW_THINGS_URL (default: http://localhost:7860)`;

// Recommended settings for Qwen Image 2.1 Turbo.
const defaults = {
  model: 'qwen_image_2.1_turbo_q8p.ckpt',
  sampler: 'DDIM Trailing',
  guidance_scale: 1,
  shift: 6.5,
  resolution_dependent_shift: false,
  batch_size: 1,
};

const defaultNegative =
  'gradient, texture, crosshatching, sketch lines, shading, realistic, 3D render, photo, background, scenery, ground shadow, text, vignette, film grain';

const { values } = parseArgs({
  options: {
    out: { type: 'string' },
    prompt: { type: 'string' },
    'prompt-file': { type: 'string' },
    negative: { type: 'string', default: defaultNegative },
    seed: { type: 'string' },
    width: { type: 'string', default: '640' },
    height: { type: 'string', default: '960' },
    steps: { type: 'string', default: '8' },
    count: { type: 'string', default: '1' },
    help: { type: 'boolean', short: 'h' },
  },
});

const prompt = values['prompt-file']
  ? (await readFile(values['prompt-file'], 'utf8')).trim()
  : values.prompt;

if (values.help || !values.out || !prompt) {
  console.log(usage);
  process.exit(values.help ? 0 : 1);
}

const baseUrl = process.env.DRAW_THINGS_URL ?? 'http://localhost:7860';
const firstSeed = values.seed
  ? Number(values.seed)
  : Math.floor(Math.random() * 2 ** 31);
const count = Number(values.count);

await mkdir(dirname(values.out), { recursive: true });

for (let i = 0; i < count; i++) {
  const seed = firstSeed + i;
  const out =
    count === 1 ? values.out : values.out.replace(/\.png$/, `-${seed}.png`);
  const request = {
    ...defaults,
    prompt,
    negative_prompt: values.negative,
    width: Number(values.width),
    height: Number(values.height),
    steps: Number(values.steps),
    seed,
  };

  const started = Date.now();
  const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(
      `Draw Things answered ${response.status}: ${await response.text()}`,
    );
  }
  const { images } = (await response.json()) as { images?: string[] };
  const image = images?.[0];
  if (!image) throw new Error('Draw Things returned no image');

  await writeFile(out, Buffer.from(image, 'base64'));
  await writeFile(
    out.replace(/\.png$/, '.prompt.json'),
    JSON.stringify(request, null, 2) + '\n',
  );
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`${out} (seed ${seed}, ${seconds} s)`);
}
