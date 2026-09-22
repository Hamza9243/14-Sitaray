import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AudioPlayer } from '../components/AudioPlayer';
import { DataTable, type Column } from '../components/DataTable';
import { MediaThumb } from '../components/MediaPicker';
import { Badge, Button, ConfirmDialog, FilterBar, type FilterDef, IconButton, PageHeader, Pagination, SearchBar, StatusBadge, Switch, Tabs } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useLookups } from '../lib/data';
import { friendlyError, hardDeleteRow, listRows, restoreRow, type Row, setStatus, softDeleteRow, updateRow } from '../lib/db';
import { formatBytes, formatDate, formatDuration, timeAgo, titleCase } from '../lib/format';
import { mediaUrl } from '../lib/media';
import { sortSpec } from '../lib/resource';
import { useToast } from '../lib/toast';
import { useMedia, useMediaMap } from '../lib/useMedia';
import type { ColumnDef, ResourceDef } from '../resources/types';

const PAGE_SIZE = 15;

function ImageCell({ id }: { id?: string | null }) {
  const { media } = useMedia(id);
  return media ? <MediaThumb media={media} size={44} /> : <span className="thumb-empty" />;
}

function AudioCell({ id }: { id?: string | null }) {
  const { media } = useMedia(id);
  return media && media.kind === 'audio' ? <AudioPlayer url={mediaUrl(media)} duration={media.duration_seconds} compact /> : <span className="muted">—</span>;
}

export function ResourceList({ def }: { def: ResourceDef }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const { stars, categories, languages, starName, categoryName } = useLookups();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const statusFilter = params.get('status') ?? '';
  const sort = params.get('sort') ?? def.defaultSort ?? 'newest';
  const page = Number(params.get('page') ?? 0);
  const trash = params.get('trash') === '1';

  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: 'delete' | 'purge'; row: Row }>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  const setParam = useCallback(
    (key: string, value: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          if (key !== 'page') next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const filterDefs: FilterDef[] = useMemo(
    () =>
      def.filters.map((f) => ({
        key: f.key,
        label: f.label,
        options:
          f.options === 'star'
            ? stars.map((s) => ({ value: s.id as string, label: `${s.number}. ${s.name}` }))
            : f.options === 'category'
              ? categories.filter((c) => !def.categoryScope || (c.scopes ?? []).includes(def.categoryScope)).map((c) => ({ value: c.id as string, label: c.name as string }))
              : f.options === 'language'
                ? languages.map((l) => ({ value: l.code, label: l.name }))
                : (f.options ?? []),
      })),
    [def, stars, categories, languages]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const filters = def.filters
      .filter((f) => params.get(`f_${f.key}`))
      .map((f) => ({ column: f.column, op: 'eq' as const, value: params.get(`f_${f.key}`) }));
    if (def.hasStatus && statusFilter) filters.push({ column: 'status', op: 'eq', value: statusFilter });
    listRows(def.table, {
      search: q ? { fields: def.searchFields, term: q } : undefined,
      filters,
      order: sortSpec(def, sort),
      page,
      pageSize: PAGE_SIZE,
      deleted: trash ? 'trash' : 'active',
      softDelete: def.table !== 'stars' ? true : true,
    })
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows);
        setCount(res.count);
      })
      .catch((e) => !cancelled && setError(friendlyError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [def, params, q, statusFilter, sort, page, trash, reload]);

  // Warm the media cache for thumbnail / audio columns in one request.
  const mediaMap = useMediaMap(rows.flatMap((r) => def.columns.filter((c) => ['image', 'audio', 'audio-meta'].includes(c.kind)).map((c) => r[c.field ?? ''] as string | null)));

  async function quickStatus(row: Row, status: 'published' | 'unpublished') {
    try {
      await setStatus(def.table, row.id, status);
      toast.success(status === 'published' ? 'Published.' : 'Unpublished.');
      setReload((n) => n + 1);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function toggle(row: Row, field: string, value: boolean) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [field]: value } : r)));
    try {
      await updateRow(def.table, row.id, { [field]: value });
    } catch (e) {
      toast.error(friendlyError(e));
      setReload((n) => n + 1);
    }
  }

  async function move(row: Row, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id);
    const other = rows[idx + dir];
    if (!other) return;
    try {
      // Give both rows distinct, ordered values even if they currently share the same display_order.
      const base = Math.min(Number(row.display_order), Number(other.display_order));
      const first = dir === -1 ? row : other;
      const second = dir === -1 ? other : row;
      await Promise.all([updateRow(def.table, first.id, { display_order: base }), updateRow(def.table, second.id, { display_order: base + 1 })]);
      setReload((n) => n + 1);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'delete') {
        await softDeleteRow(def.table, confirm.row.id);
        toast.success('Moved to Trash.');
      } else {
        await hardDeleteRow(def.table, confirm.row.id);
        toast.success('Permanently deleted.');
      }
      setConfirm(null);
      setReload((n) => n + 1);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const openRow = (row: Row) => navigate(`/admin/${def.key}/${row.id}`);

  const renderCell = (c: ColumnDef, row: Row) => {
    const v = c.field ? row[c.field] : undefined;
    switch (c.kind) {
      case 'title':
        return (
          <div className="cell-title">
            <strong>{String(row[def.titleField] ?? '—')}</strong>
            {row.slug && def.slugField ? <span className="muted small">{String(row.slug)}</span> : null}
          </div>
        );
      case 'image':
        return <ImageCell id={v as string | null} />;
      case 'audio':
        return <AudioCell id={v as string | null} />;
      case 'audio-meta': {
        const m = v ? mediaMap.get(v as string) : undefined;
        return m ? (
          <div className="cell-title">
            <span>{formatBytes(m.size_bytes)} · {formatDuration(m.duration_seconds)}</span>
            <span className="muted small">{formatDate(m.created_at)}</span>
          </div>
        ) : <span className="muted">—</span>;
      }
      case 'star':
        return <span>{v ? starName(v as string) : '—'}</span>;
      case 'category':
        return <span>{v ? categoryName(v as string) : '—'}</span>;
      case 'status':
        return <StatusBadge status={row.status} deleted={Boolean(row.deleted_at)} />;
      case 'date':
        return <span>{formatDate(v as string)}</span>;
      case 'updated':
        return <span className="muted" title={formatDate(row.updated_at, true)}>{timeAgo(row.updated_at)}</span>;
      case 'yesno':
        return v ? <Badge tone="green">Yes</Badge> : <span className="muted">No</span>;
      case 'badge':
        return v ? <Badge tone="blue">{titleCase(String(v))}</Badge> : <span className="muted">—</span>;
      case 'language':
        return <span>{v ? String(v).toUpperCase() : '—'}</span>;
      case 'toggle':
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <Switch checked={Boolean(v)} disabled={trash} onChange={(val) => void toggle(row, c.field!, val)} />
          </span>
        );
      case 'number':
        return <span>{v === null || v === undefined ? '—' : String(v)}</span>;
      default:
        return <span>{Array.isArray(v) ? v.map((x) => titleCase(String(x))).join(', ') : v === null || v === undefined || v === '' ? '—' : titleCase(String(v))}</span>;
    }
  };

  const columns: Column<Row>[] = [
    ...def.columns.map<Column<Row>>((c) => ({ key: c.key, header: c.header, width: c.width, render: (r) => renderCell(c, r) })),
    {
      key: 'actions',
      header: '',
      width: def.orderable ? '190px' : '150px',
      align: 'right',
      render: (r) => (
        <div className="row gap-xs end" onClick={(e) => e.stopPropagation()}>
          {trash ? (
            <>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await restoreRow(def.table, r.id);
                    toast.success('Restored.');
                    setReload((n) => n + 1);
                  } catch (e) {
                    toast.error(friendlyError(e));
                  }
                }}
              >
                Restore
              </Button>
              {isSuperAdmin ? <IconButton icon="trash" variant="danger" label="Delete permanently" onClick={() => setConfirm({ kind: 'purge', row: r })} /> : null}
            </>
          ) : (
            <>
              {def.orderable && sort === 'order' ? (
                <>
                  <IconButton icon="up" label="Move up" onClick={() => void move(r, -1)} />
                  <IconButton icon="down" label="Move down" onClick={() => void move(r, 1)} />
                </>
              ) : null}
              {def.hasStatus ? (
                r.status === 'published' ? (
                  <IconButton icon="eye-off" label="Unpublish" onClick={() => void quickStatus(r, 'unpublished')} />
                ) : (
                  <IconButton icon="eye" label="Publish" onClick={() => void quickStatus(r, 'published')} />
                )
              ) : null}
              <IconButton icon="edit" label="Edit" onClick={() => openRow(r)} />
              {def.fixedSet ? null : <IconButton icon="trash" variant="danger" label="Move to Trash" onClick={() => setConfirm({ kind: 'delete', row: r })} />}
            </>
          )}
        </div>
      ),
    },
  ];

  const filterValues: Record<string, string> = Object.fromEntries(def.filters.map((f) => [f.key, params.get(`f_${f.key}`) ?? '']));

  return (
    <div>
      <PageHeader
        title={def.label.plural}
        subtitle={def.description}
        actions={def.fixedSet ? null : (
          <Button variant="primary" icon="add" onClick={() => navigate(`/admin/${def.key}/new`)}>
            Add {def.label.singular}
          </Button>
        )}
      />

      <div className="card">
        <div className="toolbar">
          {def.hasStatus ? (
            <Tabs
              tabs={[
                { value: '', label: 'All' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
                { value: 'unpublished', label: 'Unpublished' },
              ]}
              value={statusFilter}
              onChange={(v) => setParam('status', v)}
            />
          ) : null}
          <div className="toolbar-row">
            <SearchBar value={q} onChange={(v) => setParam('q', v)} placeholder={`Search ${def.label.plural.toLowerCase()}…`} />
            <FilterBar filters={filterDefs} values={filterValues} onChange={(k, v) => setParam(`f_${k}`, v)} />
            <select className="filter-select" aria-label="Sort" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="az">Sort: A–Z</option>
              {def.orderable || def.defaultSort === 'order' ? <option value="order">Sort: Display order</option> : null}
            </select>
            <Button size="sm" variant={trash ? 'primary' : 'secondary'} icon="trash" onClick={() => setParam('trash', trash ? '' : '1')}>
              {trash ? 'Viewing Trash' : 'Trash'}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error">
            {error} <Button size="sm" onClick={() => setReload((n) => n + 1)}>Retry</Button>
          </div>
        ) : null}

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          onRowClick={trash ? undefined : openRow}
          empty={{
            title: trash ? 'Trash is empty' : q || statusFilter || Object.values(filterValues).some(Boolean) ? 'No matches' : `No ${def.label.plural.toLowerCase()} yet`,
            hint: trash ? undefined : q || statusFilter ? 'Try clearing the search or filters.' : `Create your first ${def.label.singular.toLowerCase()} to get started.`,
            action: !trash && !def.fixedSet && !q && !statusFilter ? (
              <Button variant="primary" icon="add" onClick={() => navigate(`/admin/${def.key}/new`)}>
                Add {def.label.singular}
              </Button>
            ) : undefined,
          }}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} onPage={(p) => setParam('page', p ? String(p) : '')} />
      </div>

      <ConfirmDialog
        open={confirm?.kind === 'delete'}
        danger
        title={`Move to Trash?`}
        message={<>“{String(confirm?.row[def.titleField] ?? '')}” will be hidden from the app. You can restore it from Trash.</>}
        confirmLabel="Move to Trash"
        loading={busy}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'purge'}
        danger
        title="Delete permanently?"
        message={<>“{String(confirm?.row[def.titleField] ?? '')}” and its translations will be erased. This cannot be undone.</>}
        confirmLabel="Delete permanently"
        loading={busy}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
