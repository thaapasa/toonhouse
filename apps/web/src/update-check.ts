// A web app on the home screen of an iPad resumes from memory instead of
// loading again, so it can run an old version long after a deploy. Check for a
// new version each time the app comes back to the foreground. Loading again at
// any other time could lose the work of the user.

/** Saves the edits that are not saved yet, and tells whether all are saved. */
type Saver = () => Promise<boolean>;

const savers = new Set<Saver>();

/**
 * Makes the app save with `saver` before it loads a new version, and wait for
 * the next time if the save fails. Gives the function that removes it.
 */
export function saveBeforeReload(saver: Saver): () => void {
  savers.add(saver);
  return () => savers.delete(saver);
}

async function reloadIfOutdated() {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return;
    const { buildId } = (await res.json()) as { buildId?: string };
    if (!buildId || buildId === __BUILD_ID__) return;
    const saved = await Promise.all([...savers].map((save) => save()));
    if (saved.every(Boolean)) location.reload();
  } catch {
    // Offline or a bad response: try again the next time.
  }
}

if (import.meta.env.PROD) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reloadIfOutdated();
  });
}
