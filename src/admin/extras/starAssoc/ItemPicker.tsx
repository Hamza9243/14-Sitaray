import { useEffect, useRef, useState } from 'react';

import { StatusBadge } from '../../components/ui';
import { friendlyError, listRows, type Row } from '../../lib/db';

import type { AssocType } from './config';

/** Searchable select over one content table; already-linked ids are left out. */
export function ItemPicker({ def, exclude, value, onChange }: { def: AssocType; exclude: Set<string>; value: Row | null; onChange: (row: Row | null) => void }) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    const t = window.setTimeout(() => {
      listRows(def.table, {
        select: `id,${def.titleField},status`,
        search: { fields: [def.titleField], term },
        order: [{ column: def.titleField, ascending: true }],
        pageSize: 30,
      })
        .then((r) => {
          if (cancelled) return;
          setRows(r.rows.filter((x) => !exclude.has(x.id)).slice(0, 12));
          setError(null);
        })
        .catch((e) => !cancelled && setError(friendlyError(e)))
        .finally(() => !cancelled && setLoading(false));
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, term, def, exclude]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="picker" ref={box}>
      <input
        className="input"
        role="combobox"
        aria-expanded={open}
        aria-label={`Search ${def.plural.toLowerCase()}`}
        placeholder={`Search ${def.plural.toLowerCase()} by title…`}
        value={open ? term : value ? String(value[def.titleField]) : term}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
      />
      {open ? (
        <ul className="picker-menu" role="listbox">
          {loading && rows.length === 0 ? <li className="picker-note muted">Searching…</li> : null}
          {error ? <li className="picker-note error">{error}</li> : null}
          {!loading && !error && rows.length === 0 ? <li className="picker-note muted">Nothing to add. Everything matching is already linked.</li> : null}
          {rows.map((r) => (
            <li key={r.id} role="option" aria-selected={value?.id === r.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(r);
                  setOpen(false);
                }}
              >
                <span>{r[def.titleField] || 'Untitled'}</span>
                <StatusBadge status={r.status} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
