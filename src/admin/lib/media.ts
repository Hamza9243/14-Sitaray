import { storagePublicUrl, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';

import { db, listRows, type Row, unwrap } from './db';

export type MediaKind = 'image' | 'audio' | 'animation' | 'video';

export interface MediaRow {
  id: string;
  bucket: string;
  path: string;
  thumbnail_path: string | null;
  file_name: string;
  display_name: string;
  kind: MediaKind | 'other';
  mime_type: string | null;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  folder: string;
  alt_text: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UploadLimits {
  image_mb: number;
  audio_mb: number;
  animation_mb: number;
  video_mb: number;
}

export const DEFAULT_LIMITS: UploadLimits = { image_mb: 10, audio_mb: 50, animation_mb: 20, video_mb: 50 };
/** Hard ceilings enforced by the storage buckets themselves (see the migration). */
const BUCKET_CAPS_MB: UploadLimits = { image_mb: 10, audio_mb: 50, animation_mb: 20, video_mb: 50 };

export const KIND_INFO: Record<MediaKind, { label: string; bucket: string; exts: string[]; hint: string }> = {
  image: { label: 'Image', bucket: 'media-images', exts: ['png', 'jpg', 'jpeg', 'webp'], hint: 'PNG, JPG, WEBP' },
  audio: { label: 'Audio', bucket: 'media-audio', exts: ['mp3', 'wav', 'm4a', 'ogg'], hint: 'MP3, WAV, M4A, OGG' },
  animation: { label: 'Animation', bucket: 'media-animation', exts: ['json', 'gif', 'webm', 'mp4'], hint: 'Lottie JSON, GIF, WebM, MP4' },
  video: { label: 'Video', bucket: 'media-video', exts: ['mp4', 'webm', 'mov'], hint: 'MP4, WebM, MOV' },
};

export const ALL_KINDS: MediaKind[] = ['image', 'audio', 'animation', 'video'];

export class MediaError extends Error {
  constructor(
    message: string,
    public code: 'invalid-type' | 'too-large' | 'duplicate' | 'upload-failed' | 'aborted' | 'invalid-file' = 'upload-failed',
    public existing?: MediaRow
  ) {
    super(message);
  }
}

const extOf = (name: string) => (name.split('.').pop() ?? '').toLowerCase();

export function detectKind(file: File, allowed: MediaKind[] = ALL_KINDS): MediaKind | null {
  const ext = extOf(file.name);
  const has = (k: MediaKind) => allowed.includes(k);
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext) && has('image')) return 'image';
  if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext) && has('audio')) return 'audio';
  if (['json', 'gif', 'webm'].includes(ext)) {
    if (has('animation')) return 'animation';
    if (ext === 'webm' && has('video')) return 'video';
  }
  if (['mp4', 'mov'].includes(ext)) {
    if (has('video') && (ext === 'mov' || !has('animation') || allowed.length === ALL_KINDS.length)) return 'video';
    if (has('animation') && ext === 'mp4') return 'animation';
  }
  return null;
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg',
  json: 'application/json', gif: 'image/gif', webm: 'video/webm', mp4: 'video/mp4', mov: 'video/quicktime',
};

export function acceptAttr(kinds: MediaKind[]): string {
  return kinds.flatMap((k) => KIND_INFO[k].exts.map((e) => `.${e}`)).join(',');
}

export function validateFile(file: File, kinds: MediaKind[], limits: UploadLimits = DEFAULT_LIMITS): MediaKind {
  const kind = detectKind(file, kinds);
  if (!kind) {
    const hint = kinds.map((k) => KIND_INFO[k].hint).join(' · ');
    throw new MediaError(`"${file.name}" is not a supported file type. Allowed: ${hint}.`, 'invalid-type');
  }
  if (file.size === 0) throw new MediaError(`"${file.name}" is empty.`, 'invalid-file');
  const key = `${kind}_mb` as keyof UploadLimits;
  const maxMb = Math.min(limits[key] ?? BUCKET_CAPS_MB[key], BUCKET_CAPS_MB[key]);
  if (file.size > maxMb * 1024 * 1024) {
    throw new MediaError(`"${file.name}" is too large (${(file.size / 1048576).toFixed(1)} MB). The limit for ${KIND_INFO[kind].label.toLowerCase()} files is ${maxMb} MB.`, 'too-large');
  }
  return kind;
}

export function mediaUrl(m: Pick<MediaRow, 'bucket' | 'path'> | null | undefined): string {
  return m ? storagePublicUrl(m.bucket, m.path) : '';
}

/** Small preview for grids and lists — falls back to the original when no thumbnail was generated. */
export function thumbUrl(m: Pick<MediaRow, 'bucket' | 'path' | 'thumbnail_path'> | null | undefined): string {
  if (!m) return '';
  return storagePublicUrl(m.bucket, m.thumbnail_path ?? m.path);
}

// ---------------------------------------------------------------- caching of media rows by id
const cache = new Map<string, MediaRow | null>();
const pending = new Map<string, Promise<MediaRow | null>>();
const listeners = new Set<() => void>();

export function subscribeMedia(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function invalidateMedia(id?: string) {
  if (id) cache.delete(id);
  else cache.clear();
  listeners.forEach((fn) => fn());
}
export function primeMedia(rows: MediaRow[]) {
  rows.forEach((r) => cache.set(r.id, r));
}
export function cachedMedia(id: string | null | undefined): MediaRow | null | undefined {
  return id ? cache.get(id) : null;
}

export async function fetchMedia(id: string): Promise<MediaRow | null> {
  if (cache.has(id)) return cache.get(id) ?? null;
  const inFlight = pending.get(id);
  if (inFlight) return inFlight;
  const p = (async () => {
    const { data } = await db().from('media').select('*').eq('id', id).maybeSingle();
    const row = (data as MediaRow | null) ?? null;
    cache.set(id, row);
    pending.delete(id);
    return row;
  })();
  pending.set(id, p);
  return p;
}

export async function fetchMediaMany(ids: string[]): Promise<Map<string, MediaRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const missing = unique.filter((id) => !cache.has(id));
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    const rows = await unwrap<MediaRow[]>(db().from('media').select('*').in('id', chunk));
    primeMedia(rows);
    chunk.filter((id) => !rows.some((r) => r.id === id)).forEach((id) => cache.set(id, null));
  }
  const out = new Map<string, MediaRow>();
  unique.forEach((id) => {
    const r = cache.get(id);
    if (r) out.set(id, r);
  });
  return out;
}

// ---------------------------------------------------------------- upload
async function accessToken(): Promise<string> {
  const { data } = await db().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new MediaError('Your session has expired. Please sign in again.', 'upload-failed');
  return token;
}

function xhrUpload(bucket: string, path: string, file: Blob, contentType: string, token: string, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let body: { message?: string; error?: string; statusCode?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error body */
      }
      const err = new MediaError(body.message ?? body.error ?? `Upload failed (${xhr.status})`, 'upload-failed');
      Object.assign(err, { statusCode: String(xhr.status), message: body.message ?? body.error ?? err.message });
      reject(err);
    };
    xhr.onerror = () => reject(new MediaError('Upload failed. Check your internet connection and try again.'));
    xhr.onabort = () => reject(new MediaError('Upload cancelled.', 'aborted'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}

function readImageSize(file: Blob): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function readMediaDuration(file: Blob, kind: 'audio' | 'video'): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind === 'audio' ? 'audio' : 'video');
    const done = (v: number | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? Math.round(el.duration * 10) / 10 : null);
    el.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    el.src = url;
  });
}

async function makeThumbnail(file: File): Promise<Blob | null> {
  try {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type || MIME_BY_EXT[extOf(file.name)])) return null;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/webp', 0.8));
  } catch {
    return null;
  }
}

async function validateLottie(file: File) {
  try {
    const json = JSON.parse(await file.text());
    if (!json || typeof json !== 'object' || !('layers' in json)) throw new Error('not lottie');
  } catch {
    throw new MediaError(`"${file.name}" does not look like a valid Lottie animation (JSON with layers).`, 'invalid-file');
  }
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export interface UploadOptions {
  folder?: string;
  kinds?: MediaKind[];
  displayName?: string;
  limits?: UploadLimits;
  allowDuplicate?: boolean;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

export async function findDuplicate(file: File): Promise<MediaRow | null> {
  const { data } = await db().from('media').select('*').eq('file_name', file.name).eq('size_bytes', file.size).is('deleted_at', null).limit(1);
  return ((data as MediaRow[] | null) ?? [])[0] ?? null;
}

async function inspect(file: File, kind: MediaKind) {
  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;
  if (kind === 'image') {
    const size = await readImageSize(file);
    width = size?.width ?? null;
    height = size?.height ?? null;
  } else if (kind === 'audio') duration = await readMediaDuration(file, 'audio');
  else if (kind === 'video' || (kind === 'animation' && /\.(mp4|webm)$/i.test(file.name))) duration = await readMediaDuration(file, 'video');
  return { width, height, duration };
}

export async function uploadMedia(file: File, opts: UploadOptions = {}): Promise<MediaRow> {
  const kinds = opts.kinds ?? ALL_KINDS;
  const kind = validateFile(file, kinds, opts.limits);
  if (kind === 'animation' && extOf(file.name) === 'json') await validateLottie(file);
  if (!opts.allowDuplicate) {
    const dup = await findDuplicate(file);
    if (dup) throw new MediaError(`A file named "${file.name}" with the same size is already in the library.`, 'duplicate', dup);
  }

  const bucket = KIND_INFO[kind].bucket;
  const folder = (opts.folder ?? 'general').replace(/[^a-z0-9-_]/gi, '') || 'general';
  const ext = extOf(file.name);
  const id = newId();
  const month = new Date().toISOString().slice(0, 7);
  const path = `${folder}/${month}/${id}.${ext}`;
  const contentType = file.type && file.type !== 'application/octet-stream' ? file.type : MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const token = await accessToken();

  await xhrUpload(bucket, path, file, contentType, token, opts.onProgress, opts.signal);

  let thumbnailPath: string | null = null;
  const created: string[] = [path];
  try {
    const [meta, thumb] = await Promise.all([inspect(file, kind), kind === 'image' ? makeThumbnail(file) : Promise.resolve(null)]);
    if (thumb) {
      const tp = `thumbs/${month}/${id}.webp`;
      try {
        await xhrUpload(bucket, tp, thumb, 'image/webp', token);
        thumbnailPath = tp;
        created.push(tp);
      } catch {
        thumbnailPath = null;
      }
    }
    const row = await unwrap<MediaRow>(
      db()
        .from('media')
        .insert({
          bucket,
          path,
          thumbnail_path: thumbnailPath,
          file_name: file.name,
          display_name: opts.displayName?.trim() || file.name.replace(/\.[^.]+$/, ''),
          kind,
          mime_type: contentType,
          size_bytes: file.size,
          width: meta.width,
          height: meta.height,
          duration_seconds: meta.duration,
          folder,
        })
        .select()
        .single()
    );
    primeMedia([row]);
    return row;
  } catch (err) {
    await db().storage.from(bucket).remove(created).catch(() => undefined);
    throw err;
  }
}

/** Swaps the file behind an existing media row (same id, so every reference keeps working). */
export async function replaceMediaFile(media: MediaRow, file: File, opts: Pick<UploadOptions, 'onProgress' | 'signal' | 'limits'> = {}): Promise<MediaRow> {
  const kind = validateFile(file, [media.kind as MediaKind], opts.limits);
  if (kind === 'animation' && extOf(file.name) === 'json') await validateLottie(file);
  const ext = extOf(file.name);
  const month = new Date().toISOString().slice(0, 7);
  const path = `${media.folder}/${month}/${newId()}.${ext}`;
  const contentType = file.type && file.type !== 'application/octet-stream' ? file.type : MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const token = await accessToken();
  await xhrUpload(media.bucket, path, file, contentType, token, opts.onProgress, opts.signal);

  let thumbnailPath: string | null = null;
  const meta = await inspect(file, kind);
  if (kind === 'image') {
    const thumb = await makeThumbnail(file);
    if (thumb) {
      const tp = `thumbs/${month}/${newId()}.webp`;
      try {
        await xhrUpload(media.bucket, tp, thumb, 'image/webp', token);
        thumbnailPath = tp;
      } catch {
        thumbnailPath = null;
      }
    }
  }
  try {
    const row = await unwrap<MediaRow>(
      db()
        .from('media')
        .update({
          path,
          thumbnail_path: thumbnailPath,
          file_name: file.name,
          mime_type: contentType,
          size_bytes: file.size,
          width: meta.width,
          height: meta.height,
          duration_seconds: meta.duration,
        })
        .eq('id', media.id)
        .select()
        .single()
    );
    await db().storage.from(media.bucket).remove([media.path, ...(media.thumbnail_path ? [media.thumbnail_path] : [])]).catch(() => undefined);
    invalidateMedia(media.id);
    primeMedia([row]);
    return row;
  } catch (err) {
    await db().storage.from(media.bucket).remove([path, ...(thumbnailPath ? [thumbnailPath] : [])]).catch(() => undefined);
    throw err;
  }
}

export interface MediaUsage {
  table_name: string;
  record_id: string;
  column_name: string;
  label: string | null;
  is_published: boolean;
}

export async function mediaUsage(id: string): Promise<MediaUsage[]> {
  const { data, error } = await db().rpc('media_usage', { p_media_id: id });
  if (error) throw error;
  return (data ?? []) as MediaUsage[];
}

export async function updateMediaMeta(id: string, values: Partial<Pick<MediaRow, 'display_name' | 'alt_text' | 'folder'>>): Promise<MediaRow> {
  const row = await unwrap<MediaRow>(db().from('media').update(values).eq('id', id).select().single());
  invalidateMedia(id);
  primeMedia([row]);
  return row;
}

/** Soft delete: the file stays in storage (recoverable from Trash) but stops being served to the app. */
export async function trashMedia(id: string) {
  await unwrap(db().from('media').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').single());
  invalidateMedia(id);
}
export async function restoreMedia(id: string) {
  await unwrap(db().from('media').update({ deleted_at: null }).eq('id', id).select('id').single());
  invalidateMedia(id);
}
/** Permanent removal of the row and the stored files (super admins only — enforced by RLS). */
export async function purgeMedia(media: MediaRow) {
  const { data, error } = await db().from('media').delete().eq('id', media.id).select('id');
  if (error) throw error;
  if (!data?.length) throw { code: '42501', message: 'permission denied: only a super admin can permanently delete files' };
  await db().storage.from(media.bucket).remove([media.path, ...(media.thumbnail_path ? [media.thumbnail_path] : [])]).catch(() => undefined);
  invalidateMedia(media.id);
}

export async function listMedia(o: { search?: string; kind?: MediaKind | ''; folder?: string; page?: number; pageSize?: number; trash?: boolean; sort?: 'newest' | 'oldest' | 'az' | 'size' }) {
  const order =
    o.sort === 'oldest' ? [{ column: 'created_at', ascending: true }]
    : o.sort === 'az' ? [{ column: 'display_name', ascending: true }]
    : o.sort === 'size' ? [{ column: 'size_bytes', ascending: false }]
    : [{ column: 'created_at', ascending: false }];
  const filters: { column: string; op: 'eq'; value: unknown }[] = [];
  if (o.kind) filters.push({ column: 'kind', op: 'eq', value: o.kind });
  if (o.folder) filters.push({ column: 'folder', op: 'eq', value: o.folder });
  const res = await listRows('media', {
    search: o.search ? { fields: ['display_name', 'file_name'], term: o.search } : undefined,
    filters,
    order,
    page: o.page ?? 0,
    pageSize: o.pageSize ?? 24,
    deleted: o.trash ? 'trash' : 'active',
  });
  primeMedia(res.rows as MediaRow[]);
  return { rows: res.rows as MediaRow[], count: res.count };
}

export type { Row };
