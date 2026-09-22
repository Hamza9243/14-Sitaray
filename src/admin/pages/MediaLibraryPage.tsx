import { useCallback, useEffect, useRef, useState } from 'react';

import { DataTable, type Column } from '../components/DataTable';
import { FileUploader } from '../components/FileUploader';
import { Icon } from '../components/Icon';
import { Badge, Button, cx, EmptyState, Modal, PageHeader, Pagination, SearchBar, Tabs } from '../components/ui';
import { friendlyError } from '../lib/db';
import { formatBytes, formatDate, formatDuration } from '../lib/format';
import { ALL_KINDS, KIND_INFO, listMedia, type MediaKind, type MediaRow } from '../lib/media';

import { MediaDetails } from './media-library/MediaDetails';
import { FOLDERS, kindLabel, Thumb } from './media-library/shared';
import './media-library.css';

const PAGE_SIZE = 24;
type Sort = 'newest' | 'oldest' | 'az' | 'size';
type View = 'grid' | 'table';

const readView = (): View => {
  try {
    return localStorage.getItem('admin.media.view') === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
};

export default function MediaLibraryPage() {
  const [tab, setTab] = useState<'library' | 'trash'>('library');
  const [view, setViewState] = useState<View>(readView);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<MediaKind | ''>('');
  const [folder, setFolder] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [selected, setSelected] = useState<MediaRow | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('general');
  const seq = useRef(0);

  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem('admin.media.view', v);
    } catch {
      /* preference only */
    }
  };

  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    listMedia({ search, kind, folder, sort, page, pageSize: PAGE_SIZE, trash: tab === 'trash' })
      .then((res) => {
        if (id !== seq.current) return;
        if (res.rows.length === 0 && page > 0 && res.count > 0) setPage(Math.ceil(res.count / PAGE_SIZE) - 1);
        setRows(res.rows);
        setCount(res.count);
      })
      .catch((e) => id === seq.current && setError(friendlyError(e, 'Could not load the media library.')))
      .finally(() => id === seq.current && setLoading(false));
  }, [search, kind, folder, sort, page, tab, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const onUploaded = useCallback(() => {
    setTab('library');
    setPage(0);
    setSort('newest');
    reload();
  }, [reload]);
  const filtered = Boolean(search || kind || folder);
  const trash = tab === 'trash';

  const patchRow = (row: MediaRow) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? row : r)));
    setSelected(row);
  };

  const columns: Column<MediaRow>[] = [
    { key: 'preview', header: '', width: '64px', render: (m) => <Thumb media={m} size={44} /> },
    {
      key: 'name',
      header: 'Name',
      render: (m) => (
        <div className="cell-title">
          <strong>{m.display_name}</strong>
          <span className="muted small">{m.file_name}</span>
        </div>
      ),
    },
    { key: 'kind', header: 'Type', render: (m) => <Badge tone="blue">{kindLabel(m.kind)}</Badge> },
    { key: 'folder', header: 'Folder', render: (m) => <span>{m.folder}</span> },
    { key: 'size', header: 'Size', render: (m) => <span>{formatBytes(m.size_bytes)}</span> },
    { key: 'date', header: 'Uploaded', render: (m) => <span className="muted">{formatDate(m.created_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Media Library"
        subtitle="Every image, audio clip, animation and video used by the app lives here."
        actions={
          <Button variant="primary" icon="upload" onClick={() => setUploadOpen(true)}>
            Upload files
          </Button>
        }
      />

      <div className="card">
        <div className="toolbar">
          <div className="ml-toolbar-top">
            <Tabs
              tabs={[
                { value: 'library', label: 'Library' },
                { value: 'trash', label: 'Trash' },
              ]}
              value={tab}
              onChange={(t) => {
                setTab(t);
                setPage(0);
                setSelected(null);
              }}
            />
            <div className="ml-view-toggle" role="group" aria-label="View">
              <button type="button" className={cx('ml-view-btn', view === 'grid' && 'is-active')} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
                <Icon name="grid" size={15} /> Grid
              </button>
              <button type="button" className={cx('ml-view-btn', view === 'table' && 'is-active')} aria-pressed={view === 'table'} onClick={() => setView('table')}>
                <Icon name="menu" size={15} /> Table
              </button>
            </div>
          </div>
          <div className="toolbar-row">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(0);
              }}
              placeholder="Search by name or file name…"
            />
            <select
              className="filter-select"
              aria-label="Type"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as MediaKind | '');
                setPage(0);
              }}
            >
              <option value="">Type: All</option>
              {ALL_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_INFO[k].label}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              aria-label="Folder"
              value={folder}
              onChange={(e) => {
                setFolder(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Folder: All</option>
              {FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              aria-label="Sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as Sort);
                setPage(0);
              }}
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="az">Sort: A–Z</option>
              <option value="size">Sort: Largest</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error">
            {error}{' '}
            <Button size="sm" onClick={reload}>
              Retry
            </Button>
          </div>
        ) : null}

        {view === 'table' ? (
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            onRowClick={setSelected}
            empty={emptyProps(trash, filtered, () => setUploadOpen(true))}
          />
        ) : loading && rows.length === 0 ? (
          <div className="ml-grid" aria-busy="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="ml-tile ml-tile-skeleton">
                <span className="skeleton ml-skel-img" />
                <span className="skeleton" />
                <span className="skeleton ml-skel-short" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState {...emptyProps(trash, filtered, () => setUploadOpen(true))} icon="library" />
        ) : (
          <div className={cx('ml-grid', loading && 'is-loading')}>
            {rows.map((m) => (
              <button key={m.id} type="button" className="ml-tile" onClick={() => setSelected(m)} title={m.file_name}>
                <Thumb media={m} size={150} />
                <span className="ml-tile-name">{m.display_name}</span>
                <span className="muted small ml-tile-meta">
                  {kindLabel(m.kind)} · {formatBytes(m.size_bytes)}
                  {m.duration_seconds ? ` · ${formatDuration(m.duration_seconds)}` : ''}
                </span>
                <span className="muted small">{formatDate(m.created_at)}</span>
              </button>
            ))}
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} onPage={setPage} />
      </div>

      <Modal open={uploadOpen} title="Upload files" onClose={() => setUploadOpen(false)}>
        <div className="field">
          <label className="field-label" htmlFor="ml-upload-folder">
            Save into folder
          </label>
          <select id="ml-upload-folder" className="select" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
            {FOLDERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <FileUploader multiple folder={uploadFolder} onUploaded={onUploaded} />
        <p className="muted small">Duplicates of files already in the library are flagged before uploading.</p>
      </Modal>

      {selected ? (
        <MediaDetails
          key={selected.id}
          media={selected}
          trashed={trash}
          onClose={() => setSelected(null)}
          onChanged={patchRow}
          onRemoved={() => {
            setSelected(null);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

function emptyProps(trash: boolean, filtered: boolean, upload: () => void) {
  return {
    title: trash ? 'Trash is empty' : filtered ? 'No files match' : 'No files yet',
    hint: trash ? 'Deleted files appear here and can be restored.' : filtered ? 'Try clearing the search or filters.' : 'Upload your first image, audio clip or animation.',
    action:
      !trash && !filtered ? (
        <Button variant="primary" icon="upload" onClick={upload}>
          Upload files
        </Button>
      ) : undefined,
  };
}
