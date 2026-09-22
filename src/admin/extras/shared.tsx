import { useMemo } from 'react';

import { IconButton, Tabs } from '../components/ui';
import { useLookups } from '../lib/data';
import { db, type Row, unwrap } from '../lib/db';

import './extras.css';

/** Language tab helper: the default language edits the row itself, every other enabled language is an overlay. */
export function useLangTabs() {
  const { languages, defaultLanguage, extraLanguages } = useLookups();
  return useMemo(() => {
    const base = languages.find((l) => l.code === defaultLanguage);
    const all = [{ code: defaultLanguage, name: base?.name ?? defaultLanguage, dir: base?.direction ?? 'ltr' }, ...extraLanguages.map((l) => ({ code: l.code, name: l.name, dir: l.direction }))];
    return { defaultLanguage, extra: extraLanguages, all, dir: (code: string) => all.find((l) => l.code === code)?.dir ?? 'ltr' };
  }, [languages, defaultLanguage, extraLanguages]);
}

export function LangTabs({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const { all, extra } = useLangTabs();
  if (extra.length === 0) return null;
  return <Tabs tabs={all.map((l) => ({ value: l.code, label: l.name }))} value={value} onChange={onChange} />;
}

export function ReorderButtons({ index, count, onMove, disabled }: { index: number; count: number; onMove: (delta: -1 | 1) => void; disabled?: boolean }) {
  return (
    <>
      <IconButton icon="up" label="Move up" disabled={disabled || index === 0} onClick={() => onMove(-1)} />
      <IconButton icon="down" label="Move down" disabled={disabled || index === count - 1} onClick={() => onMove(1)} />
    </>
  );
}

export function moved<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Writes 0..n-1 into the order column, touching only rows whose value changed. */
export async function renumber(table: string, column: string, ordered: Row[]): Promise<Row[]> {
  const next = ordered.map((r, i) => ({ ...r, [column]: i }));
  await Promise.all(next.filter((r, i) => ordered[i][column] !== i).map((r) => unwrap(db().from(table).update({ [column]: r[column] }).eq('id', r.id).select('id').single())));
  return next;
}

/** content_translations has no FK to the polymorphic parent, so orphans are removed by hand. */
export async function deleteRows(table: string, translationType: string, ids: string[]) {
  if (!ids.length) return;
  await unwrap(db().from(table).delete().in('id', ids));
  await unwrap(db().from('content_translations').delete().eq('content_type', translationType).in('content_id', ids));
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <ul className="ex-errors" role="alert">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

export function isRtl(dir: string) {
  return dir === 'rtl';
}
