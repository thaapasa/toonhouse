// A web app on the home screen of an iPad resumes from memory instead of
// loading again, so it can run an old version long after a deploy. Check for a
// new version each time the app comes back to the foreground. Loading again at
// any other time could lose the work of the user.

async function reloadIfOutdated() {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return;
    const { buildId } = (await res.json()) as { buildId?: string };
    if (buildId && buildId !== __BUILD_ID__) location.reload();
  } catch {
    // Offline or a bad response: try again the next time.
  }
}

if (import.meta.env.PROD) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reloadIfOutdated();
  });
}
