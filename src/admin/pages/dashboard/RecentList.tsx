import { Link } from 'react-router-dom';

import { StatusBadge } from '../../components/ui';
import type { Row } from '../../lib/db';
import { timeAgo } from '../../lib/format';
import { entityRoute, TABLE_LABEL } from '../../lib/routes';

export function RecentList({ rows, dateKey }: { rows: Row[]; dateKey: 'created_at' | 'updated_at' }) {
  if (rows.length === 0) return <p className="muted card-body">Nothing yet.</p>;
  return (
    <ul className="recent-list">
      {rows.map((r) => (
        <li key={`${r.entity_type}-${r.id}`}>
          <Link className="recent-item" to={entityRoute(r.entity_type, r.id) ?? '/admin/dashboard'}>
            <span className="recent-main">
              <strong>{r.label || 'Untitled'}</strong>
              <span className="muted small">
                {TABLE_LABEL[r.entity_type] ?? r.entity_type} · {timeAgo(r[dateKey])}
              </span>
            </span>
            <StatusBadge status={r.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
