// Writes new numbers into the text of a JSON file and keeps everything else
// as it was, so that a saved rig changes only the lines with new values.

type Path = (string | number)[];

interface NumberToken {
  start: number;
  end: number;
  path: Path;
}

const LITERAL = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/y;

/** The number tokens of valid JSON text, with the path to each. */
function numberTokens(text: string): NumberToken[] {
  const tokens: NumberToken[] = [];
  let i = 0;
  const space = () => {
    while (/\s/.test(text[i] ?? '')) i++;
  };
  const string = () => {
    const start = i++;
    while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    i++;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const value = (path: Path): void => {
    space();
    const c = text[i];
    if (c === '{' || c === '[') {
      const object = c === '{';
      const close = object ? '}' : ']';
      i++;
      space();
      if (text[i] === close) {
        i++;
        return;
      }
      for (let index = 0; ; index++) {
        space();
        let key: string | number = index;
        if (object) {
          key = string();
          space();
          i++; // :
        }
        value([...path, key]);
        space();
        if (text[i++] === close) return;
      }
    }
    if (c === '"') {
      string();
      return;
    }
    LITERAL.lastIndex = i;
    const m = LITERAL.exec(text);
    if (!m) throw new Error(`Unexpected JSON at ${i}`);
    if (c !== 't' && c !== 'f' && c !== 'n') {
      tokens.push({ start: i, end: i + m[0].length, path });
    }
    i += m[0].length;
  };
  value([]);
  return tokens;
}

const at = (value: unknown, path: Path): unknown =>
  path.reduce<unknown>(
    (v, key) =>
      v !== null && typeof v === 'object'
        ? (v as Record<string | number, unknown>)[key]
        : undefined,
    value,
  );

/**
 * The text of `next` in the layout of `text`, or null if `next` differs from
 * the JSON in `text` by more than its numbers.
 */
export function patchNumbers(text: string, next: unknown): string | null {
  let out = text;
  for (const t of numberTokens(text).reverse()) {
    const v = at(next, t.path);
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    if (v !== Number(text.slice(t.start, t.end))) {
      out = out.slice(0, t.start) + JSON.stringify(v) + out.slice(t.end);
    }
  }
  return JSON.stringify(JSON.parse(out)) === JSON.stringify(next) ? out : null;
}
