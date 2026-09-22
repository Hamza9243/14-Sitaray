/** Admin route segment for each content table (used to deep-link from usage lists, logs, dashboards). */
export const TABLE_TO_ROUTE: Record<string, string> = {
  stories: 'stories',
  duas: 'duas',
  games: 'games',
  audio: 'audio',
  daily_stars: 'daily-star',
  quizzes: 'quizzes',
  good_deeds: 'good-deeds',
  reflections: 'reflections',
  wisdom: 'wisdom',
  characters: 'characters',
  stars: 'stars',
  categories: 'categories',
};

/** Route for a record, or null when it has no editor page (e.g. media, settings). */
export function entityRoute(table: string, id?: string | null): string | null {
  const segment = TABLE_TO_ROUTE[table];
  if (!segment) {
    if (table === 'media') return '/admin/media';
    if (table === 'languages') return '/admin/languages';
    if (table === 'admin_users') return '/admin/users';
    if (table === 'app_settings') return '/admin/settings';
    return null;
  }
  return id ? `/admin/${segment}/${id}` : `/admin/${segment}`;
}

/** Human label for a table name, e.g. 'good_deeds' -> 'Good deed'. */
export const TABLE_LABEL: Record<string, string> = {
  stories: 'Story',
  story_scenes: 'Story scene',
  duas: 'Du’a',
  games: 'Game',
  game_questions: 'Game question',
  audio: 'Audio',
  daily_stars: 'Daily Star',
  quizzes: 'Quiz',
  quiz_questions: 'Quiz question',
  good_deeds: 'Good deed',
  reflections: 'Reflection',
  wisdom: 'Wisdom',
  characters: 'Character',
  stars: 'Star',
  categories: 'Category',
  media: 'Media file',
  languages: 'Language',
  app_settings: 'Setting',
  admin_users: 'Admin',
};
