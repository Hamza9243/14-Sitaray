import { useEffect, useState } from 'react';

import { Button, Field, Modal, Switch } from '../../components/ui';
import { type Language, useLookups } from '../../lib/data';
import { db, friendlyError, unwrap } from '../../lib/db';
import { useToast } from '../../lib/toast';

const CODE_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

/** Add (language === null) or edit one language. The code is the primary key, so it is fixed once created. */
export function LanguageForm({ open, language, onClose }: { open: boolean; language: Language | null; onClose: () => void }) {
  const toast = useToast();
  const { languages, reload } = useLookups();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nativeName, setNativeName] = useState('');
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [sortOrder, setSortOrder] = useState('0');
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(language?.code ?? '');
    setName(language?.name ?? '');
    setNativeName(language?.native_name ?? '');
    setDirection(language?.direction ?? 'ltr');
    setSortOrder(String(language?.sort_order ?? Math.max(0, ...languages.map((l) => l.sort_order)) + 1));
    setEnabled(language?.is_enabled ?? true);
    setErrors({});
  }, [open, language, languages]);

  const save = async () => {
    const next: Record<string, string> = {};
    const c = code.trim();
    if (!language) {
      if (!CODE_RE.test(c)) next.code = 'Use a language code such as “ur”, “ar” or “pt-BR”.';
      else if (languages.some((l) => l.code.toLowerCase() === c.toLowerCase())) next.code = 'That code is already in use.';
    }
    if (!name.trim()) next.name = 'Enter the language name in English.';
    if (!nativeName.trim()) next.native_name = 'Enter the name as its speakers write it.';
    if (!Number.isInteger(Number(sortOrder))) next.sort_order = 'Use a whole number.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const values = { name: name.trim(), native_name: nativeName.trim(), direction, sort_order: Number(sortOrder), is_enabled: language?.is_default ? true : enabled };
      if (language) await unwrap(db().from('languages').update(values).eq('code', language.code).select('code').single());
      else await unwrap(db().from('languages').insert({ code: c, ...values, is_default: false }));
      await reload();
      toast.success(language ? 'Language updated.' : 'Language added.');
      onClose();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={language ? `Edit ${language.name}` : 'Add language'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void save()}>
            {language ? 'Save changes' : 'Add language'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Code" required error={errors.code} help={language ? 'The code cannot be changed after it is created.' : 'ISO code, e.g. ur, ar, fa, pt-BR.'}>
          <input className="input" aria-label="Code" value={code} disabled={Boolean(language)} onChange={(e) => setCode(e.target.value)} placeholder="ur" />
        </Field>
        <Field label="Direction">
          <select className="select" aria-label="Direction" value={direction} onChange={(e) => setDirection(e.target.value as 'ltr' | 'rtl')}>
            <option value="ltr">Left to right (LTR)</option>
            <option value="rtl">Right to left (RTL)</option>
          </select>
        </Field>
        <Field label="Name (English)" required error={errors.name}>
          <input className="input" aria-label="Name (English)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Urdu" />
        </Field>
        <Field label="Native name" required error={errors.native_name}>
          <input className="input" aria-label="Native name" dir={direction} value={nativeName} onChange={(e) => setNativeName(e.target.value)} placeholder="اردو" />
        </Field>
        <Field label="Sort order" error={errors.sort_order}>
          <input className="input" aria-label="Sort order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </Field>
        <Field label="Enabled" help={language?.is_default ? 'The default language is always enabled.' : undefined}>
          <Switch checked={language?.is_default ? true : enabled} disabled={language?.is_default} onChange={setEnabled} label={enabled ? 'Enabled' : 'Disabled'} />
        </Field>
      </div>
    </Modal>
  );
}
