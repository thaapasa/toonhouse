// Writes new values into the text of a JSON file and keeps everything else
// as it was, so that a saved rig changes only the lines with new values.

type Path = (string | number)[];

interface NumberToken {
  start: number;
  end: number;
  path: Path;
}

/** A member of the top-level object, from its key to the end of its value. */
interface Member {
  key: string;
  start: number;
  end: number;
}

const LITERAL = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/y;

/**
 * The number tokens of valid JSON text, with the path to each, and the
 * members of the top-level object.
 */
function scan(text: string): { tokens: NumberToken[]; members: Member[] } {
  const tokens: NumberToken[] = [];
  const members: Member[] = [];
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
        const start = i;
        if (object) {
          key = string();
          space();
          i++; // :
        }
        value([...path, key]);
        if (object && path.length === 0) {
          members.push({ key: key as string, start, end: i });
        }
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
  return { tokens, members };
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
  for (const t of scan(text).tokens.reverse()) {
    const v = at(next, t.path);
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    if (v !== Number(text.slice(t.start, t.end))) {
      out = out.slice(0, t.start) + JSON.stringify(v) + out.slice(t.end);
    }
  }
  return JSON.stringify(JSON.parse(out)) === JSON.stringify(next) ? out : null;
}

type JsonObject = Record<string, unknown>;

/**
 * Writes the top-level members of `next` that are new, removed or arrays into
 * `text` whole. The text must be a JSON object, and the result may need
 * formatting.
 */
function patchMembers(text: string, old: JsonObject, next: JsonObject) {
  const whole = (key: string) =>
    !(key in old) ||
    !(key in next) ||
    ((Array.isArray(old[key]) || Array.isArray(next[key])) &&
      JSON.stringify(old[key]) !== JSON.stringify(next[key]));
  const member = (key: string) =>
    `${JSON.stringify(key)}: ${JSON.stringify(next[key])}`;
  let out = text;
  const { members } = scan(text);
  // From the end, so that the earlier positions stay valid.
  for (let m = members.length - 1; m >= 0; m--) {
    const { key, start, end } = members[m]!;
    if (!whole(key)) continue;
    if (key in next) {
      out = out.slice(0, start) + member(key) + out.slice(end);
    } else if (m > 0) {
      out = out.slice(0, members[m - 1]!.end) + out.slice(end);
    } else {
      // The first member, with the comma after it.
      const rest = /^\s*,?\s*/.exec(out.slice(end))![0];
      out = out.slice(0, start) + out.slice(end + rest.length);
    }
  }
  const added = Object.keys(next).filter((key) => !(key in old));
  if (added.length > 0) {
    const close = out.lastIndexOf('}');
    const comma = Object.keys(old).some((key) => key in next);
    out =
      out.slice(0, close).trimEnd() +
      (comma ? ',' : '') +
      added.map(member).join(',') +
      out.slice(close);
  }
  return out;
}

/**
 * The text of `next` in the layout of `text`, or null if it can't keep the
 * layout. The values in `next` may differ from the JSON in `text` in their
 * numbers and in the top-level members that are new, removed or arrays. The
 * result may need formatting.
 */
export function patchJson(text: string, next: unknown): string | null {
  const old: unknown = JSON.parse(text);
  const object = (v: unknown): v is JsonObject =>
    v !== null && typeof v === 'object' && !Array.isArray(v);
  if (!object(old) || !object(next)) return patchNumbers(text, next);
  return patchNumbers(patchMembers(text, old, next), next);
}
