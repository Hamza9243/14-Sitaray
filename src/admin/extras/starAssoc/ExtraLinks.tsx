import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, ConfirmDialog, Field, IconButton, StatusBadge } from '../../components/ui';
import { db, friendlyError, type Row, unwrap } from '../../lib/db';
import { entityRoute } from '../../lib/routes';
import { useToast } from '../../lib/toast';

import { ASSOC_BY_TYPE, ASSOC_TYPES } from './config';
import { ItemPicker } from './ItemPicker';

interface LinkRow {
  id: string;
  content_type: string;
  content_id: string;
  sort_order: number;
  item: Row | null;
}

export function ExtraLinks({ starId }: { starId: string }) {
  const toast = useToast();
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(ASSOC_TYPES[0].type);
  const [picked, setPicked] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<LinkRow | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await unwrap<Row[]>(db().from('star_content').select('*').eq('star_id', starId).order('sort_order').order('created_at'));
      const byType = new Map<string, string[]>();
      for (const r of rows) byType.set(r.content_type, [...(byType.get(r.content_type) ?? []), r.content_id]);
      const items = new Map<string, Row>();
      await Promise.all(
        [...byType.entries()].map(async ([t, ids]) => {
          const def = ASSOC_BY_TYPE[t];
          if (!def) return;
          const found = await unwrap<Row[]>(db().from(def.table).select(`id,${def.titleField},status,deleted_at`).in('id', ids));
          for (const f of found) items.set(`${t}:${f.id}`, f);
        })
      );
      setLinks(rows.map((r) => ({ id: r.id, content_type: r.content_type, content_id: r.content_id, sort_order: r.sort_order, item: items.get(`${r.content_type}:${r.content_id}`) ?? null })));
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    }
  }, [starId]);

  useEffect(() => {
    void load();
  }, [load]);

  const def = ASSOC_BY_TYPE[type];
  const exclude = useMemo(() => new Set((links ?? []).filter((l) => l.content_type === type).map((l) => l.content_id)), [links, type]);

  const add = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const next = Math.max(-1, ...(links ?? []).map((l) => l.sort_order)) + 1;
      await unwrap(db().from('star_content').insert({ star_id: starId, content_type: type, content_id: picked.id, sort_order: next }));
      toast.success('Link added.');
      setPicked(null);
      await load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await unwrap(db().from('star_content').delete().eq('id', removing.id));
      toast.success('Link removed.');
      setRemoving(null);
      await load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!links) return;
    const order = [...links];
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    setBusy(true);
    try {
      // Renumber everything so equal sort_order values can never make the order ambiguous.
      await Promise.all(order.map((l, i) => (l.sort_order === i ? null : unwrap(db().from('star_content').update({ sort_order: i }).eq('id', l.id)))));
      await load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="assoc-add">
        <Field label="Type">
          <select
            className="select"
            aria-label="Content type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPicked(null);
            }}
          >
            {ASSOC_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Item">
          <ItemPicker key={type} def={def} exclude={exclude} value={picked} onChange={setPicked} />
        </Field>
        <Button variant="primary" icon="add" disabled={!picked} loading={busy} onClick={() => void add()}>
          Add link
        </Button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {!links && !error ? <span className="skeleton" style={{ height: 40 }} /> : null}
      {links && links.length === 0 ? <p className="muted">No extra links yet. Use this to show an item under this Star even though it belongs to another Star.</p> : null}
      {links && links.length > 0 ? (
        <ul className="assoc-list assoc-links">
          {links.map((l, i) => {
            const d = ASSOC_BY_TYPE[l.content_type];
            const title = l.item ? String(l.item[d?.titleField ?? 'title'] ?? 'Untitled') : null;
            const route = d && l.item ? entityRoute(d.table, l.item.id) : null;
            return (
              <li key={l.id}>
                <span className="chip">{d?.label ?? l.content_type}</span>
                {title && route ? <Link to={route}>{title}</Link> : <span className="muted">{l.item?.deleted_at ? 'Deleted item' : 'Item not found'}</span>}
                {l.item ? <StatusBadge status={l.item.status} deleted={Boolean(l.item.deleted_at)} /> : null}
                <span className="assoc-actions">
                  <IconButton icon="up" label="Move up" disabled={busy || i === 0} onClick={() => void move(i, -1)} />
                  <IconButton icon="down" label="Move down" disabled={busy || i === links.length - 1} onClick={() => void move(i, 1)} />
                  <IconButton icon="trash" label="Remove link" variant="danger" disabled={busy} onClick={() => setRemoving(l)} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={Boolean(removing)}
        danger
        title="Remove this link?"
        message={<>The item itself is not deleted; it just stops appearing as an extra association of this Star.</>}
        confirmLabel="Remove link"
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
