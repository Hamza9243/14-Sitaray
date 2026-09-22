import { DUAS, QUIZ_QUESTIONS, STARS, STORIES } from '@/data';
import type { Dua, QuizQuestion, StarDefinition, Story } from '@/types/content';

import { useCmsStore } from './cmsStore';
import type { CmsSnapshot } from './types';

type CmsState = ReturnType<typeof useCmsStore.getState>;

/** The active language's snapshot, else the default-language one (e.g. Urdu picked while offline), else none. */
export function pickSnapshot(state: CmsState): CmsSnapshot | null {
  return state.snapshots[state.language] ?? state.snapshots.en ?? null;
}

const NONE = Symbol('none');

/** Recomputes only when the snapshot object changes, so hooks and getters hand out stable references. */
function memo<R>(fn: (snapshot: CmsSnapshot | null) => R): (snapshot: CmsSnapshot | null) => R {
  let lastArg: CmsSnapshot | null | typeof NONE = NONE;
  let last!: R;
  return (snapshot) => {
    if (snapshot !== lastArg) {
      last = fn(snapshot);
      lastArg = snapshot;
    }
    return last;
  };
}

/** CMS items whose slug equals a bundled id replace it; the rest are appended. Zero CMS rows keeps the bundled list as-is. */
function mergeById<T extends { id: string }>(bundled: T[], remote: T[]): T[] {
  if (remote.length === 0) return bundled;
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const bundledIds = new Set(bundled.map((item) => item.id));
  return [...bundled.map((item) => remoteById.get(item.id) ?? item), ...remote.filter((item) => !bundledIds.has(item.id))];
}

/** The seeded quiz ("general-knowledge") mirrors the bundled questions by position, so edits there replace them. */
const LEGACY_QUIZ_SLUG = 'general-knowledge';

function mergeQuiz(remote: CmsSnapshot['quizQuestions']): QuizQuestion[] {
  if (remote.length === 0) return QUIZ_QUESTIONS;
  const replaced = new Set<string>();
  const merged = QUIZ_QUESTIONS.map((bundled, index) => {
    const match = remote.find((q) => q.quizSlug === LEGACY_QUIZ_SLUG && q.sortOrder === index);
    if (!match) return bundled;
    replaced.add(match.id);
    return { ...match, id: bundled.id };
  });
  return [...merged, ...remote.filter((q) => !replaced.has(q.id))];
}

function mergeStars(overrides: CmsSnapshot['stars']): StarDefinition[] {
  if (overrides.length === 0) return STARS;
  return STARS.map((star) => {
    const o = overrides.find((x) => x.number === star.id);
    if (!o) return star;
    return {
      ...star,
      name: o.name ?? star.name,
      honorific: o.honorific ?? star.honorific,
      lessonTitle: o.lessonTitle ?? star.lessonTitle,
      lessonSummary: o.lessonSummary ?? star.lessonSummary,
      imageUrl: o.imageUrl,
    };
  });
}

export const selectStories = memo<Story[]>((s) => mergeById(STORIES, s?.stories ?? []));
export const selectDuas = memo<Dua[]>((s) => mergeById(DUAS, s?.duas ?? []));
export const selectQuizQuestions = memo<QuizQuestion[]>((s) => mergeQuiz(s?.quizQuestions ?? []));
export const selectStars = memo<StarDefinition[]>((s) => mergeStars(s?.stars ?? []));

const current = () => pickSnapshot(useCmsStore.getState());

export const getStories = () => selectStories(current());
export const getDuas = () => selectDuas(current());
export const getQuizQuestions = () => selectQuizQuestions(current());
export const getStars = () => selectStars(current());
export const getStoryById = (id: string) => getStories().find((s) => s.id === id);
export const getDuaById = (id: string) => getDuas().find((d) => d.id === id);
export const getQuizQuestionById = (id: string) => getQuizQuestions().find((q) => q.id === id);

/** YYYY-MM-DD in the device's local time zone (daily stars are scheduled by calendar date). */
export function localDateString(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
