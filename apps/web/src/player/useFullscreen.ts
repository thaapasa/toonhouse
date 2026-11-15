// Full screen for one element. Safari on older iPads has only the prefixed
// API, and Safari on the iPhone has none for other elements than video, so
// the player hides the button there.
import { type RefObject, useCallback, useEffect, useState } from 'react';

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};
type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

const doc = () => document as FullscreenDocument;
const currentElement = () =>
  doc().fullscreenElement ?? doc().webkitFullscreenElement ?? null;

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const supported =
    document.fullscreenEnabled || doc().webkitFullscreenEnabled === true;

  useEffect(() => {
    const update = () =>
      setActive(ref.current !== null && currentElement() === ref.current);
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  }, [ref]);

  const toggle = useCallback(() => {
    const el = ref.current as FullscreenElement | null;
    if (!el) return;
    if (currentElement()) {
      if (document.exitFullscreen)
        void document.exitFullscreen().catch(() => {});
      else doc().webkitExitFullscreen?.();
    } else if (el.requestFullscreen) {
      // The browser can refuse, such as when the page is in a frame.
      void el.requestFullscreen().catch(() => {});
    } else {
      el.webkitRequestFullscreen?.();
    }
  }, [ref]);

  return { supported, active, toggle };
}
