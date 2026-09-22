import { Button, Field } from '../../components/ui';

import type { ChoicePayload, Item, PairPayload, Payload, SortPayload, TrDraft } from './model';

export function EmojiInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <input className="input ex-emoji" value={value} maxLength={8} placeholder="🙂" onChange={(e) => onChange(e.target.value)} aria-label={label} />;
}

interface Props {
  gameType: string;
  payload: Payload;
  onChange: (p: Payload) => void;
  /** null while editing the default language. */
  tr: TrDraft | null;
  onTr: (patch: Partial<TrDraft>) => void;
  dir: string;
  bucketLabels: [string, string];
  onRemoveOption?: (i: number) => void;
}

function ItemRow({ label, item, onChange, tr, onTr, dir, trPlaceholder }: { label: string; item: Item; onChange: (i: Item) => void; tr: string | null; onTr: (v: string) => void; dir: string; trPlaceholder?: string }) {
  return (
    <div className="ex-opt">
      {tr === null ? <EmojiInput value={item.emoji} onChange={(v) => onChange({ ...item, emoji: v })} label={`${label} emoji`} /> : <span className="ex-big-emoji" aria-hidden="true">{item.emoji}</span>}
      {tr === null ? (
        <input className="input" value={item.label} placeholder={label} onChange={(e) => onChange({ ...item, label: e.target.value })} aria-label={`${label} text`} />
      ) : (
        <input className="input" dir={dir} value={tr} placeholder={trPlaceholder ?? item.label} onChange={(e) => onTr(e.target.value)} aria-label={`${label} text (translation)`} />
      )}
    </div>
  );
}

export function ChoiceFields({ gameType, payload, onChange, tr, onTr, dir, onRemoveOption }: Props) {
  const p = payload as ChoicePayload;
  const fixed = gameType === 'true_false';
  return (
    <>
      <Field label="Question" required>
        <div className="ex-opt">
          {tr === null ? <EmojiInput value={p.emoji} onChange={(v) => onChange({ ...p, emoji: v })} label="Question emoji" /> : <span className="ex-big-emoji" aria-hidden="true">{p.emoji}</span>}
          <textarea
            className="input"
            rows={2}
            dir={tr ? dir : undefined}
            value={tr ? tr.prompt : p.prompt}
            placeholder={tr ? p.prompt : ''}
            onChange={(e) => (tr ? onTr({ prompt: e.target.value }) : onChange({ ...p, prompt: e.target.value }))}
            aria-label="Question text"
          />
        </div>
      </Field>
      <Field label={fixed ? 'Correct answer' : 'Answer options'} required help={tr === null && !fixed ? 'Select the radio button next to the correct answer (2–4 options).' : undefined}>
        <div className="stack-sm" style={{ alignItems: 'stretch' }}>
          {p.options.map((o, i) => (
            <div key={i} className="ex-opt">
              <input type="radio" name="game-correct" checked={p.correct_index === i} disabled={tr !== null} onChange={() => onChange({ ...p, correct_index: i })} aria-label={`Option ${i + 1} is correct`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {fixed && tr === null ? (
                  <div className="ex-opt">
                    <EmojiInput value={o.emoji} onChange={(v) => onChange({ ...p, options: p.options.map((x, j) => (j === i ? { ...x, emoji: v } : x)) })} label={`Option ${i + 1} emoji`} />
                    <input className="input" value={o.label} readOnly aria-label={`Option ${i + 1} text`} />
                  </div>
                ) : (
                  <ItemRow
                    label={`Option ${i + 1}`}
                    item={o}
                    onChange={(it) => onChange({ ...p, options: p.options.map((x, j) => (j === i ? it : x)) })}
                    tr={tr ? (tr.options[i] ?? '') : null}
                    onTr={(v) => onTr({ options: p.options.map((_, j) => (j === i ? v : (tr?.options[j] ?? ''))) })}
                    dir={dir}
                  />
                )}
              </div>
              {tr === null && !fixed && p.options.length > 2 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="close"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => onRemoveOption?.(i)}
                />
              ) : null}
            </div>
          ))}
          {tr === null && !fixed && p.options.length < 4 ? (
            <Button size="sm" icon="add" onClick={() => onChange({ ...p, options: [...p.options, { emoji: '', label: '' }] })}>
              Add option
            </Button>
          ) : null}
        </div>
      </Field>
      <Field label="Explanation (shown after answering)">
        <textarea
          className="input"
          rows={2}
          dir={tr ? dir : undefined}
          value={tr ? tr.explanation : p.explanation}
          placeholder={tr ? p.explanation : ''}
          onChange={(e) => (tr ? onTr({ explanation: e.target.value }) : onChange({ ...p, explanation: e.target.value }))}
          aria-label="Explanation"
        />
      </Field>
    </>
  );
}

export function PairFields({ payload, onChange, tr, onTr, dir }: Props) {
  const p = payload as PairPayload;
  return (
    <div className="ex-cols">
      <Field label="Left card" required>
        <ItemRow label="Left" item={p.left} onChange={(left) => onChange({ ...p, left })} tr={tr ? tr.left : null} onTr={(left) => onTr({ left })} dir={dir} />
      </Field>
      <Field label="Right card (its match)" required>
        <ItemRow label="Right" item={p.right} onChange={(right) => onChange({ ...p, right })} tr={tr ? tr.right : null} onTr={(right) => onTr({ right })} dir={dir} />
      </Field>
    </div>
  );
}

export function LabelFields({ gameType, payload, onChange, tr, onTr, dir, bucketLabels }: Props) {
  const p = payload as SortPayload;
  const sort = gameType === 'drag_drop';
  return (
    <>
      <Field label={sort ? 'Item' : 'Step'} required help={sort ? undefined : 'The order in the list is the correct order — use the arrows to reorder.'}>
        <ItemRow label={sort ? 'Item' : 'Step'} item={p} onChange={(it) => onChange({ ...p, ...it })} tr={tr ? tr.label : null} onTr={(label) => onTr({ label })} dir={dir} />
      </Field>
      {sort && tr === null ? (
        <Field label="Belongs in" required>
          <select className="select" value={p.bucket} onChange={(e) => onChange({ ...p, bucket: e.target.value === '1' ? 1 : 0 })} aria-label="Bucket">
            {[0, 1].map((b) => (
              <option key={b} value={b}>
                {`Bucket ${b + 1}: ${bucketLabels[b] || '(unnamed)'}`}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
    </>
  );
}
