import { useEffect, useMemo, useState } from 'react';

import { useLookups } from '../lib/data';
import { db, type Row } from '../lib/db';
import type { FieldDef } from '../resources/types';

import { MediaField } from './MediaField';
import { RichTextEditor } from './RichTextEditor';
import { Field, Switch } from './ui';

function useStoryOptions(enabled: boolean) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    if (!enabled) return;
    db()
      .from('stories')
      .select('id,title')
      .is('deleted_at', null)
      .order('title')
      .limit(500)
      .then(({ data }) => setOptions(((data ?? []) as Row[]).map((s) => ({ value: s.id, label: s.title }))));
  }, [enabled]);
  return options;
}

function JsonInput({ value, onChange, id }: { value: unknown; onChange: (v: unknown) => void; id: string }) {
  const [text, setText] = useState(() => (typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)));
  // Keep the editing buffer in sync when a different record loads.
  useEffect(() => {
    if (typeof value !== 'string') setText((prev) => {
      try {
        return JSON.stringify(JSON.parse(prev)) === JSON.stringify(value ?? {}) ? prev : JSON.stringify(value ?? {}, null, 2);
      } catch {
        return prev;
      }
    });
  }, [value]);
  return (
    <textarea
      id={id}
      className="input mono"
      rows={6}
      spellCheck={false}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        try {
          onChange(e.target.value.trim() ? JSON.parse(e.target.value) : {});
        } catch {
          onChange(e.target.value); // invalid text is kept as a string; validation flags it on save
        }
      }}
    />
  );
}

export interface FieldInputProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown, extra?: { media?: { duration_seconds: number | null; display_name: string } }) => void;
  error?: string | null;
  disabled?: boolean;
  /** Text direction for translatable text (rtl languages). */
  dir?: 'ltr' | 'rtl';
  /** Shown under a translatable field on non-default language tabs. */
  reference?: string;
  label?: string;
}

export function FieldInput({ field, value, onChange, error, disabled, dir, reference, label }: FieldInputProps) {
  const { stars, categories, characters, languages } = useLookups();
  const storyOptions = useStoryOptions(field.type === 'story');
  const inputId = `f-${field.name}`;
  const direction = field.rtl ? 'rtl' : dir;

  const options = useMemo(() => {
    switch (field.type) {
      case 'star':
        return stars.map((s) => ({ value: s.id as string, label: `${s.number}. ${s.name}` }));
      case 'category':
        return categories
          .filter((c) => c.is_enabled !== false && (!field.categoryScope || (c.scopes ?? []).includes(field.categoryScope)))
          .map((c) => ({ value: c.id as string, label: c.name as string }));
      case 'character':
        return characters.map((c) => ({ value: c.id as string, label: c.name as string }));
      case 'language':
        return languages.filter((l) => l.is_enabled).map((l) => ({ value: l.code, label: `${l.name} (${l.native_name})` }));
      case 'story':
        return storyOptions;
      default:
        return field.options ?? [];
    }
  }, [field, stars, categories, characters, languages, storyOptions]);

  let control: React.ReactNode;
  switch (field.type) {
    case 'text':
    case 'emoji':
      control = (
        <input
          id={inputId}
          className="input"
          type="text"
          dir={direction}
          maxLength={field.type === 'emoji' ? 8 : undefined}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'textarea':
      control = (
        <textarea id={inputId} className="input" dir={direction} rows={field.rows ?? 4} value={(value as string) ?? ''} placeholder={field.placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case 'richtext':
      control = <RichTextEditor value={(value as string) ?? ''} onChange={(v) => onChange(v)} dir={direction} disabled={disabled} placeholder={field.placeholder} />;
      break;
    case 'number':
      control = (
        <input
          id={inputId}
          className="input"
          type="number"
          min={field.min}
          max={field.max}
          value={value === null || value === undefined ? '' : String(value)}
          disabled={disabled || field.readOnly}
          onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)}
        />
      );
      break;
    case 'date':
      control = <input id={inputId} className="input" type="date" value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'boolean':
      control = <Switch checked={Boolean(value)} onChange={(v) => onChange(v)} disabled={disabled} label={value ? 'On' : 'Off'} />;
      break;
    case 'multiselect':
      control = (
        <div className="checks">
          {options.map((o) => {
            const arr = (value as string[]) ?? [];
            const checked = arr.includes(o.value);
            return (
              <label key={o.value} className="check">
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onChange(checked ? arr.filter((x) => x !== o.value) : [...arr, o.value])} />
                {o.label}
              </label>
            );
          })}
        </div>
      );
      break;
    case 'select':
    case 'star':
    case 'category':
    case 'character':
    case 'story':
    case 'language':
      control = (
        <select id={inputId} className="input" value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}>
          {field.type === 'select' && !field.nullable ? null : <option value="">— None —</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'json':
      control = <JsonInput id={inputId} value={value} onChange={onChange} />;
      break;
    case 'image':
    case 'audio':
    case 'media':
      control = (
        <MediaField
          value={value as string | null}
          disabled={disabled}
          folder={field.folder}
          kinds={field.kinds ?? (field.type === 'image' ? ['image'] : field.type === 'audio' ? ['audio'] : undefined)}
          onChange={(id, media) => onChange(id, media ? { media: { duration_seconds: media.duration_seconds, display_name: media.display_name } } : undefined)}
        />
      );
      break;
    default:
      control = null;
  }

  return (
    <Field htmlFor={inputId} label={label ?? field.label} required={field.required} error={error} help={field.help} span={['richtext', 'textarea', 'image', 'audio', 'media', 'json'].includes(field.type) ? 2 : 1}>
      {control}
      {reference ? (
        <div className="reference">
          <span className="reference-tag">Default</span> {reference}
        </div>
      ) : null}
    </Field>
  );
}
