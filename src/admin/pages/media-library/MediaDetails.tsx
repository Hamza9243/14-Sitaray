import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AudioPlayer } from '../../components/AudioPlayer';
import { Icon } from '../../components/Icon';
import { Badge, Button, ConfirmDialog, CopyButton, Drawer, Field } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useLookups } from '../../lib/data';
import { friendlyError } from '../../lib/db';
import { formatBytes, formatDate, formatDuration } from '../../lib/format';
import { acceptAttr, MediaError, type MediaKind, type MediaRow, mediaUrl, purgeMedia, replaceMediaFile, restoreMedia, trashMedia, updateMediaMeta } from '../../lib/media';
import { TABLE_LABEL } from '../../lib/routes';
import { useToast } from '../../lib/toast';

import { FOLDERS, isGif, isLottie, kindLabel } from './shared';
import { useUsage } from './useUsage';

function Preview({ media }: { media: MediaRow }) {
  const url = mediaUrl(media);
  if (media.kind === 'image' || isGif(media)) return <img className="ml-preview-img" src={url} alt={media.alt_text || media.display_name} />;
  if (media.kind === 'audio') return <AudioPlayer url={url} duration={media.duration_seconds} />;
  if (media.kind === 'video') return <video className="ml-preview-video" src={url} controls preload="metadata" />;
  if (isLottie(media)) {
    return (
      <div className="ml-lottie-tile">
        <Icon name="film" size={30} />
        <strong>Lottie animation (JSON)</strong>
        <span className="muted small">Plays in the child app. No inline preview in the studio.</span>
      </div>
    );
  }
  if (media.kind === 'animation') return <video className="ml-preview-video" src={url} controls loop muted autoPlay playsInline />;
  return <div className="ml-lottie-tile">No preview available</div>;
}

interface Props {
  media: MediaRow;
  trashed: boolean;
  onClose: () => void;
  onChanged: (row: MediaRow) => void;
  onRemoved: () => void;
}

export function MediaDetails({ media, trashed, onClose, onChanged, onRemoved }: Props) {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const { limits } = useLookups();
  const usage = useUsage(media.id);
  const [name, setName] = useState(media.display_name);
  const [alt, setAlt] = useState(media.alt_text ?? '');
  const [folder, setFolder] = useState(media.folder);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<'trash' | 'purge' | null>(null);
  const [busy, setBusy] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(media.display_name);
    setAlt(media.alt_text ?? '');
    setFolder(media.folder);
  }, [media]);

  const url = mediaUrl(media);
  const dirty = name.trim() !== media.display_name || alt.trim() !== (media.alt_text ?? '') || folder !== media.folder;
  const folders = FOLDERS.includes(folder) ? FOLDERS : [...FOLDERS, folder];
  const list = usage.items ?? [];
  const publishedCount = list.filter((u) => u.is_published).length;

  async function save() {
    if (!name.trim()) return toast.error('The name cannot be empty.');
    setSaving(true);
    try {
      onChanged(await updateMediaMeta(media.id, { display_name: name.trim(), alt_text: alt.trim() || null, folder }));
      toast.success('Details saved.');
    } catch (e) {
      toast.error(friendlyError(e, 'Could not save the details.'));
    } finally {
      setSaving(false);
    }
  }

  async function replace(file: File) {
    setProgress(0);
    try {
      onChanged(await replaceMediaFile(media, file, { limits, onProgress: setProgress }));
      toast.success('File replaced. Everything that uses it now shows the new file.');
    } catch (e) {
      toast.error(e instanceof MediaError ? e.message : friendlyError(e, 'Could not replace the file.'));
    } finally {
      setProgress(null);
    }
  }

  async function run(kind: 'trash' | 'purge' | 'restore') {
    setBusy(true);
    try {
      if (kind === 'trash') await trashMedia(media.id);
      else if (kind === 'purge') await purgeMedia(media);
      else await restoreMedia(media.id);
      toast.success(kind === 'trash' ? 'Moved to Trash.' : kind === 'purge' ? 'Permanently deleted.' : 'Restored.');
      setConfirm(null);
      onRemoved();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open title={<span className="ml-drawer-title">{media.display_name}</span>} onClose={onClose}>
      <div className="ml-preview">
        <Preview media={media} />
      </div>
      {progress !== null ? (
        <div className="progress" role="progressbar" aria-label="Replacing file" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {trashed ? (
        <div className="alert alert-info">This file is in the Trash and is hidden from the app.</div>
      ) : (
        <div className="ml-form">
          <Field label="Display name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Alt text" help="Describes the file for accessibility.">
            <input className="input" value={alt} onChange={(e) => setAlt(e.target.value)} />
          </Field>
          <Field label="Folder">
            <select className="select" value={folder} onChange={(e) => setFolder(e.target.value)}>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <Button variant="primary" loading={saving} disabled={!dirty} onClick={() => void save()}>
              Save changes
            </Button>
          </div>
        </div>
      )}

      <dl className="ml-meta">
        <dt>Type</dt>
        <dd>{kindLabel(media.kind)}</dd>
        <dt>File name</dt>
        <dd>{media.file_name}</dd>
        <dt>MIME type</dt>
        <dd>{media.mime_type ?? '—'}</dd>
        <dt>Size</dt>
        <dd>{formatBytes(media.size_bytes)}</dd>
        {media.width ? (
          <>
            <dt>Dimensions</dt>
            <dd>
              {media.width} × {media.height} px
            </dd>
          </>
        ) : null}
        {media.duration_seconds ? (
          <>
            <dt>Duration</dt>
            <dd>{formatDuration(media.duration_seconds)}</dd>
          </>
        ) : null}
        <dt>Uploaded</dt>
        <dd>{formatDate(media.created_at, true)}</dd>
        <dt>Storage</dt>
        <dd className="ml-break">
          {media.bucket}/{media.path}
        </dd>
      </dl>

      <Field label="Public URL">
        <div className="ml-url">
          <input className="input" readOnly value={url} aria-label="Public URL" onFocus={(e) => e.target.select()} />
          <CopyButton text={url} />
        </div>
      </Field>

      {!trashed ? (
        <div className="row gap-sm wrap">
          <Button icon="swap" disabled={progress !== null} onClick={() => replaceRef.current?.click()}>
            Replace file
          </Button>
          <input
            ref={replaceRef}
            type="file"
            hidden
            accept={acceptAttr([media.kind as MediaKind])}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void replace(f);
            }}
          />
        </div>
      ) : null}

      <section className="ml-usage" aria-label="Used by">
        <h4>
          Used by {usage.items ? <Badge tone={list.length ? 'blue' : 'neutral'}>{list.length}</Badge> : null}
        </h4>
        {usage.loading ? <span className="muted small">Checking where this file is used…</span> : null}
        {usage.error ? (
          <div className="alert alert-error">
            {usage.error} <Button size="sm" onClick={usage.retry}>Retry</Button>
          </div>
        ) : null}
        {usage.items && list.length === 0 ? <span className="muted small">Not used anywhere yet.</span> : null}
        {list.length ? (
          <ul className="ml-usage-list">
            {list.map((u) => (
              <li key={`${u.table_name}:${u.record_id}:${u.column_name}`}>
                <div className="ml-usage-main">
                  <span className="muted small">{TABLE_LABEL[u.table_name] ?? (u.table_name === 'character_assets' ? 'Character asset' : u.table_name)}</span>
                  {u.href ? <Link to={u.href}>{u.text}</Link> : <span>{u.text}</span>}
                  <span className="muted small">{u.column_name}</span>
                </div>
                <Badge tone={u.is_published ? 'green' : 'neutral'}>{u.is_published ? 'Published' : 'Not live'}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="ml-danger row gap-sm wrap">
        {trashed ? (
          <>
            <Button variant="primary" loading={busy} onClick={() => void run('restore')}>
              Restore
            </Button>
            {isSuperAdmin ? (
              <Button variant="danger" icon="trash" onClick={() => setConfirm('purge')}>
                Delete permanently
              </Button>
            ) : (
              <span className="muted small">Only a super admin can delete permanently.</span>
            )}
          </>
        ) : (
          <Button variant="danger" icon="trash" onClick={() => setConfirm('trash')}>
            Delete
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'trash'}
        danger
        title="Move file to Trash?"
        confirmLabel={list.length ? 'Move to Trash anyway' : 'Move to Trash'}
        loading={busy || usage.loading}
        onConfirm={() => void run('trash')}
        onCancel={() => setConfirm(null)}
        message={
          <div className="stack-sm">
            <span>“{media.display_name}” will be hidden from the app. You can restore it from Trash.</span>
            {usage.error ? <div className="alert alert-error">We could not check whether this file is in use. Proceed with care.</div> : null}
            {list.length ? (
              <div className="alert alert-error">
                <strong>
                  This file is used by {list.length} item{list.length === 1 ? '' : 's'}.
                </strong>{' '}
                They will lose their {kindLabel(media.kind).toLowerCase()} until it is restored.
                {publishedCount ? (
                  <>
                    {' '}
                    <strong>
                      {publishedCount} of them {publishedCount === 1 ? 'is' : 'are'} published and live in the app right now.
                    </strong>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      />
      <ConfirmDialog
        open={confirm === 'purge'}
        danger
        title="Delete permanently?"
        confirmLabel="Delete permanently"
        loading={busy || usage.loading}
        onConfirm={() => void run('purge')}
        onCancel={() => setConfirm(null)}
        message={
          <div className="stack-sm">
            <span>“{media.display_name}” and its stored file will be erased. This cannot be undone.</span>
            {list.length ? (
              <div className="alert alert-error">
                <strong>{list.length} item{list.length === 1 ? ' still references' : 's still reference'} this file</strong>; the link will be removed from them.
              </div>
            ) : null}
          </div>
        }
      />
    </Drawer>
  );
}
