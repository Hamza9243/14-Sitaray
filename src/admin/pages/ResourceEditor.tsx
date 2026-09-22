import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ContentPreview } from '../components/ContentPreview';
import { FieldInput } from '../components/FieldInput';
import { Button, Card, ConfirmDialog, Drawer, EmptyState, PageHeader, Spinner, StatusBadge, Tabs } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useLookups } from '../lib/data';
import { friendlyError, hardDeleteRow, type Row, softDeleteRow, type Status } from '../lib/db';
import { formatDate } from '../lib/format';
import { cachedMedia } from '../lib/media';
import { findDuplicateTitle, initialValues, loadResource, saveResource, type TransState } from '../lib/resource';
import { useToast } from '../lib/toast';
import type { FieldDef, ResourceDef } from '../resources/types';

function stableStringify(v: unknown) {
  return JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val));
}

export function ResourceEditor({ def }: { def: ResourceDef }) {
  const { id: routeId } = useParams();
  const isNew = routeId === 'new' || !routeId;
  const navigate = useNavigate();
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const { defaultLanguage, extraLanguages, languages, loaded, settings } = useLookups();
  const confirmPublish = settings.publishing?.confirm_before_publish === true;

  const [values, setValues] = useState<Row>(() => initialValues(def));
  const [trans, setTrans] = useState<TransState>({});
  const [original, setOriginal] = useState<string>('');
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | 'draft' | 'publish' | 'unpublish' | 'save'>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | 'delete' | 'purge' | 'leave' | 'duplicate' | 'unpublish' | 'publish'>(null);
  const pendingSave = useRef<null | (() => void)>(null);
  const [recordId, setRecordId] = useState<string | null>(isNew ? null : routeId ?? null);
  const [reloadKey, setReloadKey] = useState(0);

  const activeLang = lang || defaultLanguage;
  const isDefaultLang = activeLang === defaultLanguage;
  const isRtl = languages.find((l) => l.code === activeLang)?.direction === 'rtl';

  // Load an existing record.
  useEffect(() => {
    if (isNew) {
      const v = initialValues(def);
      const params = new URLSearchParams(window.location.search);
      params.forEach((val, key) => {
        if (def.fields.some((f) => f.name === key)) v[key] = val;
      });
      setValues(v);
      setTrans({});
      setOriginal(stableStringify({ v, t: {} }));
      setRecordId(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    loadResource(def, routeId!)
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setNotFound(true);
          return;
        }
        const v = { ...initialValues(def), ...res.row };
        setValues(v);
        setTrans(res.translations);
        setOriginal(stableStringify({ v, t: res.translations }));
        setRecordId(res.row.id);
      })
      .catch((e) => !cancelled && setLoadError(friendlyError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [def, routeId, isNew, reloadKey]);

  const dirty = useMemo(() => original !== '' && stableStringify({ v: values, t: trans }) !== original, [values, trans, original]);

  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const status = (values.status as Status | undefined) ?? 'draft';
  const deleted = Boolean(values.deleted_at);
  const canEdit = !deleted;

  const setValue = useCallback(
    (field: FieldDef, value: unknown, extra?: { media?: { duration_seconds: number | null; display_name: string } }) => {
      if (field.translatable && !isDefaultLang) {
        setTrans((prev) => ({ ...prev, [activeLang]: { ...(prev[activeLang] ?? {}), [field.name]: value } }));
      } else {
        setValues((prev) => {
          const next = { ...prev, [field.name]: value };
          const sync = def.syncFromMedia;
          if (sync && field.name === sync.field) {
            const m = cachedMedia(value as string) ?? undefined;
            const duration = extra?.media?.duration_seconds ?? m?.duration_seconds ?? null;
            if (sync.durationField) next[sync.durationField] = duration;
            const label = extra?.media?.display_name ?? m?.display_name;
            if (sync.nameField && label && !String(prev[sync.nameField] ?? '').trim()) next[sync.nameField] = label;
          }
          return next;
        });
      }
      setErrors((e) => {
        if (!e[field.name]) return e;
        const { [field.name]: _drop, ...rest } = e;
        return rest;
      });
    },
    [activeLang, def.syncFromMedia, isDefaultLang]
  );

  const valueFor = (f: FieldDef): unknown => (f.translatable && !isDefaultLang ? trans[activeLang]?.[f.name] ?? '' : values[f.name]);

  async function doSave(target?: Status, mode: 'draft' | 'publish' | 'unpublish' | 'save' = 'save', skipDuplicateCheck = false) {
    setErrors({});
    // Client-side validation first so the editor sees every problem at once.
    const problems: Record<string, string> = {};
    for (const f of def.fields) {
      if (f.readOnly) continue;
      if (f.required && f.type !== 'boolean') {
        const v = values[f.name];
        const empty = v === null || v === undefined || (typeof v === 'string' && v.replace(/<[^>]+>/g, '').trim() === '');
        if (empty) problems[f.name] = `${f.label} is required.`;
      }
    }
    if (Object.keys(problems).length) {
      setErrors(problems);
      setLang(defaultLanguage);
      toast.error(Object.values(problems)[0]);
      window.setTimeout(() => document.querySelector('.field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    if (!recordId && !skipDuplicateCheck && (await findDuplicateTitle(def, String(values[def.titleField] ?? '')).catch(() => false))) {
      pendingSave.current = () => void doSave(target, mode, true);
      setConfirm('duplicate');
      return;
    }
    setSaving(mode);
    try {
      const row = await saveResource(def, { id: recordId ?? undefined, values, translations: trans, status: target });
      toast.success(mode === 'publish' ? `${def.label.singular} published.` : mode === 'unpublish' ? `${def.label.singular} unpublished.` : mode === 'draft' ? 'Draft saved.' : 'Saved.');
      const merged = { ...values, ...row };
      setValues(merged);
      setOriginal(stableStringify({ v: merged, t: trans }));
      if (!recordId) {
        setRecordId(row.id);
        navigate(`/admin/${def.key}/${row.id}`, { replace: true });
      }
    } catch (e) {
      const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fe) setErrors(fe);
      toast.error(friendlyError(e, 'Could not save.'));
    } finally {
      setSaving(null);
    }
  }

  async function doDelete() {
    if (!recordId) return;
    try {
      await softDeleteRow(def.table, recordId);
      toast.success(`${def.label.singular} moved to Trash.`);
      setOriginal(stableStringify({ v: values, t: trans }));
      navigate(`/admin/${def.key}`);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setConfirm(null);
    }
  }

  async function doPurge() {
    if (!recordId) return;
    try {
      await hardDeleteRow(def.table, recordId);
      toast.success('Permanently deleted.');
      setOriginal(stableStringify({ v: values, t: trans }));
      navigate(`/admin/${def.key}`);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setConfirm(null);
    }
  }

  function leave() {
    if (dirty) setConfirm('leave');
    else navigate(`/admin/${def.key}`);
  }

  if (loading || !loaded) return <Spinner label="Loading…" />;
  if (notFound) {
    return <EmptyState icon="alert" title={`${def.label.singular} not found`} hint="It may have been permanently deleted." action={<Button onClick={() => navigate(`/admin/${def.key}`)}>Back to {def.label.plural}</Button>} />;
  }
  if (loadError) {
    return <EmptyState icon="alert" title="Could not load" hint={loadError} action={<Button onClick={() => setReloadKey((k) => k + 1)}>Try again</Button>} />;
  }

  const contentFields = def.fields.filter((f) => (f.group ?? 'content') === 'content' && (!f.showWhen || f.showWhen(values)));
  const mediaFields = def.fields.filter((f) => f.group === 'media');
  const detailFields = def.fields.filter((f) => f.group === 'details' && (!f.showWhen || f.showWhen(values)));
  const visibleContent = contentFields.filter((f) => isDefaultLang || f.translatable);
  const tabs = [{ value: defaultLanguage, label: languages.find((l) => l.code === defaultLanguage)?.name ?? defaultLanguage }, ...extraLanguages.map((l) => ({ value: l.code, label: l.name }))];
  const hasTranslatable = Boolean(def.translationType) && contentFields.some((f) => f.translatable);
  const title = String(values[def.titleField] ?? '') || `New ${def.label.singular.toLowerCase()}`;

  const primaryButtons = def.hasStatus ? (
    status === 'published' ? (
      <>
        <Button variant="primary" icon="check-circle" loading={saving === 'save'} disabled={!canEdit || (Boolean(saving) && saving !== 'save')} onClick={() => void doSave(undefined, 'save')}>
          Save changes
        </Button>
        <Button icon="eye-off" loading={saving === 'unpublish'} disabled={!canEdit || Boolean(saving)} onClick={() => setConfirm('unpublish')}>
          Unpublish
        </Button>
      </>
    ) : (
      <>
        <Button loading={saving === 'draft'} disabled={!canEdit || Boolean(saving)} onClick={() => void doSave(recordId ? undefined : 'draft', 'draft')}>
          Save draft
        </Button>
        <Button variant="success" icon="eye" loading={saving === 'publish'} disabled={!canEdit || Boolean(saving)} onClick={() => (confirmPublish ? setConfirm('publish') : void doSave('published', 'publish'))}>
          Publish
        </Button>
      </>
    )
  ) : (
    <Button variant="primary" loading={saving === 'save'} disabled={!canEdit || Boolean(saving)} onClick={() => void doSave(undefined, 'save')}>
      Save
    </Button>
  );

  return (
    <div className="editor">
      <PageHeader
        back={{ label: def.label.plural, onClick: leave }}
        title={
          <span className="row gap-sm wrap">
            {title}
            {def.hasStatus && recordId ? <StatusBadge status={status} deleted={deleted} /> : null}
            {dirty ? <span className="badge badge-amber">Unsaved changes</span> : null}
          </span>
        }
        subtitle={recordId ? `Last updated ${formatDate(values.updated_at, true)}` : `Create a new ${def.label.singular.toLowerCase()}`}
        actions={
          <>
            <Button icon="eye" onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
            {primaryButtons}
          </>
        }
      />

      {deleted ? (
        <div className="alert alert-error">This item is in the Trash. Restore it from the {def.label.plural} list to edit it.</div>
      ) : null}

      <div className="editor-grid">
        <div className="editor-main">
          <Card
            title="Content"
            actions={hasTranslatable && tabs.length > 1 ? <Tabs tabs={tabs} value={activeLang} onChange={setLang} /> : undefined}
          >
            {!isDefaultLang ? (
              <p className="muted small">
                Translating into <b>{languages.find((l) => l.code === activeLang)?.name}</b>. Leave a field empty to fall back to the default language.
              </p>
            ) : null}
            <div className="form-grid">
              {visibleContent.map((f) => (
                <FieldInput
                  key={`${f.name}-${activeLang}`}
                  field={f}
                  value={valueFor(f)}
                  error={isDefaultLang ? errors[f.name] : undefined}
                  disabled={!canEdit}
                  dir={f.translatable && isRtl && !isDefaultLang ? 'rtl' : 'ltr'}
                  reference={!isDefaultLang && f.type !== 'richtext' ? String(values[f.name] ?? '') : undefined}
                  onChange={(v, extra) => setValue(f, v, extra)}
                />
              ))}
            </div>
          </Card>

          {mediaFields.length ? (
            <Card title="Media">
              <div className="form-grid">
                {mediaFields.map((f) => (
                  <FieldInput key={f.name} field={f} value={values[f.name]} error={errors[f.name]} disabled={!canEdit} onChange={(v, extra) => setValue(f, v, extra)} />
                ))}
              </div>
            </Card>
          ) : null}

          {def.extras?.map((x) =>
            recordId ? (
              <Card key={x.key} title={x.title}>
                <x.component id={recordId} values={values} reload={() => setReloadKey((k) => k + 1)} />
              </Card>
            ) : (
              <Card key={x.key} title={x.title}>
                <p className="muted">Save the {def.label.singular.toLowerCase()} first, then you can add this.</p>
              </Card>
            )
          )}
        </div>

        <aside className="editor-side">
          {def.hasStatus ? (
            <Card title="Publishing">
              <dl className="meta">
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={status} deleted={deleted} />
                </dd>
                <dt>Published</dt>
                <dd>{formatDate(values.published_at, true)}</dd>
                <dt>Created</dt>
                <dd>{formatDate(values.created_at, true)}</dd>
                <dt>Updated</dt>
                <dd>{formatDate(values.updated_at, true)}</dd>
              </dl>
              <div className="stack-sm">{primaryButtons}</div>
            </Card>
          ) : null}
          {detailFields.length ? (
            <Card title="Details">
              <div className="form-grid form-grid-1">
                {detailFields.map((f) => (
                  <FieldInput key={f.name} field={f} value={values[f.name]} error={errors[f.name]} disabled={!canEdit} onChange={(v, extra) => setValue(f, v, extra)} />
                ))}
              </div>
            </Card>
          ) : null}
          {recordId && !def.fixedSet ? (
            <Card title="Danger zone">
              <div className="stack-sm">
                <Button variant="danger" icon="trash" disabled={deleted} onClick={() => setConfirm('delete')}>
                  Move to Trash
                </Button>
                {isSuperAdmin ? (
                  <Button variant="danger" icon="trash" onClick={() => setConfirm('purge')}>
                    Delete permanently
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}
        </aside>
      </div>

      <Drawer open={previewOpen} title={`Preview${tabs.length > 1 && hasTranslatable ? ` · ${tabs.find((t) => t.value === activeLang)?.label}` : ''}`} onClose={() => setPreviewOpen(false)}>
        {hasTranslatable && tabs.length > 1 ? <Tabs tabs={tabs} value={activeLang} onChange={setLang} /> : null}
        <ContentPreview def={def} values={values} translations={trans} lang={activeLang} />
      </Drawer>

      <ConfirmDialog
        open={confirm === 'delete'}
        danger
        title={`Move this ${def.label.singular.toLowerCase()} to Trash?`}
        message="It will disappear from the app immediately. You can restore it from the Trash tab."
        confirmLabel="Move to Trash"
        onConfirm={() => void doDelete()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'purge'}
        danger
        title="Delete permanently?"
        message="This cannot be undone. Related translations are removed too."
        confirmLabel="Delete permanently"
        onConfirm={() => void doPurge()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'publish'}
        title={`Publish this ${def.label.singular.toLowerCase()}?`}
        message="It will become visible to children in the app right away."
        confirmLabel="Publish"
        onConfirm={() => {
          setConfirm(null);
          void doSave('published', 'publish');
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'unpublish'}
        title={`Unpublish this ${def.label.singular.toLowerCase()}?`}
        message="Children will no longer see it in the app. You can publish it again at any time."
        confirmLabel="Unpublish"
        onConfirm={() => {
          setConfirm(null);
          void doSave('unpublished', 'unpublish');
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'leave'}
        title="Discard unsaved changes?"
        message="You have changes that have not been saved."
        confirmLabel="Discard"
        danger
        onConfirm={() => {
          setConfirm(null);
          setOriginal(stableStringify({ v: values, t: trans }));
          navigate(`/admin/${def.key}`);
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'duplicate'}
        title="Similar item already exists"
        message={`A ${def.label.singular.toLowerCase()} with this title already exists. Do you want to save another one anyway?`}
        confirmLabel="Save anyway"
        onConfirm={() => {
          setConfirm(null);
          pendingSave.current?.();
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
