import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Icon, type IconName } from '../components/Icon';
import { Button, Card, PageHeader } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useLookups } from '../lib/data';
import { friendlyError, type Row, rpc } from '../lib/db';
import { formatBytes, toDateKey } from '../lib/format';
import { KIND_INFO, type MediaKind } from '../lib/media';

import { BarList } from './dashboard/BarList';
import { RecentList } from './dashboard/RecentList';

import './dashboard/dashboard.css';

interface Counts {
  total: number;
  published: number;
  draft: number;
  unpublished: number;
}
interface Stats {
  counts: Record<string, Counts>;
  users: number;
  storage: { total_bytes: number; by_kind: Record<string, number> };
  by_category: { name: string; count: number }[];
  by_language: { code: string; name: string; count: number }[];
}

const CARDS: { table: string; label: string; icon: IconName; to: string }[] = [
  { table: 'stories', label: 'Total Stories', icon: 'book', to: '/admin/stories' },
  { table: 'audio', label: 'Total Audio Files', icon: 'music', to: '/admin/audio' },
  { table: 'duas', label: 'Total Du’as', icon: 'chat', to: '/admin/duas' },
  { table: 'games', label: 'Total Games', icon: 'game', to: '/admin/games' },
  { table: 'daily_stars', label: 'Total Daily Stars', icon: 'sparkles', to: '/admin/daily-star' },
  { table: 'quizzes', label: 'Total Quizzes', icon: 'help', to: '/admin/quizzes' },
  { table: 'good_deeds', label: 'Total Good Deeds', icon: 'heart', to: '/admin/good-deeds' },
];

function StatCard({ label, value, icon, to, sub, tone }: { label: string; value: number; icon: IconName; to?: string; sub?: string; tone?: 'green' | 'amber' }) {
  const body = (
    <>
      <div className="stat-card-top">
        <span>{label}</span>
        <span className={`stat-icon${tone ? ` stat-icon-${tone}` : ''}`}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="stat-value">{value.toLocaleString()}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </>
  );
  return to ? (
    <Link to={to} className="stat-card">
      {body}
    </Link>
  ) : (
    <div className="stat-card">{body}</div>
  );
}

const time = (r: Row, k: string) => new Date(r[k]).getTime();

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { limits } = useLookups();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([rpc<Stats>('dashboard_stats'), rpc<Row[]>('recent_content', { p_limit: 30 })]);
      setStats(s);
      setRecent(r ?? []);
    } catch (e) {
      setError(friendlyError(e, 'Could not load the dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const all = Object.values(stats?.counts ?? {});
    return { published: all.reduce((n, c) => n + c.published, 0), draft: all.reduce((n, c) => n + c.draft, 0) };
  }, [stats]);
  const added = useMemo(() => [...recent].sort((a, b) => time(b, 'created_at') - time(a, 'created_at')).slice(0, 6), [recent]);
  const updated = useMemo(() => [...recent].sort((a, b) => time(b, 'updated_at') - time(a, 'updated_at')).slice(0, 6), [recent]);

  const kinds = (Object.keys(KIND_INFO) as MediaKind[]).map((k) => ({ kind: k, bytes: Number(stats?.storage.by_kind[k] ?? 0) }));
  const maxBytes = Math.max(1, ...kinds.map((k) => k.bytes));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="An overview of everything in the Content Studio."
        actions={
          <Button icon="refresh" onClick={() => void load()} loading={loading && !!stats}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
          {error}{' '}
          <Button size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!stats && loading ? (
        <div className="dash-stats" aria-busy="true" aria-label="Loading dashboard">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="dash-skel" />
          ))}
        </div>
      ) : null}

      {stats ? (
        <>
          <div className="dash-stats">
            {CARDS.map((c) => (
              <StatCard key={c.table} label={c.label} icon={c.icon} to={c.to} value={stats.counts[c.table]?.total ?? 0} sub={`${stats.counts[c.table]?.published ?? 0} published`} />
            ))}
            <StatCard label="Total Users" icon="people" value={stats.users} to={isSuperAdmin ? '/admin/users' : undefined} sub="App accounts" />
            <StatCard label="Published Content" icon="check-circle" tone="green" value={totals.published} sub="Visible in the app" />
            <StatCard label="Draft Content" icon="edit" tone="amber" value={totals.draft} sub="Not yet published" />
          </div>

          <Card title="Quick actions">
            <div className="quick-actions">
              <Button variant="primary" icon="add" onClick={() => navigate('/admin/stories/new')}>
                Add story
              </Button>
              <Button icon="add" onClick={() => navigate('/admin/duas/new')}>
                Add du’a
              </Button>
              <Button icon="upload" onClick={() => navigate('/admin/media')}>
                Upload media
              </Button>
              <Button icon="calendar" onClick={() => navigate(`/admin/daily-star/new?date=${toDateKey(new Date())}`)}>
                Schedule Daily Star
              </Button>
            </div>
          </Card>

          <div className="dash-grid">
            <div className="dash-col">
              <Card title="Recently added" padded={false}>
                <RecentList rows={added} dateKey="created_at" />
              </Card>
              <Card title="Recently updated" padded={false}>
                <RecentList rows={updated} dateKey="updated_at" />
              </Card>
            </div>
            <div className="dash-col">
              <Card title="Storage usage" actions={<Link to="/admin/media">Media library</Link>}>
                <div className="storage-total">{formatBytes(stats.storage.total_bytes)}</div>
                <p className="muted small" style={{ marginBottom: 14 }}>
                  Used by all files. Each row also shows the per-file upload limit.
                </p>
                <BarList
                  max={maxBytes}
                  items={kinds.map((k) => ({
                    key: k.kind,
                    label: KIND_INFO[k.kind].label,
                    value: k.bytes,
                    display: `${formatBytes(k.bytes)} · max ${limits[`${k.kind}_mb` as keyof typeof limits]} MB`,
                    tone: 'green',
                  }))}
                />
              </Card>
              <Card title="Content by category">
                {stats.by_category.length ? (
                  <BarList items={stats.by_category.map((c) => ({ key: c.name, label: c.name, value: c.count }))} />
                ) : (
                  <p className="muted">No content has a category yet.</p>
                )}
              </Card>
              <Card title="Content by language">
                {stats.by_language.length ? (
                  <BarList items={stats.by_language.map((l) => ({ key: l.code, label: l.name, value: l.count, tone: 'amber' }))} />
                ) : (
                  <p className="muted">No languages are enabled.</p>
                )}
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
