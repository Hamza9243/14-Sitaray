import { useEffect, useState } from 'react';

/**
 * Web has no bundled TTFs to load synchronously — fonts come from public/fonts.css
 * (a `<link>` in index.html), which the browser fetches independently of JS. This
 * just waits on the standard `document.fonts.ready` promise so callers get the same
 * "don't render until fonts are ready" behavior `expo-font`'s `useFonts` gave natively,
 * with a short timeout fallback so a slow/offline font fetch never blocks the app forever.
 */
export function useAppFonts(): [boolean] {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setLoaded(true);
    }, 2000);

    document.fonts.ready.then(() => {
      if (!cancelled) setLoaded(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return [loaded];
}
