import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { type Column, DataTable } from '../components/DataTable';
import { Badge, Button, Card, PageHeader, Pagination, SearchBar } from '../components/ui';
import { db, friendlyError, type Row } from '../lib/db';
import { formatDate, timeAgo, titleCase } from '../lib/format';
import { entityRoute, TABLE_LABEL, TABLE_TO_ROUTE } from '../lib/routes';

const PAGE_SIZE = 25;
const ACTIONS = ['created', 'updated', 'published', 'unpublished', 'deleted', 'restored', 'login'];
const TONE: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'violet' | 'neutral'> = {
  created: 'green',
  published: 'green',
  updated: 'blue',
  unpublished: 'amber',
  deleted: 'red',
  restored: 'violet',
  login: 'neutral',
};

const verbOf = (action: string) => action.split('.').pop() ?? action;

function humanise(action: string): string {
  const [table, verb] = action.split('.');
  if (table === 'admin' && verb === 'login') return 'Signed in';
  return `${TABLE_LABEL[table] ?? titleCase(table)} ${(verb ?? '').toLowerCase()}`.trim();
}

const dayStart = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const dayEnd = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

export default function ActivityLogPage() {
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [alive, setAlive] = useState<Set<string>>(new Set());
  const [actors, setActors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = db().from('activity_log').select('*', { count: 'exact' });
      if (entity) query = query.eq('entity_type', entity);
      if (action) query = query.like('action', `%.${action}`);
      if (actor) query = query.eq('actor_email', actor);
      if (from) query = query.gte('created_at', dayStart(from));
      if (to) query = query.lte('created_at', dayEnd(to));
      const term = q.trim().replace(/[%,()*]/g, ' ');
      if (term) query = query.ilike('entity_label', `%${term}%`);
      const { data, error: err, count: total } = await query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (err) throw err;
      const found = (data ?? []) as Row[];

      // Only link to records that still exist (and are not in the trash).
      const byTable = new Map<string, string[]>();
      for (const r of found) if (r.entity_id && TABLE_TO_ROUTE[r.entity_type]) byTable.set(r.entity_type, [...(byTable.get(r.entity_type) ?? []), r.entity_id]);
      const ok = new Set<string>();
      await Promise.all(
        [...byTable.entries()].map(async ([table, ids]) => {
          const res = await db().from(table).select('id').in('id', ids).is('deleted_at', null);
          for (const x of (res.data ?? []) as Row[]) ok.add(`${table}:${x.id}`);
        })
      );
      setRows(found);
      setCount(total ?? 0);
      setAlive(ok);
      setError(null);
    } catch (e) {
      setError(friendlyError(e, 'Could not load the activity log.'));
    } finally {
      setLoading(false);
    }
  }, [q, entity, action, actor, from, to, page]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    db()
      .from('activity_log')
      .select('actor_email')
      .not('actor_email', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => setActors([...new Set(((data ?? []) as Row[]).map((r) => r.actor_email as string))].sort()));
  }, [reloadKey]);

  const change = (fn: () => void) => {
    fn();
    setPage(0);
  };

  const columns: Column<Row>[] = useMemo(
    () => [
      { key: 'actor', header: 'Admin', width: '210px', render: (r) => r.actor_email || <span className="muted">System</span> },
      { key: 'action', header: 'Action', width: '190px', render: (r) => <Badge tone={TONE[verbOf(r.action)] ?? 'neutral'}>{humanise(r.action)}</Badge> },
      {
        key: 'content',
        header: 'Content',
        render: (r) => {
          const label = r.entity_label || '—';
          const to =
            r.entity_type === 'media' || r.entity_type === 'languages' || r.entity_type === 'admin_users' || r.entity_type === 'app_settings'
              ? entityRoute(r.entity_type)
              : r.entity_id && alive.has(`${r.entity_type}:${r.entity_id}`)
                ? entityRoute(r.entity_type, r.entity_id)
                : null;
          return to ? <Link to={to}>{label}</Link> : <span className={r.entity_label ? undefined : 'muted'}>{label}</span>;
        },
      },
      {
        key: 'when',
        header: 'Date & time',
        width: '210px',
        render: (r) => (
          <span className="cell-title">
            <span>{formatDate(r.created_at, true)}</span>
            <span className="muted small">{timeAgo(r.created_at)}</span>
          </span>
        ),
      },
    ],
    [alive]
  );

  const filtered = Boolean(q || entity || action || actor || from || to);

  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Who changed what, and when."
        actions={
          <Button icon="refresh" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <Card padded={false}>
        <div className="toolbar">
          <div className="toolbar-row">
            <SearchBar value={q} onChange={(v) => change(() => setQ(v))} placeholder="Search by content name…" />
            <select className="filter-select" aria-label="Content type" value={entity} onChange={(e) => change(() => setEntity(e.target.value))}>
              <option value="">Type: All</option>
              {Object.entries(TABLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select className="filter-select" aria-label="Action" value={action} onChange={(e) => change(() => setAction(e.target.value))}>
              <option value="">Action: All</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a === 'login' ? 'Signed in' : titleCase(a)}
                </option>
              ))}
            </select>
            <select className="filter-select" aria-label="Admin" value={actor} onChange={(e) => change(() => setActor(e.target.value))}>
              <option value="">Admin: All</option>
              {actors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <label className="row gap-xs muted small">
              From
              <input className="input" style={{ width: 150 }} type="date" aria-label="From date" value={from} max={to || undefined} onChange={(e) => change(() => setFrom(e.target.value))} />
            </label>
            <label className="row gap-xs muted small">
              To
              <input className="input" style={{ width: 150 }} type="date" aria-label="To date" value={to} min={from || undefined} onChange={(e) => change(() => setTo(e.target.value))} />
            </label>
            {filtered ? (
              <Button
                size="sm"
                onClick={() =>
                  change(() => {
                    setQ('');
                    setEntity('');
                    setAction('');
                    setActor('');
                    setFrom('');
                    setTo('');
                  })
                }
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}{' '}
            <Button size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        ) : null}
        <DataTable columns={columns} rows={rows} loading={loading} empty={{ title: filtered ? 'No activity matches' : 'No activity yet', hint: filtered ? 'Try clearing some filters.' : 'Changes made by admins will be listed here.' }} />
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} onPage={setPage} />
      </Card>
    </>
  );
}
