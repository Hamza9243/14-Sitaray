import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Card, PageHeader, Tabs } from '../components/ui';
import { friendlyError, listRows, type Row } from '../lib/db';
import { toDateKey } from '../lib/format';
import { RESOURCE_BY_KEY } from '../resources/defs';

import { Coverage } from './daily/Coverage';
import { MonthCalendar, monthGrid } from './daily/MonthCalendar';
import { ResourceList } from './ResourceList';

const MONTH_RE = /^(\d{4})-(\d{2})$/;

function parseMonth(value: string | null): { year: number; month: number } {
  const m = value ? MONTH_RE.exec(value) : null;
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) - 1 };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function DailyStarPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 'list' : 'calendar';
  const { year, month } = parseMonth(params.get('m'));

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const setQuery = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      },
      { replace: true }
    );

  const goMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setQuery({ m: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
  };

  const load = useCallback(async () => {
    const cells = monthGrid(year, month);
    setLoading(true);
    try {
      // Includes the grey leading/trailing days so a full week grid shows real data.
      const { rows: found } = await listRows('daily_stars', {
        select: 'id,scheduled_date,title,status',
        pageSize: 60,
        filters: [
          { column: 'scheduled_date', op: 'gte', value: cells[0] },
          { column: 'scheduled_date', op: 'lte', value: cells[cells.length - 1] },
        ],
        order: [{ column: 'scheduled_date', ascending: true }],
      });
      setRows(found);
      setError(null);
    } catch (e) {
      setError(friendlyError(e, 'Could not load the calendar.'));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (view === 'calendar') void load();
  }, [load, view, reloadKey]);

  const byDate = useMemo(() => new Map(rows.map((r) => [r.scheduled_date as string, r])), [rows]);

  const toggle = (
    <Tabs
      tabs={[
        { value: 'calendar', label: 'Calendar' },
        { value: 'list', label: 'List' },
      ]}
      value={view}
      onChange={(v) => setQuery({ view: v === 'list' ? 'list' : null })}
    />
  );

  if (view === 'list') {
    return (
      <>
        <div style={{ marginBottom: 12 }}>{toggle}</div>
        <ResourceList def={RESOURCE_BY_KEY['daily-star']} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Daily Star"
        subtitle="Plan which Daily Star appears on each day. Click a date to add or open one."
        actions={
          <>
            {toggle}
            <Button icon="refresh" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
              Refresh
            </Button>
            <Button variant="primary" icon="add" onClick={() => navigate(`/admin/daily-star/new?date=${toDateKey(new Date())}`)}>
              Schedule today
            </Button>
          </>
        }
      />
      <Coverage refreshKey={reloadKey} />
      {error ? (
        <div className="alert alert-error" role="alert" style={{ margin: '16px 0' }}>
          {error}{' '}
          <Button size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      ) : null}
      <div style={{ height: 16 }} />
      <Card padded={false}>
        <div style={loading ? { opacity: 0.6 } : undefined} aria-busy={loading}>
          <MonthCalendar
            year={year}
            month={month}
            byDate={byDate}
            onPrev={() => goMonth(-1)}
            onNext={() => goMonth(1)}
            onToday={() => setQuery({ m: null })}
            onPick={(key, row) => navigate(row ? `/admin/daily-star/${row.id}` : `/admin/daily-star/new?date=${key}`)}
          />
        </div>
      </Card>
    </>
  );
}
