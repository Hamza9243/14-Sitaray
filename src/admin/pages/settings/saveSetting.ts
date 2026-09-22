import { db, unwrap } from '../../lib/db';

/** Writes app_settings[key] without touching is_public on an existing row. */
export async function saveSetting(key: string, value: Record<string, unknown>, isPublic: boolean) {
  const { data, error } = await db().from('app_settings').update({ value }).eq('key', key).select('key');
  if (error) throw error;
  if (data && data.length > 0) return;
  await unwrap(db().from('app_settings').insert({ key, value, is_public: isPublic }));
}
