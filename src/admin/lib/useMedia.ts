import { useEffect, useState } from 'react';

import { cachedMedia, fetchMedia, fetchMediaMany, type MediaRow, subscribeMedia } from './media';

/** One media row by id (cached, refreshes when the row is replaced or edited elsewhere). */
export function useMedia(id: string | null | undefined): { media: MediaRow | null; loading: boolean } {
  const [, force] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeMedia(() => force((n) => n + 1)), []);

  useEffect(() => {
    if (!id || cachedMedia(id) !== undefined) return undefined;
    let cancelled = false;
    setLoading(true);
    fetchMedia(id).finally(() => {
      if (!cancelled) {
        setLoading(false);
        force((n) => n + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { media: id ? (cachedMedia(id) ?? null) : null, loading };
}

/** Prefetches many ids at once (for tables) and returns a map. */
export function useMediaMap(ids: (string | null | undefined)[]): Map<string, MediaRow> {
  const [map, setMap] = useState<Map<string, MediaRow>>(new Map());
  const key = [...new Set(ids.filter(Boolean) as string[])].sort().join(',');
  useEffect(() => {
    if (!key) {
      setMap(new Map());
      return undefined;
    }
    let cancelled = false;
    fetchMediaMany(key.split(',')).then((m) => !cancelled && setMap(m)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key]);
  return map;
}
