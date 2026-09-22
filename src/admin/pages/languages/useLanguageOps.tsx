import { type ReactNode, useState } from 'react';

import { ConfirmDialog } from '../../components/ui';
import { type Language, useLookups } from '../../lib/data';
import { db, friendlyError, unwrap } from '../../lib/db';
import { useToast } from '../../lib/toast';

interface Ops {
  busy: boolean;
  toggleEnabled: (lang: Language, enabled: boolean) => Promise<void>;
  requestDefault: (lang: Language) => void;
  requestDelete: (lang: Language) => Promise<void>;
  dialogs: ReactNode;
}

/** Shared rules for the Languages page and the compact block in Settings. */
export function useLanguageOps(): Ops {
  const toast = useToast();
  const { languages, reload } = useLookups();
  const [busy, setBusy] = useState(false);
  const [defaultTarget, setDefaultTarget] = useState<Language | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ lang: Language; translations: number } | null>(null);
  const [alsoTranslations, setAlsoTranslations] = useState(false);

  const run = async (work: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await work();
      await reload();
      toast.success(success);
    } catch (e) {
      toast.error(friendlyError(e));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (lang: Language, enabled: boolean) => {
    if (lang.is_default && !enabled) {
      toast.error('The default language cannot be disabled. Make another language the default first.');
      return;
    }
    await run(async () => {
      await unwrap(db().from('languages').update({ is_enabled: enabled }).eq('code', lang.code).select('code').single());
    }, `${lang.name} ${enabled ? 'enabled' : 'disabled'}.`);
  };

  const confirmDefault = async () => {
    const next = defaultTarget;
    if (!next) return;
    const old = languages.find((l) => l.is_default);
    await run(async () => {
      // A unique partial index allows a single default, so the old one must be unset first.
      if (old) await unwrap(db().from('languages').update({ is_default: false }).eq('code', old.code).select('code').single());
      try {
        await unwrap(db().from('languages').update({ is_default: true, is_enabled: true }).eq('code', next.code).select('code').single());
      } catch (e) {
        if (old) await db().from('languages').update({ is_default: true }).eq('code', old.code);
        throw e;
      }
    }, `${next.name} is now the default language.`);
    setDefaultTarget(null);
  };

  const requestDelete = async (lang: Language) => {
    if (lang.is_default) {
      toast.error('The default language cannot be deleted. Make another language the default first.');
      return;
    }
    setBusy(true);
    try {
      const { count, error } = await db().from('content_translations').select('id', { count: 'exact', head: true }).eq('language_code', lang.code);
      if (error) throw error;
      setAlsoTranslations(false);
      setDeleteTarget({ lang, translations: count ?? 0 });
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { lang, translations } = deleteTarget;
    await run(async () => {
      if (translations > 0) await unwrap(db().from('content_translations').delete().eq('language_code', lang.code));
      const { data, error } = await db().from('languages').delete().eq('code', lang.code).select('code');
      if (error) throw error;
      if (!data?.length) throw { code: '42501', message: 'permission denied' };
    }, `${lang.name} deleted.`);
    setDeleteTarget(null);
  };

  const oldDefault = languages.find((l) => l.is_default);
  const dialogs = (
    <>
      <ConfirmDialog
        open={Boolean(defaultTarget)}
        title={`Make ${defaultTarget?.name ?? ''} the default language?`}
        confirmLabel="Change default"
        loading={busy}
        onConfirm={() => void confirmDefault()}
        onCancel={() => setDefaultTarget(null)}
        message={
          <>
            <p>
              Base content columns (story titles, du’a text and so on) hold the <strong>default</strong> language text. After this change every existing item will be treated as{' '}
              <strong>{defaultTarget?.name}</strong>, even though it is currently written in {oldDefault?.name ?? 'the current default'}.
            </p>
            <p className="muted" style={{ marginTop: 8 }}>
              Existing {oldDefault?.name ?? 'current-default'} text is not translated or moved. Only change this if the content really is written in {defaultTarget?.name}.
            </p>
          </>
        }
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        danger
        title={`Delete ${deleteTarget?.lang.name ?? 'language'}?`}
        confirmLabel={deleteTarget && deleteTarget.translations > 0 ? 'Delete language and translations' : 'Delete language'}
        loading={busy}
        onConfirm={() => {
          if (deleteTarget && deleteTarget.translations > 0 && !alsoTranslations) {
            toast.error('Tick the box to confirm deleting the translations too.');
            return;
          }
          void confirmDelete();
        }}
        onCancel={() => setDeleteTarget(null)}
        message={
          deleteTarget && deleteTarget.translations > 0 ? (
            <>
              <p>
                <strong>{deleteTarget.translations}</strong> translation{deleteTarget.translations === 1 ? '' : 's'} exist{deleteTarget.translations === 1 ? 's' : ''} in {deleteTarget.lang.name}. Deleting the language permanently removes them.
              </p>
              <label className="row gap-sm" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={alsoTranslations} onChange={(e) => setAlsoTranslations(e.target.checked)} />
                <span>Delete translations too</span>
              </label>
            </>
          ) : (
            <>This language has no translations. Deleting it cannot be undone.</>
          )
        }
      />
    </>
  );

  return { busy, toggleEnabled, requestDefault: setDefaultTarget, requestDelete, dialogs };
}
