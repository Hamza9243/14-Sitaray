import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Spinner } from '../components/ui';
import { db, friendlyError, type Row, unwrap } from '../lib/db';
import { useToast } from '../lib/toast';
import type { ExtrasProps } from '../resources/types';

import GameConfigEditor from './game/GameConfigEditor';
import ItemModal from './game/ItemModal';
import { expectedType, MIN_ITEMS, normalizePayload, type Payload, summarize, type QType, TYPE_NOUN } from './game/model';
import { deleteRows, moved, renumber, ReorderButtons } from './shared';

export default function GameQuestionsEditor({ id, values }: ExtrasProps) {
  const toast = useToast();
  const gameType = String(values.game_type ?? 'multiple_choice');
  const type: QType = expectedType(gameType);
  const noun = TYPE_NOUN[type];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [config, setConfig] = useState<Row>({});
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [purge, setPurge] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRows(await unwrap<Row[]>(db().from('game_questions').select('*').eq('game_id', id).order('sort_order').order('created_at')));
    } catch (e) {
      setLoadError(friendlyError(e, 'Could not load the game content.'));
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
  if (!rows) return <Spinner label="Loading game content…" />;

  const valid = rows.filter((r) => r.question_type === type);
  const mismatched = rows.filter((r) => r.question_type !== type);
  const buckets = Array.isArray(config.buckets) ? config.buckets : [];
  const bucketLabels: [string, string] = [String(buckets[0]?.label ?? ''), String(buckets[1]?.label ?? '')];
  const warnings: string[] = [];
  if (valid.length < MIN_ITEMS[type]) warnings.push(`Needs at least ${MIN_ITEMS[type]} ${noun.many} to be playable (has ${valid.length}).`);
  if (type === 'sort_item' && valid.length) {
    [0, 1].forEach((b) => {
      if (!valid.some((r) => (r.payload?.bucket === 1 ? 1 : 0) === b)) warnings.push(`Bucket ${b + 1}${bucketLabels[b] ? ` (${bucketLabels[b]})` : ''} has no items.`);
    });
  }

  async function reorder(list: Row[], index: number, delta: -1 | 1) {
    const ids = [list[index].id, list[index + delta].id];
    mark(ids, true);
    try {
      setRows(await renumber('game_questions', 'sort_order', [...moved(list, index, delta), ...mismatched]));
    } catch (e) {
      toast.error(friendlyError(e, 'Could not reorder.'));
      void load();
    } finally {
      mark(ids, false);
    }
  }

  async function remove(row: Row) {
    mark([row.id], true);
    try {
      await deleteRows('game_questions', 'game_question', [row.id]);
      const left = rows!.filter((r) => r.id !== row.id);
      setRows(await renumber('game_questions', 'sort_order', [...left.filter((r) => r.question_type === type), ...left.filter((r) => r.question_type !== type)]));
      toast.success(`${noun.one[0].toUpperCase()}${noun.one.slice(1)} deleted.`);
    } catch (e) {
      toast.error(friendlyError(e, 'Could not delete.'));
    } finally {
      mark([row.id], false);
      setDeleting(null);
    }
  }

  async function removeMismatched() {
    const ids = mismatched.map((r) => r.id);
    mark(ids, true);
    try {
      await deleteRows('game_questions', 'game_question', ids);
      setRows(await renumber('game_questions', 'sort_order', valid));
      toast.success(`Deleted ${ids.length} mismatched row${ids.length === 1 ? '' : 's'}.`);
    } catch (e) {
      toast.error(friendlyError(e, 'Could not delete the mismatched rows.'));
    } finally {
      mark(ids, false);
      setPurge(false);
    }
  }

  return (
    <div className="stack">
      <GameConfigEditor gameId={id} gameType={gameType} onSaved={setConfig} />
      <hr style={{ border: 0, borderTop: '1px solid var(--border)', width: '100%' }} />
      <div>
        <div className="ex-summary">
          <div className="ex-stats">
            <strong>
              {valid.length} {valid.length === 1 ? noun.one : noun.many}
            </strong>
            <Badge tone="blue">{type === 'choice' ? 'Choice questions' : type === 'pair' ? 'Pairs' : type === 'step' ? 'Ordered steps' : 'Sort items'}</Badge>
            {type === 'step' ? <span className="muted">The list order is the correct order.</span> : null}
          </div>
          <Button variant="primary" icon="add" onClick={() => setEditing('new')}>
            {noun.add}
          </Button>
        </div>
        {warnings.map((w) => (
          <div key={w} className="ex-warn" role="alert">
            <span>{w}</span>
          </div>
        ))}
        {mismatched.length ? (
          <div className="ex-warn" role="alert">
            <span>
              {mismatched.length} row{mismatched.length === 1 ? ' does' : 's do'} not match this game type ({gameType.replace(/_/g, ' ')}). Switching the game type keeps old rows, but they are ignored until deleted.
            </span>
            <Button size="sm" variant="danger" icon="trash" onClick={() => setPurge(true)}>
              Delete mismatched
            </Button>
          </div>
        ) : null}
        {valid.length === 0 ? (
          <EmptyState icon="game" title={`No ${noun.many} yet`} hint={`Add the first ${noun.one} for this game.`} />
        ) : (
          <ol className="ex-list">
            {valid.map((r, i) => {
              const p: Payload = normalizePayload(type, r.payload, gameType);
              const s = summarize(type, p);
              return (
                <li key={r.id} className={busy.has(r.id) ? 'ex-row ex-row-busy' : 'ex-row'}>
                  <span className="ex-num">{i + 1}</span>
                  {s.emoji ? <span className="ex-big-emoji" aria-hidden="true">{s.emoji}</span> : null}
                  <div className="ex-main">
                    <span className="ex-title" title={s.title}>
                      {s.title}
                    </span>
                    {s.sub ? <span className="ex-sub">{s.sub}</span> : null}
                  </div>
                  <div className="ex-actions">
                    <ReorderButtons index={i} count={valid.length} onMove={(d) => reorder(valid, i, d)} />
                    <IconButton icon="edit" label={`Edit ${noun.one}`} onClick={() => setEditing(r)} />
                    <IconButton icon="trash" variant="danger" label={`Delete ${noun.one}`} onClick={() => setDeleting(r)} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {mismatched.length ? (
          <ul className="ex-list ex-mt">
            {mismatched.map((r) => (
              <li key={r.id} className="ex-row ex-row-bad">
                <Badge tone="amber">{r.question_type}</Badge>
                <div className="ex-main">
                  <span className="ex-sub">Does not match the current game type — ignored by the game.</span>
                </div>
                <IconButton icon="trash" variant="danger" label="Delete mismatched row" onClick={() => setDeleting(r)} />
              </li>
            ))}
          </ul>
        ) : null}
        <p className="muted small ex-mt">Changes here are saved immediately. Changing the game type above keeps existing rows, but they must match the new type to be used.</p>
      </div>
      {editing ? (
        <ItemModal
          gameId={id}
          gameType={gameType}
          type={type}
          row={editing === 'new' ? null : editing}
          nextOrder={rows.length}
          bucketLabels={bucketLabels}
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
        title={`Delete this ${deleting?.question_type === type ? noun.one : 'row'}?`}
        message="It and its translations will be permanently removed."
        confirmLabel="Delete"
        loading={deleting ? busy.has(deleting.id) : false}
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={purge}
        danger
        title="Delete mismatched rows?"
        message={`${mismatched.length} row${mismatched.length === 1 ? '' : 's'} that do not fit this game type will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={removeMismatched}
        onCancel={() => setPurge(false)}
      />
    </div>
  );
}
