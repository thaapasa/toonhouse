// A dev server endpoint that saves an edited rig to its rig.json in assets/.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';

import * as prettier from 'prettier';
import type { Plugin } from 'vite';

import { SAVE_RIG_URL } from './api.ts';
import { patchJson } from './patchJson.ts';

const RIG_FILE =
  /^assets\/(packs\/[a-z0-9-]+\/(characters|props)|fixtures\/props)\/[a-z0-9-]+\/rig\.json$/;
const MAX_BODY = 1_000_000;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        fail(new Error('Too large'));
        req.destroy();
      }
    });
    req.on('end', () => ok(body));
    req.on('error', fail);
  });
}

function reply(res: ServerResponse, status: number, body: object) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Requests from a page on another host would change files on this one. The
 * browser always sends `Origin` with a POST, so a request without it doesn't
 * come from the studio.
 */
function sameOrigin(req: IncomingMessage): boolean {
  const { origin, host } = req.headers;
  if (!origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function save(repoRoot: string, body: string): Promise<void> {
  const { file, rig } = JSON.parse(body) as { file?: unknown; rig?: unknown };
  if (typeof file !== 'string' || !RIG_FILE.test(file)) {
    throw new Error(`Not a rig file: ${String(file)}`);
  }
  const path = resolve(repoRoot, file);
  if (!existsSync(path)) throw new Error(`No such file: ${file}`);
  const old = await readFile(path, 'utf8');
  const kind = (JSON.parse(old) as { kind: string }).kind;
  if (
    rig === null ||
    typeof rig !== 'object' ||
    (rig as { kind?: unknown }).kind !== kind
  ) {
    throw new Error(`The rig is not a ${kind} rig`);
  }
  // Without line breaks, Prettier puts each object that fits on one line,
  // as in the rigs written by hand. It keeps the line breaks that it gets.
  const text = patchJson(old, rig) ?? JSON.stringify(rig);
  const options = await prettier.resolveConfig(path);
  await writeFile(
    path,
    await prettier.format(text, { ...options, filepath: path }),
  );
}

/** Saves rigs from the studio. Only the dev server has it. */
export function saveRigPlugin(repoRoot: string): Plugin {
  return {
    name: 'toonhouse-save-rig',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(SAVE_RIG_URL, (req, res) => {
        if (req.method !== 'POST') return reply(res, 405, { error: 'POST' });
        if (!sameOrigin(req)) return reply(res, 403, { error: 'Origin' });
        readBody(req)
          .then((body) => save(repoRoot, body))
          .then(
            () => reply(res, 200, { ok: true }),
            (e: unknown) =>
              reply(res, 400, {
                error: e instanceof Error ? e.message : String(e),
              }),
          );
      });
    },
  };
}
