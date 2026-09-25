import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { db, type Row } from './db';
import { DEFAULT_LIMITS, type UploadLimits } from './media';

export interface Language {
  code: string;
  name: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
  is_enabled: boolean;
  is_default: boolean;
  sort_order: number;
}

interface LookupsValue {
  loaded: boolean;
  stars: Row[];
  categories: Row[];
  languages: Language[];
  characters: Row[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- app_settings values are per-key jsonb blobs.
  settings: Record<string, any>;
  limits: UploadLimits;
  defaultLanguage: string;
  /** Enabled languages other than the default — the ones stored as translations. */
  extraLanguages: Language[];
  starName: (id: string | null | undefined) => string;
  categoryName: (id: string | null | undefined) => string;
  reload: () => Promise<void>;
}

const LookupsContext = createContext<LookupsValue | null>(null);

/** Small reference tables every editor needs (stars, categories, languages, characters, settings). */
export function LookupsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Pick<LookupsValue, 'stars' | 'categories' | 'languages' | 'characters' | 'settings'>>({
    stars: [],
    categories: [],
    languages: [],
    characters: [],
    settings: {},
  });
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const client = db();
    const [stars, categories, languages, characters, settings] = await Promise.all([
      client.from('stars').select('id,number,name,slug,status').is('deleted_at', null).order('number'),
      client.from('categories').select('id,slug,name,scopes,is_enabled,display_order').is('deleted_at', null).order('display_order').order('name'),
      client.from('languages').select('*').order('sort_order'),
      client.from('characters').select('id,slug,name,gender').is('deleted_at', null).order('display_order'),
      client.from('app_settings').select('key,value'),
    ]);
    setState({
      stars: (stars.data ?? []) as Row[],
      categories: (categories.data ?? []) as Row[],
      languages: (languages.data ?? []) as Language[],
      characters: (characters.data ?? []) as Row[],
      settings: Object.fromEntries(((settings.data ?? []) as Row[]).map((r) => [r.key, r.value])),
    });
    setLoaded(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<LookupsValue>(() => {
    const defaultLanguage = state.languages.find((l) => l.is_default)?.code ?? 'en';
    return {
      loaded,
      ...state,
      limits: { ...DEFAULT_LIMITS, ...(state.settings.upload_limits ?? {}) },
      defaultLanguage,
      extraLanguages: state.languages.filter((l) => l.is_enabled && !l.is_default),
      starName: (id) => {
        const s = state.stars.find((x) => x.id === id);
        return s ? `${s.number}. ${s.name}` : '—';
      },
      categoryName: (id) => state.categories.find((c) => c.id === id)?.name ?? '—',
      reload,
    };
  }, [loaded, state, reload]);

  return <LookupsContext.Provider value={value}>{children}</LookupsContext.Provider>;
}

export function useLookups(): LookupsValue {
  const ctx = useContext(LookupsContext);
  if (!ctx) throw new Error('useLookups must be used inside <LookupsProvider>');
  return ctx;
}
