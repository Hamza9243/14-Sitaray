import { useEffect, useState } from 'react';

import { Button, Card, Field } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useLookups } from '../../lib/data';
import { friendlyError, rpc } from '../../lib/db';
import { formatBytes } from '../../lib/format';
import { KIND_INFO, type MediaKind, type UploadLimits } from '../../lib/media';
import { useToast } from '../../lib/toast';
import { BarList } from '../dashboard/BarList';

import { saveSetting } from './saveSetting';

const HARD_CAP: Record<MediaKind, number> = { image: 10, audio: 50, animation: 20, video: 50 };
const KINDS = Object.keys(HARD_CAP) as MediaKind[];
const field = (k: MediaKind) => `${k}_mb` as keyof UploadLimits;

export function StorageCard() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const { limits, reload } = useLookups();
  const [bytes, setBytes] = useState<Record<string, number> | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rpc<{ storage: { total_bytes: number; by_kind: Record<string, number> } }>('dashboard_stats')
      .then((s) => {
        setBytes(s.storage.by_kind);
        setTotal(Number(s.storage.total_bytes));
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  useEffect(() => {
    setDraft(Object.fromEntries(KINDS.map((k) => [k, String(limits[field(k)])])));
  }, [limits]);

  const save = async () => {
    const next: Record<string, number> = {};
    let clamped = false;
    for (const k of KINDS) {
      const raw = Math.round(Number(draft[k]));
      const value = Number.isFinite(raw) && raw >= 1 ? Math.min(HARD_CAP[k], raw) : Math.min(HARD_CAP[k], limits[field(k)]);
      if (String(value) !== draft[k]) clamped = true;
      next[field(k)] = value;
    }
    setSaving(true);
    try {
      await saveSetting('upload_limits', next, false);
      await reload();
      toast.success(clamped ? 'Saved. Some values were adjusted to fit the storage bucket limits.' : 'Upload limits saved.');
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Storage">
      <div className="stack">
        {error ? <div className="alert alert-error">{error}</div> : null}
        <div>
          <div className="storage-total">{bytes ? formatBytes(total) : '…'}</div>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Total used by all uploaded files.
          </p>
          {bytes ? <BarList max={Math.max(1, ...KINDS.map((k) => Number(bytes[k] ?? 0)))} items={KINDS.map((k) => ({ key: k, label: KIND_INFO[k].label, value: Number(bytes[k] ?? 0), display: formatBytes(Number(bytes[k] ?? 0)), tone: 'green' as const }))} /> : null}
        </div>
        <div>
          <div className="field-label">Maximum upload size (per file)</div>
          <p className="muted small" style={{ margin: '4px 0 12px' }}>
            Each bucket also enforces a hard cap in Supabase Storage ({KINDS.map((k) => `${KIND_INFO[k].label.toLowerCase()} ${HARD_CAP[k]} MB`).join(', ')}). Values above the cap are lowered to it when you save.
          </p>
          <div className="form-grid">
            {KINDS.map((k) => (
              <Field key={k} label={`${KIND_INFO[k].label} (MB)`} help={`1 to ${HARD_CAP[k]} MB`}>
                <input className="input" type="number" min={1} max={HARD_CAP[k]} aria-label={`${KIND_INFO[k].label} limit in MB`} value={draft[k] ?? ''} disabled={!isSuperAdmin} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} />
              </Field>
            ))}
          </div>
        </div>
        {isSuperAdmin ? (
          <div>
            <Button variant="primary" loading={saving} onClick={() => void save()}>
              Save upload limits
            </Button>
          </div>
        ) : (
          <p className="muted small">Only super admins can change upload limits.</p>
        )}
      </div>
    </Card>
  );
}
