import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { StatusBadge } from '../../components/ui';
import { friendlyError, listRows, type Row } from '../../lib/db';
import { entityRoute, TABLE_TO_ROUTE } from '../../lib/routes';

import { ASSOC_TYPES, type AssocType } from './config';

const LIMIT = 20;

interface Group {
  def: AssocType;
  rows: Row[];
  count: number;
}

export function PrimaryContent({ starId }: { starId: string }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGroups(null);
    setError(null);
    Promise.all(
      ASSOC_TYPES.map(async (def) => {
        const { rows, count } = await listRows(def.table, {
          select: `id,${def.titleField},status`,
          pageSize: LIMIT,
          filters: [{ column: 'star_id', op: 'eq', value: starId }],
          order: [{ column: def.titleField, ascending: true }],
        });
        return { def, rows, count };
      })
    )
      .then((g) => !cancelled && setGroups(g))
      .catch((e) => !cancelled && setError(friendlyError(e)));
    return () => {
      cancelled = true;
    };
  }, [starId]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!groups) return <span className="skeleton" style={{ height: 60 }} />;
  const filled = groups.filter((g) => g.count > 0);
  if (filled.length === 0) return <p className="muted">No content names this Star as its primary Star yet. Choose “Related Star” on a story, game, du’a or other item to link it here.</p>;

  return (
    <div className="assoc-groups">
      {filled.map(({ def, rows, count }) => (
        <div key={def.type} className="assoc-group">
          <div className="assoc-group-head">
            <strong>
              {def.plural} <span className="muted">({count})</span>
            </strong>
            {count > LIMIT ? <Link to={`/admin/${TABLE_TO_ROUTE[def.table]}?f_star=${starId}`}>View all {count}</Link> : null}
          </div>
          <ul className="assoc-list">
            {rows.map((r) => (
              <li key={r.id}>
                <Link to={entityRoute(def.table, r.id) ?? '#'}>{r[def.titleField] || 'Untitled'}</Link>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
