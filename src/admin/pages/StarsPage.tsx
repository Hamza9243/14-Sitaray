import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, EmptyState, FilterBar, PageHeader, SearchBar, StatusBadge } from '../components/ui';
import { friendlyError, listRows, type Row, rpc, setStatus } from '../lib/db';
import { thumbUrl } from '../lib/media';
import { useToast } from '../lib/toast';
import { useMedia } from '../lib/useMedia';

import './stars/stars.css';

const SINGULAR: Record<string, string> = { story: 'story', game: 'game', audio: 'audio', dua: 'du’a', quiz: 'quiz', good_deed: 'good deed', reflection: 'reflection', wisdom: 'wisdom', activity: 'activity' };
const TYPE_LABEL: Record<string, string> = {
  story: 'stories',
  game: 'games',
  audio: 'audio',
  dua: 'du’as',
  quiz: 'quizzes',
  good_deed: 'good deeds',
  reflection: 'reflections',
  wisdom: 'wisdom',
  activity: 'activities',
};

// Abstract mark only: a gradient derived from the Star's number plus its initial.
function StarArt({ star }: { star: Row }) {
  const { media } = useMedia(star.image_media_id);
  const hue = (Number(star.number) * 47) % 360;
  return (
    <div className="star-art" style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 46%), hsl(${(hue + 50) % 360} 60% 32%))` }}>
      {media && media.kind === 'image' ? <img src={thumbUrl(media)} alt="" loading="lazy" /> : <span aria-hidden="true">{String(star.name ?? '?').trim().charAt(0).toUpperCase()}</span>}
      <span className="star-num">{star.number}</span>
    </div>
  );
}

function StarCard({ star, counts, busy, onToggle }: { star: Row; counts: Record<string, number>; busy: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const published = star.status === 'published';
  return (
    <article className="star-card" aria-label={`Star ${star.number}: ${star.name}`}>
      <button type="button" className="star-card-open" onClick={() => navigate(`/admin/stars/${star.id}`)}>
        <StarArt star={star} />
        <div className="star-info">
          <h3>{star.name}</h3>
          {star.title ? <div className="muted small">{star.title}</div> : null}
          <p className="star-desc">{star.description || 'No description yet.'}</p>
          <div className="star-chips" aria-label="Content breakdown">
            {total === 0 ? (
              <span className="chip">No content yet</span>
            ) : (
              Object.entries(counts).map(([t, n]) => (
                <span key={t} className="chip">
                  {n} {(n === 1 ? SINGULAR[t] : TYPE_LABEL[t]) ?? t}
                </span>
              ))
            )}
          </div>
        </div>
      </button>
      <div className="star-foot">
        <span className="row gap-sm">
          <StatusBadge status={star.status} />
          <span className="muted small">{total} item{total === 1 ? '' : 's'}</span>
        </span>
        <Button size="sm" variant={published ? 'secondary' : 'success'} icon={published ? 'eye-off' : 'eye'} loading={busy} onClick={onToggle}>
          {published ? 'Unpublish' : 'Publish'}
        </Button>
      </div>
    </article>
  );
}

export default function StarsPage() {
  const toast = useToast();
  const [stars, setStars] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, cnt] = await Promise.all([
        listRows('stars', { pageSize: 14, order: [{ column: 'number', ascending: true }] }),
        rpc<{ star_id: string; content_type: string; n: number | string }[]>('star_content_counts'),
      ]);
      const map: Record<string, Record<string, number>> = {};
      for (const c of cnt ?? []) (map[c.star_id] ??= {})[c.content_type] = Number(c.n);
      setStars(list.rows);
      setCounts(map);
    } catch (e) {
      setError(friendlyError(e, 'Could not load the Stars.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (star: Row) => {
    const next = star.status === 'published' ? 'unpublished' : 'published';
    setBusyId(star.id);
    try {
      const updated = await setStatus('stars', star.id, next);
      setStars((prev) => prev.map((s) => (s.id === star.id ? { ...s, ...updated } : s)));
      toast.success(`${star.name} ${next === 'published' ? 'published' : 'unpublished'}.`);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return stars.filter((s) => (!status || s.status === status) && (!term || `${s.name} ${s.title ?? ''} ${s.description ?? ''}`.toLowerCase().includes(term)));
  }, [stars, q, status]);

  return (
    <>
      <PageHeader
        title="14 Stars"
        subtitle="The fourteen Stars and everything linked to them. Open a Star to edit its details and manage its content."
        actions={
          <Button icon="refresh" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <Card padded={false}>
        <div className="toolbar">
          <div className="toolbar-row">
            <SearchBar value={q} onChange={setQ} placeholder="Search Stars…" />
            <FilterBar
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  options: [
                    { value: 'published', label: 'Published' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'unpublished', label: 'Unpublished' },
                  ],
                },
              ]}
              values={{ status }}
              onChange={(_, v) => setStatusFilter(v)}
            />
          </div>
        </div>
      </Card>

      {error ? (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
          {error}{' '}
          <Button size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading && stars.length === 0 ? (
        <div className="star-grid" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="star-skel" />
          ))}
        </div>
      ) : shown.length === 0 && !error ? (
        <Card>
          <EmptyState icon="star" title={stars.length ? 'No Stars match' : 'No Stars found'} hint={stars.length ? 'Try clearing the search or status filter.' : 'Has the database seed been applied?'} />
        </Card>
      ) : (
        <div className="star-grid">
          {shown.map((s) => (
            <StarCard key={s.id} star={s} counts={counts[s.id] ?? {}} busy={busyId === s.id} onToggle={() => void toggle(s)} />
          ))}
        </div>
      )}
    </>
  );
}
