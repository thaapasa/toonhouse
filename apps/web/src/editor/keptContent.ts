// The edits that the editor couldn't save, such as after the login ended or
// when the editor closed before a save. The next editor of the cartoon starts
// from them and saves them.
import { SavedContent } from '@toonhouse/api';

const key = (cartoonId: string) => `toonhouse-unsaved-${cartoonId}`;

/** Tells whether the browser could keep the content. */
export function keepContent(cartoonId: string, saved: SavedContent): boolean {
  try {
    localStorage.setItem(key(cartoonId), JSON.stringify(saved));
    return true;
  } catch {
    // The storage is full or turned off.
    return false;
  }
}

/** The kept edits of a cartoon, if they are there and still fit the format. */
export function keptContent(cartoonId: string): SavedContent | null {
  try {
    const text = localStorage.getItem(key(cartoonId));
    return text ? SavedContent.parse(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

export function clearKeptContent(cartoonId: string) {
  localStorage.removeItem(key(cartoonId));
}
