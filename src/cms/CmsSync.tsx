import { useEffect } from 'react';

import { useAppStore } from '@/hooks/useAppStore';

import { refreshCms, startCmsSync, useCmsStore } from './cmsStore';

/** Keeps the CMS content in step with the child's language: refetches on start and whenever it changes. */
export function CmsSync() {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    if (!hasHydrated) return;
    const changed = useCmsStore.getState().language !== language;
    useCmsStore.getState().setLanguage(language);
    if (!startCmsSync() && changed) void refreshCms();
  }, [hasHydrated, language]);

  return null;
}
