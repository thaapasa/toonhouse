// Traces a PNG to SVG with VTracer and minifies the result with SVGO.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const usage = `Usage: pnpm trace-image <input.png> <output.svg> [options]

Options:
  --palette <colors>  Fixed palette, such as '#2a1a08,#f8b866,#e01010'.
                      Use it when automatic color reduction merges colors.
  --max-colors <n>    Colors when no palette is given (default: 16)
  --speckle <px>      Drop patches smaller than this (default: 8)
  --simplify <px>     Curve tolerance (default: 1.5)`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    palette: { type: 'string' },
    'max-colors': { type: 'string', default: '16' },
    speckle: { type: 'string', default: '8' },
    simplify: { type: 'string', default: '1.5' },
    help: { type: 'boolean', short: 'h' },
  },
});

const [input, output] = positionals;
if (values.help || !input || !output) {
  console.log(usage);
  process.exit(values.help ? 0 : 1);
}

const work = mkdtempSync(join(tmpdir(), 'trace-'));
const traced = join(work, 'traced.svg');
try {
  execFileSync(
    'vtracer',
    [
      ...['--input', input, '--output', traced],
      ...['--mode', 'spline', '--optimize', '2', '--path-precision', '1'],
      ...['--filter-speckle', values.speckle, '--simplify', values.simplify],
      ...(values.palette
        ? ['--palette', values.palette]
        : ['--max-colors', values['max-colors']]),
    ],
    { stdio: 'inherit' },
  );
  execFileSync(
    'svgo',
    ['--quiet', '--multipass', '--precision', '1', '-i', traced, '-o', output],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log(`${output} (${statSync(output).size} bytes)`);
