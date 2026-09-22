import { useCallback, useEffect, useState } from 'react';

import { type Column, DataTable } from '../../components/DataTable';
import { Button, Card, Pagination, SearchBar } from '../../components/ui';
import { friendlyError, type Row, rpc } from '../../lib/db';
import { formatDate, timeAgo } from '../../lib/format';

import { RoleBadge } from './AdminsTab';

const PAGE_SIZE = 25;

export function AppUsersTab() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rpc<Row[]>('admin_list_users', { p_search: q.trim() || null, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE });
      setRows(data ?? []);
      setTotal(Number(data?.[0]?.total_count ?? 0));
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<Row>[] = [
    { key: 'email', header: 'Email', render: (r) => r.email },
    { key: 'name', header: 'Display name', render: (r) => r.display_name || <span className="muted">—</span> },
    { key: 'joined', header: 'Joined', width: '120px', render: (r) => formatDate(r.created_at) },
    { key: 'last', header: 'Last sign-in', width: '120px', render: (r) => (r.last_sign_in_at ? timeAgo(r.last_sign_in_at) : <span className="muted">Never</span>) },
    { key: 'children', header: 'Children', width: '90px', align: 'right', render: (r) => Number(r.children_count) },
    { key: 'role', header: 'Admin role', width: '140px', render: (r) => <RoleBadge role={r.admin_role} /> },
  ];

  return (
    <Card padded={false}>
      <div className="toolbar">
        <div className="toolbar-row">
          <SearchBar
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            placeholder="Search by email or name…"
          />
          <Button icon="refresh" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>
      {error ? (
        <div className="alert alert-error" role="alert">
          {error}{' '}
          <Button size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}
      <DataTable columns={columns} rows={rows} loading={loading} empty={{ title: q ? 'No users match' : 'No app users yet', hint: q ? 'Try a different search.' : 'Parents appear here after they sign up in the app.' }} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
    </Card>
  );
}
