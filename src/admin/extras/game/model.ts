export type QType = 'choice' | 'pair' | 'step' | 'sort_item';

export interface Item {
  emoji: string;
  label: string;
}

export const CHOICE_TYPES = ['multiple_choice', 'quiz', 'story_choice', 'good_deed_challenge', 'true_false'];

export function expectedType(gameType: string): QType {
  if (gameType === 'matching' || gameType === 'memory') return 'pair';
  if (gameType === 'sequence') return 'step';
  if (gameType === 'drag_drop') return 'sort_item';
  return 'choice';
}

export const TYPE_NOUN: Record<QType, { one: string; many: string; add: string }> = {
  choice: { one: 'question', many: 'questions', add: 'Add question' },
  pair: { one: 'pair', many: 'pairs', add: 'Add pair' },
  step: { one: 'step', many: 'steps', add: 'Add step' },
  sort_item: { one: 'item', many: 'items', add: 'Add item' },
};

export const MIN_ITEMS: Record<QType, number> = { choice: 1, pair: 2, step: 2, sort_item: 2 };

export interface ChoicePayload {
  prompt: string;
  emoji: string;
  options: Item[];
  correct_index: number;
  explanation: string;
}
export interface PairPayload {
  left: Item;
  right: Item;
}
export type StepPayload = Item;
export interface SortPayload extends Item {
  bucket: 0 | 1;
}
export type Payload = ChoicePayload | PairPayload | StepPayload | SortPayload;

const item = (): Item => ({ emoji: '', label: '' });

export function blankPayload(type: QType, gameType: string): Payload {
  if (type === 'choice') {
    if (gameType === 'true_false') return { prompt: '', emoji: '', options: [{ emoji: '', label: 'True' }, { emoji: '', label: 'False' }], correct_index: 0, explanation: '' };
    return { prompt: '', emoji: '', options: [item(), item()], correct_index: 0, explanation: '' };
  }
  if (type === 'pair') return { left: item(), right: item() };
  if (type === 'step') return item();
  return { ...item(), bucket: 0 };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const asItem = (v: unknown): Item => ({ emoji: str((v as Item)?.emoji), label: str((v as Item)?.label) });

/** Fills defaults so an editor never crashes on an odd stored payload. */
export function normalizePayload(type: QType, raw: unknown, gameType: string): Payload {
  const p = (raw ?? {}) as Record<string, unknown>;
  if (type === 'choice') {
    const options = Array.isArray(p.options) ? p.options.map(asItem) : [];
    const fallback = blankPayload('choice', gameType) as ChoicePayload;
    return { prompt: str(p.prompt), emoji: str(p.emoji), options: options.length ? options : fallback.options, correct_index: Number(p.correct_index) || 0, explanation: str(p.explanation) };
  }
  if (type === 'pair') return { left: asItem(p.left), right: asItem(p.right) };
  if (type === 'step') return asItem(p);
  return { ...asItem(p), bucket: p.bucket === 1 ? 1 : 0 };
}

/** What is saved for a row: empty optional keys are dropped so payloads stay tidy. */
export function cleanPayload(type: QType, p: Payload): Record<string, unknown> {
  const it = (i: Item) => ({ emoji: i.emoji.trim(), label: i.label.trim() });
  if (type === 'choice') {
    const c = p as ChoicePayload;
    const out: Record<string, unknown> = { prompt: c.prompt.trim(), options: c.options.map(it), correct_index: c.correct_index, explanation: c.explanation.trim() };
    if (c.emoji.trim()) out.emoji = c.emoji.trim();
    return out;
  }
  if (type === 'pair') return { left: it((p as PairPayload).left), right: it((p as PairPayload).right) };
  if (type === 'step') return it(p as Item);
  return { ...it(p as Item), bucket: (p as SortPayload).bucket };
}

export function validatePayload(type: QType, p: Payload, gameType: string): string[] {
  const errors: string[] = [];
  if (type === 'choice') {
    const c = p as ChoicePayload;
    const fixed = gameType === 'true_false';
    if (!c.prompt.trim()) errors.push('Enter the question text.');
    const labels = c.options.map((o) => o.label.trim());
    if (!fixed && (labels.length < 2 || labels.length > 4)) errors.push('Use 2 to 4 answer options.');
    if (labels.some((l) => !l)) errors.push('Every answer option needs a label.');
    else if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) errors.push('Answer options must be different from each other.');
    if (!(c.correct_index >= 0 && c.correct_index < c.options.length)) errors.push('Select exactly one correct answer.');
  } else if (type === 'pair') {
    const c = p as PairPayload;
    if (!c.left.label.trim()) errors.push('The left card needs a label.');
    if (!c.right.label.trim()) errors.push('The right card needs a label.');
    if (c.left.label.trim() && c.left.label.trim().toLowerCase() === c.right.label.trim().toLowerCase()) errors.push('The two cards of a pair must be different.');
  } else if (!(p as Item).label.trim()) {
    errors.push(type === 'step' ? 'Describe the step.' : 'Give the item a label.');
  }
  return errors;
}

export function summarize(type: QType, p: Payload): { title: string; sub: string; emoji: string } {
  if (type === 'choice') {
    const c = p as ChoicePayload;
    const right = c.options[c.correct_index];
    return { title: c.prompt || '(no question)', sub: `Answer: ${right ? `${right.emoji} ${right.label}`.trim() : '—'} · ${c.options.length} options`, emoji: c.emoji };
  }
  if (type === 'pair') {
    const c = p as PairPayload;
    return { title: `${c.left.emoji} ${c.left.label}  ↔  ${c.right.emoji} ${c.right.label}`.replace(/\s+/g, ' '), sub: 'Matching pair', emoji: '' };
  }
  const c = p as SortPayload;
  return { title: c.label || '(no label)', sub: type === 'sort_item' ? `Bucket ${(c.bucket ?? 0) + 1}` : '', emoji: c.emoji };
}

/** Text-only translation drafts (editable strings) and how they map to stored fields. */
export interface TrDraft {
  prompt: string;
  explanation: string;
  options: string[];
  left: string;
  right: string;
  label: string;
}

export function emptyTr(count = 0): TrDraft {
  return { prompt: '', explanation: '', options: Array.from({ length: count }, () => ''), left: '', right: '', label: '' };
}

const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export function trFromFields(type: QType, f: Record<string, unknown>, optionCount: number): TrDraft {
  const d = emptyTr(optionCount);
  if (type === 'choice') {
    d.prompt = str(f.prompt);
    d.explanation = str(f.explanation);
    const opts = Array.isArray(f.options) ? f.options : [];
    d.options = d.options.map((_, i) => str(obj(opts[i]).label));
  } else if (type === 'pair') {
    d.left = str(obj(f.left).label);
    d.right = str(obj(f.right).label);
  } else d.label = str(f.label);
  return d;
}

export function trToFields(type: QType, d: TrDraft, base: Payload): Record<string, unknown> {
  if (type === 'choice') {
    const c = base as ChoicePayload;
    return {
      prompt: d.prompt.trim(),
      explanation: d.explanation.trim(),
      options: c.options.map((o, i) => {
        const label = (d.options[i] ?? '').trim();
        return label ? { emoji: o.emoji.trim(), label } : { emoji: '', label: '' };
      }),
    };
  }
  if (type === 'pair') return { left: { label: d.left.trim() }, right: { label: d.right.trim() } };
  return { label: d.label.trim() };
}

export interface ConfigText {
  intro: string;
  badge_title: string;
  closing: string;
  prompt: string;
  buckets: [string, string];
}

export function configTrFromFields(f: Record<string, unknown> | undefined): ConfigText {
  const c = obj(obj(f).config);
  const b = Array.isArray(c.buckets) ? c.buckets : [];
  return { intro: str(c.intro), badge_title: str(c.badge_title), closing: str(c.closing), prompt: str(c.prompt), buckets: [str(obj(b[0]).label), str(obj(b[1]).label)] };
}
