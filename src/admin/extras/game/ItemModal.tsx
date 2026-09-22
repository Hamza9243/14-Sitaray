import { useEffect, useState } from 'react';

import { Button, Modal, Spinner, Switch } from '../../components/ui';
import { db, friendlyError, loadTranslations, type Row, saveTranslations, unwrap } from '../../lib/db';
import { useToast } from '../../lib/toast';
import { ErrorList, LangTabs, useLangTabs } from '../shared';

import { ChoiceFields, LabelFields, PairFields } from './ItemFields';
import ItemPreview from './ItemPreview';
import { blankPayload, cleanPayload, emptyTr, normalizePayload, type Payload, type QType, TYPE_NOUN, trFromFields, type TrDraft, trToFields, validatePayload } from './model';

interface Props {
  gameId: string;
  gameType: string;
  type: QType;
  row: Row | null;
  nextOrder: number;
  bucketLabels: [string, string];
  onClose: () => void;
  onSaved: (row: Row) => void;
}

export default function ItemModal({ gameId, gameType, type, row, nextOrder, bucketLabels, onClose, onSaved }: Props) {
  const toast = useToast();
  const langs = useLangTabs();
  const noun = TYPE_NOUN[type].one;
  const [lang, setLang] = useState(langs.defaultLanguage);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [tr, setTr] = useState<Record<string, TrDraft>>({});
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const base = row ? normalizePayload(type, row.payload, gameType) : blankPayload(type, gameType);
    const count = type === 'choice' ? (base as { options: unknown[] }).options.length : 0;
    const blanks = () => Object.fromEntries(langs.extra.map((l) => [l.code, emptyTr(count)]));
    if (!row) {
      setPayload(base);
      setTr(blanks());
      return undefined;
    }
    loadTranslations('game_question', row.id)
      .then((map) => {
        if (cancelled) return;
        setPayload(base);
        setTr(Object.fromEntries(langs.extra.map((l) => [l.code, trFromFields(type, (map[l.code] ?? {}) as Record<string, unknown>, count)])));
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(friendlyError(e, 'Could not load translations.'));
        setPayload(base);
        setTr(blanks());
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  if (!payload) {
    return (
      <Modal open title={`${row ? 'Edit' : 'Add'} ${noun}`} onClose={onClose} wide>
        <Spinner label="Loading…" />
      </Modal>
    );
  }

  const isBase = lang === langs.defaultLanguage;
  const cur = isBase ? null : (tr[lang] ?? emptyTr());

  const removeOption = (i: number) => {
    const p = payload as Extract<Payload, { options: unknown[] }>;
    const correct = p.correct_index > i ? p.correct_index - 1 : p.correct_index === i ? 0 : p.correct_index;
    setPayload({ ...p, options: p.options.filter((_, j) => j !== i), correct_index: correct });
    setTr((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, options: v.options.filter((_, j) => j !== i) }])));
    setErrors([]);
  };

  const fieldProps = {
    gameType,
    payload,
    onChange: (p: Payload) => {
      setPayload(p);
      setErrors([]);
    },
    tr: cur,
    onTr: (patch: Partial<TrDraft>) => setTr((prev) => ({ ...prev, [lang]: { ...(prev[lang] ?? emptyTr()), ...patch } })),
    dir: langs.dir(lang),
    bucketLabels,
    onRemoveOption: removeOption,
  };

  async function save() {
    const errs = validatePayload(type, payload!, gameType);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    try {
      const values = { question_type: type, payload: cleanPayload(type, payload!) };
      const saved = row
        ? await unwrap<Row>(db().from('game_questions').update(values).eq('id', row.id).select().single())
        : await unwrap<Row>(db().from('game_questions').insert({ ...values, game_id: gameId, sort_order: nextOrder }).select().single());
      try {
        await saveTranslations('game_question', saved.id, Object.fromEntries(langs.extra.map((l) => [l.code, trToFields(type, tr[l.code] ?? emptyTr(), payload!)])));
        toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} ${row ? 'updated' : 'added'}.`);
      } catch (e) {
        toast.error(`Saved, but translations failed: ${friendlyError(e)}`);
      }
      onSaved(saved);
    } catch (e) {
      setErrors([friendlyError(e, `Could not save the ${noun}.`)]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      wide
      title={`${row ? 'Edit' : 'Add'} ${noun}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            {row ? 'Save' : 'Add'} {noun}
          </Button>
        </>
      }
    >
      <div className="ex-form">
        <div className="row gap-sm wrap" style={{ justifyContent: 'space-between' }}>
          <LangTabs value={lang} onChange={setLang} />
          <Switch checked={preview} onChange={setPreview} label="Preview" />
        </div>
        {!isBase ? <p className="ex-tr-note">Translate the text only. Empty boxes fall back to the default language. Emojis, the correct answer and buckets are shared.</p> : null}
        {type === 'choice' ? <ChoiceFields {...fieldProps} /> : type === 'pair' ? <PairFields {...fieldProps} /> : <LabelFields {...fieldProps} />}
        {preview ? <ItemPreview type={type} payload={payload} bucketLabels={bucketLabels} /> : null}
        <ErrorList errors={errors} />
      </div>
    </Modal>
  );
}
