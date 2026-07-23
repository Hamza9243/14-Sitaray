import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ACHIEVEMENTS, DUAS, QUIZ_QUESTIONS, STARS, STORIES } from '@/data';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export interface StoryProgressEntry {
  lastPageIndex: number;
  quizScore: number | null;
  sequenceDone: boolean;
  moralDone: boolean;
  completedAt: string | null;
}

const DEFAULT_STORY_PROGRESS: StoryProgressEntry = {
  lastPageIndex: 0,
  quizScore: null,
  sequenceDone: false,
  moralDone: false,
  completedAt: null,
};

interface AppState {
  childName: string;
  xp: number;
  streakCount: number;
  lastOpenedDate: string | null;
  openedDates: string[];
  completedDuaIds: string[];
  completedQuizIds: string[];
  completedStoryIds: string[];
  favoriteDuaIds: string[];
  completedGameIds: string[];
  /** Per-activity completion within a multi-activity game hub, keyed by `${hubId}:${activityId}`. */
  activityCompletions: Record<string, { score: number; completedAt: string }>;
  /** Earned certificates, keyed by hub id (one per Ma'sumeen game hub). */
  certificates: Record<string, { childName: string; earnedAt: string }>;
  /** Per-story reader progress — resumable page position + quiz/activity beats, keyed by story id. */
  storyProgress: Record<string, StoryProgressEntry>;
  hasHydrated: boolean;
  journeyCelebrationShown: boolean;

  setChildName: (name: string) => void;
  recordAppOpen: () => void;
  toggleFavoriteDua: (id: string) => void;
  completeDua: (id: string) => { xpGained: number; alreadyDone: boolean };
  answerQuizCorrect: (id: string) => { xpGained: number; alreadyDone: boolean };
  completeStory: (id: string) => { xpGained: number; alreadyDone: boolean };
  /** Generic XP award for mini-game mission rewards. */
  addXp: (amount: number) => void;
  /** Marks a mini-game's completion badge as earned. Idempotent — no XP here, missions award XP as they're completed. */
  completeGame: (id: string) => { alreadyDone: boolean };
  /** Marks one activity within a hub (e.g. Imam Ali's 8 activities) as complete. Idempotent. */
  completeActivity: (hubId: string, activityId: string, score: number) => { alreadyDone: boolean };
  /** Records the certificate earned once every activity in a hub is complete. Idempotent — never regenerated. */
  earnCertificate: (hubId: string, childName: string) => { alreadyDone: boolean };
  /** Saves the last page read in a story, so the reader can resume there next time. */
  updateStoryPage: (id: string, pageIndex: number) => void;
  recordStoryQuiz: (id: string, score: number) => void;
  recordStorySequence: (id: string) => void;
  recordStoryMoral: (id: string) => void;
  markJourneyCelebrationShown: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      childName: 'Little Star',
      xp: 0,
      streakCount: 0,
      lastOpenedDate: null,
      openedDates: [],
      completedDuaIds: [],
      completedQuizIds: [],
      completedStoryIds: [],
      favoriteDuaIds: [],
      completedGameIds: [],
      activityCompletions: {},
      certificates: {},
      storyProgress: {},
      hasHydrated: false,
      journeyCelebrationShown: false,

      setChildName: (name) => set({ childName: name }),
      markJourneyCelebrationShown: () => set({ journeyCelebrationShown: true }),
      toggleFavoriteDua: (id) => {
        const { favoriteDuaIds } = get();
        set({
          favoriteDuaIds: favoriteDuaIds.includes(id)
            ? favoriteDuaIds.filter((existing) => existing !== id)
            : [...favoriteDuaIds, id],
        });
      },

      recordAppOpen: () => {
        const today = todayString();
        const { lastOpenedDate, streakCount, openedDates } = get();

        if (lastOpenedDate === today) return;

        const nextStreak = lastOpenedDate && daysBetween(lastOpenedDate, today) === 1 ? streakCount + 1 : 1;
        const nextOpenedDates = [...openedDates, today].slice(-60);
        set({ streakCount: nextStreak, lastOpenedDate: today, openedDates: nextOpenedDates });
      },

      completeDua: (id) => {
        const { completedDuaIds, xp } = get();
        if (completedDuaIds.includes(id)) return { xpGained: 0, alreadyDone: true };
        const dua = DUAS.find((d) => d.id === id);
        const reward = dua?.xpReward ?? 0;
        set({ completedDuaIds: [...completedDuaIds, id], xp: xp + reward });
        return { xpGained: reward, alreadyDone: false };
      },

      answerQuizCorrect: (id) => {
        const { completedQuizIds, xp } = get();
        if (completedQuizIds.includes(id)) return { xpGained: 0, alreadyDone: true };
        const question = QUIZ_QUESTIONS.find((q) => q.id === id);
        const reward = question?.xpReward ?? 0;
        set({ completedQuizIds: [...completedQuizIds, id], xp: xp + reward });
        return { xpGained: reward, alreadyDone: false };
      },

      completeStory: (id) => {
        const { completedStoryIds, xp } = get();
        if (completedStoryIds.includes(id)) return { xpGained: 0, alreadyDone: true };
        const story = STORIES.find((s) => s.id === id);
        const reward = story?.xpReward ?? 0;
        set({ completedStoryIds: [...completedStoryIds, id], xp: xp + reward });
        return { xpGained: reward, alreadyDone: false };
      },

      addXp: (amount) => set((state) => ({ xp: state.xp + amount })),

      completeGame: (id) => {
        const { completedGameIds } = get();
        if (completedGameIds.includes(id)) return { alreadyDone: true };
        set({ completedGameIds: [...completedGameIds, id] });
        return { alreadyDone: false };
      },

      completeActivity: (hubId, activityId, score) => {
        const { activityCompletions } = get();
        const key = `${hubId}:${activityId}`;
        if (activityCompletions[key]) return { alreadyDone: true };
        set({
          activityCompletions: {
            ...activityCompletions,
            [key]: { score, completedAt: new Date().toISOString() },
          },
        });
        return { alreadyDone: false };
      },

      earnCertificate: (hubId, childName) => {
        const { certificates } = get();
        if (certificates[hubId]) return { alreadyDone: true };
        set({
          certificates: {
            ...certificates,
            [hubId]: { childName, earnedAt: new Date().toISOString() },
          },
        });
        return { alreadyDone: false };
      },

      updateStoryPage: (id, pageIndex) => {
        const { storyProgress } = get();
        const existing = storyProgress[id] ?? DEFAULT_STORY_PROGRESS;
        set({ storyProgress: { ...storyProgress, [id]: { ...existing, lastPageIndex: pageIndex } } });
      },

      recordStoryQuiz: (id, score) => {
        const { storyProgress } = get();
        const existing = storyProgress[id] ?? DEFAULT_STORY_PROGRESS;
        set({ storyProgress: { ...storyProgress, [id]: { ...existing, quizScore: score } } });
      },

      recordStorySequence: (id) => {
        const { storyProgress } = get();
        const existing = storyProgress[id] ?? DEFAULT_STORY_PROGRESS;
        set({ storyProgress: { ...storyProgress, [id]: { ...existing, sequenceDone: true } } });
      },

      recordStoryMoral: (id) => {
        const { storyProgress } = get();
        const existing = storyProgress[id] ?? DEFAULT_STORY_PROGRESS;
        set({
          storyProgress: {
            ...storyProgress,
            [id]: { ...existing, moralDone: true, completedAt: new Date().toISOString() },
          },
        });
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: '14stars-app-state',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function getUnlockedStarIds(xp: number): number[] {
  return STARS.filter((star) => xp >= star.xpThreshold).map((star) => star.id);
}

export function getNextStar(xp: number) {
  return STARS.find((star) => xp < star.xpThreshold) ?? null;
}

/** Stars whose XP threshold sits between two XP values — used to trigger unlock celebrations. */
export function getNewlyUnlockedStars(previousXp: number, currentXp: number) {
  return STARS.filter((star) => previousXp < star.xpThreshold && currentXp >= star.xpThreshold);
}

/** Completed activity ids for one game hub, derived from the `${hubId}:${activityId}` keyed record. */
export function getCompletedActivityIds(
  activityCompletions: Record<string, { score: number; completedAt: string }>,
  hubId: string
): string[] {
  const prefix = `${hubId}:`;
  return Object.keys(activityCompletions)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}

/** Reads one story's progress, falling back to the untouched default (never started). */
export function getStoryProgress(storyProgress: Record<string, StoryProgressEntry>, storyId: string): StoryProgressEntry {
  return storyProgress[storyId] ?? DEFAULT_STORY_PROGRESS;
}

/** 0-1 completion fraction across the whole reader flow (pages -> quiz -> sequence -> moral), for the story card progress bar. */
export function getStoryProgressFraction(pageCount: number, progress: StoryProgressEntry): number {
  if (progress.completedAt) return 1;
  if (progress.moralDone) return 0.95;
  if (progress.sequenceDone) return 0.85;
  if (progress.quizScore !== null) return 0.7;
  if (pageCount <= 0) return 0;
  return Math.min(0.65, (progress.lastPageIndex / pageCount) * 0.65);
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Last 7 calendar days ending today, for the streak calendar strip. */
export function getLast7DaysStatus(openedDates: string[]) {
  const days: { date: string; label: string; opened: boolean; isToday: boolean }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      label: DAY_LABELS[d.getDay()],
      opened: openedDates.includes(dateStr),
      isToday: i === 0,
    });
  }

  return days;
}

export function getEarnedAchievementIds(state: {
  xp: number;
  streakCount: number;
  completedDuaIds: string[];
  completedQuizIds: string[];
  completedStoryIds: string[];
  completedGameIds: string[];
}): string[] {
  const unlockedCount = getUnlockedStarIds(state.xp).length;

  return ACHIEVEMENTS.filter((achievement) => {
    switch (achievement.kind) {
      case 'dua':
        return state.completedDuaIds.length >= achievement.threshold;
      case 'quiz':
        return state.completedQuizIds.length >= achievement.threshold;
      case 'story':
        return state.completedStoryIds.length >= achievement.threshold;
      case 'game':
        return state.completedGameIds.length >= achievement.threshold;
      case 'streak':
        return state.streakCount >= achievement.threshold;
      case 'star':
        return unlockedCount >= achievement.threshold;
      case 'journey':
        return unlockedCount >= achievement.threshold;
      default:
        return false;
    }
  }).map((achievement) => achievement.id);
}
