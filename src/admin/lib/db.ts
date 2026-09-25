import type { SupabaseClient } from '@supabase/supabase-js';

import { getAdminClient } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase rows are dynamically shaped per table.
export type Row = Record<string, any>;
export type Status = 'draft' | 'published' | 'unpublished';

/** The admin Supabase client (throws a clear error when env vars are missing). */
export function db(): SupabaseClient {
  const client = getAdminClient();
  if (!client) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  return client;
}

/** Turns any Supabase / network / storage error into a sentence an editor can act on. */
export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { code?: string; message?: string; details?: string; status?: number; statusCode?: string | number } | null;
  if (!e) return fallback;
  const message = String(e.message ?? '');
  const details = String(e.details ?? '');
  const code = String(e.code ?? e.statusCode ?? '');

  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }
  if (/jwt expired|invalid jwt|refresh token|session (has )?expired|PGRST30[13]/i.test(message + code)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (code === '23505' || /duplicate key|already exists/i.test(message)) {
    if (/slug/i.test(message + details)) return 'Another item already uses that title/URL name. Change the title slightly.';
    if (/daily_stars_date/i.test(message + details)) return 'A Daily Star already exists for that date.';
    if (/languages_single_default/i.test(message + details)) return 'Only one language can be the default.';
    return 'That item already exists (duplicate).';
  }
  if (code === '23503' || /foreign key/i.test(message)) return 'This item is still linked to other content, so the action was blocked.';
  if (code === '23514' || /violates check constraint/i.test(message)) return 'One of the values is not allowed. Please review the form.';
  if (code === '22P02' || /invalid input syntax/i.test(message)) return 'One of the values has an invalid format.';
  if (code === '42501' || code === '403' || /row-level security|permission denied|not authorized|only a super admin/i.test(message)) {
    return 'You do not have permission to do that.';
  }
  if (code === '413' || /too large|exceeded the maximum/i.test(message)) return 'That file is too large.';
  if (code === '415' || /mime type|not supported/i.test(message)) return 'That file type is not supported.';
  if (code === '404' || /bucket not found/i.test(message)) return 'The storage location was not found. Has the migration been applied?';
  return message || fallback;
}

export function isAuthProblem(err: unknown): boolean {
  const e = err as { message?: string; code?: string; status?: number } | null;
  return /jwt expired|invalid jwt|PGRST30[13]|refresh token/i.test(`${e?.message ?? ''} ${e?.code ?? ''}`) || e?.status === 401;
}

export async function unwrap<T>(query: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw error;
  return data as T;
}

export interface ListOptions {
  select?: string;
  search?: { fields: string[]; term: string };
  filters?: { column: string; op: 'eq' | 'neq' | 'in' | 'is' | 'contains' | 'gte' | 'lte'; value: unknown }[];
  order?: { column: string; ascending: boolean }[];
  page?: number;
  pageSize?: number;
  /** 'active' hides soft-deleted rows, 'trash' shows only them. Ignored when softDelete is false. */
  deleted?: 'active' | 'trash';
  softDelete?: boolean;
}

export async function listRows(table: string, o: ListOptions = {}): Promise<{ rows: Row[]; count: number }> {
  const page = o.page ?? 0;
  const size = o.pageSize ?? 20;
  let q = db().from(table).select(o.select ?? '*', { count: 'exact' });
  if (o.softDelete !== false) q = o.deleted === 'trash' ? q.not('deleted_at', 'is', null) : q.is('deleted_at', null);
  for (const f of o.filters ?? []) {
    if (f.op === 'eq') q = q.eq(f.column, f.value as never);
    else if (f.op === 'neq') q = q.neq(f.column, f.value as never);
    else if (f.op === 'in') q = q.in(f.column, f.value as never[]);
    else if (f.op === 'is') q = q.is(f.column, f.value as null);
    else if (f.op === 'contains') q = q.contains(f.column, f.value as never);
    else if (f.op === 'gte') q = q.gte(f.column, f.value as never);
    else if (f.op === 'lte') q = q.lte(f.column, f.value as never);
  }
  const term = o.search?.term.trim().replace(/[%,()*]/g, ' ');
  if (term && o.search) q = q.or(o.search.fields.map((f) => `${f}.ilike.%${term}%`).join(','));
  for (const ord of o.order ?? []) q = q.order(ord.column, { ascending: ord.ascending });
  q = q.range(page * size, page * size + size - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as Row[], count: count ?? 0 };
}

export async function getRow(table: string, id: string): Promise<Row | null> {
  const { data, error } = await db().from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

export async function insertRow(table: string, values: Row): Promise<Row> {
  return unwrap<Row>(db().from(table).insert(values).select().single());
}

export async function updateRow(table: string, id: string, values: Row): Promise<Row> {
  return unwrap<Row>(db().from(table).update(values).eq('id', id).select().single());
}

export async function softDeleteRow(table: string, id: string) {
  await unwrap(db().from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').single());
}

export async function restoreRow(table: string, id: string) {
  await unwrap(db().from(table).update({ deleted_at: null }).eq('id', id).select('id').single());
}

/** Permanent delete — allowed by RLS for super admins only. */
export async function hardDeleteRow(table: string, id: string) {
  const { data, error } = await db().from(table).delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw { code: '42501', message: 'permission denied: only a super admin can permanently delete' };
}

export async function setStatus(table: string, id: string, status: Status) {
  return updateRow(table, id, { status });
}

export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/** Non-default-language overlays: { ur: { title: '…' }, fa: { … } } */
export type TranslationMap = Record<string, Record<string, unknown>>;

export async function loadTranslations(type: string, id: string): Promise<TranslationMap> {
  const rows = await unwrap<Row[]>(
    db().from('content_translations').select('language_code,fields').eq('content_type', type).eq('content_id', id)
  );
  return Object.fromEntries(rows.map((r) => [r.language_code, r.fields ?? {}]));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.every(isEmptyValue);
  if (typeof v === 'object') return Object.values(v as object).every(isEmptyValue);
  return false;
}

export async function saveTranslations(type: string, id: string, map: TranslationMap) {
  const keep: Row[] = [];
  const drop: string[] = [];
  for (const [lang, fields] of Object.entries(map)) {
    const cleaned = Object.fromEntries(Object.entries(fields).filter(([, v]) => !isEmptyValue(v)));
    if (Object.keys(cleaned).length === 0) drop.push(lang);
    else keep.push({ content_type: type, content_id: id, language_code: lang, fields: cleaned });
  }
  if (keep.length) {
    await unwrap(db().from('content_translations').upsert(keep, { onConflict: 'content_type,content_id,language_code' }));
  }
  if (drop.length) {
    await unwrap(
      db().from('content_translations').delete().eq('content_type', type).eq('content_id', id).in('language_code', drop)
    );
  }
}
