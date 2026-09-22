import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getDuaById, getQuizQuestionById, getStars, getStoryById } from '@/cms/selectors';
import { ACHIEVEMENTS, QUIZ_QUESTIONS, STARS } from '@/data';
import type { ReminderActivityType } from '@/data/characters';
import { IMAM_ALI_HUB } from '@/data/games/imamAli';
import { KINDNESS_MISSIONS, KINDNESS_MISSIONS_GAME_ID } from '@/data/games/kindnessMissions';
import { localHHMM, nextOccurrence } from '@/lib/time';

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

export type ReminderStatus = 'pending' | 'completed' | 'dismissed';

export interface Reminder {
  id: number;
  type: ReminderActivityType;
  title: string;
  /** ISO datetime string — when the character should "call". */
  scheduledAt: string;
  enabled: boolean;
  /** Repeats every day at the same clock time — rolled forward by rollDailyReminders once it has fired. */
  daily?: boolean;
  status: ReminderStatus;
  createdAt: string;
}

interface AppState {
  childName: string;
  /** Unset until the parent picks one in Profile — drives Ali/Sakina character selection. */
  childGender: 'boy' | 'girl' | null;
  childAge: number | null;
  /** False until the Welcome screen has been completed (or skipped) once. */
  hasOnboarded: boolean;
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
  /** Character Call Reminders — parent-created, deliver a fake incoming call from Ali/Sakina. */
  reminders: Reminder[];
  nextReminderId: number;
  /** Individual Kindness Mission completions, keyed `${gameId}:${missionId}` — XP is awarded once per key. */
  completedMissionIds: string[];
  /** Resumable quiz position: the question to show next, and how many were answered correctly so far. */
  quizProgress: { currentIndex: number; correctCount: number };
  /** Content language code — CMS text is fetched in this language, falling back to English per field. */
  language: string;
  /** Good deeds (from the CMS) the child has ticked off — local only, never awards XP. */
  completedDeedIds: string[];
  hasHydrated: boolean;
  journeyCelebrationShown: boolean;

  setLanguage: (language: string) => void;
  toggleDeed: (id: string) => void;
  setChildName: (name: string) => void;
  setChildGender: (gender: 'boy' | 'girl') => void;
  setChildAge: (age: number | null) => void;
  /** Saves the Welcome-screen profile and marks onboarding done. */
  completeOnboarding: (profile: { name: string; age: number | null; gender: 'boy' | 'girl' | null }) => void;
  /** Moves every enabled daily reminder that has fired (or been missed) to its next occurrence. Returns those changed. */
  rollDailyReminders: () => Reminder[];
  /** Creates a reminder. Its caller (Ali/Sakina) is never stored — it's derived from childGender at display/call time. */
  addReminder: (input: { type: ReminderActivityType; title: string; scheduledAt: string; enabled?: boolean; daily?: boolean }) => Reminder;
  updateReminder: (id: number, patch: Partial<Pick<Reminder, 'type' | 'title' | 'scheduledAt' | 'enabled'>>) => void;
  deleteReminder: (id: number) => void;
  setReminderStatus: (id: number, status: ReminderStatus) => void;
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
  completeActivity: (
    hubId: string,
    activityId: string,
    score: number
  ) => { alreadyDone: boolean; xpGained: number; certificateEarned: boolean };
  /** Awards a Kindness Mission's XP the first time only (persisted per mission). */
  completeMission: (gameId: string, missionId: string, xp: number) => { xpGained: number; alreadyDone: boolean };
  /** Marks a standalone Star game complete and awards its XP exactly once. */
  completeStarGame: (gameId: string, xp: number) => { xpGained: number; alreadyDone: boolean };
  setQuizProgress: (currentIndex: number, correctCount: number) => void;
  resetQuizProgress: () => void;
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
      childGender: null,
      childAge: null,
      hasOnboarded: false,
      reminders: [],
      nextReminderId: 1,
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
      completedMissionIds: [],
      quizProgress: { currentIndex: 0, correctCount: 0 },
      language: 'en',
      completedDeedIds: [],
      hasHydrated: false,
      journeyCelebrationShown: false,

      setLanguage: (language) => set({ language }),
      toggleDeed: (id) => {
        const { completedDeedIds } = get();
        set({ completedDeedIds: completedDeedIds.includes(id) ? completedDeedIds.filter((d) => d !== id) : [...completedDeedIds, id] });
      },
      setChildName: (name) => set({ childName: name }),
      setChildGender: (gender) => set({ childGender: gender }),
      setChildAge: (age) => set({ childAge: age }),

      completeOnboarding: ({ name, age, gender }) => {
        const trimmed = name.trim();
        set((state) => ({
          childName: trimmed || state.childName,
          childAge: age,
          childGender: gender ?? state.childGender,
          hasOnboarded: true,
        }));
      },

      rollDailyReminders: () => {
        const now = new Date();
        const changed: Reminder[] = [];
        const next = get().reminders.map((r) => {
          if (!r.daily || !r.enabled) return r;
          const fired = new Date(r.scheduledAt).getTime() <= now.getTime();
          if (!fired && r.status === 'pending') return r;
          const rolled: Reminder = {
            ...r,
            scheduledAt: nextOccurrence(localHHMM(r.scheduledAt), now).toISOString(),
            status: 'pending',
          };
          changed.push(rolled);
          return rolled;
        });
        if (changed.length > 0) set({ reminders: next });
        return changed;
      },

      addReminder: (input) => {
        const { reminders, nextReminderId } = get();
        const reminder: Reminder = {
          id: nextReminderId,
          type: input.type,
          title: input.title,
          scheduledAt: input.scheduledAt,
          enabled: input.enabled ?? true,
          daily: input.daily ?? false,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        set({ reminders: [...reminders, reminder], nextReminderId: nextReminderId + 1 });
        return reminder;
      },

      updateReminder: (id, patch) => {
        const { reminders } = get();
        set({ reminders: reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
      },

      deleteReminder: (id) => {
        const { reminders } = get();
        set({ reminders: reminders.filter((r) => r.id !== id) });
      },

      setReminderStatus: (id, status) => {
        const { reminders } = get();
        set({ reminders: reminders.map((r) => (r.id === id ? { ...r, status } : r)) });
      },
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
        const dua = getDuaById(id);
        const reward = dua?.xpReward ?? 0;
        set({ completedDuaIds: [...completedDuaIds, id], xp: xp + reward });
        return { xpGained: reward, alreadyDone: false };
      },

      answerQuizCorrect: (id) => {
        const { completedQuizIds, xp } = get();
        if (completedQuizIds.includes(id)) return { xpGained: 0, alreadyDone: true };
        const question = getQuizQuestionById(id);
        const reward = question?.xpReward ?? 0;
        set({ completedQuizIds: [...completedQuizIds, id], xp: xp + reward });
        return { xpGained: reward, alreadyDone: false };
      },

      completeStory: (id) => {
        const { completedStoryIds, xp } = get();
        if (completedStoryIds.includes(id)) return { xpGained: 0, alreadyDone: true };
        const story = getStoryById(id);
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
        const { activityCompletions, xp } = get();
        const key = `${hubId}:${activityId}`;
        if (activityCompletions[key]) return { alreadyDone: true, xpGained: 0, certificateEarned: false };

        const hub = hubId === IMAM_ALI_HUB.id ? IMAM_ALI_HUB : null;
        const reward = hub?.activities.find((a) => a.id === activityId)?.xpReward ?? 0;
        const nextCompletions = {
          ...activityCompletions,
          [key]: { score, completedAt: new Date().toISOString() },
        };
        set({ activityCompletions: nextCompletions, xp: xp + reward });

        let certificateEarned = false;
        if (hub) {
          const done = getCompletedActivityIds(nextCompletions, hubId);
          if (hub.activities.every((a) => done.includes(a.id))) {
            certificateEarned = !get().earnCertificate(hubId, get().childName).alreadyDone;
          }
        }
        return { alreadyDone: false, xpGained: reward, certificateEarned };
      },

      completeMission: (gameId, missionId, xpAmount) => {
        const { completedMissionIds, xp } = get();
        const key = `${gameId}:${missionId}`;
        if (completedMissionIds.includes(key)) return { xpGained: 0, alreadyDone: true };
        set({ completedMissionIds: [...completedMissionIds, key], xp: xp + xpAmount });
        return { xpGained: xpAmount, alreadyDone: false };
      },

      completeStarGame: (gameId, xpAmount) => {
        const { completedGameIds, xp } = get();
        if (completedGameIds.includes(gameId)) return { xpGained: 0, alreadyDone: true };
        set({ completedGameIds: [...completedGameIds, gameId], xp: xp + xpAmount });
        return { xpGained: xpAmount, alreadyDone: false };
      },

      setQuizProgress: (currentIndex, correctCount) => set({ quizProgress: { currentIndex, correctCount } }),
      resetQuizProgress: () => set({ quizProgress: { currentIndex: 0, correctCount: 0 } }),

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
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          // Reminders used to store a fixed `character`; it's now derived from childGender.
          const reminders = Array.isArray(state.reminders) ? (state.reminders as Record<string, unknown>[]) : [];
          state.reminders = reminders.map((r) => {
            const copy = { ...r };
            delete copy.character;
            return copy;
          });

          // Kindness Missions used to re-award XP on every replay. Anyone who already finished the game
          // has been paid for every mission, so mark them all done rather than letting them earn again.
          const completedGameIds = Array.isArray(state.completedGameIds) ? (state.completedGameIds as string[]) : [];
          if (completedGameIds.includes(KINDNESS_MISSIONS_GAME_ID)) {
            state.completedMissionIds = KINDNESS_MISSIONS.missions.map((m) => `${KINDNESS_MISSIONS_GAME_ID}:${m.id}`);
          }

          // Quiz progress didn't exist: resume after the leading run of already-answered questions.
          const answered = Array.isArray(state.completedQuizIds) ? (state.completedQuizIds as string[]) : [];
          let index = 0;
          while (index < QUIZ_QUESTIONS.length && answered.includes(QUIZ_QUESTIONS[index].id)) index += 1;
          state.quizProgress = { currentIndex: index, correctCount: index };
        }
        if (version < 3) {
          // Anyone who already has progress or a profile has effectively onboarded — don't show them Welcome.
          const hasName = typeof state.childName === 'string' && state.childName !== 'Little Star';
          const hasProgress = typeof state.xp === 'number' && state.xp > 0;
          const hasReminders = Array.isArray(state.reminders) && state.reminders.length > 0;
          state.hasOnboarded = hasName || hasProgress || hasReminders;
        }
        if (version < 4) {
          state.language = typeof state.language === 'string' ? state.language : 'en';
          state.completedDeedIds = Array.isArray(state.completedDeedIds) ? state.completedDeedIds : [];
        }
        return state as unknown as AppState;
      },
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
  return getStars().find((star) => xp < star.xpThreshold) ?? null;
}

/** Stars whose XP threshold sits between two XP values — used to trigger unlock celebrations. */
export function getNewlyUnlockedStars(previousXp: number, currentXp: number) {
  return getStars().filter((star) => previousXp < star.xpThreshold && currentXp >= star.xpThreshold);
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
  certificates: Record<string, unknown>;
}): string[] {
  const unlockedCount = getUnlockedStarIds(state.xp).length;
  const starGamesDone = state.completedGameIds.filter((id) => id.startsWith('star-game-')).length;

  return ACHIEVEMENTS.filter((achievement) => {
    switch (achievement.kind) {
      case 'dua':
        return state.completedDuaIds.length >= achievement.threshold;
      case 'quiz':
        return state.completedQuizIds.length >= achievement.threshold;
      case 'story':
        return state.completedStoryIds.length >= achievement.threshold;
      case 'game':
        return achievement.refId ? state.completedGameIds.includes(achievement.refId) : false;
      case 'starGames':
        return starGamesDone >= achievement.threshold;
      case 'certificate':
        return achievement.refId ? Boolean(state.certificates[achievement.refId]) : false;
      case 'streak':
        return state.streakCount >= achievement.threshold;
      case 'star':
      case 'journey':
        return unlockedCount >= achievement.threshold;
      default:
        return false;
    }
  }).map((achievement) => achievement.id);
}
