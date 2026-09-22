export interface BarItem {
  key: string;
  label: string;
  value: number;
  display?: string;
  tone?: 'green' | 'amber';
}

export function BarList({ items, max }: { items: BarItem[]; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="bar-list">
      {items.map((i) => (
        <li key={i.key} className="bar-row">
          <span className="bar-label" title={i.label}>
            {i.label}
          </span>
          <span className="bar-track" role="img" aria-label={`${i.label}: ${i.display ?? i.value}`}>
            <span className={`bar-fill${i.tone ? ` bar-fill-${i.tone}` : ''}`} style={{ width: `${Math.min(100, (i.value / top) * 100)}%` }} />
          </span>
          <span className="bar-value">{i.display ?? i.value}</span>
        </li>
      ))}
    </ul>
  );
}
