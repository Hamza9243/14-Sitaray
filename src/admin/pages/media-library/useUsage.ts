import { useCallback, useEffect, useState } from 'react';

import { db, friendlyError } from '../../lib/db';
import { entityRoute } from '../../lib/routes';
import { type MediaUsage, mediaUsage } from '../../lib/media';

export interface UsageItem extends MediaUsage {
  href: string | null;
  text: string;
}

/** Child rows (scenes, character assets) have no editor page of their own, so link to their parent. */
async function resolve(rows: MediaUsage[]): Promise<UsageItem[]> {
  const scenes = rows.filter((r) => r.table_name === 'story_scenes').map((r) => r.record_id);
  const assets = rows.filter((r) => r.table_name === 'character_assets').map((r) => r.record_id);
  const parent = new Map<string, string>();
  const assetKey = new Map<string, string>();
  const [s, a] = await Promise.all([
    scenes.length ? db().from('story_scenes').select('id,story_id').in('id', scenes) : Promise.resolve({ data: [] }),
    assets.length ? db().from('character_assets').select('id,character_id,asset_key').in('id', assets) : Promise.resolve({ data: [] }),
  ]);
  ((s.data ?? []) as { id: string; story_id: string }[]).forEach((r) => parent.set(r.id, r.story_id));
  ((a.data ?? []) as { id: string; character_id: string; asset_key: string }[]).forEach((r) => {
    parent.set(r.id, r.character_id);
    assetKey.set(r.id, r.asset_key);
  });
  return rows.map((r) => {
    const pid = parent.get(r.record_id);
    let href: string | null = null;
    if (r.table_name === 'story_scenes') href = pid ? entityRoute('stories', pid) : null;
    else if (r.table_name === 'character_assets') href = pid ? entityRoute('characters', pid) : null;
    else href = entityRoute(r.table_name, r.record_id);
    return { ...r, href, text: r.label || assetKey.get(r.record_id) || 'Untitled' };
  });
}

export function useUsage(mediaId: string) {
  const [items, setItems] = useState<UsageItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    mediaUsage(mediaId)
      .then(resolve)
      .then((r) => !cancelled && setItems(r))
      .catch((e) => !cancelled && setError(friendlyError(e, 'Could not check where this file is used.')));
    return () => {
      cancelled = true;
    };
  }, [mediaId, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { items, error, loading: items === null && !error, retry };
}
