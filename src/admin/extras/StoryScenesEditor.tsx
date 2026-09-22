import { useCallback, useEffect, useState } from 'react';

import { Button, ConfirmDialog, EmptyState, Spinner } from '../components/ui';
import { db, friendlyError, loadTranslations, type Row, saveTranslations, unwrap } from '../lib/db';
import { formatDuration } from '../lib/format';
import { useToast } from '../lib/toast';
import type { ExtrasProps } from '../resources/types';

import SceneCard from './story/SceneCard';
import SceneModal from './story/SceneModal';
import { deleteRows, moved, renumber } from './shared';

export default function StoryScenesEditor({ id }: ExtrasProps) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRows(await unwrap<Row[]>(db().from('story_scenes').select('*').eq('story_id', id).order('scene_order').order('created_at')));
    } catch (e) {
      setLoadError(friendlyError(e, 'Could not load the scenes.'));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const mark = (ids: string[], on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      ids.forEach((x) => (on ? next.add(x) : next.delete(x)));
      return next;
    });

  if (loadError) {
    return (
      <div className="stack-sm">
        <p className="error">{loadError}</p>
        <Button onClick={load}>Try again</Button>
      </div>
    );
  }
  if (!rows) return <Spinner label="Loading scenes…" />;

  const total = rows.reduce((s, r) => s + Number(r.duration_seconds), 0);

  async function move(index: number, delta: -1 | 1) {
    const ids = [rows![index].id, rows![index + delta].id];
    mark(ids, true);
    try {
      setRows(await renumber('story_scenes', 'scene_order', moved(rows!, index, delta)));
    } catch (e) {
      toast.error(friendlyError(e, 'Could not reorder.'));
      void load();
    } finally {
      mark(ids, false);
    }
  }

  async function duplicate(index: number) {
    const src = rows![index];
    mark([src.id], true);
    try {
      const rest: Row = { ...src };
      delete rest.id;
      delete rest.created_at;
      delete rest.updated_at;
      const copy = await unwrap<Row>(db().from('story_scenes').insert({ ...rest, name: `${src.name} (copy)`, scene_order: rows!.length }).select().single());
      try {
        const map = await loadTranslations('story_scene', src.id);
        await saveTranslations('story_scene', copy.id, map);
      } catch (e) {
        toast.error(`Copied, but translations were not: ${friendlyError(e)}`);
      }
      const list = [...rows!.slice(0, index + 1), copy, ...rows!.slice(index + 1, rows!.length)];
      setRows(await renumber('story_scenes', 'scene_order', list));
      toast.success('Scene duplicated.');
    } catch (e) {
      toast.error(friendlyError(e, 'Could not duplicate the scene.'));
      void load();
    } finally {
      mark([src.id], false);
    }
  }

  async function remove() {
    const row = deleting!;
    mark([row.id], true);
    try {
      await deleteRows('story_scenes', 'story_scene', [row.id]);
      setRows(await renumber('story_scenes', 'scene_order', rows!.filter((r) => r.id !== row.id)));
      toast.success('Scene deleted.');
    } catch (e) {
      toast.error(friendlyError(e, 'Could not delete the scene.'));
    } finally {
      mark([row.id], false);
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="ex-summary">
        <div className="ex-stats">
          <strong>
            {rows.length} scene{rows.length === 1 ? '' : 's'} · {formatDuration(total)} total ({Math.round(total * 10) / 10}s)
          </strong>
        </div>
        <Button variant="primary" icon="add" onClick={() => setEditing('new')}>
          Add scene
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="film" title="No scenes yet" hint="Add scenes to turn this story into an animated, narrated experience." />
      ) : (
        <>
          <div className="ex-timeline" aria-label="Scene timeline">
            {rows.map((r, i) => (
              <button
                key={r.id}
                type="button"
                className="ex-tl-item"
                style={{ flexGrow: Math.max(1, Number(r.duration_seconds)) }}
                onClick={() => document.getElementById(`scene-${r.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
                title={`${r.name} — ${Number(r.duration_seconds)}s`}
              >
                <strong>
                  {i + 1}. {r.name}
                </strong>
                <span className="muted">{Number(r.duration_seconds)}s</span>
                <span className="ex-tl-bar" />
              </button>
            ))}
          </div>
          <ol className="ex-list">
            {rows.map((r, i) => (
              <SceneCard
                key={r.id}
                scene={r}
                index={i}
                count={rows.length}
                busy={busy.has(r.id)}
                onMove={(d) => move(i, d)}
                onEdit={() => setEditing(r)}
                onDuplicate={() => duplicate(i)}
                onDelete={() => setDeleting(r)}
              />
            ))}
          </ol>
        </>
      )}
      {editing ? (
        <SceneModal
          storyId={id}
          row={editing === 'new' ? null : editing}
          nextOrder={rows.length}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setRows((prev) => (prev ? (prev.some((r) => r.id === saved.id) ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved]) : prev));
            setEditing(null);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={!!deleting}
        danger
        title="Delete this scene?"
        message={<>“{deleting?.name}” and its translations will be permanently removed. The uploaded files stay in the media library.</>}
        confirmLabel="Delete"
        loading={deleting ? busy.has(deleting.id) : false}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
