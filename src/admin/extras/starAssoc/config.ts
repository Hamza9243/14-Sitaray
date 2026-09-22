export interface AssocType {
  type: string;
  table: string;
  titleField: string;
  label: string;
  plural: string;
}

export const ASSOC_TYPES: AssocType[] = [
  { type: 'story', table: 'stories', titleField: 'title', label: 'Story', plural: 'Stories' },
  { type: 'game', table: 'games', titleField: 'name', label: 'Game', plural: 'Games' },
  { type: 'audio', table: 'audio', titleField: 'name', label: 'Audio', plural: 'Audio' },
  { type: 'dua', table: 'duas', titleField: 'name', label: 'Du’a', plural: 'Du’as' },
  { type: 'quiz', table: 'quizzes', titleField: 'title', label: 'Quiz', plural: 'Quizzes' },
  { type: 'good_deed', table: 'good_deeds', titleField: 'title', label: 'Good deed', plural: 'Good deeds' },
  { type: 'reflection', table: 'reflections', titleField: 'question', label: 'Reflection', plural: 'Reflections' },
  { type: 'wisdom', table: 'wisdom', titleField: 'title', label: 'Wisdom', plural: 'Wisdom' },
];

export const ASSOC_BY_TYPE: Record<string, AssocType> = Object.fromEntries(ASSOC_TYPES.map((t) => [t.type, t]));
