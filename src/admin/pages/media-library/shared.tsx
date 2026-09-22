import { Icon, type IconName } from '../../components/Icon';
import { KIND_INFO, type MediaKind, type MediaRow, mediaUrl, thumbUrl } from '../../lib/media';

export const FOLDERS = ['images', 'audio', 'animations', 'video', 'characters', 'stories', 'duas', 'games', 'general'];

export const KIND_ICON: Record<string, IconName> = { image: 'image', audio: 'music', animation: 'film', video: 'video', other: 'doc' };

export const kindLabel = (k: string) => KIND_INFO[k as MediaKind]?.label ?? 'File';

export const isLottie = (m: MediaRow) => m.kind === 'animation' && (m.mime_type === 'application/json' || /\.json$/i.test(m.file_name));
export const isGif = (m: MediaRow) => m.kind === 'animation' && (m.mime_type === 'image/gif' || /\.gif$/i.test(m.file_name));

/** Lazy-loaded preview for tiles and table rows. */
export function Thumb({ media, size }: { media: MediaRow; size: number }) {
  const src = media.kind === 'image' ? thumbUrl(media) : isGif(media) ? mediaUrl(media) : '';
  if (src) return <img className="ml-thumb" src={src} alt="" loading="lazy" width={size} height={size} style={{ width: size, height: size }} />;
  return (
    <div className="ml-thumb ml-thumb-icon" style={{ width: size, height: size }}>
      <Icon name={KIND_ICON[media.kind] ?? 'doc'} size={Math.round(size / 3)} />
    </div>
  );
}
