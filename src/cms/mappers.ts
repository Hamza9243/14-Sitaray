import type { CharacterAudioSet } from '@/data/characters';
import { gradients } from '@/design-system/tokens/colors';
import { richTextToParagraphs, richTextToPlain } from '@/lib/richText';
import type { Dua, QuizQuestion, Story, StoryDifficulty, StoryMoralChoice, StoryQuizQuestion } from '@/types/content';
import type { StarChoiceGame, StarGameDefinition, StarGameSortItem } from '@/types/games';

import type {
  CmsCharacter,
  CmsDailyStar,
  CmsGame,
  CmsGoodDeed,
  CmsQuizQuestion,
  CmsReflection,
  CmsWisdom,
  StarOverride,
} from './types';

export type Row = Record<string, unknown>;

export interface MapContext {
  media: (id: unknown) => string | undefined;
  /** Translation `fields` for one record in the active language ({} for the default language or when none exists). */
  overlay: (type: string, id: unknown) => Row;
  starNumber: (id: unknown) => number | undefined;
  categorySlug: (id: unknown) => string | undefined;
}

/** Game reward XP is capped so a CMS game can never break the XP economy. */
export const MAX_CMS_GAME_XP = 50;

const rec = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const strings = (v: unknown): string[] => list(v).filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
const pair = (v: unknown): readonly [string, string] | undefined => {
  const a = list(v);
  return typeof a[0] === 'string' && typeof a[1] === 'string' ? [a[0], a[1]] : undefined;
};
/** Translated value when present, otherwise the default-language column. */
const field = (row: Row, over: Row, key: string): string => str(over[key]) ?? text(row[key]);

const PAGE_GRADIENTS: readonly (readonly [string, string])[] = [
  [gradients.dawn[0], gradients.dawn[1]],
  [gradients.skyClimb[0], gradients.skyClimb[1]],
  [gradients.berryPop[0], gradients.berryPop[1]],
  [gradients.meadowFresh[0], gradients.meadowFresh[1]],
  [gradients.starBurst[0], gradients.starBurst[1]],
];

const DIFFICULTIES: StoryDifficulty[] = ['easy', 'medium', 'hard'];

export function mapStory(row: Row, ctx: MapContext): Story {
  const over = ctx.overlay('story', row.id);
  const extras = rec(row.extras);
  const title = field(row, over, 'title');
  const summary = field(row, over, 'short_description');
  const coverEmoji = str(extras.cover_emoji) ?? '📖';
  const gradient = pair(extras.gradient) ?? PAGE_GRADIENTS[0];
  const extraPages = list(extras.pages).map(rec);

  const paragraphs = richTextToParagraphs(field(row, over, 'body'));
  const texts = paragraphs.length > 0 ? paragraphs : [summary || title];

  const quiz: StoryQuizQuestion[] = list(extras.quiz)
    .map(rec)
    .map((q, i) => ({
      id: str(q.id) ?? `q${i + 1}`,
      question: text(q.question),
      emoji: str(q.emoji),
      options: strings(q.options),
      correctIndex: num(q.correctIndex, 0),
    }))
    .filter((q) => q.question && q.options.length >= 2 && q.correctIndex < q.options.length);

  const sequence = strings(extras.sequence_events);
  const moralRaw = rec(extras.moral_choice);
  const moralOptions = strings(moralRaw.options);
  const moral: StoryMoralChoice | null =
    str(moralRaw.question) && moralOptions.length >= 2 && num(moralRaw.correctIndex, 0) < moralOptions.length
      ? { question: text(moralRaw.question), options: moralOptions, correctIndex: num(moralRaw.correctIndex, 0) }
      : null;

  const difficulty = DIFFICULTIES.find((d) => d === extras.difficulty) ?? 'easy';
  const words = texts.join(' ').split(/\s+/).length;

  return {
    id: text(row.slug),
    title,
    summary,
    relatedStarId: ctx.starNumber(row.star_id) ?? 0,
    gradient,
    coverEmoji,
    minutes: typeof row.duration_minutes === 'number' ? row.duration_minutes : Math.max(1, Math.ceil(words / 120)),
    xpReward: num(row.xp_reward, 0),
    difficulty,
    pages: texts.map((t, i) => ({
      text: t,
      emoji: str(extraPages[i]?.emoji) ?? coverEmoji,
      gradient: pair(extraPages[i]?.gradient) ?? (extraPages.length > 0 ? gradient : PAGE_GRADIENTS[i % PAGE_GRADIENTS.length]),
    })),
    sequenceEvents: sequence.length >= 2 ? sequence : [],
    quiz,
    moral,
    badgeEmoji: str(extras.badge_emoji) ?? '⭐',
    badgeTitle: str(extras.badge_title) ?? 'Story Star',
    moralText: str(field(row, over, 'moral')),
    takeaway: str(field(row, over, 'takeaway')),
    coverImageUrl: ctx.media(row.cover_media_id),
    narrationUrl: ctx.media(row.narration_media_id),
    backgroundImageUrl: ctx.media(row.background_media_id),
  };
}

export function mapDua(row: Row, ctx: MapContext): Dua {
  const over = ctx.overlay('dua', row.id);
  const extras = rec(row.extras);
  const arabic = text(row.arabic_text);
  const transliteration = text(row.transliteration);
  const translation = field(row, over, 'translation');

  let repeatSegments = strings(extras.repeat_segments);
  let arabicSegments = strings(extras.arabic_segments);
  if (repeatSegments.length === 0 || repeatSegments.length !== arabicSegments.length) {
    repeatSegments = [transliteration || arabic];
    arabicSegments = [arabic];
  }
  const conceptEmojis = strings(extras.concept_emojis);
  const conceptLabels = strings(extras.concept_labels);
  const conceptCount = Math.min(conceptEmojis.length, conceptLabels.length);

  return {
    id: text(row.slug),
    title: field(row, over, 'name'),
    arabic,
    transliteration,
    translation,
    xpReward: num(row.xp_reward, 0),
    repeatSegments,
    arabicSegments,
    meaningEmoji: str(extras.meaning_emoji) ?? '🤲',
    meaningExplainer: str(field(row, over, 'explanation')) ?? translation,
    conceptEmojis: conceptEmojis.slice(0, conceptCount),
    conceptLabels: conceptLabels.slice(0, conceptCount),
    audioUrl: ctx.media(row.audio_media_id) ?? null,
    reciterName: str(extras.reciter_name) ?? null,
    category: ctx.categorySlug(row.category_id) ?? 'daily',
  };
}

export function mapQuizQuestion(row: Row, quiz: Row, ctx: MapContext): CmsQuizQuestion | null {
  const over = ctx.overlay('quiz_question', row.id);
  const baseOptions = strings(row.options);
  const translated = strings(over.options);
  const options = translated.length === baseOptions.length ? translated : baseOptions;
  const correctIndex = num(row.correct_index, 0);
  const prompt = field(row, over, 'prompt');
  if (!prompt || options.length < 2 || correctIndex >= options.length) return null;
  return {
    id: text(row.id),
    question: prompt,
    options,
    correctIndex,
    explanation: field(row, over, 'explanation'),
    xpReward: typeof row.points === 'number' ? row.points : num(quiz.points_per_question, 10),
    quizSlug: text(quiz.slug),
    sortOrder: num(row.sort_order, 0),
  };
}

export function mapStarOverride(row: Row, ctx: MapContext): StarOverride {
  const over = ctx.overlay('star', row.id);
  return {
    number: num(row.number, 0),
    name: str(field(row, over, 'name')),
    honorific: str(field(row, over, 'title')),
    lessonTitle: str(field(row, over, 'qualities')?.split('\n')[0]?.trim()),
    lessonSummary: str(field(row, over, 'description')),
    imageUrl: ctx.media(row.image_media_id),
  };
}

export function mapDailyStar(row: Row, ctx: MapContext): CmsDailyStar {
  const over = ctx.overlay('daily_star', row.id);
  return {
    id: text(row.id),
    date: text(row.scheduled_date).slice(0, 10),
    title: field(row, over, 'title'),
    shortStory: richTextToPlain(field(row, over, 'short_story')),
    lesson: field(row, over, 'lesson'),
    takeaway: field(row, over, 'takeaway'),
    minutes: typeof row.duration_minutes === 'number' ? row.duration_minutes : null,
    coverImageUrl: ctx.media(row.cover_media_id),
    audioUrl: ctx.media(row.audio_media_id),
  };
}

export function mapGoodDeed(row: Row, ctx: MapContext): CmsGoodDeed {
  const over = ctx.overlay('good_deed', row.id);
  return {
    id: text(row.id),
    title: field(row, over, 'title'),
    description: field(row, over, 'description'),
    emoji: str(row.icon_emoji) ?? '🌟',
    iconUrl: ctx.media(row.icon_media_id),
    points: num(row.points, 0),
  };
}

export function mapReflection(row: Row, ctx: MapContext): CmsReflection {
  const over = ctx.overlay('reflection', row.id);
  return {
    id: text(row.id),
    question: field(row, over, 'question'),
    description: field(row, over, 'description'),
    imageUrl: ctx.media(row.image_media_id),
    audioUrl: ctx.media(row.audio_media_id),
  };
}

export function mapWisdom(row: Row, ctx: MapContext): CmsWisdom {
  const over = ctx.overlay('wisdom', row.id);
  return {
    id: text(row.id),
    title: field(row, over, 'title'),
    text: field(row, over, 'wisdom_text'),
    arabic: text(row.arabic_text),
    translation: field(row, over, 'translation'),
    explanation: field(row, over, 'explanation'),
    imageUrl: ctx.media(row.image_media_id),
    audioUrl: ctx.media(row.audio_media_id),
  };
}

const CHOICE_TYPES = new Set(['multiple_choice', 'quiz', 'story_choice', 'good_deed_challenge', 'true_false']);
const DEFAULT_EMOJI = '✨';

function labelOf(base: unknown, translated: unknown): { emoji: string; label: string } {
  const b = rec(base);
  const label = typeof translated === 'string' ? translated : str(rec(translated).label);
  return { emoji: str(b.emoji) ?? DEFAULT_EMOJI, label: label ?? text(b.label) };
}

/** Builds the engine definition for one CMS game, or null when it has nothing playable. */
export function mapGame(row: Row, questions: Row[], ctx: MapContext): CmsGame | null {
  const id = text(row.id);
  const over = ctx.overlay('game', id);
  const cfg = rec(row.config);
  const type = text(row.game_type);
  const title = field(row, over, 'name');
  const description = field(row, over, 'description');
  const qs = questions.filter((q) => q.game_id === row.id).sort((a, b) => num(a.sort_order, 0) - num(b.sort_order, 0));
  const ofType = (t: string) =>
    qs
      .filter((q) => q.question_type === t)
      .map((q) => ({ p: rec(q.payload), t: rec(ctx.overlay('game_question', q.id)) }));

  const base = {
    starId: ctx.starNumber(row.star_id) ?? 0,
    title,
    intro: str(field(row, over, 'instructions')) ?? (description || 'Let’s play!'),
    icon: '🎮',
    xpReward: Math.min(num(row.reward_points, MAX_CMS_GAME_XP), MAX_CMS_GAME_XP),
    badgeTitle: str(cfg.badge_title) ?? 'Game Star',
    closing: str(cfg.closing) ?? 'Great job! You finished the game.',
  };

  let definition: StarGameDefinition | null = null;
  let emoji = str(cfg.emoji);

  if (CHOICE_TYPES.has(type)) {
    const rounds: StarChoiceGame['rounds'] = ofType('choice')
      .map(({ p, t }) => {
        const translatedOptions = list(t.options);
        const options = list(p.options).map((o, i) => labelOf(o, translatedOptions[i]));
        return {
          prompt: str(t.prompt) ?? text(p.prompt),
          emoji: str(p.emoji),
          options,
          correctIndex: num(p.correct_index, 0),
          explanation: str(t.explanation) ?? text(p.explanation),
        };
      })
      .filter((r) => r.prompt && r.options.length >= 2 && r.correctIndex < r.options.length);
    if (rounds.length > 0) definition = { ...base, kind: 'choice', rounds };
    emoji ??= '🧩';
  } else if (type === 'matching' || type === 'memory') {
    const pairs = ofType('pair').map(({ p, t }) => ({
      left: labelOf(p.left, t.left),
      right: labelOf(p.right, t.right),
    }));
    if (pairs.length >= 2) definition = { ...base, kind: 'match', pairs };
    emoji ??= '🃏';
  } else if (type === 'sequence') {
    const steps = ofType('step').map(({ p, t }) => labelOf(p, t.label));
    if (steps.length >= 2) {
      definition = { ...base, kind: 'order', prompt: str(over.prompt) ?? str(cfg.prompt) ?? 'Put the steps in the right order.', steps };
    }
    emoji ??= '🔢';
  } else if (type === 'drag_drop') {
    const cfgBuckets = list(over.buckets).length === 2 ? list(over.buckets) : list(cfg.buckets);
    const buckets = [0, 1].map((i) => {
      const b = rec(cfgBuckets[i]);
      return { emoji: str(b.emoji) ?? (i === 0 ? '👍' : '👎'), label: str(b.label) ?? (i === 0 ? 'Good' : 'Not good') };
    }) as [{ emoji: string; label: string }, { emoji: string; label: string }];
    const items: StarGameSortItem[] = ofType('sort_item').map(({ p, t }) => ({
      ...labelOf(p, t.label),
      bucket: num(p.bucket, 0) === 1 ? 1 : 0,
    }));
    if (items.length > 0) {
      definition = { ...base, kind: 'sort', prompt: str(over.prompt) ?? str(cfg.prompt) ?? 'Sort each one into the right group.', buckets, items };
    }
    emoji ??= '🗂️';
  }

  if (!definition) return null;
  definition.icon = emoji ?? '🎮';
  return {
    id,
    name: title,
    description,
    gameType: type,
    emoji: definition.icon,
    thumbnailUrl: ctx.media(row.thumbnail_media_id),
    rewardPoints: definition.xpReward,
    definition,
  };
}

const VOICE_KEYS: Record<keyof CharacterAudioSet, string> = {
  welcome: 'voice_welcome',
  story: 'voice_story',
  dua: 'voice_dua',
  game: 'voice_game',
  learning: 'voice_learning',
};

export function mapCharacters(characters: Row[], assets: Row[], ctx: MapContext): CmsCharacter[] {
  return characters.map((c) => {
    const own = assets.filter((a) => a.character_id === c.id);
    const fallback = ctx.media(c.voice_media_id);
    const audio: Partial<CharacterAudioSet> = {};
    (Object.keys(VOICE_KEYS) as (keyof CharacterAudioSet)[]).forEach((line) => {
      const asset = own.find((a) => a.asset_key === VOICE_KEYS[line]);
      const url = (asset ? ctx.media(asset.media_id) : undefined) ?? fallback;
      if (url) audio[line] = url;
    });
    return { slug: text(c.slug), mainImageUrl: ctx.media(c.main_media_id), audio };
  });
}

export type { QuizQuestion };
