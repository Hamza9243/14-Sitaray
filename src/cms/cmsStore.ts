import { create } from 'zustand';

import { isSupabaseConfigured, supabaseUrl } from '@/lib/supabase';

import { FALLBACK_LANGUAGES, fetchCmsContent } from './contentService';
import type { CmsSnapshot, LanguageInfo } from './types';

const CACHE_KEY = '14stars-cms-cache-v1';

interface CacheShape {
  url: string;
  languages: LanguageInfo[];
  snapshots: Record<string, CmsSnapshot>;
}

interface CmsState {
  language: string;
  languages: LanguageInfo[];
  /** Last successful download per language — stale-while-revalidate, also mirrored to localStorage. */
  snapshots: Record<string, CmsSnapshot>;
  setLanguage: (language: string) => void;
}

function readCache(): Partial<CacheShape> {
  if (!isSupabaseConfigured) return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CacheShape) : null;
    return parsed && parsed.url === supabaseUrl ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(state: CmsState) {
  try {
    const cache: CacheShape = { url: supabaseUrl, languages: state.languages, snapshots: state.snapshots };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage unavailable or full — the in-memory snapshot still works.
  }
}

const cached = readCache();

export const useCmsStore = create<CmsState>()((set) => ({
  language: 'en',
  languages: cached.languages ?? FALLBACK_LANGUAGES,
  snapshots: cached.snapshots ?? {},
  setLanguage: (language) => set({ language }),
}));

let inFlight: Promise<void> | null = null;
let rerun = false;

/** Downloads fresh content for the active language. One at a time; a failure keeps the previous snapshot. */
export function refreshCms(): Promise<void> {
  if (!isSupabaseConfigured) return Promise.resolve();
  if (inFlight) {
    rerun = true;
    return inFlight;
  }
  inFlight = (async () => {
    do {
      rerun = false;
      const language = useCmsStore.getState().language;
      try {
        const result = await fetchCmsContent(language);
        if (result) {
          useCmsStore.setState((s) => ({
            languages: result.languages.length > 0 ? result.languages : s.languages,
            snapshots: { ...s.snapshots, [language]: result.snapshot },
          }));
          writeCache(useCmsStore.getState());
        }
      } catch {
        // offline / slow / server error: keep whatever we already have.
      }
    } while (rerun);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

let started = false;

/** First call: refreshes now and again whenever the browser comes back online. Returns false once already running. */
export function startCmsSync(): boolean {
  if (started || !isSupabaseConfigured) return false;
  started = true;
  window.addEventListener('online', () => void refreshCms());
  void refreshCms();
  return true;
}
