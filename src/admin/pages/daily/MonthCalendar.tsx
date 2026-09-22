import { useMemo } from 'react';

import { Button } from '../../components/ui';
import type { Row } from '../../lib/db';
import { toDateKey } from '../../lib/format';

import './calendar.css';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_WORD: Record<string, string> = { published: 'published', draft: 'draft', unpublished: 'unpublished' };

export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const start = 1 - first.getDay();
  const days = Math.ceil((first.getDay() + new Date(year, month + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: days }, (_, i) => toDateKey(new Date(year, month, start + i)));
}

export function MonthCalendar({
  year,
  month,
  byDate,
  onPrev,
  onNext,
  onToday,
  onPick,
}: {
  year: number;
  month: number;
  byDate: Map<string, Row>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPick: (dateKey: string, row?: Row) => void;
}) {
  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const todayKey = toDateKey(new Date());
  const title = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;

  return (
    <div>
      <div className="cal-head">
        <div className="row gap-sm">
          <Button icon="chevron-left" aria-label="Previous month" onClick={onPrev} />
          <h2 className="cal-title" aria-live="polite">
            {title}
          </h2>
          <Button icon="chevron-right" aria-label="Next month" onClick={onNext} />
          <Button onClick={onToday}>Today</Button>
        </div>
        <div className="cal-legend" aria-hidden="true">
          <span>
            <i style={{ background: 'var(--green)' }} />
            Published
          </span>
          <span>
            <i style={{ background: '#d99a2b' }} />
            Draft
          </span>
          <span>
            <i style={{ background: '#98a1b5' }} />
            Unpublished
          </span>
        </div>
      </div>
      <div className="cal-dow" aria-hidden="true">
        {DOW.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="cal-grid" role="grid" aria-label={title}>
        {cells.map((key) => {
          const row = byDate.get(key);
          const inMonth = key.startsWith(prefix);
          const day = Number(key.slice(8));
          const cls = ['cal-cell', !inMonth && 'cal-cell-out', key === todayKey && 'cal-cell-today', key < todayKey && 'cal-cell-past'].filter(Boolean).join(' ');
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              className={cls}
              data-date={key}
              aria-label={row ? `${key}: ${row.title}, ${STATUS_WORD[row.status] ?? row.status}. Open` : `${key}: no Daily Star. Add one`}
              onClick={() => onPick(key, row)}
            >
              <span className="cal-day">{day}</span>
              {row ? <span className={`cal-item cal-item-${row.status}`}>{row.title}</span> : <span className="cal-add">+ Add</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
