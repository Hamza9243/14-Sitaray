import { useCallback, useEffect, useState } from 'react';

import { MediaField } from '../components/MediaField';
import { Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Spinner } from '../components/ui';
import { db, friendlyError, type Row, unwrap } from '../lib/db';
import { titleCase } from '../lib/format';
import { useToast } from '../lib/toast';
import type { ExtrasProps } from '../resources/types';

import './character-assets.css';

const KEY_RE = /^[a-z0-9_]+$/;
const CALL_KEYS = ['voice_welcome', 'voice_story', 'voice_dua', 'voice_game', 'voice_learning'];
const SUGGESTIONS = [...CALL_KEYS, 'wave_animation', 'celebrate_animation', 'sad_animation', 'thinking_animation', 'greeting_image'];

interface Asset {
  id: string;
  asset_key: string;
  label: string | null;
  media_id: string;
  sort_order: number;
}

function duplicateAware(e: unknown, key: string): string {
  const err = e as { code?: string } | null;
  return err?.code === '23505' ? `This character already has an asset with the key “${key}”. Choose another key or edit the existing row.` : friendlyError(e, 'Could not save the asset.');
}

function AssetRow({
  asset,
  index,
  total,
  saving,
  onLabel,
  onMedia,
  onMove,
  onDelete,
}: {
  asset: Asset;
  index: number;
  total: number;
  saving: boolean;
  onLabel: (label: string) => void;
  onMedia: (id: string | null) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(asset.label ?? '');
  useEffect(() => setLabel(asset.label ?? ''), [asset.label]);
  return (
    <li className="ca-row" aria-busy={saving}>
      <div className="ca-row-head">
        <div className="ca-key">
          <code>{asset.asset_key}</code>
          {CALL_KEYS.includes(asset.asset_key) ? <span className="muted small">Incoming-call line</span> : null}
          {saving ? <span className="spinner spinner-sm" aria-label="Saving" /> : null}
        </div>
        <div className="row gap-xs">
          <IconButton icon="up" label="Move up" disabled={index === 0 || saving} onClick={() => onMove(-1)} />
          <IconButton icon="down" label="Move down" disabled={index === total - 1 || saving} onClick={() => onMove(1)} />
          <IconButton icon="trash" variant="danger" label="Delete asset" disabled={saving} onClick={onDelete} />
        </div>
      </div>
      <Field label="Label">
        <input
          className="input"
          value={label}
          placeholder={titleCase(asset.asset_key)}
          disabled={saving}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label.trim() !== (asset.label ?? '') && onLabel(label.trim())}
        />
      </Field>
      <MediaField value={asset.media_id} folder="characters" disabled={saving} onChange={onMedia} />
    </li>
  );
}

export default function CharacterAssetsEditor({ id }: ExtrasProps) {
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newMedia, setNewMedia] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await unwrap<Row[]>(db().from('character_assets').select('*').eq('character_id', id).order('sort_order').order('created_at'));
      setAssets(rows as Asset[]);
    } catch (e) {
      setError(friendlyError(e, 'Could not load the extra assets.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const mark = (rowId: string, on: boolean) =>
    setSaving((s) => {
      const n = new Set(s);
      if (on) n.add(rowId);
      else n.delete(rowId);
      return n;
    });

  async function patch(asset: Asset, values: Partial<Asset>, done: string) {
    mark(asset.id, true);
    try {
      const row = await unwrap<Asset>(db().from('character_assets').update(values).eq('id', asset.id).select().single());
      setAssets((a) => a.map((x) => (x.id === asset.id ? row : x)));
      toast.success(done);
    } catch (e) {
      toast.error(friendlyError(e, 'Could not save the change.'));
      await load();
    } finally {
      mark(asset.id, false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...assets];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    const changed = next.map((a, i) => ({ ...a, sort_order: i })).filter((a, i) => assets.find((x) => x.id === a.id)?.sort_order !== i || a.id === next[index].id || a.id === next[j].id);
    setAssets(next.map((a, i) => ({ ...a, sort_order: i })));
    changed.forEach((a) => mark(a.id, true));
    try {
      await Promise.all(changed.map((a) => unwrap(db().from('character_assets').update({ sort_order: a.sort_order }).eq('id', a.id).select('id').single())));
    } catch (e) {
      toast.error(friendlyError(e, 'Could not reorder the assets.'));
      await load();
    } finally {
      changed.forEach((a) => mark(a.id, false));
    }
  }

  async function remove() {
    if (!confirm) return;
    setDeleting(true);
    try {
      await unwrap(db().from('character_assets').delete().eq('id', confirm.id).select('id').single());
      setAssets((a) => a.filter((x) => x.id !== confirm.id));
      toast.success('Asset removed.');
      setConfirm(null);
    } catch (e) {
      toast.error(friendlyError(e, 'Could not delete the asset.'));
    } finally {
      setDeleting(false);
    }
  }

  const trimmedKey = newKey.trim();
  const validate = (key: string): string | null => {
    if (!key) return 'Choose or type a key.';
    if (!KEY_RE.test(key)) return 'Use only lowercase letters, numbers and underscores (for example voice_welcome).';
    if (assets.some((a) => a.asset_key === key)) return `This character already has an asset with the key “${key}”.`;
    return null;
  };

  async function add() {
    const problem = validate(trimmedKey);
    if (problem) return setKeyError(problem);
    if (!newMedia) return toast.error('Pick or upload a file for this asset first.');
    setAdding(true);
    try {
      const row = await unwrap<Asset>(
        db()
          .from('character_assets')
          .insert({ character_id: id, asset_key: trimmedKey, label: newLabel.trim() || null, media_id: newMedia, sort_order: assets.length ? Math.max(...assets.map((a) => a.sort_order)) + 1 : 0 })
          .select()
          .single()
      );
      setAssets((a) => [...a, row]);
      setNewKey('');
      setNewLabel('');
      setNewMedia(null);
      setKeyError(null);
      toast.success('Asset added.');
    } catch (e) {
      const msg = duplicateAware(e, trimmedKey);
      setKeyError(msg);
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  }

  const free = SUGGESTIONS.filter((k) => !assets.some((a) => a.asset_key === k));

  return (
    <Card title="Extra assets">
      <div className="stack">
        <p className="muted small">
          Any number of named files for this character. <code>voice_welcome</code>, <code>voice_story</code>, <code>voice_dua</code>, <code>voice_game</code> and <code>voice_learning</code> are the
          lines played during the fake incoming-call reminder for Ali and Sakina. Changes save immediately.
        </p>

        {loading ? <Spinner label="Loading assets…" /> : null}
        {error ? (
          <div className="alert alert-error">
            {error} <Button size="sm" onClick={() => void load()}>Retry</Button>
          </div>
        ) : null}
        {!loading && !error && assets.length === 0 ? <EmptyState icon="music" title="No extra assets yet" hint="Add a voice line or animation below." /> : null}

        {assets.length ? (
          <ul className="ca-list">
            {assets.map((a, i) => (
              <AssetRow
                key={a.id}
                asset={a}
                index={i}
                total={assets.length}
                saving={saving.has(a.id)}
                onLabel={(label) => void patch(a, { label: label || null }, 'Label saved.')}
                onMedia={(mid) => (mid ? void patch(a, { media_id: mid }, 'File updated.') : setConfirm(a))}
                onMove={(dir) => void move(i, dir)}
                onDelete={() => setConfirm(a)}
              />
            ))}
          </ul>
        ) : null}

        <div className="ca-add">
          <h4>Add an asset</h4>
          <div className="ca-add-grid">
            <Field label="Key" error={keyError} help="Pick a suggestion or type your own (a–z, 0–9, _).">
              <input
                className="input"
                list="ca-key-suggestions"
                value={newKey}
                placeholder="voice_welcome"
                autoComplete="off"
                onChange={(e) => {
                  setNewKey(e.target.value);
                  setKeyError(null);
                }}
              />
              <datalist id="ca-key-suggestions">
                {free.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </Field>
            <Field label="Label (optional)">
              <input className="input" value={newLabel} placeholder="Shown to editors" onChange={(e) => setNewLabel(e.target.value)} />
            </Field>
          </div>
          <Field label="File">
            <MediaField value={newMedia} folder="characters" onChange={(mid) => setNewMedia(mid)} />
          </Field>
          <div>
            <Button variant="primary" icon="add" loading={adding} disabled={!trimmedKey || !newMedia} onClick={() => void add()}>
              Add asset
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        danger
        title="Delete this asset?"
        message={
          <>
            <code>{confirm?.asset_key}</code> will be removed from this character. The file stays in the Media Library.
          </>
        }
        confirmLabel="Delete asset"
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirm(null)}
      />
    </Card>
  );
}
