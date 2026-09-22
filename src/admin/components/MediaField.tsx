import { useRef, useState } from 'react';

import { useLookups } from '../lib/data';
import { friendlyError } from '../lib/db';
import { formatBytes, formatDuration } from '../lib/format';
import { acceptAttr, ALL_KINDS, KIND_INFO, MediaError, type MediaKind, type MediaRow, mediaUrl, replaceMediaFile } from '../lib/media';
import { useToast } from '../lib/toast';
import { useMedia } from '../lib/useMedia';

import { AudioPlayer } from './AudioPlayer';
import { FileUploader } from './FileUploader';
import { Icon } from './Icon';
import { MediaPicker, MediaThumb } from './MediaPicker';
import { Button, Spinner } from './ui';

export interface MediaFieldProps {
  value: string | null | undefined;
  onChange: (id: string | null, media?: MediaRow) => void;
  kinds?: MediaKind[];
  folder?: string;
  disabled?: boolean;
}

/**
 * A media reference field: shows the current file with preview, and lets the editor upload a new file,
 * pick from the library, replace the file, or remove the link. The stored value is the media row's id.
 */
export function MediaField({ value, onChange, kinds = ALL_KINDS, folder, disabled }: MediaFieldProps) {
  const { media, loading } = useMedia(value);
  const { limits } = useLookups();
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  async function replaceFile(file: File) {
    if (!media) return;
    setProgress(0);
    try {
      const row = await replaceMediaFile(media, file, { limits, onProgress: setProgress });
      onChange(row.id, row);
      toast.success('File replaced.');
    } catch (e) {
      toast.error(e instanceof MediaError ? e.message : friendlyError(e, 'Could not replace the file.'));
    } finally {
      setProgress(null);
    }
  }

  if (!value) {
    return (
      <div className="stack-sm">
        <FileUploader kinds={kinds} folder={folder} compact disabled={disabled} onUploaded={(rows) => onChange(rows[0].id, rows[0])} />
        <div>
          <Button size="sm" icon="library" onClick={() => setPickerOpen(true)} disabled={disabled}>
            Choose from library
          </Button>
        </div>
        <MediaPicker open={pickerOpen} kinds={kinds} folder={folder} onClose={() => setPickerOpen(false)} onSelect={(m) => { onChange(m.id, m); setPickerOpen(false); }} />
      </div>
    );
  }

  if (loading && !media) return <Spinner />;

  if (!media) {
    return (
      <div className="media-card media-missing">
        <Icon name="alert" /> <span>This file is no longer available.</span>
        <Button size="sm" onClick={() => onChange(null)}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="media-card">
      {progress !== null ? (
        <div className="progress" role="progressbar" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="media-card-main">
        <MediaThumb media={media} size={media.kind === 'image' ? 112 : 64} />
        <div className="media-card-info">
          <strong title={media.file_name}>{media.display_name}</strong>
          <span className="muted small">
            {KIND_INFO[media.kind as MediaKind]?.label ?? 'File'} · {formatBytes(media.size_bytes)}
            {media.width ? ` · ${media.width}×${media.height}` : ''}
            {media.duration_seconds ? ` · ${formatDuration(media.duration_seconds)}` : ''}
          </span>
          {media.kind === 'audio' ? <AudioPlayer url={mediaUrl(media)} duration={media.duration_seconds} /> : null}
          {media.kind === 'video' ? <video className="video-preview" src={mediaUrl(media)} controls preload="metadata" /> : null}
          <div className="row gap-sm wrap">
            <Button size="sm" icon="swap" disabled={disabled || progress !== null} onClick={() => replaceRef.current?.click()}>
              Replace
            </Button>
            <Button size="sm" icon="library" disabled={disabled} onClick={() => setPickerOpen(true)}>
              Library
            </Button>
            <Button size="sm" variant="danger" icon="trash" disabled={disabled} onClick={() => onChange(null)}>
              Remove
            </Button>
          </div>
        </div>
      </div>
      <input
        ref={replaceRef}
        type="file"
        hidden
        accept={acceptAttr([media.kind as MediaKind])}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void replaceFile(f);
        }}
      />
      <MediaPicker open={pickerOpen} kinds={kinds} folder={folder} onClose={() => setPickerOpen(false)} onSelect={(m) => { onChange(m.id, m); setPickerOpen(false); }} />
    </div>
  );
}

export function ImageUploader(props: Omit<MediaFieldProps, 'kinds'>) {
  return <MediaField {...props} kinds={['image']} />;
}

export function AudioUploader(props: Omit<MediaFieldProps, 'kinds'>) {
  return <MediaField {...props} kinds={['audio']} />;
}
