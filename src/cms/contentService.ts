import { getPublicClient, storagePublicUrl } from '@/lib/supabase';

import {
  mapCharacters,
  mapDailyStar,
  mapDua,
  mapGame,
  mapGoodDeed,
  mapQuizQuestion,
  mapReflection,
  mapStarOverride,
  mapStory,
  mapWisdom,
  type MapContext,
  type Row,
} from './mappers';
import type { CmsSnapshot, LanguageInfo } from './types';

const TIMEOUT_MS = 8000;
const PAGE = 1000;
const MEDIA_CHUNK = 100;

export const FALLBACK_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl' },
  { code: 'fa', name: 'Farsi', nativeName: 'فارسی', direction: 'rtl' },
];

export interface FetchResult {
  languages: LanguageInfo[];
  snapshot: CmsSnapshot;
}

function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

type Query = { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }> };

/** Reads every row of a query, a page at a time (the API caps a single response at ~1000 rows). */
async function fetchAll(build: () => Query): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await withTimeout(build().range(from, from + PAGE - 1));
    if (error) throw error;
    const page = (data as Row[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const byOrder = (a: Row, b: Row) =>
  Number(a.display_order ?? 0) - Number(b.display_order ?? 0) || String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));

function collectMediaIds(...tables: Row[][]): string[] {
  const ids = new Set<string>();
  for (const rows of tables) {
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        if ((key === 'media_id' || key.endsWith('_media_id')) && typeof value === 'string') ids.add(value);
      }
    }
  }
  return [...ids];
}

/** Downloads everything the child app shows from the CMS, already mapped into the app's own types. */
export async function fetchCmsContent(language: string): Promise<FetchResult | null> {
  const client = getPublicClient();
  if (!client) return null;
  const from = (table: string, key = 'id') => client.from(table).select('*').order(key) as unknown as Query;

  const [languageRows, stars, stories, duas, quizzes, quizQuestions, goodDeeds, reflections, wisdom, games, gameQuestions, categories, characters, characterAssets, dailyResult] =
    await Promise.all([
      fetchAll(() => from('languages', 'code')),
      fetchAll(() => from('stars')),
      fetchAll(() => from('stories')),
      fetchAll(() => from('duas')),
      fetchAll(() => from('quizzes')),
      fetchAll(() => from('quiz_questions')),
      fetchAll(() => from('good_deeds')),
      fetchAll(() => from('reflections')),
      fetchAll(() => from('wisdom')),
      fetchAll(() => from('games')),
      fetchAll(() => from('game_questions')),
      fetchAll(() => from('categories')),
      fetchAll(() => from('characters')),
      fetchAll(() => from('character_assets')),
      withTimeout(client.from('daily_stars').select('*').order('scheduled_date', { ascending: false }).limit(60)),
    ]);
  if (dailyResult.error) throw dailyResult.error;
  const dailyStars = (dailyResult.data as Row[] | null) ?? [];

  const languages: LanguageInfo[] = languageRows
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((l) => ({
      code: String(l.code),
      name: String(l.name),
      nativeName: String(l.native_name ?? l.name),
      direction: l.direction === 'rtl' ? 'rtl' : 'ltr',
    }));
  const defaultCode = languageRows.find((l) => l.is_default === true)?.code ?? 'en';

  const overlays = new Map<string, Row>();
  if (language !== defaultCode) {
    const translations = await fetchAll(
      () => client.from('content_translations').select('*').eq('language_code', language).order('id') as unknown as Query
    );
    for (const t of translations) overlays.set(`${t.content_type}:${t.content_id}`, (t.fields as Row) ?? {});
  }

  const mediaIds = collectMediaIds(stars, stories, duas, goodDeeds, reflections, wisdom, games, dailyStars, characters, characterAssets);
  const media = new Map<string, string>();
  for (let i = 0; i < mediaIds.length; i += MEDIA_CHUNK) {
    const { data, error } = await withTimeout(
      client.from('media').select('id,bucket,path,mime_type,kind').in('id', mediaIds.slice(i, i + MEDIA_CHUNK))
    );
    if (error) throw error;
    for (const m of (data as Row[] | null) ?? []) media.set(String(m.id), storagePublicUrl(String(m.bucket), String(m.path)));
  }

  const starNumbers = new Map(stars.map((s) => [String(s.id), Number(s.number)]));
  const categorySlugs = new Map(categories.map((c) => [String(c.id), String(c.slug)]));
  const ctx: MapContext = {
    media: (id) => (typeof id === 'string' ? media.get(id) : undefined),
    overlay: (type, id) => overlays.get(`${type}:${id}`) ?? {},
    starNumber: (id) => (typeof id === 'string' ? starNumbers.get(id) : undefined),
    categorySlug: (id) => (typeof id === 'string' ? categorySlugs.get(id) : undefined),
  };

  const quizById = new Map(quizzes.map((q) => [String(q.id), q]));
  const orderedQuizzes = [...quizzes].sort(byOrder);
  const quizOrder = new Map(orderedQuizzes.map((q, i) => [String(q.id), i]));

  const snapshot: CmsSnapshot = {
    language,
    fetchedAt: Date.now(),
    stories: [...stories].sort(byOrder).map((r) => mapStory(r, ctx)),
    duas: [...duas].sort(byOrder).map((r) => mapDua(r, ctx)),
    quizQuestions: quizQuestions
      .filter((q) => quizById.has(String(q.quiz_id)))
      .sort(
        (a, b) =>
          (quizOrder.get(String(a.quiz_id)) ?? 0) - (quizOrder.get(String(b.quiz_id)) ?? 0) ||
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
      )
      .flatMap((q) => mapQuizQuestion(q, quizById.get(String(q.quiz_id))!, ctx) ?? []),
    stars: stars.map((r) => mapStarOverride(r, ctx)),
    dailyStars: dailyStars.map((r) => mapDailyStar(r, ctx)),
    goodDeeds: [...goodDeeds].sort(byOrder).map((r) => mapGoodDeed(r, ctx)),
    reflections: [...reflections].sort(byOrder).map((r) => mapReflection(r, ctx)),
    wisdom: [...wisdom].sort(byOrder).map((r) => mapWisdom(r, ctx)),
    games: [...games].sort(byOrder).flatMap((r) => mapGame(r, gameQuestions, ctx) ?? []),
    characters: mapCharacters(characters, characterAssets, ctx),
  };

  return { languages, snapshot };
}
