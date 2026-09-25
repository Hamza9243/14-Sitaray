import type { ReactNode } from 'react';

import { cx, EmptyState } from './ui';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic table rows are dynamically shaped.
export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  loading,
  onRowClick,
  empty,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  empty?: { title: string; hint?: string; action?: ReactNode };
  rowClassName?: (row: T) => string | undefined;
}) {
  if (!loading && rows.length === 0) {
    return <EmptyState title={empty?.title ?? 'Nothing here yet'} hint={empty?.hint} action={empty?.action} />;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cx(loading && 'table-loading')}>
          {loading && rows.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk${i}`} className="skeleton-row">
                  {columns.map((c) => (
                    <td key={c.key}>
                      <span className="skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={String(row.id)}
                  className={cx(onRowClick && 'clickable', rowClassName?.(row))}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={c.className} style={{ textAlign: c.align }}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
