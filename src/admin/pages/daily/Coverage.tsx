import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { friendlyError, listRows } from '../../lib/db';
import { toDateKey } from '../../lib/format';

const DAYS = 14;

function nextDays(): string[] {
  const now = new Date();
  return Array.from({ length: DAYS }, (_, i) => toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)));
}

const pretty = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export function Coverage({ refreshKey }: { refreshKey: number }) {
  const [missing, setMissing] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const days = nextDays();
    listRows('daily_stars', {
      select: 'scheduled_date',
      pageSize: 100,
      filters: [
        { column: 'scheduled_date', op: 'gte', value: days[0] },
        { column: 'scheduled_date', op: 'lte', value: days[days.length - 1] },
        { column: 'status', op: 'eq', value: 'published' },
      ],
    })
      .then(({ rows }) => {
        if (cancelled) return;
        const have = new Set(rows.map((r) => r.scheduled_date as string));
        setMissing(days.filter((d) => !have.has(d)));
        setError(null);
      })
      .catch((e) => !cancelled && setError(friendlyError(e)));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) return <div className="alert alert-error">Could not check upcoming coverage: {error}</div>;
  if (!missing) return <span className="skeleton" style={{ height: 40, marginBottom: 16 }} />;
  if (missing.length === 0) return <div className="alert alert-success">Every one of the next {DAYS} days has a published Daily Star.</div>;
  return (
    <div className="alert" style={{ background: 'var(--amber-soft)', borderColor: '#edcf9a', color: '#7c4d05' }} role="status">
      <strong>
        {missing.length} of the next {DAYS} days {missing.length === 1 ? 'has' : 'have'} no published Daily Star.
      </strong>
      <div className="cal-missing">
        {missing.map((d) => (
          <Link key={d} to={`/admin/daily-star/new?date=${d}`} title={`Schedule a Daily Star for ${d}`}>
            {pretty(d)}
          </Link>
        ))}
      </div>
    </div>
  );
}
