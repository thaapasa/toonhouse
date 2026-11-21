// The edits that the server refused because the login had ended. The editor
// keeps them in the browser until the user logs in again, and then saves them.
import { SavedContent } from '@toonhouse/api';

const key = (cartoonId: string) => `toonhouse-unsaved-${cartoonId}`;

export function keepContent(cartoonId: string, saved: SavedContent) {
  try {
    localStorage.setItem(key(cartoonId), JSON.stringify(saved));
  } catch {
    // The storage is full or turned off. The editor still shows the message.
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
