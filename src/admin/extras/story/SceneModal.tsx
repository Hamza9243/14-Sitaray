import { useEffect, useState } from 'react';

import { MediaField } from '../../components/MediaField';
import { Button, Field, Modal, Spinner } from '../../components/ui';
import { useLookups } from '../../lib/data';
import { db, friendlyError, loadTranslations, type Row, saveTranslations, unwrap } from '../../lib/db';
import { useToast } from '../../lib/toast';
import { ErrorList, LangTabs, useLangTabs } from '../shared';

export const POSITIONS = ['left', 'center', 'right'] as const;
export const EXPRESSIONS = ['happy', 'sad', 'thinking', 'surprised', 'neutral'] as const;
export const ANIMATIONS = ['idle', 'talking', 'none'] as const;
export const TRANSITIONS = ['none', 'fade', 'slide', 'zoom'] as const;

interface Draft {
  name: string;
  text: string;
  background_media_id: string | null;
  character_id: string | null;
  character_position: string;
  character_expression: string;
  animation: string;
  animation_media_id: string | null;
  audio_media_id: string | null;
  duration_seconds: string;
  transition: string;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

interface Props {
  storyId: string;
  row: Row | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (row: Row) => void;
}

export default function SceneModal({ storyId, row, nextOrder, onClose, onSaved }: Props) {
  const toast = useToast();
  const langs = useLangTabs();
  const { characters } = useLookups();
  const [lang, setLang] = useState(langs.defaultLanguage);
  const [draft, setDraft] = useState<Draft>(() => ({
    name: row?.name ?? `Scene ${nextOrder + 1}`,
    text: row?.text ?? '',
    background_media_id: row?.background_media_id ?? null,
    character_id: row?.character_id ?? null,
    character_position: row?.character_position ?? 'center',
    character_expression: row?.character_expression ?? 'happy',
    animation: row?.animation ?? 'idle',
    animation_media_id: row?.animation_media_id ?? null,
    audio_media_id: row?.audio_media_id ?? null,
    duration_seconds: String(row?.duration_seconds ?? 6),
    transition: row?.transition ?? 'fade',
  }));
  const [tr, setTr] = useState<Record<string, string>>({});
  const [loadingTr, setLoadingTr] = useState(!!row && langs.extra.length > 0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!row || langs.extra.length === 0) return undefined;
    let cancelled = false;
    loadTranslations('story_scene', row.id)
      .then((map) => !cancelled && setTr(Object.fromEntries(langs.extra.map((l) => [l.code, String((map[l.code] as { text?: string } | undefined)?.text ?? '')]))))
      .catch((e) => !cancelled && toast.error(friendlyError(e, 'Could not load translations.')))
      .finally(() => !cancelled && setLoadingTr(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors([]);
  };
  const isBase = lang === langs.defaultLanguage;

  async function save() {
    const errs: string[] = [];
    const duration = Number(draft.duration_seconds);
    if (!draft.name.trim()) errs.push('Give the scene a name.');
    if (!draft.duration_seconds.trim() || !Number.isFinite(duration) || duration <= 0) errs.push('Duration must be a number of seconds greater than 0.');
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    try {
      const values = {
        name: draft.name.trim(),
        text: draft.text.trim() || null,
        background_media_id: draft.background_media_id,
        character_id: draft.character_id,
        character_position: draft.character_position,
        character_expression: draft.character_expression,
        animation: draft.animation,
        animation_media_id: draft.animation_media_id,
        audio_media_id: draft.audio_media_id,
        duration_seconds: duration,
        transition: draft.transition,
      };
      const saved = row
        ? await unwrap<Row>(db().from('story_scenes').update(values).eq('id', row.id).select().single())
        : await unwrap<Row>(db().from('story_scenes').insert({ ...values, story_id: storyId, scene_order: nextOrder }).select().single());
      try {
        await saveTranslations('story_scene', saved.id, Object.fromEntries(langs.extra.map((l) => [l.code, { text: (tr[l.code] ?? '').trim() }])));
        toast.success(row ? 'Scene updated.' : 'Scene added.');
      } catch (e) {
        toast.error(`Scene saved, but translations failed: ${friendlyError(e)}`);
      }
      onSaved(saved);
    } catch (e) {
      setErrors([friendlyError(e, 'Could not save the scene.')]);
    } finally {
      setSaving(false);
    }
  }

  const sel = (label: string, key: keyof Draft, options: readonly string[]) => (
    <Field label={label}>
      <select className="select" value={draft[key] ?? ''} onChange={(e) => set({ [key]: e.target.value })} aria-label={label}>
        {options.map((o) => (
          <option key={o} value={o}>
            {cap(o)}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <Modal
      open
      wide
      title={row ? 'Edit scene' : 'Add scene'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={loadingTr}>
            {row ? 'Save scene' : 'Add scene'}
          </Button>
        </>
      }
    >
      {loadingTr ? (
        <Spinner label="Loading…" />
      ) : (
        <div className="ex-form">
          <div className="ex-cols">
            <div className="ex-form">
              <Field label="Scene name" required>
                <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} aria-label="Scene name" />
              </Field>
              <LangTabs value={lang} onChange={setLang} />
              <Field label="Narration text" help={isBase ? undefined : 'Leave empty to fall back to the default language.'}>
                <textarea
                  className="input"
                  rows={5}
                  dir={isBase ? undefined : langs.dir(lang)}
                  value={isBase ? draft.text : (tr[lang] ?? '')}
                  placeholder={isBase ? '' : draft.text}
                  onChange={(e) => (isBase ? set({ text: e.target.value }) : setTr((prev) => ({ ...prev, [lang]: e.target.value })))}
                  aria-label="Scene text"
                />
              </Field>
              <div className="ex-cols">
                <Field label="Character">
                  <select className="select" value={draft.character_id ?? ''} onChange={(e) => set({ character_id: e.target.value || null })} aria-label="Character">
                    <option value="">No character</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {sel('Position', 'character_position', POSITIONS)}
                {sel('Expression', 'character_expression', EXPRESSIONS)}
                {sel('Animation', 'animation', ANIMATIONS)}
                {sel('Transition', 'transition', TRANSITIONS)}
                <Field label="Duration (seconds)" required help={note ?? undefined}>
                  <input className="input" inputMode="decimal" value={draft.duration_seconds} onChange={(e) => set({ duration_seconds: e.target.value })} aria-label="Duration in seconds" />
                </Field>
              </div>
            </div>
            <div className="ex-form">
              <Field label="Background image">
                <MediaField value={draft.background_media_id} kinds={['image']} folder="stories" onChange={(id) => set({ background_media_id: id })} />
              </Field>
              <Field label="Narration audio">
                <MediaField
                  value={draft.audio_media_id}
                  kinds={['audio']}
                  folder="stories"
                  onChange={(id, media) => {
                    set({ audio_media_id: id, ...(media?.duration_seconds ? { duration_seconds: String(Math.ceil(media.duration_seconds)) } : {}) });
                    setNote(media?.duration_seconds ? 'Set from the audio length. You can change it.' : null);
                  }}
                />
              </Field>
              <Field label="Character animation file (optional)" help="Lottie, GIF or video used instead of the still character.">
                <MediaField value={draft.animation_media_id} kinds={['animation', 'video']} folder="stories" onChange={(id) => set({ animation_media_id: id })} />
              </Field>
            </div>
          </div>
          <ErrorList errors={errors} />
        </div>
      )}
    </Modal>
  );
}
