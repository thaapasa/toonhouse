import { z } from 'zod';

/**
 * Whether PostgreSQL can store the text. It can't store the NUL character in
 * `text` or `jsonb`, and `jsonb` can't store a lone UTF-16 surrogate, such as
 * half of an emoji.
 */
export function isStorable(text: string): boolean {
  // A loop and not `isWellFormed()` or a regex with lookbehind, because the web
  // app runs the schemas too, and iPadOS before 16.4 has neither.
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0) return false;
    if (c >= 0xdc00 && c <= 0xdfff) return false;
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i++;
    }
  }
  return true;
}

const message = 'Text has a character that the server cannot store';

/** A string that PostgreSQL can store. */
export const StorableText = () => z.string().refine(isStorable, message);

/** Checks every string and every key in a JSON value. */
export function checkStorableJson(value: unknown, ctx: z.RefinementCtx) {
  const bad = (v: unknown): boolean => {
    if (typeof v === 'string') return !isStorable(v);
    if (Array.isArray(v)) return v.some(bad);
    if (v && typeof v === 'object')
      return Object.entries(v).some(([k, x]) => !isStorable(k) || bad(x));
    return false;
  };
  if (bad(value)) ctx.addIssue({ code: 'custom', message });
}
