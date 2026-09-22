import type { ChoicePayload, PairPayload, Payload, QType, SortPayload } from './model';

const Face = ({ emoji, label }: { emoji: string; label: string }) => (
  <span className="row gap-sm">
    {emoji ? <span className="ex-big-emoji">{emoji}</span> : null}
    <span>{label || '…'}</span>
  </span>
);

/** Static, non-interactive approximation of what a child will see. */
export default function ItemPreview({ type, payload, bucketLabels }: { type: QType; payload: Payload; bucketLabels: [string, string] }) {
  if (type === 'choice') {
    const c = payload as ChoicePayload;
    return (
      <div className="ex-preview" aria-label="Preview">
        <div className="row gap-sm">
          {c.emoji ? <span className="ex-big-emoji">{c.emoji}</span> : null}
          <strong>{c.prompt || 'Your question appears here'}</strong>
        </div>
        {c.options.map((o, i) => (
          <div key={i} className={i === c.correct_index ? 'ex-preview-opt ex-preview-ok' : 'ex-preview-opt'}>
            <Face emoji={o.emoji} label={o.label} />
            {i === c.correct_index ? <span style={{ marginLeft: 'auto' }}>✓ correct</span> : null}
          </div>
        ))}
        {c.explanation ? <span className="muted small">{c.explanation}</span> : null}
      </div>
    );
  }
  if (type === 'pair') {
    const c = payload as PairPayload;
    return (
      <div className="ex-preview ex-preview-pair" aria-label="Preview">
        <div className="ex-preview-opt"><Face emoji={c.left.emoji} label={c.left.label} /></div>
        <span aria-hidden="true">↔</span>
        <div className="ex-preview-opt"><Face emoji={c.right.emoji} label={c.right.label} /></div>
      </div>
    );
  }
  const c = payload as SortPayload;
  return (
    <div className="ex-preview" aria-label="Preview">
      <div className="ex-preview-opt"><Face emoji={c.emoji} label={c.label} /></div>
      {type === 'sort_item' ? <span className="muted small">Belongs in: {bucketLabels[c.bucket ?? 0] || `Bucket ${(c.bucket ?? 0) + 1}`}</span> : null}
    </div>
  );
}
