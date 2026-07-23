export interface StarDefinition {
  /** 1-14, fixed — the app has exactly 14 Stars, never more. */
  id: number;
  name: string;
  /** Honorific shown small beneath the name, e.g. "Peace be upon him". */
  honorific: string;
  lessonTitle: string;
  lessonSummary: string;
  unlockRequirement: string;
  /** XP threshold cumulative XP must reach for this star to unlock. */
  xpThreshold: number;
  rewardLabel: string;
  gradient: readonly [string, string, string] | readonly [string, string];
}

export interface Dua {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  xpReward: number;
  /** Transliteration split into "repeat after me" chunks (1 chunk for short duas, 2-3 for longer ones). */
  repeatSegments: string[];
  /** Arabic-script equivalent of repeatSegments, same break points — this is the primary script shown/spoken in the lesson. */
  arabicSegments: string[];
  /** A single illustrative emoji for the "what does it mean" card. */
  meaningEmoji: string;
  /** One kid-friendly sentence explaining the meaning, simpler than the literal translation. */
  meaningExplainer: string;
  /** 2-3 emoji representing sub-concepts of the meaning, paired with conceptLabels for the matching challenge. */
  conceptEmojis: string[];
  conceptLabels: string[];
  /**
   * URL to a real reciter's MP3 recitation of `arabic`. `null` until an authentic recording is
   * uploaded — the player shows a "coming soon" state rather than falling back to AI TTS.
   */
  audioUrl: string | null;
  /** Name of the reciter credited for `audioUrl`, shown next to the player. `null` while audioUrl is unset. */
  reciterName: string | null;
  /** Grouping used for browsing/filtering, e.g. 'daily', 'food', 'sleep', 'family', 'learning'. */
  category: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

export type StoryDifficulty = 'easy' | 'medium' | 'hard';

export interface StoryPage {
  text: string;
  /** Symbolic/abstract illustration anchor for the page — emoji only, never a figurative depiction of the Ma'sumeen. */
  emoji: string;
  gradient: readonly [string, string];
}

export interface StoryQuizQuestion {
  id: string;
  question: string;
  /** Optional big emoji shown above the question — used for the "image-based question" beat. */
  emoji?: string;
  options: string[];
  correctIndex: number;
}

export interface StoryMoralChoice {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  relatedStarId: number;
  gradient: readonly [string, string];
  /** Cover emoji shown large on the story card and reader intro. */
  coverEmoji: string;
  minutes: number;
  xpReward: number;
  difficulty: StoryDifficulty;
  /** Page-by-page storybook content, narrated + highlighted in the reader. */
  pages: StoryPage[];
  /** Story beats in correct chronological order — shuffled at runtime for the "arrange in order" activity. */
  sequenceEvents: string[];
  /** 3-5 question quick quiz shown after the story. */
  quiz: StoryQuizQuestion[];
  /** "Choose the correct moral" challenge. */
  moral: StoryMoralChoice;
  badgeEmoji: string;
  badgeTitle: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Condition key checked against store state to determine if earned. */
  kind: 'dua' | 'quiz' | 'story' | 'streak' | 'star' | 'journey' | 'game';
  threshold: number;
}
