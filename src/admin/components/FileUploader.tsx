import { useCallback, useRef, useState } from 'react';

import { friendlyError } from '../lib/db';
import { useLookups } from '../lib/data';
import { formatBytes } from '../lib/format';
import { acceptAttr, ALL_KINDS, KIND_INFO, MediaError, type MediaKind, type MediaRow, uploadMedia } from '../lib/media';

import { Icon } from './Icon';
import { Button, cx } from './ui';

interface QueueItem {
  id: number;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error' | 'duplicate';
  error?: string;
  existing?: MediaRow;
}

export interface FileUploaderProps {
  kinds?: MediaKind[];
  folder?: string;
  multiple?: boolean;
  compact?: boolean;
  disabled?: boolean;
  title?: string;
  onUploaded: (rows: MediaRow[]) => void;
}

/** Drag & drop + browse uploader with per-file progress, validation and duplicate handling. */
export function FileUploader({ kinds = ALL_KINDS, folder = 'general', multiple = false, compact, disabled, title, onUploaded }: FileUploaderProps) {
  const { limits } = useLookups();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const counter = useRef(0);

  const patch = (id: number, p: Partial<QueueItem>) => setQueue((q) => q.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const run = useCallback(
    async (item: QueueItem, allowDuplicate: boolean) => {
      patch(item.id, { status: 'uploading', progress: 0, error: undefined, existing: undefined });
      try {
        const row = await uploadMedia(item.file, { kinds, folder, limits, allowDuplicate, onProgress: (p) => patch(item.id, { progress: p }) });
        patch(item.id, { status: 'done', progress: 100 });
        onUploaded([row]);
        window.setTimeout(() => setQueue((q) => q.filter((i) => i.id !== item.id)), 2500);
      } catch (e) {
        if (e instanceof MediaError && e.code === 'duplicate') patch(item.id, { status: 'duplicate', existing: e.existing, error: e.message });
        else patch(item.id, { status: 'error', error: e instanceof MediaError ? e.message : friendlyError(e, 'Upload failed.') });
      }
    },
    [folder, kinds, limits, onUploaded]
  );

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const items = (multiple ? list : list.slice(0, 1)).map<QueueItem>((file) => ({ id: (counter.current += 1), file, progress: 0, status: 'uploading' }));
    setQueue((q) => [...q, ...items]);
    items.forEach((i) => void run(i, false));
  };

  const maxMb = Math.max(...kinds.map((k) => limits[`${k}_mb` as keyof typeof limits] ?? 10));
  const hint = kinds.map((k) => KIND_INFO[k].hint).join(' · ');

  return (
    <div className="uploader-wrap">
      <div
        className={cx('dropzone', dragging && 'dropzone-active', compact && 'dropzone-compact', disabled && 'dropzone-disabled')}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={compact ? 22 : 30} />
        <strong>{title ?? 'Drag & Drop File'}</strong>
        <span className="muted">
          or{' '}
          <button type="button" className="link" disabled={disabled} onClick={() => inputRef.current?.click()}>
            Browse Files
          </button>
        </span>
        <span className="muted small">
          {hint} · Max size: {maxMb} MB
        </span>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple={multiple}
          accept={acceptAttr(kinds)}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {queue.length ? (
        <ul className="upload-queue">
          {queue.map((i) => (
            <li key={i.id} className={cx('upload-item', `upload-${i.status}`)}>
              <div className="upload-row">
                <span className="upload-name" title={i.file.name}>
                  {i.file.name}
                </span>
                <span className="muted small">{formatBytes(i.file.size)}</span>
                {i.status === 'done' ? <Icon name="check-circle" size={16} className="ok" /> : null}
                {i.status === 'error' || i.status === 'duplicate' ? (
                  <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setQueue((q) => q.filter((x) => x.id !== i.id))}>
                    <Icon name="close" size={14} />
                  </button>
                ) : null}
              </div>
              {i.status === 'uploading' ? (
                <div className="progress" role="progressbar" aria-valuenow={i.progress} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${i.progress}%` }} />
                </div>
              ) : null}
              {i.status === 'error' ? (
                <div className="row gap-sm wrap">
                  <span className="error small">{i.error}</span>
                  <Button size="sm" onClick={() => void run(i, false)}>
                    Retry
                  </Button>
                </div>
              ) : null}
              {i.status === 'duplicate' ? (
                <div className="row gap-sm wrap">
                  <span className="small">{i.error}</span>
                  {i.existing ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onUploaded([i.existing!]);
                        setQueue((q) => q.filter((x) => x.id !== i.id));
                      }}
                    >
                      Use existing
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => void run(i, true)}>
                    Upload anyway
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
