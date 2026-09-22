import { useCallback, useEffect, useState } from 'react';

import { friendlyError } from '../lib/db';
import { formatBytes, formatDuration } from '../lib/format';
import { ALL_KINDS, KIND_INFO, listMedia, type MediaKind, type MediaRow, thumbUrl } from '../lib/media';

import { FileUploader } from './FileUploader';
import { Icon, type IconName } from './Icon';
import { cx, Modal, Pagination, SearchBar, Spinner, Tabs } from './ui';

const KIND_ICON: Record<string, IconName> = { image: 'image', audio: 'music', animation: 'film', video: 'video', other: 'doc' };
const PAGE = 18;

export function MediaThumb({ media, size = 96 }: { media: MediaRow; size?: number }) {
  if (media.kind === 'image') {
    return <img className="thumb-img" src={thumbUrl(media)} alt={media.alt_text ?? media.display_name} loading="lazy" style={{ width: size, height: size }} />;
  }
  return (
    <div className="thumb-icon" style={{ width: size, height: size }}>
      <Icon name={KIND_ICON[media.kind] ?? 'doc'} size={Math.round(size / 3)} />
    </div>
  );
}

/** Pick an existing library file (or upload a new one) — used by every media field in the CMS. */
export function MediaPicker({
  open,
  kinds = ALL_KINDS,
  folder,
  onSelect,
  onClose,
}: {
  open: boolean;
  kinds?: MediaKind[];
  folder?: string;
  onSelect: (media: MediaRow) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<MediaKind | ''>(kinds.length === 1 ? kinds[0] : '');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMedia({ search, kind: kind || undefined, page, pageSize: PAGE });
      const filtered = kind ? res.rows : res.rows.filter((r) => (kinds as string[]).includes(r.kind));
      setRows(filtered);
      setCount(res.count);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [search, kind, page, kinds]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (open) setTab('library');
  }, [open]);

  return (
    <Modal open={open} title="Media Library" onClose={onClose} wide>
      <Tabs
        tabs={[
          { value: 'library', label: 'Library' },
          { value: 'upload', label: 'Upload new' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'upload' ? (
        <div className="stack">
          <FileUploader
            kinds={kinds}
            folder={folder}
            onUploaded={(uploaded) => {
              onSelect(uploaded[0]);
            }}
          />
          <p className="muted small">The file is added to the Media Library and selected for you.</p>
        </div>
      ) : (
        <div className="stack">
          <div className="row gap-sm wrap">
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(0);
              }}
              placeholder="Search files…"
            />
            {kinds.length > 1 ? (
              <select
                className="select"
                aria-label="Type"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as MediaKind | '');
                  setPage(0);
                }}
              >
                <option value="">All types</option>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {KIND_INFO[k].label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {error ? <div className="alert alert-error">{error}</div> : null}
          {loading && rows.length === 0 ? (
            <Spinner label="Loading files…" />
          ) : rows.length === 0 ? (
            <p className="muted center-text">No files found. Use “Upload new” to add one.</p>
          ) : (
            <div className={cx('media-grid', loading && 'is-loading')}>
              {rows.map((m) => (
                <button key={m.id} type="button" className="media-tile" onClick={() => onSelect(m)} title={m.file_name}>
                  <MediaThumb media={m} />
                  <span className="media-tile-name">{m.display_name}</span>
                  <span className="muted small">
                    {formatBytes(m.size_bytes)}
                    {m.duration_seconds ? ` · ${formatDuration(m.duration_seconds)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={PAGE} total={count} onPage={setPage} />
        </div>
      )}
    </Modal>
  );
}
