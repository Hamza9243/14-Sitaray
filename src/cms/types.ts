import type { CharacterAudioSet } from '@/data/characters';
import type { Dua, QuizQuestion, Story } from '@/types/content';
import type { StarGameDefinition } from '@/types/games';

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export interface StarOverride {
  number: number;
  name?: string;
  honorific?: string;
  lessonTitle?: string;
  lessonSummary?: string;
  imageUrl?: string;
}

/** A quiz question plus where it came from, so the legacy bundled quiz can be matched by position. */
export interface CmsQuizQuestion extends QuizQuestion {
  quizSlug: string;
  sortOrder: number;
}

export interface CmsDailyStar {
  id: string;
  date: string;
  title: string;
  shortStory: string;
  lesson: string;
  takeaway: string;
  minutes: number | null;
  coverImageUrl?: string;
  audioUrl?: string;
}

export interface CmsGoodDeed {
  id: string;
  title: string;
  description: string;
  emoji: string;
  iconUrl?: string;
  points: number;
}

export interface CmsReflection {
  id: string;
  question: string;
  description: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface CmsWisdom {
  id: string;
  title: string;
  text: string;
  arabic: string;
  translation: string;
  explanation: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface CmsGame {
  id: string;
  name: string;
  description: string;
  gameType: string;
  emoji: string;
  thumbnailUrl?: string;
  rewardPoints: number;
  definition: StarGameDefinition;
}

export interface CmsCharacter {
  slug: string;
  mainImageUrl?: string;
  audio: Partial<CharacterAudioSet>;
}

export interface CmsSnapshot {
  language: string;
  fetchedAt: number;
  stories: Story[];
  duas: Dua[];
  quizQuestions: CmsQuizQuestion[];
  stars: StarOverride[];
  dailyStars: CmsDailyStar[];
  goodDeeds: CmsGoodDeed[];
  reflections: CmsReflection[];
  wisdom: CmsWisdom[];
  games: CmsGame[];
  characters: CmsCharacter[];
}
