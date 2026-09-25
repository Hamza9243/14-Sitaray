import { sanitizeRichText } from '@/lib/richText';

import type { FieldDef, ResourceDef } from '../resources/types';

import { getRow, insertRow, isEmptyValue, listRows, loadTranslations, type Row, saveTranslations, type Status, type TranslationMap, updateRow } from './db';
import { uniqueSlug } from './format';

export type TransState = Record<string, Record<string, unknown>>;

export function initialValues(def: ResourceDef): Row {
  const values: Row = { ...(def.defaults ?? {}) };
  for (const f of def.fields) {
    if (values[f.name] !== undefined) continue;
    if (f.default !== undefined) values[f.name] = f.default;
    else if (f.type === 'boolean') values[f.name] = false;
    else if (f.type === 'multiselect') values[f.name] = [];
    else if (f.type === 'json') values[f.name] = {};
    else values[f.name] = f.nullable || ['image', 'audio', 'media', 'star', 'category', 'character', 'story', 'language'].includes(f.type) ? null : '';
  }
  return values;
}

export function translatableFields(def: ResourceDef): FieldDef[] {
  return def.fields.filter((f) => f.translatable);
}

function coerce(f: FieldDef, raw: unknown): { value: unknown; error?: string } {
  const empty = raw === '' || raw === null || raw === undefined;
  switch (f.type) {
    case 'number': {
      if (empty) return { value: f.nullable ? null : f.required ? null : 0, error: f.required ? `${f.label} is required.` : undefined };
      const n = Number(raw);
      if (!Number.isFinite(n)) return { value: null, error: `${f.label} must be a number.` };
      if (f.min !== undefined && n < f.min) return { value: n, error: `${f.label} must be at least ${f.min}.` };
      if (f.max !== undefined && n > f.max) return { value: n, error: `${f.label} must be at most ${f.max}.` };
      return { value: n };
    }
    case 'boolean':
      return { value: Boolean(raw) };
    case 'multiselect':
      return { value: Array.isArray(raw) ? raw : [] };
    case 'json': {
      if (typeof raw === 'string') {
        if (!raw.trim()) return { value: {} };
        try {
          return { value: JSON.parse(raw) };
        } catch {
          return { value: {}, error: `${f.label} is not valid JSON.` };
        }
      }
      return { value: raw ?? {} };
    }
    case 'text':
    case 'textarea':
    case 'richtext':
    case 'emoji':
    case 'select':
    case 'date': {
      const s = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
      if (f.required && s.trim() === '') return { value: s, error: `${f.label} is required.` };
      if (f.type === 'richtext' && f.required && isEmptyValue(s.replace(/<[^>]+>/g, ''))) return { value: s, error: `${f.label} is required.` };
      if (s.trim() === '' && (f.nullable || f.type === 'date' || f.type === 'select')) return { value: f.type === 'select' && !f.nullable ? f.default ?? '' : null };
      if (f.type === 'richtext') return { value: sanitizeRichText(s) };
      return { value: f.type === 'text' || f.type === 'textarea' ? s.trim() : s };
    }
    default: {
      // star / category / character / story / language / image / audio / media
      const v = empty ? null : raw;
      if (f.required && v === null) return { value: null, error: `${f.label} is required.` };
      return { value: v };
    }
  }
}

export function buildPayload(def: ResourceDef, values: Row): { payload: Row; errors: Record<string, string> } {
  const payload: Row = {};
  const errors: Record<string, string> = {};
  for (const f of def.fields) {
    // readOnly only disables the input control — the value (e.g. audio.duration_seconds, synced from the
    // chosen file) still needs to reach the database, so it is NOT excluded from the save payload here.
    if (f.showWhen && !f.showWhen(values)) continue;
    const { value, error } = coerce(f, values[f.name]);
    payload[f.name] = value;
    if (error) errors[f.name] = error;
  }
  return { payload, errors };
}

export async function findDuplicateTitle(def: ResourceDef, title: string, excludeId?: string): Promise<boolean> {
  const t = title.trim();
  if (!t) return false;
  const { rows } = await listRows(def.table, { filters: [{ column: def.titleField, op: 'eq', value: t }], pageSize: 5, softDelete: def.table !== 'stars' });
  return rows.some((r) => r.id !== excludeId && String(r[def.titleField]).trim().toLowerCase() === t.toLowerCase());
}

export interface SaveArgs {
  id?: string;
  values: Row;
  translations: TransState;
  /** Explicit status to set (Publish / Unpublish / Save draft on a new item). */
  status?: Status;
}

export async function saveResource(def: ResourceDef, { id, values, translations, status }: SaveArgs): Promise<Row> {
  const { payload, errors } = buildPayload(def, values);
  const firstError = Object.values(errors)[0];
  if (firstError) throw Object.assign(new Error(firstError), { code: 'VALIDATION', fieldErrors: errors });

  if (def.hasStatus && status) payload.status = status;
  else if (def.hasStatus && !id) payload.status = 'draft';

  let row: Row;
  if (id) {
    row = await updateRow(def.table, id, payload);
  } else {
    if (def.slugField) payload[def.slugField] = uniqueSlug(String(values[def.titleField] ?? 'item'));
    try {
      row = await insertRow(def.table, payload);
    } catch (e) {
      // A slug collision is astronomically unlikely, but retry once with a fresh suffix rather than failing.
      if (def.slugField && (e as { code?: string }).code === '23505' && /slug/i.test(String((e as { message?: string }).message))) {
        payload[def.slugField] = uniqueSlug(String(values[def.titleField] ?? 'item'));
        row = await insertRow(def.table, payload);
      } else throw e;
    }
  }

  if (def.translationType) {
    const names = translatableFields(def).map((f) => f.name);
    const map: TranslationMap = {};
    for (const [lang, fields] of Object.entries(translations)) {
      map[lang] = Object.fromEntries(names.filter((n) => fields[n] !== undefined).map((n) => [n, fields[n]]));
    }
    await saveTranslations(def.translationType, row.id, map);
  }
  return row;
}

export async function loadResource(def: ResourceDef, id: string): Promise<{ row: Row; translations: TransState } | null> {
  const row = await getRow(def.table, id);
  if (!row) return null;
  const translations = def.translationType ? await loadTranslations(def.translationType, id) : {};
  return { row, translations: translations as TransState };
}

export function sortSpec(def: ResourceDef, sort: string): { column: string; ascending: boolean }[] {
  const dateCol = def.table === 'daily_stars' ? 'scheduled_date' : 'created_at';
  const orderCol = def.table === 'stars' ? 'number' : 'display_order';
  switch (sort) {
    case 'oldest':
      return [{ column: dateCol, ascending: true }];
    case 'az':
      return [{ column: def.titleField, ascending: true }];
    case 'order':
      return [{ column: orderCol, ascending: true }, { column: 'created_at', ascending: true }];
    default:
      return [{ column: dateCol, ascending: false }];
  }
}
