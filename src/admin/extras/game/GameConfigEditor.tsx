import { useEffect, useState } from 'react';

import { Button, Field, Spinner } from '../../components/ui';
import { db, friendlyError, loadTranslations, type Row, saveTranslations, unwrap } from '../../lib/db';
import { useToast } from '../../lib/toast';
import { ErrorList, LangTabs, useLangTabs } from '../shared';

import { EmojiInput } from './ItemFields';
import { type ConfigText, configTrFromFields } from './model';

interface Base {
  intro: string;
  badge_title: string;
  closing: string;
  icon: string;
  prompt: string;
  buckets: [{ emoji: string; label: string }, { emoji: string; label: string }];
}

const s = (v: unknown) => (typeof v === 'string' ? v : '');

function toBase(c: Row): Base {
  const b = Array.isArray(c.buckets) ? c.buckets : [];
  const bk = (i: number) => ({ emoji: s(b[i]?.emoji), label: s(b[i]?.label) });
  return { intro: s(c.intro), badge_title: s(c.badge_title), closing: s(c.closing), icon: s(c.icon), prompt: s(c.prompt), buckets: [bk(0), bk(1)] };
}

const blankTr = (): ConfigText => ({ intro: '', badge_title: '', closing: '', prompt: '', buckets: ['', ''] });

/** Game-level settings live in games.config; unknown keys are preserved by merging into the freshly read value. */
export default function GameConfigEditor({ gameId, gameType, onSaved }: { gameId: string; gameType: string; onSaved: (config: Row) => void }) {
  const toast = useToast();
  const langs = useLangTabs();
  const dragDrop = gameType === 'drag_drop';
  const [lang, setLang] = useState(langs.defaultLanguage);
  const [base, setBase] = useState<Base | null>(null);
  const [tr, setTr] = useState<Record<string, ConfigText>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([unwrap<Row>(db().from('games').select('config').eq('id', gameId).single()), loadTranslations('game', gameId)])
      .then(([game, map]) => {
        if (cancelled) return;
        const config = (game.config ?? {}) as Row;
        setBase(toBase(config));
        setTr(Object.fromEntries(langs.extra.map((l) => [l.code, configTrFromFields(map[l.code])])));
        onSaved(config);
      })
      .catch((e) => !cancelled && setLoadError(friendlyError(e, 'Could not load the game settings.')));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, langs.extra.map((l) => l.code).join(',')]);

  if (loadError) return <p className="error">{loadError}</p>;
  if (!base) return <Spinner label="Loading game settings…" />;

  const isBase = lang === langs.defaultLanguage;
  const t = tr[lang] ?? blankTr();
  const dir = isBase ? undefined : langs.dir(lang);
  const editBase = (patch: Partial<Base>) => {
    setBase({ ...base, ...patch });
    setDirty(true);
    setErrors([]);
  };
  const editTr = (patch: Partial<ConfigText>) => {
    setTr({ ...tr, [lang]: { ...t, ...patch } });
    setDirty(true);
  };
  const text = (key: 'intro' | 'badge_title' | 'closing' | 'prompt', label: string, help: string, rows = 2) => (
    <Field label={label} help={help}>
      <textarea className="input" rows={rows} dir={dir} value={isBase ? base[key] : t[key]} placeholder={isBase ? '' : base[key]} onChange={(e) => (isBase ? editBase({ [key]: e.target.value }) : editTr({ [key]: e.target.value }))} aria-label={label} />
    </Field>
  );

  async function save() {
    const b = base!;
    const errs: string[] = [];
    if (dragDrop && b.buckets.some((x) => !x.label.trim())) errs.push('Both buckets need a label.');
    if (dragDrop && b.buckets[0].label.trim().toLowerCase() === b.buckets[1].label.trim().toLowerCase() && b.buckets[0].label.trim()) errs.push('The two buckets must have different labels.');
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    try {
      const game = await unwrap<Row>(db().from('games').select('config').eq('id', gameId).single());
      const config: Row = { ...((game.config ?? {}) as Row) };
      const put = (k: string, v: string) => {
        if (v.trim()) config[k] = v.trim();
        else delete config[k];
      };
      put('intro', b.intro);
      put('badge_title', b.badge_title);
      put('closing', b.closing);
      put('icon', b.icon);
      if (dragDrop) {
        put('prompt', b.prompt);
        config.buckets = b.buckets.map((x) => ({ emoji: x.emoji.trim(), label: x.label.trim() }));
      }
      await unwrap(db().from('games').update({ config }).eq('id', gameId).select('id').single());

      // Merge into each language's existing row: the game's own translated name/description share it.
      const existing = await loadTranslations('game', gameId);
      const map: Record<string, Record<string, unknown>> = {};
      for (const l of langs.extra) {
        const x = tr[l.code] ?? blankTr();
        const fields = { ...(existing[l.code] ?? {}) };
        const cfg: Row = typeof fields.config === 'object' && fields.config ? { ...(fields.config as Row) } : {};
        const putT = (k: string, v: string) => {
          if (v.trim()) cfg[k] = v.trim();
          else delete cfg[k];
        };
        putT('intro', x.intro);
        putT('badge_title', x.badge_title);
        putT('closing', x.closing);
        if (dragDrop) {
          putT('prompt', x.prompt);
          if (x.buckets.some((v) => v.trim())) cfg.buckets = x.buckets.map((label) => ({ label: label.trim() }));
          else delete cfg.buckets;
        }
        if (Object.keys(cfg).length) fields.config = cfg;
        else delete fields.config;
        map[l.code] = fields;
      }
      await saveTranslations('game', gameId, map);
      setDirty(false);
      onSaved(config);
      toast.success('Game settings saved.');
    } catch (e) {
      setErrors([friendlyError(e, 'Could not save the game settings.')]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ex-config">
      <div className="row gap-sm wrap" style={{ justifyContent: 'space-between' }}>
        <strong>Game settings</strong>
        <LangTabs value={lang} onChange={setLang} />
      </div>
      {isBase ? (
        <Field label="Icon (emoji)">
          <EmojiInput value={base.icon} onChange={(icon) => editBase({ icon })} label="Game icon emoji" />
        </Field>
      ) : null}
      {text('intro', 'Intro text', 'Shown before the game starts.')}
      {text('badge_title', 'Badge title', 'Name of the badge a child earns for finishing.', 1)}
      {text('closing', 'Closing line', 'A kind, encouraging line shown at the end.')}
      {dragDrop ? (
        <>
          {text('prompt', 'Sorting prompt', 'The instruction shown above the buckets, e.g. “Which is a good deed?”.')}
          <div className="ex-cols">
            {[0, 1].map((i) => (
              <Field key={i} label={`Bucket ${i + 1}`} required>
                <div className="ex-opt">
                  {isBase ? <EmojiInput value={base.buckets[i].emoji} onChange={(emoji) => editBase({ buckets: (i === 0 ? [{ ...base.buckets[0], emoji }, base.buckets[1]] : [base.buckets[0], { ...base.buckets[1], emoji }]) as Base['buckets'] })} label={`Bucket ${i + 1} emoji`} /> : <span className="ex-big-emoji">{base.buckets[i].emoji}</span>}
                  <input
                    className="input"
                    dir={dir}
                    value={isBase ? base.buckets[i].label : t.buckets[i]}
                    placeholder={isBase ? `Bucket ${i + 1} label` : base.buckets[i].label}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (isBase) editBase({ buckets: (i === 0 ? [{ ...base.buckets[0], label: v }, base.buckets[1]] : [base.buckets[0], { ...base.buckets[1], label: v }]) as Base['buckets'] });
                      else editTr({ buckets: (i === 0 ? [v, t.buckets[1]] : [t.buckets[0], v]) as [string, string] });
                    }}
                    aria-label={`Bucket ${i + 1} label`}
                  />
                </div>
              </Field>
            ))}
          </div>
        </>
      ) : null}
      <ErrorList errors={errors} />
      <div>
        <Button variant="primary" onClick={save} loading={saving} disabled={!dirty && !saving}>
          Save game settings
        </Button>
      </div>
    </div>
  );
}
