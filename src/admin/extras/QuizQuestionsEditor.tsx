import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Spinner } from '../components/ui';
import { db, friendlyError, type Row, unwrap } from '../lib/db';
import { useToast } from '../lib/toast';
import type { ExtrasProps } from '../resources/types';

import QuestionModal from './quiz/QuestionModal';
import { deleteRows, moved, renumber, ReorderButtons } from './shared';

export default function QuizQuestionsEditor({ id, values }: ExtrasProps) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setRows(await unwrap<Row[]>(db().from('quiz_questions').select('*').eq('quiz_id', id).order('sort_order').order('created_at')));
    } catch (e) {
      setLoadError(friendlyError(e, 'Could not load the questions.'));
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
  if (!rows) return <Spinner label="Loading questions…" />;

  const defaultPoints = Number(values.points_per_question ?? 10);
  const total = rows.reduce((s, r) => s + (r.points ?? defaultPoints), 0);
  const perAttempt = values.questions_per_attempt ? Number(values.questions_per_attempt) : null;

  async function move(index: number, delta: -1 | 1) {
    const list = rows!;
    const ids = [list[index].id, list[index + delta].id];
    mark(ids, true);
    try {
      setRows(await renumber('quiz_questions', 'sort_order', moved(list, index, delta)));
    } catch (e) {
      toast.error(friendlyError(e, 'Could not reorder.'));
      void load();
    } finally {
      mark(ids, false);
    }
  }

  async function remove() {
    const row = deleting!;
    mark([row.id], true);
    try {
      await deleteRows('quiz_questions', 'quiz_question', [row.id]);
      setRows(await renumber('quiz_questions', 'sort_order', rows!.filter((r) => r.id !== row.id)));
      toast.success('Question deleted.');
    } catch (e) {
      toast.error(friendlyError(e, 'Could not delete the question.'));
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
            {rows.length} question{rows.length === 1 ? '' : 's'} · {total} points
          </strong>
          {perAttempt ? <span className="muted">{perAttempt} asked per attempt</span> : null}
        </div>
        <Button variant="primary" icon="add" onClick={() => setEditing('new')}>
          Add question
        </Button>
      </div>
      {perAttempt && rows.length < perAttempt ? (
        <div className="ex-warn" role="alert">
          <span>
            This quiz has {rows.length} question{rows.length === 1 ? '' : 's'} but asks {perAttempt} per attempt. Add {perAttempt - rows.length} more or lower “Questions per attempt”.
          </span>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState icon="help" title="No questions yet" hint="Add the first question for this quiz." />
      ) : (
        <ol className="ex-list">
          {rows.map((r, i) => {
            const options: string[] = Array.isArray(r.options) ? r.options : [];
            return (
              <li key={r.id} className={busy.has(r.id) ? 'ex-row ex-row-busy' : 'ex-row'}>
                <span className="ex-num">{i + 1}</span>
                <div className="ex-main">
                  <span className="ex-title" title={r.prompt}>
                    {r.prompt}
                  </span>
                  <span className="ex-sub">Answer: {options[r.correct_index] ?? '—'}</span>
                </div>
                <div className="ex-meta">
                  <Badge tone={r.question_type === 'true_false' ? 'violet' : 'blue'}>{r.question_type === 'true_false' ? 'True/False' : `${options.length} options`}</Badge>
                  <Badge tone="green">
                    {r.points ?? defaultPoints} pts{r.points === null ? '' : ' *'}
                  </Badge>
                </div>
                <div className="ex-actions">
                  <ReorderButtons index={i} count={rows.length} onMove={(d) => move(i, d)} />
                  <IconButton icon="edit" label="Edit question" onClick={() => setEditing(r)} />
                  <IconButton icon="trash" variant="danger" label="Delete question" onClick={() => setDeleting(r)} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {rows.length ? <p className="muted small ex-mt">* points override the quiz default of {defaultPoints}.</p> : null}
      {editing ? (
        <QuestionModal
          quizId={id}
          row={editing === 'new' ? null : editing}
          nextOrder={rows.length}
          defaultPoints={defaultPoints}
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
        title="Delete this question?"
        message={<>“{deleting?.prompt}” and its translations will be permanently removed.</>}
        confirmLabel="Delete"
        loading={deleting ? busy.has(deleting.id) : false}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
