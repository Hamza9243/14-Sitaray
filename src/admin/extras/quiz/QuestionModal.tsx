import { useEffect, useState } from 'react';

import { Button, Field, Modal, Spinner } from '../../components/ui';
import { db, friendlyError, loadTranslations, type Row, saveTranslations, unwrap } from '../../lib/db';
import { useToast } from '../../lib/toast';
import { ErrorList, LangTabs, useLangTabs } from '../shared';

interface TrText {
  prompt: string;
  options: string[];
  explanation: string;
}

interface Draft {
  question_type: 'multiple_choice' | 'true_false';
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
  points: string;
  tr: Record<string, TrText>;
}

const TF = ['True', 'False'];

function fit(list: string[], n: number): string[] {
  return Array.from({ length: n }, (_, i) => list[i] ?? '');
}

function validate(d: Draft): string[] {
  const errors: string[] = [];
  if (!d.prompt.trim()) errors.push('Enter the question text.');
  const opts = d.options.map((o) => o.trim());
  if (d.question_type === 'multiple_choice') {
    if (opts.length < 2 || opts.length > 6) errors.push('A multiple-choice question needs 2 to 6 options.');
    if (opts.some((o) => !o)) errors.push('Fill in every option (or remove the empty ones).');
    else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) errors.push('Options must be different from each other.');
  }
  if (!(d.correct_index >= 0 && d.correct_index < d.options.length)) errors.push('Select exactly one correct answer.');
  if (d.points.trim() !== '' && !/^\d+$/.test(d.points.trim())) errors.push('Points must be a whole number of 0 or more (or leave empty).');
  return errors;
}

interface Props {
  quizId: string;
  row: Row | null;
  nextOrder: number;
  defaultPoints: number;
  onClose: () => void;
  onSaved: (row: Row) => void;
}

export default function QuestionModal({ quizId, row, nextOrder, defaultPoints, onClose, onSaved }: Props) {
  const toast = useToast();
  const langs = useLangTabs();
  const [lang, setLang] = useState(langs.defaultLanguage);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const base: Draft = row
      ? {
          question_type: row.question_type,
          prompt: row.prompt ?? '',
          options: Array.isArray(row.options) ? row.options.map(String) : [],
          correct_index: row.correct_index ?? 0,
          explanation: row.explanation ?? '',
          points: row.points === null || row.points === undefined ? '' : String(row.points),
          tr: {},
        }
      : { question_type: 'multiple_choice', prompt: '', options: ['', '', '', ''], correct_index: 0, explanation: '', points: '', tr: {} };
    const blanks = () => Object.fromEntries(langs.extra.map((l) => [l.code, { prompt: '', options: fit([], base.options.length), explanation: '' }]));
    if (!row) {
      setDraft({ ...base, tr: blanks() });
      return undefined;
    }
    loadTranslations('quiz_question', row.id)
      .then((map) => {
        if (cancelled) return;
        const tr = Object.fromEntries(
          langs.extra.map((l) => {
            const f = (map[l.code] ?? {}) as Partial<TrText>;
            return [l.code, { prompt: f.prompt ?? '', options: fit(Array.isArray(f.options) ? f.options.map(String) : [], base.options.length), explanation: f.explanation ?? '' }];
          })
        );
        setDraft({ ...base, tr });
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(friendlyError(e, 'Could not load translations.'));
        setDraft({ ...base, tr: blanks() });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  if (!draft) {
    return (
      <Modal open title={row ? 'Edit question' : 'Add question'} onClose={onClose} wide>
        <Spinner label="Loading…" />
      </Modal>
    );
  }

  const set = (patch: Partial<Draft>) => {
    setDraft({ ...draft, ...patch });
    setErrors([]);
  };
  const setTr = (code: string, patch: Partial<TrText>) => set({ tr: { ...draft.tr, [code]: { ...draft.tr[code], ...patch } } });
  const isBase = lang === langs.defaultLanguage;
  const tr = draft.tr[lang];
  const dir = langs.dir(lang);
  const tf = draft.question_type === 'true_false';

  function changeType(t: Draft['question_type']) {
    if (t === draft!.question_type) return;
    set({ question_type: t, options: t === 'true_false' ? TF.slice() : ['', '', '', ''], correct_index: 0 });
  }

  function removeOption(i: number) {
    const d = draft!;
    setDraft({
      ...d,
      options: d.options.filter((_, j) => j !== i),
      correct_index: d.correct_index > i || d.correct_index === d.options.length - 1 ? Math.max(0, d.correct_index - 1) : d.correct_index,
      tr: Object.fromEntries(Object.entries(d.tr).map(([k, v]) => [k, { ...v, options: v.options.filter((_, j) => j !== i) }])),
    });
    setErrors([]);
  }

  function editOption(i: number, v: string) {
    if (isBase) set({ options: draft!.options.map((x, j) => (j === i ? v : x)) });
    else setTr(lang, { options: fit(tr.options, draft!.options.length).map((x, j) => (j === i ? v : x)) });
  }

  async function save() {
    const d = draft!;
    const errs = validate(d);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    try {
      const values = {
        question_type: d.question_type,
        prompt: d.prompt.trim(),
        options: d.options.map((o) => o.trim()),
        correct_index: d.correct_index,
        explanation: d.explanation.trim() || null,
        points: d.points.trim() === '' ? null : Number(d.points),
      };
      const saved = row
        ? await unwrap<Row>(db().from('quiz_questions').update(values).eq('id', row.id).select().single())
        : await unwrap<Row>(db().from('quiz_questions').insert({ ...values, quiz_id: quizId, sort_order: nextOrder }).select().single());
      const map = Object.fromEntries(
        langs.extra.map((l) => {
          const t = d.tr[l.code];
          return [l.code, { prompt: t.prompt.trim(), options: fit(t.options, d.options.length).map((o) => o.trim()), explanation: t.explanation.trim() }];
        })
      );
      try {
        await saveTranslations('quiz_question', saved.id, map);
        toast.success(row ? 'Question updated.' : 'Question added.');
      } catch (e) {
        toast.error(`Question saved, but translations failed: ${friendlyError(e)}`);
      }
      onSaved(saved);
    } catch (e) {
      setErrors([friendlyError(e, 'Could not save the question.')]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      wide
      title={row ? 'Edit question' : 'Add question'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            {row ? 'Save question' : 'Add question'}
          </Button>
        </>
      }
    >
      <div className="ex-form">
        <LangTabs value={lang} onChange={setLang} />
        {!isBase ? <p className="ex-tr-note">Translate the text below. Leave a box empty to fall back to the default language. The correct answer and points are shared.</p> : null}
        {isBase ? (
          <div className="ex-cols">
            <Field label="Question type">
              <select className="select" value={draft.question_type} onChange={(e) => changeType(e.target.value as Draft['question_type'])} aria-label="Question type">
                <option value="multiple_choice">Multiple choice</option>
                <option value="true_false">True / False</option>
              </select>
            </Field>
            <Field label="Points" help={`Empty = quiz default (${defaultPoints})`}>
              <input className="input" inputMode="numeric" value={draft.points} placeholder={String(defaultPoints)} onChange={(e) => set({ points: e.target.value })} aria-label="Points override" />
            </Field>
          </div>
        ) : null}
        <Field label="Question" required>
          <textarea
            className="input"
            rows={2}
            dir={isBase ? undefined : dir}
            value={isBase ? draft.prompt : tr.prompt}
            placeholder={isBase ? '' : draft.prompt}
            onChange={(e) => (isBase ? set({ prompt: e.target.value }) : setTr(lang, { prompt: e.target.value }))}
            aria-label="Question text"
          />
        </Field>
        <Field label={tf ? 'Answer' : 'Options'} required help={isBase && !tf ? 'Select the radio button next to the correct answer.' : undefined}>
          <div className="stack-sm" style={{ alignItems: 'stretch' }}>
            {draft.options.map((o, i) => (
              <div key={i} className="ex-opt">
                <input type="radio" name="quiz-correct" checked={draft.correct_index === i} disabled={!isBase} onChange={() => set({ correct_index: i })} aria-label={`Option ${i + 1} is correct`} />
                {tf && isBase ? (
                  <input className="input" value={o} readOnly aria-label={`Option ${i + 1}`} />
                ) : (
                  <input
                    className="input"
                    dir={isBase ? undefined : dir}
                    value={isBase ? o : (tr.options[i] ?? '')}
                    placeholder={isBase ? `Option ${i + 1}` : o}
                    onChange={(e) => editOption(i, e.target.value)}
                    aria-label={`Option ${i + 1}`}
                  />
                )}
                {isBase && !tf && draft.options.length > 2 ? <Button size="sm" variant="ghost" icon="close" aria-label={`Remove option ${i + 1}`} onClick={() => removeOption(i)} /> : null}
              </div>
            ))}
            {isBase && !tf && draft.options.length < 6 ? (
              <Button
                size="sm"
                icon="add"
                onClick={() => set({ options: [...draft.options, ''], tr: Object.fromEntries(Object.entries(draft.tr).map(([k, v]) => [k, { ...v, options: [...v.options, ''] }])) })}
              >
                Add option
              </Button>
            ) : null}
          </div>
        </Field>
        <Field label="Explanation (shown after answering)">
          <textarea
            className="input"
            rows={2}
            dir={isBase ? undefined : dir}
            value={isBase ? draft.explanation : tr.explanation}
            placeholder={isBase ? '' : draft.explanation}
            onChange={(e) => (isBase ? set({ explanation: e.target.value }) : setTr(lang, { explanation: e.target.value }))}
            aria-label="Explanation"
          />
        </Field>
        <ErrorList errors={errors} />
      </div>
    </Modal>
  );
}
