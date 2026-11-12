// Renders an SVG to a PNG, so that a traced image can be checked by eye.
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { Resvg } from '@resvg/resvg-js';

const usage = `Usage: pnpm render-svg <input.svg> <output.png> [options]

Options:
  --width <px>          Output width (default: the width of the SVG)
  --background <color>  Background color (default: transparent). A color
                        such as '#50a0dc' shows holes and stray edges.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    width: { type: 'string' },
    background: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

const [input, output] = positionals;
if (values.help || !input || !output) {
  console.log(usage);
  process.exit(values.help ? 0 : 1);
}

const resvg = new Resvg(await readFile(input), {
  ...(values.width
    ? { fitTo: { mode: 'width' as const, value: Number(values.width) } }
    : {}),
  ...(values.background ? { background: values.background } : {}),
});
await writeFile(output, resvg.render().asPng());
console.log(output);
