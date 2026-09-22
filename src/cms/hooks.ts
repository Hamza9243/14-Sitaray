import { useCallback, useMemo } from 'react';
import type { TextStyle } from 'react-native';

import { characterForGender, type CharacterDefinition } from '@/data/characters';
import type { Dua, QuizQuestion, StarDefinition, Story } from '@/types/content';

import { useCmsStore } from './cmsStore';
import { localDateString, pickSnapshot, selectDuas, selectQuizQuestions, selectStars, selectStories } from './selectors';
import type { CmsCharacter, CmsDailyStar, CmsGame, CmsGoodDeed, CmsReflection, CmsWisdom, LanguageInfo } from './types';

const EMPTY: never[] = [];

export const useStories = (): Story[] => useCmsStore((s) => selectStories(pickSnapshot(s)));
export const useDuas = (): Dua[] => useCmsStore((s) => selectDuas(pickSnapshot(s)));
export const useQuizQuestions = (): QuizQuestion[] => useCmsStore((s) => selectQuizQuestions(pickSnapshot(s)));
export const useStars = (): StarDefinition[] => useCmsStore((s) => selectStars(pickSnapshot(s)));

export const useGoodDeeds = (): CmsGoodDeed[] => useCmsStore((s) => pickSnapshot(s)?.goodDeeds ?? EMPTY);
export const useReflections = (): CmsReflection[] => useCmsStore((s) => pickSnapshot(s)?.reflections ?? EMPTY);
export const useWisdom = (): CmsWisdom[] => useCmsStore((s) => pickSnapshot(s)?.wisdom ?? EMPTY);
export const useCmsGames = (): CmsGame[] => useCmsStore((s) => pickSnapshot(s)?.games ?? EMPTY);
export const useCharacterAssets = (): CmsCharacter[] => useCmsStore((s) => pickSnapshot(s)?.characters ?? EMPTY);

export function useCmsGame(id: string | undefined): CmsGame | undefined {
  const games = useCmsGames();
  return games.find((g) => g.id === id);
}

/** The daily star scheduled for today's local date, if one is published. */
export function useDailyStar(): CmsDailyStar | null {
  const dailyStars = useCmsStore((s) => pickSnapshot(s)?.dailyStars ?? EMPTY) as CmsDailyStar[];
  const today = localDateString();
  return useMemo(() => dailyStars.find((d) => d.date === today) ?? null, [dailyStars, today]);
}

/** Ali / Sakina with any CMS voice lines and portrait laid over the bundled definition. */
export function useCharacter(gender: 'boy' | 'girl' | null): CharacterDefinition {
  const base = characterForGender(gender);
  const cms = useCmsStore((s) => pickSnapshot(s)?.characters.find((c) => c.slug === base.id));
  return useMemo(
    () => (cms ? { ...base, imageUrl: cms.mainImageUrl, audio: { ...base.audio, ...cms.audio } } : base),
    [base, cms]
  );
}

export const useLanguages = (): LanguageInfo[] => useCmsStore((s) => s.languages);

const RTL_CODES = new Set(['ur', 'fa', 'ar', 'he', 'ps', 'sd']);

export function useIsRtl(): boolean {
  return useCmsStore((s) => {
    const direction = s.languages.find((l) => l.code === s.language)?.direction;
    return (direction ?? (RTL_CODES.has(s.language) ? 'rtl' : 'ltr')) === 'rtl';
  });
}

const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}]/u;
const RTL_STYLE: TextStyle = { writingDirection: 'rtl', textAlign: 'right' };

/**
 * Style for CMS text: right-to-left in an rtl language, but only when the text really is in an rtl script
 * (an untranslated English field falling back inside an Urdu session keeps its natural direction).
 */
export function useDirStyle(): (text: string) => TextStyle | undefined {
  const rtl = useIsRtl();
  return useCallback((text: string) => (rtl && RTL_SCRIPT.test(text) ? RTL_STYLE : undefined), [rtl]);
}

const SPEECH_LANGS: Record<string, string> = { en: 'en-US', ur: 'ur-PK', fa: 'fa-IR', ar: 'ar-SA' };

/** Device text-to-speech locale for the active app language. */
export function useSpeechLanguage(): string {
  return useCmsStore((s) => SPEECH_LANGS[s.language] ?? 'en-US');
}
